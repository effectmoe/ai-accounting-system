import { NextResponse } from 'next/server';
import { launchPuppeteerSimple } from '@/lib/puppeteer-simple';
import { logger } from '@/lib/logger';

export async function GET() {
  let browser;
  try {
    logger.info('[Test PDF] Starting simple PDF generation test');
    
    // シンプルなHTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; padding: 20px; }
          h1 { color: #333; }
        </style>
      </head>
      <body>
        <h1>PDFテスト</h1>
        <p>これはテストPDFです。</p>
        <p>日本語も正しく表示されます。</p>
        <p>Generated at: ${new Date().toISOString()}</p>
      </body>
      </html>
    `;
    
    // Puppeteerでブラウザを起動
    browser = await launchPuppeteerSimple();
    const page = await browser.newPage();
    
    // HTMLを設定
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // PDFを生成
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });
    
    await browser.close();
    
    logger.info(`[Test PDF] Generated PDF size: ${pdfBuffer.length} bytes`);
    
    // Bufferに変換
    const buffer = Buffer.isBuffer(pdfBuffer) 
      ? pdfBuffer 
      : Buffer.from(pdfBuffer);
    
    // PDFヘッダーを確認
    const header = buffer.slice(0, 5).toString('ascii');
    logger.info(`[Test PDF] PDF header: ${header}`);
    
    if (!header.startsWith('%PDF')) {
      throw new Error('Generated content is not a valid PDF');
    }
    
    // PDFを返す
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': 'inline; filename="test.pdf"',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    logger.error('[Test PDF] Error:', error);
    
    if (browser) {
      await browser.close().catch(() => {});
    }
    
    return NextResponse.json(
      { 
        error: 'PDF generation failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}