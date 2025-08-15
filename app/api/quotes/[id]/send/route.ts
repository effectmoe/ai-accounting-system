import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { QuoteService } from '@/services/quote.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { Resend } from 'resend';
import { generateHtmlQuote } from '@/lib/html-quote-generator';

const resendApiKey = process.env.RESEND_API_KEY;
console.log('[Send Quote API] RESEND_API_KEY exists:', !!resendApiKey);
console.log('[Send Quote API] RESEND_API_KEY prefix:', resendApiKey?.substring(0, 10) + '...');
console.log('[Send Quote API] RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);

// Resend API キーの検証
if (!resendApiKey || resendApiKey === 'undefined' || resendApiKey.length < 10) {
  console.error('[Send Quote API] Invalid RESEND_API_KEY:', resendApiKey);
}

const resend = new Resend(resendApiKey);

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Send Quote API] Request started for quoteId:', params.id);
    const requestBody = await request.json();
    console.log('[Send Quote API] Received data:', JSON.stringify(requestBody, null, 2));
    
    const { recipientEmail, recipientName, customMessage } = requestBody;

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

    // Resend APIキーの確認
    if (!resendApiKey) {
      console.error('[Send Quote API] RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // Resendでメール送信（generateHtmlQuoteが既にHTMLを生成済み）
    console.log('[Send Quote API] Sending email with Resend...');
    
    // Resendが推奨するfromアドレスフォーマット
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'accounting@effect.moe';
    const fromName = companyInfo?.companyName || 'AAM Accounting';
    const from = `${fromName} <${fromEmail}>`;
    
    console.log('[Send Quote API] Email details:', {
      from,
      to: recipientEmail,
      subject: htmlContent.subject || `お見積書 - ${quote.quoteNumber}`,
    });
    
    let emailResult;
    try {
      emailResult = await resend.emails.send({
        from,
        to: recipientEmail,
        subject: htmlContent.subject || `お見積書 - ${quote.quoteNumber}`,
        html: htmlContent.html,
        text: htmlContent.plainText,
        attachments: [], // 必要に応じてPDF添付
      });
      
      console.log('[Send Quote API] Email result:', emailResult);
      
      if (!emailResult) {
        console.error('[Send Quote API] No response from Resend API');
        throw new Error('No response from email service');
      }
      
      if (emailResult.error) {
        console.error('[Send Quote API] Resend error:', emailResult.error);
        throw new Error(emailResult.error.message || 'Failed to send email');
      }
      
      if (!emailResult.data) {
        console.error('[Send Quote API] No data in Resend response');
        throw new Error('Invalid response from email service');
      }
    } catch (resendError) {
      console.error('[Send Quote API] Resend send error:', resendError);
      // エラーメッセージを詳細化
      const errorMessage = resendError instanceof Error ? resendError.message : 'Unknown error';
      console.error('[Send Quote API] Error details:', {
        message: errorMessage,
        stack: resendError instanceof Error ? resendError.stack : undefined,
      });
      
      // Resend API キーが無効な場合の特別処理
      if (errorMessage.includes('API key') || errorMessage.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'メール送信サービスの認証に失敗しました。管理者にお問い合わせください。' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `メール送信に失敗しました: ${errorMessage}` },
        { status: 500 }
      );
    }

    // 送信履歴を記録（サービスに移すべきですが、今は直接実装）
    // TODO: EmailEventService を作成して移動

    logger.info(`Quote ${quote.quoteNumber} sent to ${recipientEmail}`);

    return NextResponse.json({
      success: true,
      messageId: emailResult.data?.id || 'unknown',
      sentAt: new Date().toISOString(),
    });

  } catch (error) {
    logger.error('Error sending quote email:', error);
    console.error('[Send Quote API] Unexpected error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { error: `見積書の送信に失敗しました: ${errorMessage}` },
      { status: 500 }
    );
  }
}