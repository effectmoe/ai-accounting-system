import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { QuoteService } from '@/services/quote.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { sendGenericEmail, getGmailConfigStatus } from '@/lib/gmail-service';
import { generateSimpleHtmlQuote } from '@/lib/html-quote-generator';
import { getSuggestedOptionsFromDB, generateServerHtmlQuote } from '@/lib/html-quote-generator-server';

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

    // HTMLコンテンツ生成（DBからおすすめオプションを取得するサーバーサイド関数を使用）
    const htmlContent = await generateServerHtmlQuote({
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
    });

    // Gmail OAuth2でメール送信
    console.log('[Send Quote API] Sending email with Gmail OAuth2...');

    // Gmail設定状態を確認
    const gmailStatus = getGmailConfigStatus();
    console.log('[Send Quote API] Gmail config status:', gmailStatus);

    const fromName = companyInfo?.companyName || 'AAM Accounting';

    console.log('[Send Quote API] Email details:', {
      fromName,
      to: recipientEmail,
      subject: htmlContent.subject || `お見積書 - ${quote.quoteNumber}`,
    });

    // Gmail サービスでメール送信
    const emailResult = await sendGenericEmail({
      to: recipientEmail,
      subject: htmlContent.subject || `お見積書 - ${quote.quoteNumber}`,
      html: htmlContent.html,
      text: htmlContent.plainText,
      fromName,
    });

    console.log('[Send Quote API] Email result:', emailResult);

    if (!emailResult.success) {
      console.error('[Send Quote API] Gmail send error:', emailResult.error);

      // 認証エラーの特別処理
      if (emailResult.error?.includes('OAuth') || emailResult.error?.includes('token')) {
        return NextResponse.json(
          { error: 'メール送信サービスの認証に失敗しました。管理者にお問い合わせください。' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: `メール送信に失敗しました: ${emailResult.error}` },
        { status: 500 }
      );
    }

    // 送信履歴を記録（サービスに移すべきですが、今は直接実装）
    // TODO: EmailEventService を作成して移動

    logger.info(`Quote ${quote.quoteNumber} sent to ${recipientEmail}`);

    return NextResponse.json({
      success: true,
      messageId: emailResult.messageId || 'unknown',
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