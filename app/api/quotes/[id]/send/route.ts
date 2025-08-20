import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { QuoteService } from '@/services/quote.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { Resend } from 'resend';
import { generateSimpleHtmlQuote } from '@/lib/html-quote-generator';
import { getSuggestedOptionsFromDB, generateServerHtmlQuote } from '@/lib/html-quote-generator-server';
import { convertQuoteHTMLtoPDF } from '@/lib/quote-html-to-pdf-server';
import { generateCompactQuoteHTML } from '@/lib/pdf-quote-html-generator';

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

    // Resend APIキーの確認
    if (!resendApiKey) {
      console.error('[Send Quote API] RESEND_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Email service is not configured. Please contact administrator.' },
        { status: 500 }
      );
    }

    // 添付ファイルの準備
    const attachments = [];
    
    // PDFを生成（プレビューと同じ形式）
    logger.debug('Generating quote PDF for email attachment');
    logger.debug('Converting quote HTML to PDF for email attachment (same format as PDF print button)');
    
    try {
      // HTMLをPDFに変換（Puppeteerを使用）- 領収書と同じパターン
      // showDescriptionsを明示的にtrueに設定してPDF生成
      console.log('[Send Quote] START - Generating PDF with showDescriptions=true');
      console.log('[Send Quote] Quote Number:', quote.quoteNumber);
      console.log('[Send Quote] Quote ID:', quote._id);
      console.log('[Send Quote] Quote Items Count:', quote.items?.length || 0);
      console.log('[Send Quote] Quote Notes Length:', quote.notes?.length || 0);
      console.log('[Send Quote] Company Info exists:', !!companyInfo);
      
      const pdfStartTime = Date.now();
      const pdfBuffer = await convertQuoteHTMLtoPDF(quote, companyInfo || {}, true);
      const pdfGenerationTime = Date.now() - pdfStartTime;
      
      console.log('[Send Quote] PDF generation completed in', pdfGenerationTime, 'ms');
      console.log('[Send Quote] PDF Buffer size:', pdfBuffer.length, 'bytes');
      
      const pdfBase64 = pdfBuffer.toString('base64');
      console.log('[Send Quote] Base64 encoded, length:', pdfBase64.length);
      
      // PDFファイルとして添付
      attachments.push({
        filename: `quote_${quote.quoteNumber}.pdf`,
        content: pdfBase64,
        contentType: 'application/pdf',
      });
      
      console.log('[Send Quote] PDF attached to email');
      logger.debug('Quote PDF generated successfully for email attachment');
    } catch (error) {
      logger.error('Failed to generate quote PDF:', error);
      console.error('[Send Quote] PDF generation error details:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error('PDF生成に失敗しました');
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
      // メール送信データを構築（領収書と同じ構造）
      const emailData = {
        from,
        to: recipientEmail,
        subject: htmlContent.subject || `お見積書 - ${quote.quoteNumber}`,
        html: htmlContent.html,
        text: htmlContent.plainText,
        ...(attachments.length > 0 && {
          attachments: attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            content_type: att.contentType, // Resend APIの仕様に合わせて修正
          }))
        }),
      };
      
      emailResult = await resend.emails.send(emailData);
      
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