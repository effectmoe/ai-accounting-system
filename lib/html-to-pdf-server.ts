import { Receipt } from '@/types/receipt';
import { generateReceiptHTML } from './receipt-html-generator';
import { logger } from '@/lib/logger';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

/**
 * サーバーサイドでHTMLをPDFに変換（Vercel対応版）
 */
export async function convertReceiptHTMLtoPDF(receipt: Receipt): Promise<Buffer> {
  let browser = null;
  
  try {
    logger.debug('Converting receipt HTML to PDF on server side');
    
    // HTMLコンテンツを生成
    const htmlContent = generateReceiptHTML(receipt);
    
    // Vercel環境での実行
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    
    if (isProduction) {
      // 本番環境: @sparticuz/chromiumを使用
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
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
    
    logger.debug('PDF generated successfully');
    return pdfBuffer;
    
  } catch (error) {
    logger.error('Failed to convert HTML to PDF:', error);
    
    if (browser) {
      await browser.close();
    }
    
    // フォールバック: HTMLをそのまま返す
    const htmlContent = generateReceiptHTML(receipt);
    return Buffer.from(htmlContent, 'utf-8');
  }
}