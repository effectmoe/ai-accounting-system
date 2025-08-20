import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { logger } from '@/lib/logger';
import { convertReceiptHTMLtoPDF } from '@/lib/html-to-pdf-server';

const receiptService = new ReceiptService();

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
  }
  
  return resendInstance;
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
  receiptNumber: string,
  customerName: string,
  totalAmount: number,
  invoiceNumber?: string
): { subject: string; body: string } {
  const replyNotice = getReplyNoticeHtml();
  
  return {
    subject: `【領収書】${receiptNumber} のご送付`,
    body: `
${replyNotice}

<p>${customerName}</p>

<p>いつもお世話になっております。</p>

<p>領収書をお送りいたします。</p>

<p><strong>領収書番号：</strong>${receiptNumber}<br/>
${invoiceNumber ? `<strong>関連請求書番号：</strong>${invoiceNumber}<br/>` : ''}
<strong>領収金額：</strong>¥${totalAmount.toLocaleString()}</p>

<p>添付ファイルをご確認ください。</p>

<p>※ この領収書は電子的に発行されたものです。印紙税法第5条により収入印紙の貼付は不要です。</p>

<p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

<p>よろしくお願いいたします。</p>
    `.trim(),
  };
}

interface SendEmailRequest {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  attachPdf?: boolean;
}

/**
 * POST /api/receipts/[id]/send-email - 領収書をメールで送信
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: SendEmailRequest = await request.json();
    const { to, cc, bcc, subject: customSubject, body: customBody, attachPdf = true } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // 領収書を取得
    const receipt = await receiptService.getReceipt(params.id);
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // デフォルトのメールテンプレートを取得
    const defaultTemplate = getDefaultEmailTemplate(
      receipt.receiptNumber,
      receipt.customerName,
      receipt.totalAmount,
      receipt.invoiceNumber
    );

    // メールの件名と本文を設定
    const emailSubject = customSubject || defaultTemplate.subject;
    
    let emailBody: string;
    if (customBody) {
      // カスタム本文の場合は、送信専用の注意書きを先頭に追加
      const replyNotice = getReplyNoticeHtml();
      const plainTextBody = customBody.split('\n').map(line => {
        if (line.trim() === '') {
          return '<br>';
        }
        return `<p style="margin: 0; line-height: 1.5;">${line}</p>`;
      }).join('');
      emailBody = `${replyNotice}\n\n${plainTextBody}`;
    } else {
      emailBody = defaultTemplate.body;
    }

    // 添付ファイルの準備
    const attachments = [];
    if (attachPdf) {
      logger.debug('Generating receipt PDF for email attachment');
      
      // HTMLベースの美しいフォーマットをPDFに変換して添付
      // PDF印刷ボタンと同じフォーマットのPDFを生成
      logger.debug('Converting receipt HTML to PDF for email attachment (same format as PDF print button)');
      
      try {
        // HTMLをPDFに変換（Puppeteerを使用）
        const pdfBuffer = await convertReceiptHTMLtoPDF(receipt);
        const pdfBase64 = pdfBuffer.toString('base64');
        
        // PDFファイルとして添付
        attachments.push({
          filename: `receipt_${receipt.receiptNumber}.pdf`,
          content: pdfBase64,
          contentType: 'application/pdf',
        });
        
        logger.debug('Receipt PDF generated successfully for email attachment');
      } catch (error) {
        logger.error('Failed to generate receipt PDF:', error);
        throw new Error('PDF生成に失敗しました');
      }
    }

    // Resendインスタンスを取得
    const resend = await getResendInstance();
    const fromAddress = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = process.env.EMAIL_FROM_NAME || '株式会社EFFECT';

    // メール送信データを構築
    const emailData = {
      from: `${fromName} <${fromAddress}>`,
      to: [to],
      ...(cc && { cc: [cc] }),
      ...(bcc && { bcc: [bcc] }),
      subject: emailSubject,
      html: emailBody,
      ...(attachments.length > 0 && {
        attachments: attachments.map(att => ({
          filename: att.filename,
          content: att.content,
          content_type: att.contentType, // Resend APIの仕様に合わせて修正
        }))
      }),
    };

    logger.debug('Sending receipt email:', {
      from: emailData.from,
      to: emailData.to,
      subject: emailData.subject,
      hasAttachments: !!emailData.attachments?.length,
    });

    // メール送信
    const { data, error: resendError } = await resend.emails.send(emailData);

    if (resendError) {
      logger.error('Resend sending error:', resendError);
      throw new Error(`Resend API error: ${resendError.message || 'Unknown error'}`);
    }

    logger.info('Receipt email sent successfully:', {
      messageId: data?.id,
      receiptNumber: receipt.receiptNumber,
      to: emailData.to,
    });

    // 領収書のステータスを送信済みに更新
    await receiptService.updateStatus(params.id, 'sent');
    logger.info(`Receipt ${receipt.receiptNumber} status updated to 'sent' after email send`);

    return NextResponse.json({
      success: true,
      message: '領収書がメールで送信されました',
      messageId: data?.id || 'unknown',
    });
  } catch (error) {
    logger.error('Error sending receipt email:', error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return NextResponse.json(
      { 
        error: 'メール送信に失敗しました', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
}