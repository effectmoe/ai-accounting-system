import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { logger } from '@/lib/logger';
import { jsPDF } from 'jspdf';
import { formatCurrency, formatDate } from '@/lib/utils';

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
      
      // jsPDFでPDFを生成
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // タイトル
      doc.setFontSize(24);
      doc.text('領 収 書', 105, 30, { align: 'center' });

      // 領収書番号と日付
      doc.setFontSize(10);
      doc.text(`領収書番号: ${receipt.receiptNumber}`, 140, 45);
      doc.text(`発行日: ${formatDate(receipt.issueDate)}`, 140, 50);

      // 宛名
      doc.setFontSize(14);
      doc.text(receipt.customerName, 20, 70);

      // 金額
      doc.setFontSize(20);
      const totalAmount = formatCurrency(receipt.totalAmount);
      doc.text(`¥${totalAmount}`, 105, 90, { align: 'center' });

      // 但し書き
      if (receipt.subject) {
        doc.setFontSize(12);
        doc.text(`但し、${receipt.subject}`, 20, 110);
      }

      // 内訳テーブル
      let yPosition = 130;
      doc.setFontSize(12);
      doc.text('【内訳】', 20, yPosition);
      
      yPosition += 10;
      doc.setFontSize(10);
      
      // テーブルヘッダー
      doc.text('摘要', 20, yPosition);
      doc.text('数量', 90, yPosition);
      doc.text('単価', 120, yPosition);
      doc.text('金額', 160, yPosition);
      
      yPosition += 5;
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 5;

      // 明細行
      receipt.items.forEach(item => {
        const unitPrice = formatCurrency(item.unitPrice);
        const amount = formatCurrency(item.amount);
        const unit = item.unit || '個';
        
        doc.text(item.description, 20, yPosition);
        doc.text(`${item.quantity} ${unit}`, 90, yPosition);
        doc.text(`¥${unitPrice}`, 120, yPosition);
        doc.text(`¥${amount}`, 160, yPosition);
        
        yPosition += 7;
      });

      // 小計・税・合計
      yPosition += 5;
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 8;
      
      const subtotal = formatCurrency(receipt.subtotal);
      const taxAmount = formatCurrency(receipt.taxAmount);
      const taxRate = Math.round(receipt.taxRate * 100);
      
      doc.text('小計', 120, yPosition);
      doc.text(`¥${subtotal}`, 160, yPosition);
      
      yPosition += 7;
      doc.text(`消費税(${taxRate}%)`, 120, yPosition);
      doc.text(`¥${taxAmount}`, 160, yPosition);
      
      yPosition += 7;
      doc.setFontSize(12);
      doc.text('合計', 120, yPosition);
      doc.text(`¥${totalAmount}`, 160, yPosition);

      // 発行者情報
      yPosition = 200;
      doc.setFontSize(12);
      doc.text(receipt.issuerName, 20, yPosition);
      
      if (receipt.issuerAddress) {
        yPosition += 7;
        doc.setFontSize(10);
        doc.text(receipt.issuerAddress, 20, yPosition);
      }
      
      if (receipt.issuerPhone) {
        yPosition += 6;
        doc.text(`TEL: ${receipt.issuerPhone}`, 20, yPosition);
      }
      
      if (receipt.issuerEmail) {
        yPosition += 6;
        doc.text(`Email: ${receipt.issuerEmail}`, 20, yPosition);
      }

      // 印影エリア
      doc.rect(160, 195, 20, 20);
      doc.text('印', 170, 205, { align: 'center' });

      // 備考
      if (receipt.notes) {
        yPosition = 230;
        doc.setFontSize(10);
        doc.text('【備考】', 20, yPosition);
        yPosition += 6;
        const noteLines = doc.splitTextToSize(receipt.notes, 170);
        doc.text(noteLines, 20, yPosition);
      }

      // フッター
      doc.setFontSize(8);
      doc.text(
        'この領収書は電子的に発行されたものです。印紙税法第5条により収入印紙の貼付は不要です。',
        105,
        280,
        { align: 'center' }
      );

      // PDFをバイナリ文字列として取得
      const pdfOutput = doc.output('arraybuffer');
      const pdfBuffer = Buffer.from(pdfOutput);
      
      // Base64エンコード
      const pdfBase64 = pdfBuffer.toString('base64');
      
      attachments.push({
        filename: `receipt_${receipt.receiptNumber}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      });
      
      logger.debug('Receipt PDF generated for email attachment');
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
          type: att.contentType,
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