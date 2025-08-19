import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { generateReceiptHTML } from '@/lib/receipt-pdf-generator';
import puppeteer from 'puppeteer';
import { logger } from '@/lib/logger';

const receiptService = new ReceiptService();

/**
 * GET /api/receipts/[id]/pdf - 領収書のPDFを生成
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  let browser;
  
  try {
    // 領収書を取得
    const receipt = await receiptService.getReceipt(params.id);
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // HTMLを生成
    const html = generateReceiptHTML(receipt);

    // Puppeteerでブラウザを起動
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // HTMLをセット
    await page.setContent(html, {
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

    // PDFファイル名を設定
    const filename = `receipt_${receipt.receiptNumber}.pdf`;

    // PDFを返す
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error('Error generating receipt PDF:', error);
    
    if (browser) {
      await browser.close();
    }
    
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}