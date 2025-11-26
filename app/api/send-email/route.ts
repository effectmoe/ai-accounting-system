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

// メール送信のための型定義
interface EmailRequest {
  documentType: 'quote' | 'invoice' | 'delivery-note';
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

    const emailData = {
      from: `${fromName} <${fromAddress}>`,
      to: [options.to],
      ...(options.cc && { cc: [options.cc] }),
      ...(options.bcc && { bcc: [options.bcc] }),
      subject: options.subject,
      html: options.body,
      ...(options.attachments && options.attachments.length > 0 && {
        attachments: options.attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          type: att.contentType,
        }))
      }),
    };

    logger.debug('Sending email with Resend data:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: !!emailData.attachments?.length,
    });

    const { data, error: resendError } = await resend.emails.send(emailData);

    if (resendError) {
      logger.error('Resend送信エラー:', resendError);
      logger.error('Resendエラー詳細:', {
        name: resendError.name,
        message: resendError.message,
        response: (resendError as any).response,
        statusCode: (resendError as any).statusCode
      });
      throw new Error(`Resend API error: ${resendError.message || 'Unknown error'}`);
    }

    logger.debug('Email sent successfully via Resend:', data);
    logger.info('メール送信成功:', {
      messageId: data?.id,
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject
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
  documentType: 'quote' | 'invoice' | 'delivery-note',
  documentNumber: string,
  customerName: string,
  totalAmount: number,
  dueDate?: string,
  deliveryDate?: string
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
  } else {
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
      // 住所は改行区切りで連結（address1: 住所、address2: ビル名など）
      const buildAddress = () => {
        if (document.companySnapshot?.address) return document.companySnapshot.address;
        if (!currentCompanyInfo) return '住所未設定';

        const postalCode = currentCompanyInfo.postalCode ? `〒${currentCompanyInfo.postalCode}` : '';
        const mainAddress = `${currentCompanyInfo.prefecture || ''}${currentCompanyInfo.city || ''}${currentCompanyInfo.address1 || ''}`;
        const buildingName = currentCompanyInfo.address2 || '';

        // 住所とビル名を改行で連結
        const parts = [postalCode, mainAddress, buildingName].filter(Boolean);
        if (parts.length === 0) return '住所未設定';

        // 郵便番号と住所を1行目、ビル名を2行目に
        if (buildingName) {
          return `${postalCode} ${mainAddress}\n${buildingName}`;
        }
        return `${postalCode} ${mainAddress}`;
      };

      const effectiveCompanyInfo = {
        name: document.companySnapshot?.companyName || currentCompanyInfo?.companyName || '会社名未設定',
        address: buildAddress(),
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
      // 住所は改行区切りで連結（address1: 住所、address2: ビル名など）
      const buildInvoiceAddress = () => {
        if (document.companySnapshot?.address) return document.companySnapshot.address;
        if (!currentCompanyInfo) return '住所未設定';

        const postalCode = currentCompanyInfo.postalCode ? `〒${currentCompanyInfo.postalCode}` : '';
        const mainAddress = `${currentCompanyInfo.prefecture || ''}${currentCompanyInfo.city || ''}${currentCompanyInfo.address1 || ''}`;
        const buildingName = currentCompanyInfo.address2 || '';

        // 住所とビル名を改行で連結
        const parts = [postalCode, mainAddress, buildingName].filter(Boolean);
        if (parts.length === 0) return '住所未設定';

        // 郵便番号と住所を1行目、ビル名を2行目に
        if (buildingName) {
          return `${postalCode} ${mainAddress}\n${buildingName}`;
        }
        return `${postalCode} ${mainAddress}`;
      };

      const effectiveCompanyInfo = {
        name: document.companySnapshot?.companyName || currentCompanyInfo?.companyName || '会社名未設定',
        address: buildInvoiceAddress(),
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
    } else {
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
    }

    // デフォルトのメールテンプレートを取得
    const defaultTemplate = getDefaultEmailTemplate(
      documentType,
      documentData.documentNumber,
      documentData.customerName,
      documentData.total,
      documentData.dueDate ? new Date(documentData.dueDate).toLocaleDateString('ja-JP') : undefined,
      documentData.deliveryDate ? new Date(documentData.deliveryDate).toLocaleDateString('ja-JP') : undefined
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
    logger.debug('Preparing attachments...', { attachPdf, hasPdfBase64: !!pdfBase64 });
    const attachments = [];
    if (attachPdf) {
      logger.debug('PDF attachment requested');
      
      // クライアントから送られたPDFデータがある場合は使用
      if (pdfBase64) {
        logger.debug('Using client-generated PDF, size:', pdfBase64.length);
        const attachment = {
          filename: `${documentData.documentNumber}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
        };
        attachments.push(attachment);
        logger.debug('Client PDF attachment added to array');
      } else {
        // クライアントからPDFが送られていない場合はサーバー側で生成を試みる
        try {
          logger.debug('No client PDF provided, generating on server...');
          logger.debug('Document data summary:', {
            documentType: documentData.documentType,
            documentNumber: documentData.documentNumber,
            customerName: documentData.customerName,
            itemsCount: documentData.items?.length || 0,
            total: documentData.total
          });
          
          const serverPdfBase64 = await generatePDFBase64(documentData);
          logger.debug('Server PDF generated successfully, size:', serverPdfBase64.length, 'characters');
          
          const attachment = {
            filename: `${documentData.documentNumber}.pdf`,
            content: serverPdfBase64,
            contentType: 'application/pdf',
          };
          attachments.push(attachment);
          logger.debug('Server PDF attachment added to array');
        } catch (pdfError) {
          logger.error('=== SERVER PDF GENERATION FAILED ===');
          logger.error('Server PDF generation failed:', pdfError);
          logger.error('PDF error details:', {
            message: pdfError instanceof Error ? pdfError.message : String(pdfError),
            stack: pdfError instanceof Error ? pdfError.stack : null,
            type: pdfError instanceof Error ? pdfError.constructor.name : typeof pdfError
          });
          
          // サーバー側のPDF生成に失敗した場合はエラーを返す
          return NextResponse.json(
            { error: 'PDF生成に失敗しました。クライアントサイドでのPDF生成を試してください。' },
            { status: 500 }
          );
        }
      }
    } else {
      logger.debug('PDF attachment not requested (attachPdf is false)');
    }
    
    logger.debug('=== ATTACHMENT PREPARATION END ===');
    logger.debug('Final attachments array:', attachments.map(a => ({ filename: a.filename, size: a.content.length })));

    // 送信先を決定（クライアントから渡されたアドレスを優先）
    // ユーザーが手動で入力したメールアドレスを使用する
    let finalTo = to;
    let finalCc = cc;

    logger.debug(`Using client provided email: ${to} (CC: ${cc})`);

    // 注意: 以前は顧客設定のメールアドレスを優先していましたが、
    // ユーザーが手動で入力したアドレスを尊重するように変更しました。
    // クライアント側（email-send-modal.tsx）で既に顧客設定に基づいて
    // 初期メールアドレスが設定されているため、API側では上書きしません。

    // メール送信
    logger.debug('Sending email with attachments count:', attachments.length);
    logger.debug('Email attachments:', attachments.map(a => ({ filename: a.filename, size: a.content.length })));
    logger.debug(`Final email recipients - To: ${finalTo}, CC: ${finalCc}, BCC: ${bcc}`);
    
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