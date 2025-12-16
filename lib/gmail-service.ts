/**
 * Gmail Service - Gmail OAuth2 + Nodemailer
 * 見積書・請求書メール送信サービス
 * ResendからGmailへの移行版
 */

import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import Mail from 'nodemailer/lib/mailer';
import { logger } from '@/lib/logger';
import { generateHtmlQuote, HtmlQuoteOptions } from './html-quote-generator';
import { Quote, CompanyInfo } from '@/types/collections';

// 環境変数
const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_USER // info@effect.moe
} = process.env;

// Gmail設定の検証
const missingCredentials: string[] = [];
if (!GMAIL_CLIENT_ID) missingCredentials.push('GMAIL_CLIENT_ID is not set');
if (!GMAIL_CLIENT_SECRET) missingCredentials.push('GMAIL_CLIENT_SECRET is not set');
if (!GMAIL_REFRESH_TOKEN) missingCredentials.push('GMAIL_REFRESH_TOKEN is not set');
if (!GMAIL_USER) missingCredentials.push('GMAIL_USER is not set');

const isGmailConfigured = missingCredentials.length === 0;

if (!isGmailConfigured) {
  logger.warn('⚠️ Email service not fully configured:', missingCredentials);
}

// 既存インターフェースを維持（後方互換性）
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
  scheduledAt?: string; // Gmail APIでは直接サポートしないが、互換性のため保持
  tags?: { name: string; value: string }[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  trackingId?: string;
  scheduledAt?: string;
}

// 請求書送信用インターフェース
export interface SendInvoiceEmailOptions {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  companyInfo: CompanyInfo;
  totalAmount: number;
  dueDate?: string;
  pdfBuffer?: Buffer;
  ccEmails?: string[];
  bccEmails?: string[];
  customMessage?: string;
  replyTo?: string;
}

// 納品書送信用インターフェース
export interface SendDeliveryNoteEmailOptions {
  deliveryNoteId: string;
  deliveryNoteNumber: string;
  customerName: string;
  customerEmail: string;
  companyInfo: CompanyInfo;
  pdfBuffer?: Buffer;
  ccEmails?: string[];
  bccEmails?: string[];
  customMessage?: string;
  replyTo?: string;
}

// 領収書送信用インターフェース
export interface SendReceiptEmailOptions {
  receiptId: string;
  receiptNumber: string;
  customerName: string;
  customerEmail: string;
  companyInfo: CompanyInfo;
  totalAmount: number;
  pdfBuffer?: Buffer;
  ccEmails?: string[];
  bccEmails?: string[];
  customMessage?: string;
  replyTo?: string;
}

/**
 * OAuth2 クライアントを作成
 */
function createOAuth2Client(): OAuth2Client {
  const oauth2Client = new OAuth2Client(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN
  });

  return oauth2Client;
}

/**
 * Nodemailer トランスポーターを作成
 */
async function createTransporter(): Promise<nodemailer.Transporter> {
  try {
    const oauth2Client = createOAuth2Client();
    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: GMAIL_USER,
        clientId: GMAIL_CLIENT_ID,
        clientSecret: GMAIL_CLIENT_SECRET,
        refreshToken: GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token || undefined
      }
    } as any);

    // 接続確認
    await transporter.verify();
    logger.info('✅ Gmail transporter created successfully');

    return transporter;
  } catch (error) {
    logger.error('[GmailService] Failed to create transporter:', { error });
    throw error;
  }
}

/**
 * 日付をフォーマット
 */
function formatDate(dateString: string | Date | undefined): string {
  if (!dateString) return '未定';
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Tokyo'
  };
  return date.toLocaleDateString('ja-JP', options);
}

/**
 * 金額をフォーマット
 */
function formatPrice(price: number | undefined): string {
  if (!price && price !== 0) return '未定';
  return `¥${price.toLocaleString()}`;
}

/**
 * バウンスエラーを分類
 */
export function classifyBounce(error: any): { type: 'hard' | 'soft' | 'unknown'; reason: string } {
  const message = error?.response || error?.message || String(error);

  // ハードバウンス（永続的なエラー）
  if (
    message.includes('User unknown') ||
    message.includes('550') ||
    message.includes('mailbox not found') ||
    message.includes('does not exist') ||
    message.includes('Invalid recipient')
  ) {
    return { type: 'hard', reason: 'Invalid email address' };
  }

  // ソフトバウンス（一時的なエラー）
  if (
    message.includes('temporarily') ||
    message.includes('try again') ||
    message.includes('421') ||
    message.includes('450') ||
    message.includes('452')
  ) {
    return { type: 'soft', reason: 'Temporary delivery failure' };
  }

  return { type: 'unknown', reason: message };
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

    // Gmail設定のログ
    logger.info('Gmail configuration', {
      isConfigured: isGmailConfigured,
      hasClientId: !!GMAIL_CLIENT_ID,
      hasRefreshToken: !!GMAIL_REFRESH_TOKEN,
      gmailUser: GMAIL_USER,
      recipientEmail,
    });

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

    // Gmailが設定されていない場合はログに記録
    if (!isGmailConfigured) {
      logger.warn('Gmail not configured. Email would be sent to:', { recipientEmail });
      logger.warn('Subject:', { subject: htmlQuoteResult.subject });
      logger.warn('From:', { from: `${companyInfo.companyName || '会社名'} <${GMAIL_USER || 'noreply@example.com'}>` });
      if (attachPdf && pdfBuffer) {
        logger.warn('PDF attachment would be included:', { filename: `見積書_${quote.quoteNumber}.pdf` });
      }

      return {
        success: true,
        messageId: 'test-' + Date.now(),
        trackingId: htmlQuoteResult.trackingId,
        scheduledAt,
        error: 'Gmail not configured - email logged only',
      };
    }

    // 添付ファイルの準備
    const attachments: Mail.Attachment[] = [];
    if (attachPdf && pdfBuffer) {
      attachments.push({
        filename: `見積書_${quote.quoteNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    // トランスポーター作成
    const transporter = await createTransporter();

    // メール送信オプション
    const mailOptions: Mail.Options = {
      from: `${companyInfo.companyName || '会計自動化システム'} <${GMAIL_USER}>`,
      to: recipientEmail,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      replyTo: replyTo || companyInfo.email || GMAIL_USER,
      subject: htmlQuoteResult.subject,
      html: htmlQuoteResult.html,
      text: htmlQuoteResult.plainText,
      attachments,
      headers: {
        'X-Entity-Ref-ID': quote._id?.toString() || '',
        'X-Quote-Number': quote.quoteNumber,
        'X-Mailer': 'AI Accounting System - Gmail OAuth2',
      },
    };

    logger.info('Sending email with Gmail:', {
      from: mailOptions.from,
      to: recipientEmail,
      subject: htmlQuoteResult.subject,
      hasAttachments: attachments.length > 0,
      cc: ccEmails,
      bcc: bccEmails
    });

    // メール送信
    const info = await transporter.sendMail(mailOptions);

    logger.info('📧 Email sent successfully:', {
      messageId: info.messageId,
      response: info.response,
    });

    // イベント記録（Cloudflare Workers経由）
    await recordEmailEvent({
      messageId: info.messageId || '',
      quoteId: quote._id?.toString() || '',
      recipientEmail,
      subject: htmlQuoteResult.subject,
      trackingId: htmlQuoteResult.trackingId,
      sentAt: new Date().toISOString(),
    });

    return {
      success: true,
      messageId: info.messageId,
      trackingId: htmlQuoteResult.trackingId,
      scheduledAt,
    };
  } catch (error) {
    logger.error('Error sending quote email:', { error });

    // バウンス分類
    const bounceInfo = classifyBounce(error);
    logger.error('Bounce classification:', bounceInfo);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 請求書メールを送信
 */
export async function sendInvoiceEmail(
  options: SendInvoiceEmailOptions
): Promise<EmailSendResult> {
  try {
    const {
      invoiceId,
      invoiceNumber,
      customerName,
      customerEmail,
      companyInfo,
      totalAmount,
      dueDate,
      pdfBuffer,
      ccEmails = [],
      bccEmails = [],
      customMessage,
      replyTo,
    } = options;

    if (!isGmailConfigured) {
      logger.warn('Gmail not configured. Invoice email would be sent to:', { customerEmail });
      return {
        success: true,
        messageId: 'test-' + Date.now(),
        error: 'Gmail not configured - email logged only',
      };
    }

    const transporter = await createTransporter();
    const fromName = companyInfo.companyName || '会計自動化システム';

    // 件名
    const subject = `【請求書】${invoiceNumber} - ${fromName}`;

    // 本文
    const dueDateText = dueDate ? formatDate(dueDate) : '記載の期日';
    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${customerName} 様</h2>
        <p>いつもお世話になっております。${fromName}です。</p>
        <p>下記の通り、請求書をお送りいたします。</p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>請求書番号:</strong> ${invoiceNumber}</p>
          <p><strong>ご請求金額:</strong> ${formatPrice(totalAmount)}</p>
          <p><strong>お支払期限:</strong> ${dueDateText}</p>
        </div>

        <p>詳細は添付のPDFをご確認ください。</p>
        <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          ${fromName}<br>
          ${companyInfo.email || ''}<br>
          ${companyInfo.phone || ''}
        </p>
      </div>
    `;

    const attachments: Mail.Attachment[] = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `請求書_${invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const mailOptions: Mail.Options = {
      from: `${fromName} <${GMAIL_USER}>`,
      to: customerEmail,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      replyTo: replyTo || companyInfo.email || GMAIL_USER,
      subject,
      html,
      attachments,
      headers: {
        'X-Entity-Ref-ID': invoiceId,
        'X-Invoice-Number': invoiceNumber,
        'X-Mailer': 'AI Accounting System - Gmail OAuth2',
      },
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('📧 Invoice email sent successfully:', {
      messageId: info.messageId,
      invoiceNumber,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error('Error sending invoice email:', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 納品書メールを送信
 */
export async function sendDeliveryNoteEmail(
  options: SendDeliveryNoteEmailOptions
): Promise<EmailSendResult> {
  try {
    const {
      deliveryNoteId,
      deliveryNoteNumber,
      customerName,
      customerEmail,
      companyInfo,
      pdfBuffer,
      ccEmails = [],
      bccEmails = [],
      customMessage,
      replyTo,
    } = options;

    if (!isGmailConfigured) {
      logger.warn('Gmail not configured. Delivery note email would be sent to:', { customerEmail });
      return {
        success: true,
        messageId: 'test-' + Date.now(),
        error: 'Gmail not configured - email logged only',
      };
    }

    const transporter = await createTransporter();
    const fromName = companyInfo.companyName || '会計自動化システム';

    const subject = `【納品書】${deliveryNoteNumber} - ${fromName}`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${customerName} 様</h2>
        <p>いつもお世話になっております。${fromName}です。</p>
        <p>下記の通り、納品書をお送りいたします。</p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>納品書番号:</strong> ${deliveryNoteNumber}</p>
        </div>

        <p>詳細は添付のPDFをご確認ください。</p>
        <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          ${fromName}<br>
          ${companyInfo.email || ''}<br>
          ${companyInfo.phone || ''}
        </p>
      </div>
    `;

    const attachments: Mail.Attachment[] = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `納品書_${deliveryNoteNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const mailOptions: Mail.Options = {
      from: `${fromName} <${GMAIL_USER}>`,
      to: customerEmail,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      replyTo: replyTo || companyInfo.email || GMAIL_USER,
      subject,
      html,
      attachments,
      headers: {
        'X-Entity-Ref-ID': deliveryNoteId,
        'X-Delivery-Note-Number': deliveryNoteNumber,
        'X-Mailer': 'AI Accounting System - Gmail OAuth2',
      },
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('📧 Delivery note email sent successfully:', {
      messageId: info.messageId,
      deliveryNoteNumber,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error('Error sending delivery note email:', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 領収書メールを送信
 */
export async function sendReceiptEmail(
  options: SendReceiptEmailOptions
): Promise<EmailSendResult> {
  try {
    const {
      receiptId,
      receiptNumber,
      customerName,
      customerEmail,
      companyInfo,
      totalAmount,
      pdfBuffer,
      ccEmails = [],
      bccEmails = [],
      customMessage,
      replyTo,
    } = options;

    if (!isGmailConfigured) {
      logger.warn('Gmail not configured. Receipt email would be sent to:', { customerEmail });
      return {
        success: true,
        messageId: 'test-' + Date.now(),
        error: 'Gmail not configured - email logged only',
      };
    }

    const transporter = await createTransporter();
    const fromName = companyInfo.companyName || '会計自動化システム';

    const subject = `【領収書】${receiptNumber} - ${fromName}`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">${customerName} 様</h2>
        <p>いつもお世話になっております。${fromName}です。</p>
        <p>下記の通り、領収書をお送りいたします。</p>
        ${customMessage ? `<p>${customMessage}</p>` : ''}

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>領収書番号:</strong> ${receiptNumber}</p>
          <p><strong>領収金額:</strong> ${formatPrice(totalAmount)}</p>
        </div>

        <p>詳細は添付のPDFをご確認ください。</p>
        <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="color: #666; font-size: 12px;">
          ${fromName}<br>
          ${companyInfo.email || ''}<br>
          ${companyInfo.phone || ''}
        </p>
      </div>
    `;

    const attachments: Mail.Attachment[] = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `領収書_${receiptNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      });
    }

    const mailOptions: Mail.Options = {
      from: `${fromName} <${GMAIL_USER}>`,
      to: customerEmail,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      replyTo: replyTo || companyInfo.email || GMAIL_USER,
      subject,
      html,
      attachments,
      headers: {
        'X-Entity-Ref-ID': receiptId,
        'X-Receipt-Number': receiptNumber,
        'X-Mailer': 'AI Accounting System - Gmail OAuth2',
      },
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('📧 Receipt email sent successfully:', {
      messageId: info.messageId,
      receiptNumber,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error('Error sending receipt email:', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 汎用メール送信
 */
export async function sendGenericEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Mail.Attachment[];
  ccEmails?: string[];
  bccEmails?: string[];
  replyTo?: string;
  fromName?: string;
}): Promise<EmailSendResult> {
  try {
    const {
      to,
      subject,
      html,
      text,
      attachments = [],
      ccEmails = [],
      bccEmails = [],
      replyTo,
      fromName = '会計自動化システム',
    } = options;

    if (!isGmailConfigured) {
      logger.warn('Gmail not configured. Email would be sent to:', { to });
      return {
        success: true,
        messageId: 'test-' + Date.now(),
        error: 'Gmail not configured - email logged only',
      };
    }

    const transporter = await createTransporter();

    const mailOptions: Mail.Options = {
      from: `${fromName} <${GMAIL_USER}>`,
      to,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
      bcc: bccEmails.length > 0 ? bccEmails : undefined,
      replyTo: replyTo || GMAIL_USER,
      subject,
      html,
      text,
      attachments,
      headers: {
        'X-Mailer': 'AI Accounting System - Gmail OAuth2',
      },
    };

    const info = await transporter.sendMail(mailOptions);

    logger.info('📧 Generic email sent successfully:', {
      messageId: info.messageId,
      to,
      subject,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    logger.error('Error sending generic email:', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * バッチメール送信（複数の見積書を一括送信）
 * 注: Gmail APIにはバッチ送信がないため、順次送信
 */
export async function sendBatchQuoteEmails(
  emails: SendQuoteEmailOptions[]
): Promise<EmailSendResult[]> {
  const results: EmailSendResult[] = [];

  for (const emailOptions of emails) {
    // レート制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 500));

    const result = await sendQuoteEmail(emailOptions);
    results.push(result);
  }

  return results;
}

/**
 * メール送信イベントを記録（Cloudflare Workers経由）
 */
async function recordEmailEvent(event: {
  messageId: string;
  quoteId?: string;
  invoiceId?: string;
  deliveryNoteId?: string;
  receiptId?: string;
  recipientEmail: string;
  senderEmail?: string;
  subject?: string;
  trackingId?: string;
  sentAt: string;
}) {
  try {
    const trackingWorkerUrl = process.env.TRACKING_WORKER_URL;

    if (!trackingWorkerUrl) {
      logger.warn('TRACKING_WORKER_URL not configured - skipping remote tracking');
      logger.info('Email event recorded locally:', {
        messageId: event.messageId,
        quoteId: event.quoteId,
        recipientEmail: event.recipientEmail,
        trackingId: event.trackingId,
        sentAt: event.sentAt
      });
      return;
    }

    // Cloudflare Workers に送信記録を登録
    const response = await fetch(`${trackingWorkerUrl}/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        trackingId: event.trackingId,
        messageId: event.messageId,
        quoteId: event.quoteId,
        invoiceId: event.invoiceId,
        deliveryNoteId: event.deliveryNoteId,
        receiptId: event.receiptId,
        recipientEmail: event.recipientEmail,
        senderEmail: event.senderEmail || GMAIL_USER,
        subject: event.subject,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to record email event to Cloudflare:', {
        status: response.status,
        error: errorText,
      });
    } else {
      const result = await response.json();
      logger.info('Email event recorded to Cloudflare:', {
        id: result.id,
        trackingId: event.trackingId,
        recipientEmail: event.recipientEmail,
      });
    }
  } catch (error) {
    logger.error('Error recording email event:', { error });
  }
}

/**
 * Gmail設定状態を取得
 */
export function getGmailConfigStatus(): {
  isConfigured: boolean;
  missingCredentials: string[];
  gmailUser?: string;
} {
  return {
    isConfigured: isGmailConfigured,
    missingCredentials,
    gmailUser: GMAIL_USER,
  };
}

/**
 * メール送信統計を取得（Cloudflare Workers経由）
 */
export async function getEmailStats(options: {
  quoteId?: string;
  invoiceId?: string;
  trackingId?: string;
}): Promise<{
  sent: number;
  opened: number;
  clicked: number;
  lastOpenedAt?: string;
  lastClickedAt?: string;
  deviceBreakdown: { device_type: string; count: number }[];
  clientBreakdown: { email_client: string; count: number }[];
}> {
  try {
    const trackingWorkerUrl = process.env.TRACKING_WORKER_URL;

    if (!trackingWorkerUrl) {
      logger.warn('TRACKING_WORKER_URL not configured - returning empty stats');
      return {
        sent: 0,
        opened: 0,
        clicked: 0,
        deviceBreakdown: [],
        clientBreakdown: [],
      };
    }

    // クエリパラメータを構築
    const params = new URLSearchParams();
    if (options.quoteId) params.set('quoteId', options.quoteId);
    if (options.invoiceId) params.set('invoiceId', options.invoiceId);
    if (options.trackingId) params.set('id', options.trackingId);

    const response = await fetch(`${trackingWorkerUrl}/stats?${params.toString()}`);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Failed to fetch email stats from Cloudflare:', {
        status: response.status,
        error: errorText,
      });
      return {
        sent: 0,
        opened: 0,
        clicked: 0,
        deviceBreakdown: [],
        clientBreakdown: [],
      };
    }

    const data = await response.json() as {
      sendRecord?: {
        open_count: number;
        click_count: number;
        last_opened_at?: string;
        last_clicked_at?: string;
      };
      events: { event_type: string; count: number }[];
      deviceBreakdown: { device_type: string; count: number }[];
      clientBreakdown: { email_client: string; count: number }[];
    };

    // イベントから統計を抽出
    const openEvent = data.events.find(e => e.event_type === 'open');
    const clickEvent = data.events.find(e => e.event_type === 'click');

    return {
      sent: data.sendRecord ? 1 : 0,
      opened: data.sendRecord?.open_count || openEvent?.count || 0,
      clicked: data.sendRecord?.click_count || clickEvent?.count || 0,
      lastOpenedAt: data.sendRecord?.last_opened_at,
      lastClickedAt: data.sendRecord?.last_clicked_at,
      deviceBreakdown: data.deviceBreakdown || [],
      clientBreakdown: data.clientBreakdown || [],
    };
  } catch (error) {
    logger.error('Error fetching email stats:', { error });
    return {
      sent: 0,
      opened: 0,
      clicked: 0,
      deviceBreakdown: [],
      clientBreakdown: [],
    };
  }
}
