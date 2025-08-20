import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { generateReceiptHTML } from './receipt-html-generator';
import { logger } from '@/lib/logger';
import { Receipt } from '@/types/receipt';

// Vercel環境用の設定
chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

/**
 * Puppeteerを使用して領収書のPDFを生成する
 */
export async function generateReceiptPDFWithPuppeteer(receipt: Receipt): Promise<Buffer> {
  let browser = null;
  
  try {
    logger.debug('Starting receipt PDF generation with Puppeteer for:', receipt.receiptNumber);
    
    // 開発環境とVercel環境で異なる設定
    if (process.env.NODE_ENV === 'development') {
      // ローカル開発環境
      const puppeteerLocal = await import('puppeteer');
      browser = await puppeteerLocal.default.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    } else {
      // Vercel環境
      browser = await puppeteer.launch({
        args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
    }

    const page = await browser.newPage();
    
    // HTMLコンテンツを生成
    const htmlContent = generateReceiptHTML(receipt);
    
    // HTMLを設定
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });
    
    // PDFを生成（日本語フォント対応）
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      preferCSSPageSize: true,
    });
    
    logger.debug('Receipt PDF generated successfully, size:', pdfBuffer.length);
    return Buffer.from(pdfBuffer);
    
  } catch (error) {
    logger.error('Error generating receipt PDF with Puppeteer:', error);
    throw new Error(`PDF生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * jsPDFを使用した簡易版PDF生成（フォールバック用）
 */
export async function generateReceiptPDFWithJsPDF(receipt: Receipt): Promise<Buffer> {
  try {
    logger.debug('Generating receipt PDF with jsPDF for:', receipt.receiptNumber);
    
    const { jsPDF } = await import('jspdf');
    
    // A4サイズのPDFを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // 基本設定
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let currentY = margin;
    
    // ヘッダー
    doc.setFontSize(24);
    doc.text('領収書', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;
    
    // 領収書番号
    doc.setFontSize(12);
    doc.text(`No. ${receipt.receiptNumber}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    // 発行日
    const issueDate = new Date(receipt.issueDate).toLocaleDateString('ja-JP');
    doc.setFontSize(10);
    doc.text(`発行日: ${issueDate}`, margin, currentY);
    currentY += 15;
    
    // 顧客名
    doc.setFontSize(14);
    doc.text(`${receipt.customerName || '様'}`, margin, currentY);
    currentY += 15;
    
    // 金額
    doc.setFontSize(18);
    const totalAmount = (receipt.totalAmount ?? 0).toLocaleString('ja-JP');
    doc.text(`領収金額: ¥${totalAmount}`, margin, currentY);
    currentY += 20;
    
    // 但し書き
    doc.setFontSize(12);
    doc.text(`但し書き: ${receipt.subject || 'お品代として'}`, margin, currentY);
    currentY += 15;
    
    // 項目詳細ヘッダー
    doc.setFontSize(10);
    doc.text('項目', margin, currentY);
    doc.text('数量', margin + 80, currentY);
    doc.text('単価', margin + 110, currentY);
    doc.text('金額', margin + 140, currentY);
    
    // ヘッダー下線
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    currentY += 10;
    
    // 項目詳細
    (receipt.items || []).forEach((item, index) => {
      if (currentY > 250) { // ページの終わりに近づいたら新しいページ
        doc.addPage();
        currentY = margin;
      }
      
      doc.text(item.description || `項目${index + 1}`, margin, currentY);
      doc.text(`${(item.quantity ?? 1).toLocaleString('ja-JP')} ${item.unit || '式'}`, margin + 80, currentY);
      doc.text(`¥${(item.unitPrice ?? 0).toLocaleString('ja-JP')}`, margin + 110, currentY);
      doc.text(`¥${(item.amount ?? 0).toLocaleString('ja-JP')}`, margin + 140, currentY);
      currentY += 7;
    });
    
    // 合計欄
    currentY += 5;
    doc.line(margin + 100, currentY, pageWidth - margin, currentY);
    currentY += 7;
    
    const subtotal = (receipt.subtotal ?? 0).toLocaleString('ja-JP');
    const taxAmount = (receipt.taxAmount ?? 0).toLocaleString('ja-JP');
    const taxRate = Math.round((receipt.taxRate ?? 0.1) * 100);
    
    doc.text('小計:', margin + 110, currentY);
    doc.text(`¥${subtotal}`, margin + 140, currentY);
    currentY += 7;
    
    doc.text(`消費税(${taxRate}%):`, margin + 110, currentY);
    doc.text(`¥${taxAmount}`, margin + 140, currentY);
    currentY += 7;
    
    doc.setFontSize(12);
    doc.text('合計:', margin + 110, currentY);
    doc.text(`¥${totalAmount}`, margin + 140, currentY);
    currentY += 15;
    
    // 発行者情報
    if (receipt.issuerName) {
      doc.setFontSize(10);
      doc.text(`発行者: ${receipt.issuerName}`, margin, currentY);
      currentY += 5;
      
      if (receipt.issuerAddress) {
        doc.text(`住所: ${receipt.issuerAddress}`, margin, currentY);
        currentY += 5;
      }
      
      if (receipt.issuerPhone) {
        doc.text(`TEL: ${receipt.issuerPhone}`, margin, currentY);
        currentY += 5;
      }
    }
    
    // 備考
    if (receipt.notes) {
      currentY += 10;
      doc.text('備考:', margin, currentY);
      currentY += 5;
      const lines = doc.splitTextToSize(receipt.notes, pageWidth - margin * 2);
      doc.text(lines, margin, currentY);
    }
    
    // PDFをBufferとして返す
    const pdfArrayBuffer = doc.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    
    logger.debug('jsPDF generated successfully, size:', pdfBuffer.length);
    return pdfBuffer;
    
  } catch (error) {
    logger.error('Error generating receipt PDF with jsPDF:', error);
    throw new Error(`PDF生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}