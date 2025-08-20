import { Quote } from '@/types';
import { generateCompactQuoteHTML } from './pdf-quote-html-generator';
import { logger } from '@/lib/logger';
import { CompanyInfo } from '@/types/collections';
import { launchPuppeteer } from './puppeteer-config';

/**
 * サーバーサイドで見積書HTMLをPDFに変換（Vercel対応版）
 * 領収書のconvertReceiptHTMLtoPDFと同じパターンで実装
 */
export async function convertQuoteHTMLtoPDF(
  quote: Quote, 
  companyInfo: CompanyInfo,
  showDescriptions: boolean = true
): Promise<Buffer> {
  let browser = null;
  
  try {
    logger.debug('Converting quote HTML to PDF on server side');
    logger.debug('Quote number:', quote.quoteNumber);
    
    // HTMLコンテンツを生成（プレビューと同じ関数を使用）
    // デバッグ: PDF変換時のshowDescriptionsパラメータを確認
    console.log('[convertQuoteHTMLtoPDF] showDescriptions parameter:', showDescriptions);
    const htmlContent = generateCompactQuoteHTML(quote, companyInfo, showDescriptions);
    
    // デバッグ: 生成されたHTMLの一部を確認（商品説明と備考を中心に）
    console.log('[convertQuoteHTMLtoPDF] HTML contains item descriptions:', htmlContent.includes('item-description'));
    console.log('[convertQuoteHTMLtoPDF] HTML contains notes content:', htmlContent.includes('notes-content'));
    
    // HTMLから商品説明部分を抽出して確認
    const descriptionMatch = htmlContent.match(/<div class="item-description">([^<]*)</);
    if (descriptionMatch) {
      console.log('[convertQuoteHTMLtoPDF] First item description found:', descriptionMatch[1]);
    }
    
    // HTMLから備考部分を抽出して確認  
    const notesMatch = htmlContent.match(/<div class="notes-content">([^<]*)</);
    if (notesMatch) {
      console.log('[convertQuoteHTMLtoPDF] Notes content found:', notesMatch[1].substring(0, 100) + '...');
    }
    
    // 環境判定
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    // Puppeteerを起動
    console.log('[convertQuoteHTMLtoPDF] Starting Puppeteer...');
    browser = await launchPuppeteer();
    console.log('[convertQuoteHTMLtoPDF] Browser launched successfully');
    
    const page = await browser.newPage();
    console.log('[convertQuoteHTMLtoPDF] New page created');
    
    // デバッグ: HTMLコンテンツを保存（開発環境のみ）
    if (!isProduction) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const debugDir = path.join(process.cwd(), 'debug');
        
        if (!fs.existsSync(debugDir)) {
          fs.mkdirSync(debugDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const htmlDebugPath = path.join(debugDir, `quote-${quote.quoteNumber}-${timestamp}.html`);
        fs.writeFileSync(htmlDebugPath, htmlContent, 'utf-8');
        console.log('[Debug] HTML saved to:', htmlDebugPath);
      } catch (fsError) {
        console.warn('[Debug] HTML save failed:', fsError);
      }
    }
    
    // HTMLを設定（領収書と完全に同じ設定）
    console.log('[convertQuoteHTMLtoPDF] Setting HTML content with waitUntil: networkidle0...');
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',  // 領収書と完全に同じ設定
      timeout: 20000
    });
    console.log('[convertQuoteHTMLtoPDF] HTML content set successfully');
    
    // ページの内容を確認
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('[convertQuoteHTMLtoPDF] Page body length:', bodyHTML.length);
    console.log('[convertQuoteHTMLtoPDF] Page contains item-description:', bodyHTML.includes('item-description'));
    console.log('[convertQuoteHTMLtoPDF] Page contains ■:', bodyHTML.includes('■'));
    
    // デバッグ: PDF生成前にスクリーンショットを撮影（開発環境のみ）
    if (!isProduction) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const debugDir = path.join(process.cwd(), 'debug');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshotPath = path.join(debugDir, `quote-${quote.quoteNumber}-${timestamp}.png`);
        
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: true,
          type: 'png'
        });
        console.log('[Debug] Screenshot saved to:', screenshotPath);
        
        // DOM要素の存在確認
        const itemElements = await page.$$eval('.item-description', elements => 
          elements.map(el => ({ text: el.textContent, visible: el.offsetHeight > 0 }))
        );
        console.log('[Debug] Item descriptions found:', itemElements.length, itemElements);
        
        const notesElement = await page.$eval('.notes-content', el => ({
          text: el.textContent,
          html: el.innerHTML,
          visible: el.offsetHeight > 0
        })).catch(() => null);
        console.log('[Debug] Notes content:', notesElement);
        
      } catch (debugError) {
        console.warn('[Debug] Screenshot failed:', debugError);
      }
    }
    
    // A4サイズでPDFを生成（領収書と完全に同じ設定）
    console.log('[convertQuoteHTMLtoPDF] Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });
    
    console.log('[convertQuoteHTMLtoPDF] PDF generated, buffer size:', pdfBuffer.length, 'bytes');
    
    // PDFバッファの最初の数バイトを確認（PDFは%PDFで始まる）
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    console.log('[convertQuoteHTMLtoPDF] PDF header check:', pdfHeader, '(should be %PDF-)');
    
    if (!pdfHeader.startsWith('%PDF')) {
      console.error('[convertQuoteHTMLtoPDF] WARNING: Generated buffer does not appear to be a valid PDF');
      console.error('[convertQuoteHTMLtoPDF] First 100 bytes:', pdfBuffer.slice(0, 100).toString('ascii'));
    }
    
    await browser.close();
    console.log('[convertQuoteHTMLtoPDF] Browser closed');
    
    // デバッグ: 生成されたPDFを保存してサイズを確認（開発環境のみ）
    if (!isProduction) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const debugDir = path.join(process.cwd(), 'debug');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const pdfDebugPath = path.join(debugDir, `quote-${quote.quoteNumber}-${timestamp}.pdf`);
        
        fs.writeFileSync(pdfDebugPath, pdfBuffer);
        console.log('[Debug] PDF saved to:', pdfDebugPath, 'Size:', pdfBuffer.length, 'bytes');
      } catch (fsError) {
        console.warn('[Debug] PDF save failed:', fsError);
      }
    }
    
    logger.debug('Quote PDF generated successfully');
    return pdfBuffer;
    
  } catch (error) {
    logger.error('Failed to convert quote HTML to PDF:', error);
    console.error('[convertQuoteHTMLtoPDF] ERROR Details:', {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    if (browser) {
      await browser.close();
    }
    
    // エラーを再スローして、呼び出し元でエラーハンドリング
    throw error;
  }
}