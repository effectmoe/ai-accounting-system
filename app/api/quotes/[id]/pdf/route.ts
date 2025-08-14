import { NextRequest, NextResponse } from 'next/server';
import { QuoteService } from '@/services/quote.service';
import { CompanyInfoService } from '@/services/company-info.service';
import { generateCompactQuoteHTML, generateQuoteFilename, generateSafeQuoteFilename } from '@/lib/pdf-quote-html-generator';

import { logger } from '@/lib/logger';
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 見積書を取得
    const quoteService = new QuoteService();
    const quote = await quoteService.getQuote(params.id);
    
    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // 会社情報を取得
    const companyInfoService = new CompanyInfoService();
    const companyInfo = await companyInfoService.getCompanyInfo();

    // URLクエリパラメータでダウンロードモードを判定
    const url = new URL(request.url);
    const isDownload = url.searchParams.get('download') === 'true';
    const isPrintMode = url.searchParams.get('print') === 'true';
    const showDescriptions = url.searchParams.get('showDescriptions') !== 'false'; // デフォルトは表示

    // HTMLを生成前の詳細ログ追加
    logger.debug('=== PDF生成時データ構造調査 ===');
    logger.debug('Quote Number:', quote.quoteNumber);
    logger.debug('Quote Customer Data:', JSON.stringify({
      customer: quote.customer,
      customerSnapshot: quote.customerSnapshot
    }, null, 2));
    logger.debug('Quote Items Data:', JSON.stringify(quote.items?.map((item: any, index: number) => ({
      index,
      itemName: item.itemName,
      description: item.description,
      notes: item.notes,
      allKeys: Object.keys(item)
    })), null, 2));
    
    // HTMLを生成（コンパクト版を使用）
    logger.debug('Generating compact quote HTML for:', quote.quoteNumber);
    logger.debug('Show descriptions:', showDescriptions);
    const htmlContent = generateCompactQuoteHTML(quote, companyInfo, showDescriptions);
    
    // 新しい命名規則でファイル名を生成: 発行日_帳表名_顧客名
    const filename = generateQuoteFilename(quote);
    const safeFilename = generateSafeQuoteFilename(quote);
    logger.debug('Generated filename:', filename);
    logger.debug('Safe filename for header:', safeFilename);
    
    // 日本語ファイル名をRFC 5987準拠でエンコード
    const encodedFilename = encodeURIComponent(filename);
    
    // HTMLを返し、ブラウザの印刷機能を使ってPDFに変換
    if (isPrintMode) {
      // 印刷モード：自動的に印刷ダイアログを開くHTMLを返す
      const printHtml = `
        ${htmlContent}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          };
        </script>
      `;
      
      return new NextResponse(printHtml, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }
    
    // 通常モード：HTMLを返す
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': isDownload 
          ? `attachment; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`
          : `inline; filename="${safeFilename.replace('.pdf', '.html')}"; filename*=UTF-8''${encodedFilename.replace('.pdf', '.html')}`,
      },
    });
  } catch (error) {
    logger.error('Quote PDF generation error:', error);
    logger.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // 詳細なエラー情報を返す
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to generate quote', 
          message: error.message,
          type: error.constructor.name
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}