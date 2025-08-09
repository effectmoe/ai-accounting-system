import { Resend } from 'resend';
import { logger } from '@/lib/logger';
import { generateHtmlQuote, HtmlQuoteOptions } from './html-quote-generator';
import { Quote, CompanyInfo } from '@/types/collections';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendQuoteEmailOptions {
  quote: Quote;
  companyInfo: CompanyInfo;
  recipientEmail: string;
  recipientName?: string;
  ccEmails?: string[];
  bccEmails?: string[];
  customMessage?: string;
  attachPdf?: boolean;
  pdfBuffer?: Buffer;
  suggestedOptions?: any[];
  replyTo?: string;
  scheduledAt?: string; // ISO 8601形式の日時文字列
  tags?: { name: string; value: string }[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  trackingId?: string;
  scheduledAt?: string;
}

/**
 * HTML見積書をメールで送信
 */
export async function sendQuoteEmail(
  options: SendQuoteEmailOptions
): Promise<EmailSendResult> {
  try {
    const {
      quote,
      companyInfo,
      recipientEmail,
      recipientName,
      ccEmails = [],
      bccEmails = [],
      customMessage,
      attachPdf = true,
      pdfBuffer,
      suggestedOptions = [],
      replyTo,
      scheduledAt,
      tags = [],
    } = options;

    // HTML見積書を生成
    const htmlQuoteResult = await generateHtmlQuote({
      quote,
      companyInfo,
      recipientName,
      customMessage,
      includeTracking: true,
      includeInteractiveElements: true,
      suggestedOptions,
    });

    // 添付ファイルの準備
    const attachments = [];
    if (attachPdf && pdfBuffer) {
      attachments.push({
        filename: `見積書_${quote.quoteNumber}.pdf`,
        content: pdfBuffer,
      });
    }

    // メールタグの準備（Resend Analytics用）
    const emailTags = [
      { name: 'type', value: 'quote' },
      { name: 'quote_id', value: quote._id },
      { name: 'quote_number', value: quote.quoteNumber },
      { name: 'customer_id', value: quote.customerId },
      { name: 'amount', value: quote.totalAmount.toString() },
      ...tags,
    ];

    // Resendでメール送信
    const { data, error } = await resend.emails.send({
      from: `${companyInfo.name} <${companyInfo.email || 'noreply@accounting-automation.vercel.app'}>`,
      to: recipientEmail,
      cc: ccEmails,
      bcc: bccEmails,
      replyTo: replyTo || companyInfo.email,
      subject: htmlQuoteResult.subject,
      html: htmlQuoteResult.html,
      text: htmlQuoteResult.plainText,
      attachments,
      scheduledAt,
      tags: emailTags,
      headers: {
        'X-Entity-Ref-ID': quote._id,
        'X-Quote-Number': quote.quoteNumber,
        'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_BASE_URL}/unsubscribe?email=${recipientEmail}>`,
      },
    });

    if (error) {
      logger.error('Resend API error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Webhookイベントを記録（開封・クリック追跡用）
    if (data?.id) {
      await recordEmailEvent({
        messageId: data.id,
        quoteId: quote._id,
        recipientEmail,
        trackingId: htmlQuoteResult.trackingId,
        sentAt: new Date().toISOString(),
      });
    }

    return {
      success: true,
      messageId: data?.id,
      trackingId: htmlQuoteResult.trackingId,
      scheduledAt,
    };
  } catch (error) {
    logger.error('Error sending quote email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * メール送信イベントを記録
 */
async function recordEmailEvent(event: {
  messageId: string;
  quoteId: string;
  recipientEmail: string;
  trackingId?: string;
  sentAt: string;
}) {
  try {
    // MongoDBまたはSupabaseに記録
    const response = await fetch('/api/email-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error('Failed to record email event');
    }
  } catch (error) {
    logger.error('Error recording email event:', error);
    // エラーがあっても送信は成功扱い
  }
}

/**
 * バッチメール送信（複数の見積書を一括送信）
 */
export async function sendBatchQuoteEmails(
  emails: SendQuoteEmailOptions[]
): Promise<EmailSendResult[]> {
  try {
    // Resend Batch APIを使用
    const batchData = await Promise.all(
      emails.map(async (emailOptions) => {
        const htmlQuoteResult = await generateHtmlQuote({
          quote: emailOptions.quote,
          companyInfo: emailOptions.companyInfo,
          recipientName: emailOptions.recipientName,
          customMessage: emailOptions.customMessage,
          includeTracking: true,
          includeInteractiveElements: true,
          suggestedOptions: emailOptions.suggestedOptions,
        });

        return {
          from: `${emailOptions.companyInfo.name} <${emailOptions.companyInfo.email || 'noreply@accounting-automation.vercel.app'}>`,
          to: emailOptions.recipientEmail,
          subject: htmlQuoteResult.subject,
          html: htmlQuoteResult.html,
          text: htmlQuoteResult.plainText,
        };
      })
    );

    const { data, error } = await resend.batch.send(batchData);

    if (error) {
      logger.error('Resend Batch API error:', error);
      return emails.map(() => ({
        success: false,
        error: error.message,
      }));
    }

    return data.map((result: any) => ({
      success: true,
      messageId: result.id,
    }));
  } catch (error) {
    logger.error('Error sending batch emails:', error);
    return emails.map(() => ({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}

/**
 * メール送信統計を取得
 */
export async function getEmailStats(quoteId: string) {
  try {
    // Resend APIから統計を取得
    // 注: Resend APIの統計エンドポイントは現在開発中
    // 代わりにWebhookイベントから集計
    const response = await fetch(`/api/email-events/stats?quoteId=${quoteId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch email stats');
    }

    return await response.json();
  } catch (error) {
    logger.error('Error fetching email stats:', error);
    return {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
    };
  }
}

/**
 * Resend Webhookイベントを処理
 */
export async function handleResendWebhook(event: any) {
  try {
    const { type, data } = event;

    switch (type) {
      case 'email.sent':
        await updateEmailStatus(data.email_id, 'sent');
        break;
      case 'email.delivered':
        await updateEmailStatus(data.email_id, 'delivered');
        break;
      case 'email.opened':
        await recordEmailOpen(data.email_id, data.opened_at);
        break;
      case 'email.clicked':
        await recordEmailClick(data.email_id, data.clicked_at, data.link);
        break;
      case 'email.bounced':
        await updateEmailStatus(data.email_id, 'bounced');
        break;
      case 'email.complained':
        await updateEmailStatus(data.email_id, 'complained');
        break;
    }

    return { success: true };
  } catch (error) {
    logger.error('Error handling Resend webhook:', error);
    return { success: false, error };
  }
}

async function updateEmailStatus(emailId: string, status: string) {
  // 実装: データベースでメールステータスを更新
  logger.info(`Email ${emailId} status updated to ${status}`);
}

async function recordEmailOpen(emailId: string, openedAt: string) {
  // 実装: メール開封を記録
  logger.info(`Email ${emailId} opened at ${openedAt}`);
}

async function recordEmailClick(emailId: string, clickedAt: string, link: string) {
  // 実装: リンククリックを記録
  logger.info(`Email ${emailId} link clicked at ${clickedAt}: ${link}`);
}