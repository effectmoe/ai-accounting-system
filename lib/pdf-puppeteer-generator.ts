import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { generateInvoiceHTML } from './pdf-html-generator';

// Vercel環境用の設定
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

export async function generateInvoicePDFWithPuppeteer(invoice: any, companyInfo: any): Promise<Buffer> {
  let browser = null;
  
  try {
    // 開発環境とVercel環境で異なる設定
    if (process.env.NODE_ENV === 'development') {
      // ローカル開発環境
      const puppeteerLocal = await import('puppeteer');
      browser = await puppeteerLocal.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    } else {
      // Vercel環境
      browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
      });
    }

    const page = await browser.newPage();
    
    // HTMLコンテンツを生成
    const htmlContent = generateInvoiceHTML(invoice, companyInfo);
    
    // HTMLを設定
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    // PDFを生成（日本語も正しく表示される）
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });
    
    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}