import { Receipt } from '@/types/receipt';
import { generateReceiptHTML } from './receipt-html-generator';
import { logger } from '@/lib/logger';
import { launchPuppeteerSimple } from './puppeteer-simple';

/**
 * サーバーサイドでHTMLをPDFに変換（Vercel対応版）
 */
export async function convertReceiptHTMLtoPDF(receipt: Receipt): Promise<Buffer> {
  let browser = null;
  
  try {
    logger.debug('Converting receipt HTML to PDF on server side');
    
    // HTMLコンテンツを生成
    const htmlContent = generateReceiptHTML(receipt);
    
    // Puppeteerを起動（シンプル版）
    browser = await launchPuppeteerSimple();
    
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