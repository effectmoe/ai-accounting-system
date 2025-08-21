/**
 * jsPDFを使用したサーバーサイド見積書PDF生成
 * Puppeteerが失敗した場合のフォールバック
 */

import { Quote } from '@/types';
import { CompanyInfo } from '@/types/collections';
import { generateCompactQuoteHTML } from './pdf-quote-html-generator';
import { logger } from '@/lib/logger';

// jsPDFライブラリをサーバーサイドで使用するためのポリフィル
global.window = global.window || {} as any;
global.navigator = global.navigator || { userAgent: '' } as any;
global.document = global.document || {
  createElement: () => ({ getContext: () => null }),
} as any;

/**
 * サーバーサイドでjsPDFを使用して見積書PDFを生成
 */
export async function generateQuotePDFServer(
  quote: Quote,
  companyInfo: CompanyInfo
): Promise<Buffer> {
  try {
    logger.debug('[jsPDF Server] Starting quote PDF generation');
    
    // 動的インポート
    const jsPDF = (await import('jspdf')).default;
    
    // A4サイズのPDFを作成
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });
    
    // 日本語フォントの設定（サーバーサイドではフォント埋め込みが必要）
    // 基本的なフォントで対応
    pdf.setFont('helvetica');
    
    // タイトル
    pdf.setFontSize(20);
    pdf.text('見積書', 105, 20, { align: 'center' });
    
    // 見積書番号と日付
    pdf.setFontSize(10);
    pdf.text(`見積書番号: ${quote.quoteNumber}`, 20, 40);
    pdf.text(`発行日: ${new Date(quote.issueDate).toLocaleDateString('ja-JP')}`, 20, 45);
    
    // 顧客情報
    pdf.setFontSize(12);
    pdf.text(`${quote.customer?.companyName || ''}`, 20, 60);
    
    // 見積金額
    pdf.setFontSize(14);
    pdf.text(`見積金額: ¥${quote.total?.toLocaleString() || '0'}`, 20, 80);
    
    // 明細のヘッダー
    let yPos = 100;
    pdf.setFontSize(10);
    pdf.text('品目', 20, yPos);
    pdf.text('数量', 100, yPos);
    pdf.text('単価', 120, yPos);
    pdf.text('金額', 150, yPos);
    
    // 明細行
    yPos += 10;
    quote.items?.forEach((item: any) => {
      pdf.text(item.itemName || '', 20, yPos);
      pdf.text(String(item.quantity || 0), 100, yPos);
      pdf.text(`¥${item.unitPrice?.toLocaleString() || '0'}`, 120, yPos);
      pdf.text(`¥${item.amount?.toLocaleString() || '0'}`, 150, yPos);
      yPos += 8;
      
      // ページ境界チェック
      if (yPos > 270) {
        pdf.addPage();
        yPos = 20;
      }
    });
    
    // 小計・税・合計
    yPos += 10;
    pdf.text(`小計: ¥${quote.subtotal?.toLocaleString() || '0'}`, 120, yPos);
    yPos += 8;
    pdf.text(`消費税: ¥${quote.taxAmount?.toLocaleString() || '0'}`, 120, yPos);
    yPos += 8;
    pdf.setFontSize(12);
    pdf.text(`合計: ¥${quote.total?.toLocaleString() || '0'}`, 120, yPos);
    
    // 備考
    if (quote.notes) {
      yPos += 15;
      pdf.setFontSize(10);
      pdf.text('備考:', 20, yPos);
      yPos += 8;
      
      // 備考を複数行に分割
      const noteLines = quote.notes.split('\n');
      noteLines.forEach((line: string) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        // 長い行は自動で折り返し
        const wrappedLines = pdf.splitTextToSize(line, 170);
        wrappedLines.forEach((wrappedLine: string) => {
          pdf.text(wrappedLine, 20, yPos);
          yPos += 6;
        });
      });
    }
    
    // 会社情報
    pdf.setFontSize(10);
    const bottomY = 280;
    pdf.text(companyInfo?.companyName || '株式会社EFFECT', 20, bottomY);
    if (companyInfo?.address) {
      pdf.text(companyInfo.address, 20, bottomY + 5);
    }
    
    // PDFの情報を設定
    pdf.setProperties({
      title: `見積書 ${quote.quoteNumber}`,
      subject: '見積書',
      author: companyInfo?.companyName || '株式会社EFFECT',
      keywords: 'quote, 見積書',
      creator: 'AAM Accounting System'
    });
    
    // BufferとしてPDFを出力
    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    
    logger.debug('[jsPDF Server] PDF generated successfully', {
      size: pdfBuffer.length,
      quoteNumber: quote.quoteNumber
    });
    
    return pdfBuffer;
    
  } catch (error) {
    logger.error('[jsPDF Server] Failed to generate quote PDF:', error);
    throw new Error(`jsPDF PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}