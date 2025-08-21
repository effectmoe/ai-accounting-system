import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { InvoiceService } from '@/services/invoice.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { generatePDFBase64 } from '@/lib/pdf-export';
import { DocumentData } from '@/lib/document-generator';
import { db } from '@/lib/mongodb-client';
import { Customer } from '@/types/collections';

import { logger } from '@/lib/logger';
// 日本語フォント処理のためにNode.js Runtimeを使用
export const runtime = 'nodejs';

// APIルートのボディサイズ制限を10MBに設定（デフォルトは4.5MB）
export const maxDuration = 60; // 60秒のタイムアウト（PDF生成時間を考慮）

// メール送信のための型定義
interface EmailRequest {
  documentType: 'quote' | 'invoice' | 'delivery-note' | 'receipt';
  documentId: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  attachPdf?: boolean;
  pdfBase64?: string; // クライアントで生成されたPDFのBase64データ
}

// Resendのインスタンスをグローバルに保持（遅延初期化）
let resendInstance: any = null;

// Resendの遅延初期化関数
async function getResendInstance() {
  if (!resendInstance) {
    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    
    // 動的インポート
    const { Resend } = await import('resend');
    resendInstance = new Resend(resendApiKey);
    
    logger.debug('Resend initialized:', {
      apiKeyExists: true,
      apiKeyPrefix: resendApiKey.substring(0, 10)
    });
  }
  
  return resendInstance;
}

// 顧客のメール設定に基づいて送信先を取得するヘルパー関数
async function getEmailRecipients(customerId?: string): Promise<{ to: string[]; cc?: string[] }> {
  if (!customerId) {
    logger.debug('No customerId provided, returning default');
    return { to: [] };
  }

  try {
    logger.debug(`Getting email recipients for customer: ${customerId}`);
    const customer = await db.findById<Customer>('customers', customerId);
    
    if (!customer) {
      logger.debug(`Customer not found: ${customerId}`);
      return { to: [] };
    }

    const recipients: { to: string[]; cc?: string[] } = { to: [] };
    
    switch (customer.emailRecipientPreference) {
      case 'representative':
        // 代表者（会社のメールアドレス）に送信
        if (customer.email) {
          recipients.to.push(customer.email);
          logger.debug(`Added representative email: ${customer.email}`);
        }
        break;
        
      case 'contact':
        // 主担当者に送信
        if (customer.contacts && customer.contacts.length > 0) {
          const primaryContact = customer.primaryContactIndex !== undefined && customer.primaryContactIndex >= 0
            ? customer.contacts[customer.primaryContactIndex]
            : customer.contacts.find(contact => contact.isPrimary) || customer.contacts[0];
          
          if (primaryContact?.email) {
            recipients.to.push(primaryContact.email);
            logger.debug(`Added contact email: ${primaryContact.email} (${primaryContact.name})`);
          }
        }
        break;
        
      case 'both':
        // 両方に送信
        if (customer.email) {
          recipients.to.push(customer.email);
          logger.debug(`Added representative email: ${customer.email}`);
        }
        if (customer.contacts && customer.contacts.length > 0) {
          const primaryContact = customer.primaryContactIndex !== undefined && customer.primaryContactIndex >= 0
            ? customer.contacts[customer.primaryContactIndex]
            : customer.contacts.find(contact => contact.isPrimary) || customer.contacts[0];
          
          if (primaryContact?.email && primaryContact.email !== customer.email) {
            // CCに追加（代表者と重複しない場合）
            if (!recipients.cc) recipients.cc = [];
            recipients.cc.push(primaryContact.email);
            logger.debug(`Added contact email to CC: ${primaryContact.email} (${primaryContact.name})`);
          }
        }
        break;
        
      default:
        // デフォルトは代表者メール
        if (customer.email) {
          recipients.to.push(customer.email);
          logger.debug(`Added default representative email: ${customer.email}`);
        }
        break;
    }

    logger.debug(`Email recipients determined:`, {
      preference: customer.emailRecipientPreference,
      to: recipients.to,
      cc: recipients.cc,
      customerEmail: customer.email,
      primaryContact: customer.contacts?.[0]?.email
    });
    return recipients;
  } catch (error) {
    logger.error('Error getting email recipients:', error);
    return { to: [] };
  }
}

// メール送信サービス
async function sendEmail(options: {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
}) {
  try {
    logger.debug('Sending email via Resend:', {
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      hasAttachments: !!options.attachments?.length,
      apiKeyExists: !!process.env.RESEND_API_KEY,
    });

    // Resendインスタンスを取得（遅延初期化）
    const resend = await getResendInstance();

    // Resendでメール送信
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = process.env.EMAIL_FROM_NAME || '株式会社EFFECT';

    // 環境変数デバッグ
    logger.debug('Resend環境変数の確認:', {
      RESEND_API_KEY_EXISTS: !!process.env.RESEND_API_KEY,
      RESEND_API_KEY_PREFIX: process.env.RESEND_API_KEY?.substring(0, 10),
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
      EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
      finalFromAddress: fromAddress,
      finalFromName: fromName
    });

    // Resend用の添付ファイル形式を準備
    let resendAttachments = null;
    if (options.attachments && options.attachments.length > 0) {
      logger.debug('=== RESEND ATTACHMENT FORMATTING ===');
      logger.debug('Original attachments:', {
        count: options.attachments.length,
        details: options.attachments.map(att => ({
          filename: att.filename,
          contentLength: att.content.length,
          contentType: att.contentType,
          isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(att.content)
        }))
      });
      
      resendAttachments = options.attachments.map(att => {
        const resendAttachment = {
          filename: att.filename,
          content: att.content,
          content_type: att.contentType, // Resend APIの仕様（アンダースコア使用）
        };
        
        logger.debug('Formatted attachment for Resend:', {
          filename: resendAttachment.filename,
          contentLength: resendAttachment.content.length,
          contentType: resendAttachment.content_type,
          contentValidation: {
            isString: typeof resendAttachment.content === 'string',
            hasContent: resendAttachment.content.length > 0,
            isBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(resendAttachment.content),
            startsWithPDF: resendAttachment.content.startsWith('JVBERi0'), // "%PDF-" in base64
            preview: resendAttachment.content.substring(0, 50)
          }
        });
        
        return resendAttachment;
      });
    }

    const emailData = {
      from: `${fromName} <${fromAddress}>`,
      to: [options.to],
      ...(options.cc && { cc: [options.cc] }),
      ...(options.bcc && { bcc: [options.bcc] }),
      subject: options.subject,
      html: options.body,
      ...(resendAttachments && { attachments: resendAttachments }),
    };

    logger.debug('=== FINAL RESEND EMAIL DATA ===');
    logger.debug('Resend email data structure:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: !!emailData.attachments?.length,
      attachmentCount: emailData.attachments?.length || 0,
      emailDataKeys: Object.keys(emailData),
      attachmentStructure: emailData.attachments?.map(att => ({
        filename: att.filename,
        contentLength: att.content?.length || 0,
        contentType: att.content_type,
        hasContent: !!att.content,
        isValidBase64: typeof att.content === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(att.content)
      }))
    });

    logger.debug('=== CALLING RESEND API ===');
    logger.debug('About to call resend.emails.send', {
      dataKeys: Object.keys(emailData),
      hasAttachments: !!emailData.attachments,
      attachmentCount: emailData.attachments?.length || 0,
      emailDataSerialization: {
        canSerialize: true,
        // 実際のJSONシリアライゼーションをテスト
        serializedSize: JSON.stringify(emailData).length
      }
    });
    
    // Resend APIへの送信前の最終検証
    if (emailData.attachments && emailData.attachments.length > 0) {
      logger.debug('Final attachment validation before Resend API call:', {
        attachments: emailData.attachments.map((att, index) => ({
          index,
          filename: att.filename,
          contentType: att.content_type,
          contentSize: att.content?.length || 0,
          contentExists: !!att.content,
          contentIsString: typeof att.content === 'string',
          isValidBase64: typeof att.content === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(att.content),
          contentStructure: {
            hasFilename: !!att.filename,
            hasContentType: !!att.content_type,
            hasContent: !!att.content
          }
        }))
      });
    }
    
    const { data, error: resendError } = await resend.emails.send(emailData);

    logger.debug('=== RESEND API RESPONSE ===');
    logger.debug('Resend API response:', {
      hasError: !!resendError,
      hasData: !!data,
      dataId: data?.id,
      errorMessage: resendError?.message
    });

    if (resendError) {
      logger.error('Resend送信エラー:', resendError);
      logger.error('Resendエラー詳細:', {
        name: resendError.name,
        message: resendError.message,
        response: (resendError as any).response,
        statusCode: (resendError as any).statusCode,
        stack: (resendError as any).stack,
        attachmentRelated: emailData.attachments?.length > 0,
        resendAPILimitations: {
          // Resend API制限の参考情報
          maxAttachmentSize: '25MB per attachment',
          totalMessageSize: '40MB including all attachments',
          allowedContentTypes: 'application/pdf should be supported',
          base64Required: 'attachments require base64 encoding'
        },
        debugInfo: {
          attachmentSizes: emailData.attachments?.map(att => att.content?.length || 0),
          totalAttachmentSize: emailData.attachments?.reduce((sum, att) => sum + (att.content?.length || 0), 0) || 0
        }
      });
      throw new Error(`Resend API error: ${resendError.message || 'Unknown error'}`);
    }

    logger.debug('Email sent successfully via Resend:', {
      messageId: data?.id,
      hasAttachments: !!emailData.attachments?.length,
      attachmentCount: emailData.attachments?.length || 0
    });
    logger.info('メール送信成功:', {
      messageId: data?.id,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      attachmentCount: emailData.attachments?.length || 0
    });
    return { success: true, messageId: data?.id || 'unknown' };
  } catch (error) {
    logger.error('メール送信エラー:', error);
    throw new Error(`メール送信に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// 送信専用メールの注意書きHTML
function getReplyNoticeHtml(): string {
  return `
<div style="background-color: #FEF3C7; border: 2px solid #F59E0B; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">
  <p style="margin: 0; color: #92400E; font-weight: bold; font-size: 14px;">
    📧 このメールは送信専用です
  </p>
  <p style="margin: 8px 0 0 0; color: #78350F; font-size: 14px;">
    ご返信・お問い合わせは下記メールアドレスまでお願いいたします
  </p>
  <p style="margin: 12px 0 0 0;">
    <a href="mailto:info@effect.moe" style="background-color: #3B82F6; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
      ✉️ info@effect.moe
    </a>
  </p>
</div>
  `.trim();
}

// デフォルトのメールテンプレート
function getDefaultEmailTemplate(
  documentType: 'quote' | 'invoice' | 'delivery-note' | 'receipt',
  documentNumber: string,
  customerName: string,
  totalAmount: number,
  dueDate?: string,
  deliveryDate?: string,
  documentTitle?: string
): { subject: string; body: string } {
  // 送信専用の注意書きHTMLを取得
  const replyNotice = getReplyNoticeHtml();
  
  if (documentType === 'quote') {
    return {
      subject: `【見積書】${documentNumber} のご送付`,
      body: `
${replyNotice}

<p>${customerName} 様</p>

<p>いつもお世話になっております。</p>

<p>ご依頼いただきました見積書をお送りいたします。</p>

<p><strong>見積書番号：</strong>${documentNumber}<br/>
<strong>見積金額：</strong>¥${totalAmount.toLocaleString()}</p>

<p>添付ファイルをご確認ください。</p>

<p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

<p>よろしくお願いいたします。</p>
      `.trim(),
    };
  } else if (documentType === 'invoice') {
    return {
      subject: `【請求書】${documentNumber} のご送付`,
      body: `
${replyNotice}

<p>${customerName} 様</p>

<p>いつもお世話になっております。</p>

<p>請求書をお送りいたします。</p>

<p><strong>請求書番号：</strong>${documentNumber}<br/>
<strong>請求金額：</strong>¥${totalAmount.toLocaleString()}<br/>
${dueDate ? `<strong>お支払期限：</strong>${dueDate}` : ''}</p>

<p>添付ファイルをご確認の上、期限までにお支払いをお願いいたします。</p>

<p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

<p>よろしくお願いいたします。</p>
      `.trim(),
    };
  } else if (documentType === 'delivery-note') {
    // delivery-note の場合
    return {
      subject: `【納品書】${documentNumber} のご送付`,
      body: `
${replyNotice}

<p>${customerName} 様</p>

<p>いつもお世話になっております。</p>

<p>納品書をお送りいたします。</p>

<p><strong>納品書番号：</strong>${documentNumber}<br/>
${deliveryDate ? `<strong>納品日：</strong>${deliveryDate}<br/>` : ''}
<strong>合計金額：</strong>¥${totalAmount.toLocaleString()}</p>

<p>添付ファイルをご確認ください。</p>

<p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

<p>よろしくお願いいたします。</p>
      `.trim(),
    };
  } else {
    // receipt の場合
    return {
      subject: `【領収書】${documentNumber} のご送付`,
      body: `
${replyNotice}

<p>${customerName} 様</p>

<p>いつもお世話になっております。</p>

<p>領収書をお送りいたします。</p>

<p><strong>領収書番号：</strong>${documentNumber}<br/>
${documentTitle ? `<strong>件名：</strong>${documentTitle}<br/>` : ''}
<strong>領収金額：</strong>¥${totalAmount.toLocaleString()}</p>

<p>添付ファイルをご確認ください。</p>

<p>ご査収の程、よろしくお願いいたします。</p>
      `.trim(),
    };
  }
}

export async function POST(request: NextRequest) {
  logger.debug('=== EMAIL SEND API CALLED ===');
  try {
    const body: EmailRequest = await request.json();
    logger.debug('Request body:', body);
    const { documentType, documentId, to, cc, bcc, subject, body: customBody, attachPdf = true, pdfBase64 } = body;

    // ドキュメントを取得
    logger.debug('Fetching document...', { documentType, documentId });
    let document: any;
    let documentData: DocumentData;
    
    if (documentType === 'quote') {
      logger.debug('Fetching quote document...');
      const quoteService = new QuoteService();
      document = await quoteService.getQuote(documentId);
      logger.debug('Quote fetched:', document ? 'SUCCESS' : 'FAILED');
      
      if (!document) {
        return NextResponse.json({ error: '見積書が見つかりません' }, { status: 404 });
      }
      
      // 現在の会社情報を取得（companySnapshotのフォールバック用）
      const companyInfoService = new CompanyInfoService();
      const currentCompanyInfo = await companyInfoService.getCompanyInfo();
      
      // companySnapshotが不完全な場合に現在の会社情報をフォールバックとして使用
      const effectiveCompanyInfo = {
        name: document.companySnapshot?.companyName || currentCompanyInfo?.companyName || '会社名未設定',
        address: document.companySnapshot?.address || 
                currentCompanyInfo?.address1 || 
                `${currentCompanyInfo?.prefecture || ''} ${currentCompanyInfo?.city || ''} ${currentCompanyInfo?.address1 || ''}`.trim() ||
                '住所未設定',
        phone: document.companySnapshot?.phone || currentCompanyInfo?.phone,
        email: document.companySnapshot?.email || currentCompanyInfo?.email,
        registrationNumber: document.companySnapshot?.invoiceRegistrationNumber || currentCompanyInfo?.registrationNumber,
      };
      
      logger.debug('Effective company info for email:', effectiveCompanyInfo);
      
      // DocumentData形式に変換
      documentData = {
        documentType: 'quote',
        documentNumber: document.quoteNumber,
        issueDate: new Date(document.issueDate),
        validUntilDate: new Date(document.validityDate),
        customerName: document.customer?.companyName || '',
        customerAddress: `${document.customer?.prefecture || ''}${document.customer?.city || ''}${document.customer?.address1 || ''}`,
        items: document.items.map((item: any) => ({
          description: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        subtotal: document.subtotal,
        tax: document.taxAmount,
        total: document.totalAmount,
        notes: document.notes,
        companyInfo: effectiveCompanyInfo,
      };
    } else if (documentType === 'invoice') {
      const invoiceService = new InvoiceService();
      document = await invoiceService.getInvoice(documentId);
      
      if (!document) {
        return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 });
      }
      
      // 現在の会社情報を取得（companySnapshotのフォールバック用）
      const companyInfoService = new CompanyInfoService();
      const currentCompanyInfo = await companyInfoService.getCompanyInfo();
      
      // companySnapshotが不完全な場合に現在の会社情報をフォールバックとして使用
      const effectiveCompanyInfo = {
        name: document.companySnapshot?.companyName || currentCompanyInfo?.companyName || '会社名未設定',
        address: document.companySnapshot?.address || 
                currentCompanyInfo?.address1 || 
                `${currentCompanyInfo?.prefecture || ''} ${currentCompanyInfo?.city || ''} ${currentCompanyInfo?.address1 || ''}`.trim() ||
                '住所未設定',
        phone: document.companySnapshot?.phone || currentCompanyInfo?.phone,
        email: document.companySnapshot?.email || currentCompanyInfo?.email,
        registrationNumber: document.companySnapshot?.invoiceRegistrationNumber || currentCompanyInfo?.registrationNumber,
      };
      
      logger.debug('Effective company info for invoice email:', effectiveCompanyInfo);
      
      // DocumentData形式に変換
      documentData = {
        documentType: 'invoice',
        documentNumber: document.invoiceNumber,
        issueDate: new Date(document.issueDate || document.invoiceDate),
        dueDate: new Date(document.dueDate),
        customerName: document.customerSnapshot?.companyName || '',
        customerAddress: document.customerSnapshot?.address || '',
        items: document.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        subtotal: document.subtotal,
        tax: document.taxAmount,
        total: document.totalAmount,
        notes: document.notes,
        companyInfo: effectiveCompanyInfo,
        bankAccount: document.companySnapshot?.bankAccount,
      };
    } else if (documentType === 'delivery-note') {
      // delivery-note の場合
      logger.debug('Fetching delivery note document...');
      const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/delivery-notes/${documentId}`);
      
      if (!response.ok) {
        return NextResponse.json({ error: '納品書が見つかりません' }, { status: 404 });
      }
      
      document = await response.json();
      logger.debug('Delivery note fetched:', document ? 'SUCCESS' : 'FAILED');
      
      // DocumentData形式に変換
      documentData = {
        documentType: 'delivery-note',
        documentNumber: document.deliveryNoteNumber,
        issueDate: new Date(document.issueDate),
        deliveryDate: new Date(document.deliveryDate),
        customerName: document.customer?.companyName || document.customerSnapshot?.companyName || '',
        customerAddress: document.customer ? 
          `${document.customer.postalCode ? `〒${document.customer.postalCode} ` : ''}${document.customer.prefecture || ''}${document.customer.city || ''}${document.customer.address1 || ''}${document.customer.address2 || ''}` :
          document.customerSnapshot?.address || '',
        items: document.items.map((item: any) => ({
          itemName: item.itemName || '',
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        subtotal: document.subtotal,
        tax: document.taxAmount,
        total: document.totalAmount,
        notes: document.notes,
        companyInfo: {
          name: document.companySnapshot?.companyName || '',
          address: document.companySnapshot?.address || '',
          phone: document.companySnapshot?.phone,
          email: document.companySnapshot?.email,
          registrationNumber: document.companySnapshot?.invoiceRegistrationNumber,
        },
      };
    } else {
      // receipt の場合
      logger.debug('Fetching receipt document...');
      const { ReceiptService } = await import('@/services/receipt.service');
      const receiptService = new ReceiptService();
      document = await receiptService.getReceipt(documentId);
      logger.debug('Receipt fetched:', document ? 'SUCCESS' : 'FAILED');
      
      if (!document) {
        return NextResponse.json({ error: '領収書が見つかりません' }, { status: 404 });
      }
      
      // DocumentData形式に変換
      documentData = {
        documentType: 'receipt',
        documentNumber: document.receiptNumber,
        issueDate: new Date(document.issueDate),
        customerName: document.customerName || '',
        customerAddress: document.customerAddress || '',
        customer: (document as any).customer, // 顧客情報全体を渡す
        customerSnapshot: (document as any).customerSnapshot, // スナップショットも渡す
        items: document.items.map((item: any) => ({
          itemName: item.description || '',
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        subtotal: document.subtotal,
        tax: document.taxAmount,
        total: document.totalAmount,
        notes: document.notes,
        companyInfo: {
          name: (document as any).companySnapshot?.companyName || document.issuerName || '',
          address: (document as any).companySnapshot?.address || document.issuerAddress || '',
          phone: (document as any).companySnapshot?.phone || document.issuerPhone,
          email: (document as any).companySnapshot?.email || document.issuerEmail,
          registrationNumber: (document as any).companySnapshot?.invoiceRegistrationNumber,
          stampImage: (document as any).companySnapshot?.stampImage || document.issuerStamp,
        },
      };
    }

    // デフォルトのメールテンプレートを取得
    const defaultTemplate = getDefaultEmailTemplate(
      documentType,
      documentData.documentNumber,
      documentData.customerName,
      documentData.total,
      documentData.dueDate ? new Date(documentData.dueDate).toLocaleDateString('ja-JP') : undefined,
      documentData.deliveryDate ? new Date(documentData.deliveryDate).toLocaleDateString('ja-JP') : undefined,
      document.subject // 領収書の件名を渡す
    );

    // メールの件名と本文を設定
    const emailSubject = subject || defaultTemplate.subject;
    
    // カスタム本文が渡された場合も送信専用の注意書きを追加
    let emailBody: string;
    if (customBody) {
      // カスタム本文の場合は、送信専用の注意書きを先頭に追加
      const replyNotice = getReplyNoticeHtml();
      const plainTextBody = customBody.split('\n').map(line => {
        // 空行は<br>タグとして扱う
        if (line.trim() === '') {
          return '<br>';
        }
        // 通常の行は<p>タグで囲む
        return `<p style="margin: 0; line-height: 1.5;">${line}</p>`;
      }).join('');
      emailBody = `${replyNotice}\n\n${plainTextBody}`;
    } else {
      // デフォルトテンプレートの場合（既に注意書きが含まれている）
      emailBody = defaultTemplate.body;
    }

    // 添付ファイルの準備
    logger.debug('=== ATTACHMENT PREPARATION START ===');
    logger.debug('Preparing attachments...', { 
      attachPdf, 
      hasPdfBase64: !!pdfBase64,
      pdfBase64Length: pdfBase64?.length || 0,
      documentType,
      documentNumber: documentData.documentNumber
    });
    const attachments = [];
    if (attachPdf) {
      logger.debug('PDF attachment requested');
      
      // クライアントから送られたPDFデータがある場合は使用
      if (pdfBase64) {
        logger.debug('Using client-generated PDF', {
          size: pdfBase64.length,
          documentNumber: documentData.documentNumber,
          firstChars: pdfBase64.substring(0, 50),
          isBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(pdfBase64)
        });
        
        const attachment = {
          filename: `${documentData.documentNumber}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
        };
        attachments.push(attachment);
        logger.debug('Client PDF attachment added to array', {
          filename: attachment.filename,
          contentLength: attachment.content.length,
          contentType: attachment.contentType
        });
      } else if (documentType === 'quote') {
        // 見積書の場合はサーバーサイドでPDF生成
        logger.debug('Quote document detected, generating PDF on server-side');
        
        try {
          // データの検証
          if (!document) {
            throw new Error('Quote document is null or undefined');
          }
          if (!document.quoteNumber) {
            throw new Error('Quote number is missing');
          }
          if (!document.items || document.items.length === 0) {
            throw new Error('Quote items are missing or empty');
          }
          
          logger.debug('Quote data validation passed', {
            quoteNumber: document.quoteNumber,
            itemCount: document.items.length,
            hasCustomer: !!document.customer,
            hasTotal: typeof document.total === 'number'
          });
          
          // 会社情報を取得
          const companyInfoService = new CompanyInfoService();
          const companyInfo = await companyInfoService.getCompanyInfo();
          
          if (!companyInfo) {
            logger.warn('Company info not found, using default values');
          }
          
          let pdfBuffer: Buffer | null = null;
          let pdfAttachmentSuccessful = false;
          
          // Vercel環境ではより確実な方法を優先
          const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
          
          if (isProduction) {
            // 本番環境（Vercel）では順次フォールバック戦略を採用
            logger.debug('Production environment detected, trying multiple PDF generation methods');
            
            // 方法1: PDFkit（最優先）
            try {
              logger.debug('Attempting PDFkit PDF generation...');
              const { generateQuotePDFWithPDFkit } = await import('@/lib/quote-pdf-server-pdfkit');
              pdfBuffer = await generateQuotePDFWithPDFkit(document, companyInfo || {});
              pdfAttachmentSuccessful = true;
              logger.debug('PDFkit quote PDF generation successful');
            } catch (pdfkitError) {
              logger.error('PDFkit failed, trying next method:', {
                error: pdfkitError instanceof Error ? pdfkitError.message : String(pdfkitError),
                stack: pdfkitError instanceof Error ? pdfkitError.stack : undefined
              });
              
              // 方法2: jsPDF
              try {
                logger.debug('Attempting jsPDF PDF generation...');
                const { generateQuotePDFServer } = await import('@/lib/quote-pdf-server-jspdf');
                pdfBuffer = await generateQuotePDFServer(document, companyInfo || {});
                pdfAttachmentSuccessful = true;
                logger.debug('jsPDF fallback PDF generation successful');
              } catch (jsPdfError) {
                logger.error('jsPDF also failed, trying simple PDF method:', {
                  error: jsPdfError instanceof Error ? jsPdfError.message : String(jsPdfError),
                  stack: jsPdfError instanceof Error ? jsPdfError.stack : undefined
                });
                
                // 方法3: シンプルPDF（Puppeteer試行 → HTMLフォールバック）
                try {
                  logger.debug('Attempting simple PDF generation...');
                  const { generateSimpleQuotePDF } = await import('@/lib/quote-pdf-simple');
                  pdfBuffer = await generateSimpleQuotePDF(document, companyInfo || {});
                  pdfAttachmentSuccessful = true;
                  logger.debug('Simple PDF generation successful');
                } catch (simpleError) {
                  logger.error('All PDF generation methods failed:', {
                    error: simpleError instanceof Error ? simpleError.message : String(simpleError),
                    stack: simpleError instanceof Error ? simpleError.stack : undefined
                  });
                  
                  // 最終手段: テスト用PDFを生成してデバッグ
                  logger.warn('All PDF generation methods failed, trying test PDF as emergency fallback');
                  try {
                    const { generateTestPDF } = await import('@/lib/test-pdf-generator');
                    pdfBuffer = await generateTestPDF(`test-${documentData.documentNumber}.pdf`);
                    pdfAttachmentSuccessful = true;
                    logger.info('Emergency test PDF generated successfully - this confirms PDF attachment system is working');
                  } catch (testPdfError) {
                    logger.error('Even test PDF generation failed - PDF system is completely broken:', testPdfError);
                    pdfBuffer = null;
                    pdfAttachmentSuccessful = false;
                  }
                }
              }
            }
          } else {
            // 開発環境では順次試行（デバッグしやすい）
            logger.debug('Development environment detected, trying PDF generation methods');
            
            try {
              logger.debug('Attempting PDFkit PDF generation...');
              const { generateQuotePDFWithPDFkit } = await import('@/lib/quote-pdf-server-pdfkit');
              pdfBuffer = await generateQuotePDFWithPDFkit(document, companyInfo || {});
              pdfAttachmentSuccessful = true;
              logger.debug('PDFkit PDF generation successful');
            } catch (pdfkitError) {
              logger.error('PDFkit failed, trying Puppeteer:', {
                error: pdfkitError instanceof Error ? pdfkitError.message : String(pdfkitError),
                stack: pdfkitError instanceof Error ? pdfkitError.stack : undefined
              });
              
              try {
                logger.debug('Attempting Puppeteer PDF generation...');
                const { convertQuoteHTMLtoPDF } = await import('@/lib/quote-html-to-pdf-server');
                pdfBuffer = await convertQuoteHTMLtoPDF(document, companyInfo || {}, true);
                pdfAttachmentSuccessful = true;
                logger.debug('Puppeteer PDF generation successful');
              } catch (puppeteerError) {
                logger.error('Puppeteer also failed, trying simple PDF as last resort:', {
                  error: puppeteerError instanceof Error ? puppeteerError.message : String(puppeteerError),
                  stack: puppeteerError instanceof Error ? puppeteerError.stack : undefined
                });
                
                try {
                  logger.debug('Attempting simple PDF generation...');
                  const { generateSimpleQuotePDF } = await import('@/lib/quote-pdf-simple');
                  pdfBuffer = await generateSimpleQuotePDF(document, companyInfo || {});
                  pdfAttachmentSuccessful = true;
                  logger.debug('Simple PDF generation successful');
                } catch (simpleError) {
                  logger.error('All PDF generation methods failed, trying test PDF as last resort:', {
                    error: simpleError instanceof Error ? simpleError.message : String(simpleError)
                  });
                  
                  // 最終手段: テスト用PDFを生成してデバッグ
                  try {
                    const { generateTestPDF } = await import('@/lib/test-pdf-generator');
                    pdfBuffer = await generateTestPDF(`test-${documentData.documentNumber}.pdf`);
                    pdfAttachmentSuccessful = true;
                    logger.info('Emergency test PDF generated successfully in development - this confirms PDF attachment system is working');
                  } catch (testPdfError) {
                    logger.error('Even test PDF generation failed in development - PDF system is completely broken:', testPdfError);
                    pdfBuffer = null;
                    pdfAttachmentSuccessful = false;
                  }
                }
              }
            }
          }
          
          // PDF添付の処理
          logger.debug('=== PDF ATTACHMENT PROCESSING ===', {
            pdfAttachmentSuccessful,
            hasPdfBuffer: !!pdfBuffer,
            bufferLength: pdfBuffer?.length || 0
          });
          
          if (pdfAttachmentSuccessful && pdfBuffer && pdfBuffer.length > 0) {
            // PDFヘッダーチェック（可能な場合のみ）
            try {
              const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
              logger.debug('PDF header check:', {
                header: pdfHeader,
                isValidPDF: pdfHeader.startsWith('%PDF'),
                bufferLength: pdfBuffer.length
              });
              
              if (pdfHeader.startsWith('%PDF')) {
                // 有効なPDFとして処理
                logger.debug('Valid PDF detected, starting base64 encoding');
                
                let pdfBase64Generated: string;
                try {
                  pdfBase64Generated = pdfBuffer.toString('base64');
                  
                  // Base64の検証
                  const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(pdfBase64Generated);
                  const decodedBuffer = Buffer.from(pdfBase64Generated, 'base64');
                  const roundTripValid = decodedBuffer.equals(pdfBuffer);
                  
                  logger.debug('PDF successfully encoded to base64', {
                    originalBufferLength: pdfBuffer.length,
                    base64Length: pdfBase64Generated.length,
                    base64Preview: pdfBase64Generated.substring(0, 100),
                    isValidBase64,
                    roundTripValid,
                    decodedLength: decodedBuffer.length,
                    startsWithPDFMagic: pdfBase64Generated.startsWith('JVBERi0') // "%PDF-" in base64
                  });
                  
                  if (!isValidBase64) {
                    throw new Error('Generated base64 is not valid');
                  }
                  if (!roundTripValid) {
                    throw new Error('Base64 round-trip encoding failed');
                  }
                } catch (encodingError) {
                  logger.error('Base64 encoding failed:', {
                    error: encodingError instanceof Error ? encodingError.message : String(encodingError),
                    bufferLength: pdfBuffer.length,
                    bufferHeader: pdfHeader
                  });
                  throw encodingError;
                }
                
                const attachment = {
                  filename: `${documentData.documentNumber}.pdf`,
                  content: pdfBase64Generated,
                  contentType: 'application/pdf',
                };
                attachments.push(attachment);
                logger.debug('Server-generated PDF attachment added to array', {
                  filename: attachment.filename,
                  contentLength: attachment.content.length,
                  contentType: attachment.contentType,
                  arrayLength: attachments.length,
                  attachmentValidation: {
                    hasFilename: !!attachment.filename,
                    hasContent: !!attachment.content,
                    hasContentType: !!attachment.contentType,
                    contentIsString: typeof attachment.content === 'string'
                  }
                });
              } else {
                // HTMLなど、PDFではないコンテンツの場合
                logger.warn('Generated content is not a valid PDF, treating as HTML fallback', {
                  header: pdfHeader,
                  bufferLength: pdfBuffer.length,
                  contentPreview: pdfBuffer.slice(0, 200).toString('utf8')
                });
                
                // HTMLとしてメール本文に追加する処理を追加することも可能
                // ここではPDF添付を諦めて続行
                logger.warn('PDF attachment failed, continuing without attachment');
              }
            } catch (headerError) {
              logger.warn('PDF header check failed, but attempting attachment anyway:', {
                error: headerError instanceof Error ? headerError.message : String(headerError),
                bufferLength: pdfBuffer.length
              });
              
              // ヘッダーチェックに失敗してもPDF添付を試行
              try {
                const pdfBase64Generated = pdfBuffer.toString('base64');
                logger.debug('Force encoding PDF to base64 despite header check failure', {
                  base64Length: pdfBase64Generated.length,
                  bufferLength: pdfBuffer.length
                });
                
                const attachment = {
                  filename: `${documentData.documentNumber}.pdf`,
                  content: pdfBase64Generated,
                  contentType: 'application/pdf',
                };
                attachments.push(attachment);
                logger.debug('PDF attachment added despite header check failure', {
                  filename: attachment.filename,
                  contentLength: attachment.content.length,
                  arrayLength: attachments.length
                });
              } catch (attachError) {
                logger.error('PDF attachment completely failed:', {
                  error: attachError instanceof Error ? attachError.message : String(attachError),
                  bufferLength: pdfBuffer.length
                });
              }
            }
          } else {
            logger.warn('PDF generation was not successful, proceeding without PDF attachment', {
              pdfAttachmentSuccessful,
              hasPdfBuffer: !!pdfBuffer,
              bufferLength: pdfBuffer?.length || 0,
              debugInfo: {
                documentType,
                documentNumber: documentData.documentNumber,
                quoteNumber: document.quoteNumber
              }
            });
          }
          
        } catch (pdfError) {
          logger.error('Quote PDF generation process encountered error, but continuing with email:', {
            error: pdfError instanceof Error ? pdfError.message : String(pdfError),
            stack: pdfError instanceof Error ? pdfError.stack : undefined,
            documentId: document._id || document.id,
            documentType: documentData.documentType,
            documentNumber: documentData.documentNumber,
            environment: {
              NODE_ENV: process.env.NODE_ENV,
              VERCEL: process.env.VERCEL,
              platform: process.platform
            }
          });
          
          // PDFエラーでもメール送信は続行
          logger.warn('PDF generation failed, but proceeding with email without PDF attachment');
        }
      } else {
        // 見積書以外でクライアントからPDFが送られていない場合はエラーを返す
        logger.error('=== NO CLIENT PDF PROVIDED ===');
        logger.error('Client-side PDF generation is required but no PDF was provided');
        
        // クライアント側でPDF生成が必須であることを明示
        return NextResponse.json(
          { 
            error: 'PDFの生成に失敗しました。ブラウザでPDFを生成してから送信してください。',
            details: 'Client-side PDF generation is required for this document type',
            debugInfo: {
              documentType: documentData.documentType,
              documentNumber: documentData.documentNumber,
              message: 'No pdfBase64 provided in request'
            }
          },
          { status: 400 }
        );
      }
    } else {
      logger.debug('PDF attachment not requested (attachPdf is false)');
    }
    
    logger.debug('=== ATTACHMENT PREPARATION END ===');
    logger.debug('Final attachments array:', {
      count: attachments.length,
      details: attachments.map(a => ({ 
        filename: a.filename, 
        contentSize: a.content.length,
        contentType: a.contentType,
        isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(a.content),
        contentPreview: a.content.substring(0, 50) + '...'
      }))
    });

    // 顧客のメール設定に基づいて送信先を決定
    let finalTo = to;
    let finalCc = cc;
    
    // 顧客IDを取得（複数のパターンに対応）
    const customerId = document.customerId || document.customer?._id || document.customer?.id;
    
    if (customerId) {
      logger.debug(`Getting email recipients for customer ID: ${customerId}`);
      
      const recipients = await getEmailRecipients(customerId);
      if (recipients.to.length > 0) {
        // 顧客設定のメールアドレスを優先的に使用
        finalTo = recipients.to[0]; // 主送信先
        logger.debug(`Using customer preference email: ${finalTo} (override client provided: ${to})`);
        
        if (recipients.to.length > 1) {
          // 複数の送信先がある場合、追加をCCに
          finalCc = cc ? `${cc},${recipients.to.slice(1).join(',')}` : recipients.to.slice(1).join(',');
        }
        if (recipients.cc && recipients.cc.length > 0) {
          // 顧客設定のCCも追加
          finalCc = finalCc ? `${finalCc},${recipients.cc.join(',')}` : recipients.cc.join(',');
        }
        logger.debug(`Email recipients from customer settings - To: ${finalTo}, CC: ${finalCc}`);
      } else {
        logger.debug('No email recipients found in customer settings, using provided TO address');
        // 顧客設定がない場合は、クライアントから渡されたアドレスを使用
        logger.debug(`Using client provided email: ${to}`);
      }
    } else {
      logger.debug('No customer ID found, using client provided email');
    }

    // メール送信
    logger.debug('=== EMAIL SENDING START ===');
    logger.debug('Sending email with attachments', {
      attachmentCount: attachments.length,
      hasAttachments: attachments.length > 0,
      attachmentDetails: attachments.map(a => ({ 
        filename: a.filename, 
        contentSize: a.content.length,
        contentType: a.contentType 
      })),
      recipients: {
        to: finalTo,
        cc: finalCc,
        bcc: bcc
      },
      subject: emailSubject
    });
    
    const result = await sendEmail({
      to: finalTo,
      cc: finalCc,
      bcc,
      subject: emailSubject,
      body: emailBody,
      attachments,
    });
    
    logger.debug('Email sent successfully:', result);

    if (!result.success) {
      throw new Error('メール送信に失敗しました');
    }

    // ステータスを自動更新（メール送信成功時は送信済みに変更）
    try {
      if (documentType === 'quote') {
        const quoteService = new QuoteService();
        // 見積書のステータスを送信済みに更新（既に承認済みや拒否の場合は変更しない）
        if (!['accepted', 'rejected', 'expired', 'converted'].includes(document.status)) {
          await quoteService.updateQuote(documentId, { status: 'sent' });
          logger.info(`Quote ${documentId} status updated to 'sent' after email send`);
        }
      } else if (documentType === 'invoice') {
        const invoiceService = new InvoiceService();
        // 請求書のステータスを送信済みに更新（既に支払済みやキャンセルの場合は変更しない）
        if (!['paid', 'partially_paid', 'cancelled'].includes(document.status)) {
          await invoiceService.updateInvoice(documentId, { status: 'sent' });
          logger.info(`Invoice ${documentId} status updated to 'sent' after email send`);
        }
      } else if (documentType === 'delivery-note') {
        // 納品書のステータス更新（送信済みに変更）
        const updateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/delivery-notes/${documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'sent' }),
        });
        
        if (!updateResponse.ok) {
          logger.error('Failed to update delivery note status');
        } else {
          logger.info(`Delivery note ${documentId} status updated to 'sent' after email send`);
        }
      }
    } catch (statusUpdateError) {
      // ステータス更新に失敗してもメール送信は成功しているのでエラーはログに記録するのみ
      logger.error('Failed to update document status after email send:', statusUpdateError);
    }

    // 送信履歴を記録（将来的に実装）
    // await recordEmailHistory({
    //   documentType,
    //   documentId,
    //   to,
    //   cc,
    //   bcc,
    //   subject: emailSubject,
    //   sentAt: new Date(),
    //   messageId: result.messageId,
    // });

    return NextResponse.json({
      success: true,
      message: 'メールが送信されました',
      messageId: result.messageId,
    });
  } catch (error) {
    logger.error('Email sending error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // より詳細なエラー情報を返す
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = {
      message: errorMessage,
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: error instanceof Error ? error.stack : null
    };
    
    return NextResponse.json(
      { 
        error: 'メール送信に失敗しました', 
        details: errorMessage,
        debugInfo: errorDetails
      },
      { status: 500 }
    );
  }
}