import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { InvoiceService } from '@/services/invoice.service';
import { generatePDFBase64 } from '@/lib/pdf-export';
import { DocumentData } from '@/lib/document-generator';
import nodemailer from 'nodemailer';

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

// Gmail SMTP設定
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER || 'info@effect.moe',
    pass: process.env.GMAIL_APP_PASSWORD || 'zrvn vpbs bgcx leyo'
  }
});

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
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME || '株式会社EFFECT'} <${process.env.EMAIL_FROM_ADDRESS || 'info@effect.moe'}>`,
      to: options.to,
      cc: options.cc || undefined,
      bcc: options.bcc || undefined,
      subject: options.subject,
      text: options.body.replace(/<br>/g, '\n').replace(/<[^>]*>/g, ''), // HTMLタグを除去したプレーンテキスト版
      html: options.body,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        encoding: 'base64' as const,
        contentType: att.contentType
      }))
    };

    logger.debug('Sending email via Gmail:', {
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      hasAttachments: !!options.attachments?.length,
    });

    const info = await transporter.sendMail(mailOptions);
    
    logger.debug('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Gmail送信エラー:', error);
    throw new Error(`メール送信に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
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
  if (documentType === 'quote') {
    return {
      subject: `【見積書】${documentNumber} のご送付`,
      body: `
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
        companyInfo: {
          name: document.companySnapshot?.companyName || '',
          address: document.companySnapshot?.address || '',
          phone: document.companySnapshot?.phone,
          email: document.companySnapshot?.email,
          registrationNumber: document.companySnapshot?.invoiceRegistrationNumber,
        },
      };
    } else if (documentType === 'invoice') {
      const invoiceService = new InvoiceService();
      document = await invoiceService.getInvoice(documentId);
      
      if (!document) {
        return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 });
      }
      
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
        companyInfo: {
          name: document.companySnapshot?.companyName || '',
          address: document.companySnapshot?.address || '',
          phone: document.companySnapshot?.phone,
          email: document.companySnapshot?.email,
          registrationNumber: document.companySnapshot?.invoiceRegistrationNumber,
        },
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
          description: item.itemName || item.description,
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
    // プレーンテキストの改行を<br>タグに変換してHTMLメールとして送信
    const plainTextBody = customBody || defaultTemplate.body;
    const emailBody = plainTextBody.split('\n').map(line => {
      // 空行は<br>タグとして扱う
      if (line.trim() === '') {
        return '<br>';
      }
      // 通常の行は<p>タグで囲む
      return `<p style="margin: 0; line-height: 1.5;">${line}</p>`;
    }).join('');

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

    // メール送信
    logger.debug('Sending email with attachments count:', attachments.length);
    logger.debug('Email attachments:', attachments.map(a => ({ filename: a.filename, size: a.content.length })));
    
    const result = await sendEmail({
      to,
      cc,
      bcc,
      subject: emailSubject,
      body: emailBody,
      attachments,
    });
    
    logger.debug('Email sent successfully:', result);

    if (!result.success) {
      throw new Error('メール送信に失敗しました');
    }

    // ステータスを自動更新（下書き → 保存済み）
    if (document.status === 'draft') {
      if (documentType === 'quote') {
        const quoteService = new QuoteService();
        await quoteService.updateQuote(documentId, { status: 'saved' });
      } else if (documentType === 'invoice') {
        const invoiceService = new InvoiceService();
        await invoiceService.updateInvoice(documentId, { status: 'saved' });
      } else if (documentType === 'delivery-note') {
        // 納品書のステータス更新（draft → sent）
        const updateResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/delivery-notes/${documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'sent' }),
        });
        
        if (!updateResponse.ok) {
          logger.error('Failed to update delivery note status');
        }
      }
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