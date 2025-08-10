import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { QuoteService } from '@/services/quote.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { Resend } from 'resend';
import { generateHtmlQuote } from '@/lib/html-quote-generator';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { recipientEmail, recipientName, customMessage } = await request.json();

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'Recipient email is required' },
        { status: 400 }
      );
    }

    // サービス経由で見積書を取得
    const quoteService = new QuoteService();
    const quote = await quoteService.getQuote(params.id);

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    // HTMLコンテンツ生成
    const htmlContent = await generateHtmlQuote({
      quote,
      companyInfo: companyInfo || {
        companyName: '株式会社サンプル',
        email: 'info@example.com',
        phone: '03-1234-5678',
        postalCode: '100-0001',
        prefecture: '東京都',
        city: '千代田区',
        address1: '1-2-3',
        website: 'https://example.com',
        logoUrl: '',
        registrationNumber: '',
      },
      recipientName,
      customMessage,
      useWebLayout: true,
    });

    // Resendでメール送信（generateHtmlQuoteが既にHTMLを生成済み）
    const emailResult = await resend.emails.send({
      from: `${companyInfo?.companyName || 'AAM Accounting'} <noreply@accounting-automation.vercel.app>`,
      to: recipientEmail,
      subject: htmlContent.subject || `お見積書 - ${quote.quoteNumber}`,
      html: htmlContent.html,
      text: htmlContent.plainText,
      attachments: [], // 必要に応じてPDF添付
    });

    // 送信履歴を記録（サービスに移すべきですが、今は直接実装）
    // TODO: EmailEventService を作成して移動

    logger.info(`Quote ${quote.quoteNumber} sent to ${recipientEmail}`);

    return NextResponse.json({
      success: true,
      messageId: emailResult.data?.id,
      sentAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error sending quote email:', error);
    
    return NextResponse.json(
      { error: 'Failed to send quote email' },
      { status: 500 }
    );
  }
}