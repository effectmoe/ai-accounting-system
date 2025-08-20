import { Quote } from '@/types';
import { generateCompactQuoteHTML } from './pdf-quote-html-generator';
import { logger } from '@/lib/logger';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { CompanyInfo } from '@/types/collections';

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
    const htmlContent = generateCompactQuoteHTML(quote, companyInfo, showDescriptions);
    
    // Vercel環境での実行
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    if (isProduction) {
      // 本番環境: @sparticuz/chromiumを使用
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
      });
    } else {
      // 開発環境: ローカルのPuppeteerを使用
      const puppeteerLocal = await import('puppeteer');
      browser = await puppeteerLocal.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    const page = await browser.newPage();
    
    // HTMLを設定
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    // A4サイズでPDFを生成
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
    
    await browser.close();
    
    logger.debug('Quote PDF generated successfully');
    return pdfBuffer;
    
  } catch (error) {
    logger.error('Failed to convert quote HTML to PDF:', error);
    
    if (browser) {
      await browser.close();
    }
    
    // フォールバック: HTMLをそのまま返す
    logger.warn('Falling back to HTML content for quote PDF');
    const htmlContent = generateCompactQuoteHTML(quote, companyInfo, showDescriptions);
    return Buffer.from(htmlContent, 'utf-8');
  }
}