import { NextRequest, NextResponse } from 'next/server';
import { generateHtmlQuote } from '@/lib/html-quote-generator';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      quote,
      companyInfo,
      recipientName,
      customMessage,
      suggestedOptions,
      tooltips,
      productLinks,
      includeTracking,
      useWebLayout = true, // プレビューではデフォルトでWeb最適化レイアウトを使用
    } = body;

    logger.debug('Preview request received:', {
      hasQuote: !!quote,
      hasCompanyInfo: !!companyInfo,
      quoteNumber: quote?.quoteNumber,
      companyName: companyInfo?.companyName || companyInfo?.name,
      suggestedOptionsCount: suggestedOptions?.length || 0,
      suggestedOptions: suggestedOptions,
    });

    // デバッグ用: シンプルなHTMLを返して確認
    const debugMode = false; // 本番環境では false に設定
    if (debugMode) {
      const simpleHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>見積書プレビュー</title>
        </head>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1>見積書 #${quote?.quoteNumber || 'N/A'}</h1>
          <p>顧客名: ${quote?.customerName || 'N/A'}</p>
          <p>会社名: ${companyInfo?.companyName || companyInfo?.name || 'N/A'}</p>
          <p>合計金額: ¥${quote?.totalAmount?.toLocaleString() || 'N/A'}</p>
          <hr>
          <h2>見積項目</h2>
          <ul>
            ${quote?.items?.map(item => `
              <li>${item.itemName || item.description || 'N/A'} - ¥${item.amount?.toLocaleString() || 'N/A'}</li>
            `).join('') || '<li>項目なし</li>'}
          </ul>
        </body>
        </html>
      `;
      
      return NextResponse.json({
        html: simpleHtml,
        plainText: 'Simple preview',
        subject: 'Test Subject',
        previewText: 'Test Preview',
      });
    }

    // Map配列をMapオブジェクトに変換
    const tooltipsMap = new Map(tooltips || []);
    const productLinksMap = new Map(productLinks || []);

    // HTML生成 - Web最適化レイアウト使用
    const result = await generateHtmlQuote({
      quote,
      companyInfo,
      recipientName,
      customMessage,
      includeTracking,
      includeInteractiveElements: true,
      suggestedOptions,
      tooltips: tooltipsMap,
      productLinks: productLinksMap,
      useWebLayout, // Web最適化レイアウトフラグを渡す
    });

    logger.debug('HTML generated successfully, length:', result.html?.length);

    return NextResponse.json({
      html: result.html,
      plainText: result.plainText,
      subject: result.subject,
      previewText: result.previewText,
    });
  } catch (error) {
    logger.error('Error generating HTML quote preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate preview',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}