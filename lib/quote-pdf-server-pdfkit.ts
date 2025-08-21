/**
 * PDFkitを使用したサーバーサイド見積書PDF生成
 * jsPDFがNode.js環境で不安定な場合のより確実な代替案
 */

import { Quote } from '@/types';
import { CompanyInfo } from '@/types/collections';
import { logger } from '@/lib/logger';

/**
 * サーバーサイドでPDFkitを使用して見積書PDFを生成
 */
export async function generateQuotePDFWithPDFkit(
  quote: Quote,
  companyInfo: CompanyInfo
): Promise<Buffer> {
  try {
    logger.debug('[PDFkit Server] Starting quote PDF generation', {
      quoteNumber: quote.quoteNumber,
      itemCount: quote.items?.length || 0,
      total: quote.total
    });
    
    // 動的インポート
    const PDFDocument = (await import('pdfkit')).default;
    logger.debug('[PDFkit Server] PDFkit imported successfully');
    
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `見積書 ${quote.quoteNumber}`,
        Author: companyInfo?.companyName || '株式会社EFFECT',
        Subject: '見積書',
        Keywords: 'quote, 見積書'
      }
    });
    
    logger.debug('[PDFkit Server] PDF document created');
    
    const chunks: Buffer[] = [];
    
    // データを収集
    doc.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    // PDFの作成が完了したときのPromise
    const pdfPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        logger.debug('[PDFkit Server] PDF buffer created', {
          size: pdfBuffer.length,
          header: pdfBuffer.slice(0, 8).toString('ascii')
        });
        resolve(pdfBuffer);
      });
      
      doc.on('error', (error: Error) => {
        logger.error('[PDFkit Server] PDF document error:', error);
        reject(error);
      });
    });
    
    // フォント設定（日本語対応）
    try {
      // システムにある日本語フォントを試す
      doc.font('Helvetica');
      logger.debug('[PDFkit Server] Font set to Helvetica');
    } catch (fontError) {
      logger.warn('[PDFkit Server] Font setting failed, using default:', fontError);
    }
    
    // ヘッダー: 見積書タイトル
    doc.fontSize(24)
       .text('見積書', 50, 50, { align: 'center' });
    
    let yPosition = 100;
    
    // 見積書番号と日付
    doc.fontSize(12)
       .text(`見積書番号: ${quote.quoteNumber}`, 50, yPosition);
    yPosition += 20;
    
    doc.text(`発行日: ${new Date(quote.issueDate).toLocaleDateString('ja-JP')}`, 50, yPosition);
    yPosition += 20;
    
    // 有効期限
    if (quote.validityDate) {
      doc.text(`有効期限: ${new Date(quote.validityDate).toLocaleDateString('ja-JP')}`, 50, yPosition);
      yPosition += 20;
    }
    
    yPosition += 10; // スペース
    
    // 顧客情報
    doc.fontSize(14)
       .text('宛先:', 50, yPosition);
    yPosition += 25;
    
    doc.fontSize(12)
       .text(quote.customer?.companyName || '顧客名未設定', 50, yPosition);
    yPosition += 20;
    
    if (quote.customer) {
      const address = `${quote.customer.prefecture || ''}${quote.customer.city || ''}${quote.customer.address1 || ''}`;
      if (address.trim()) {
        doc.text(address, 50, yPosition);
        yPosition += 20;
      }
    }
    
    yPosition += 20; // スペース
    
    // 見積金額（大きく表示）
    doc.fontSize(16)
       .text(`見積金額: ¥${(quote.total || 0).toLocaleString()}`, 50, yPosition);
    yPosition += 40;
    
    // 明細テーブル
    doc.fontSize(12);
    
    // テーブルヘッダー
    const tableTop = yPosition;
    const itemX = 50;
    const qtyX = 250;
    const priceX = 320;
    const amountX = 400;
    
    doc.text('品目', itemX, tableTop)
       .text('数量', qtyX, tableTop)
       .text('単価', priceX, tableTop)
       .text('金額', amountX, tableTop);
    
    // ヘッダー下線
    doc.moveTo(itemX, tableTop + 15)
       .lineTo(500, tableTop + 15)
       .stroke();
    
    yPosition = tableTop + 25;
    
    // 明細行
    if (quote.items && quote.items.length > 0) {
      quote.items.forEach((item: any, index: number) => {
        // ページ境界チェック
        if (yPosition > 720) { // A4の下部近く
          doc.addPage();
          yPosition = 50;
        }
        
        doc.text(item.itemName || `項目${index + 1}`, itemX, yPosition)
           .text(String(item.quantity || 0), qtyX, yPosition)
           .text(`¥${(item.unitPrice || 0).toLocaleString()}`, priceX, yPosition)
           .text(`¥${(item.amount || 0).toLocaleString()}`, amountX, yPosition);
           
        yPosition += 20;
      });
    }
    
    yPosition += 20; // スペース
    
    // 合計セクション
    const totalX = 400;
    
    if (quote.subtotal !== undefined) {
      doc.text(`小計: ¥${quote.subtotal.toLocaleString()}`, totalX, yPosition);
      yPosition += 20;
    }
    
    if (quote.taxAmount !== undefined) {
      doc.text(`消費税: ¥${quote.taxAmount.toLocaleString()}`, totalX, yPosition);
      yPosition += 20;
    }
    
    doc.fontSize(14)
       .text(`合計: ¥${(quote.total || 0).toLocaleString()}`, totalX, yPosition);
    yPosition += 30;
    
    // 備考
    if (quote.notes && quote.notes.trim()) {
      // ページ境界チェック
      if (yPosition > 680) {
        doc.addPage();
        yPosition = 50;
      }
      
      doc.fontSize(12)
         .text('備考:', 50, yPosition);
      yPosition += 20;
      
      doc.text(quote.notes, 50, yPosition, {
        width: 500,
        align: 'left'
      });
    }
    
    // フッター: 会社情報
    const footerY = 750; // A4の下部
    doc.fontSize(10);
    
    if (companyInfo) {
      doc.text(companyInfo.companyName || '株式会社EFFECT', 50, footerY);
      
      if (companyInfo.address) {
        doc.text(companyInfo.address, 50, footerY + 12);
      }
      
      if (companyInfo.phone) {
        doc.text(`TEL: ${companyInfo.phone}`, 50, footerY + 24);
      }
      
      if (companyInfo.email) {
        doc.text(`Email: ${companyInfo.email}`, 50, footerY + 36);
      }
    }
    
    // PDFを終了
    doc.end();
    logger.debug('[PDFkit Server] PDF document ended, waiting for completion');
    
    // PDFの完成を待つ
    const pdfBuffer = await pdfPromise;
    
    // バッファの検証
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Generated PDF buffer is empty');
    }
    
    // PDFヘッダーの確認
    const pdfHeader = pdfBuffer.slice(0, 5).toString('ascii');
    if (!pdfHeader.startsWith('%PDF')) {
      logger.error('[PDFkit Server] Invalid PDF buffer generated', {
        headerBytes: pdfHeader,
        bufferLength: pdfBuffer.length
      });
      throw new Error('Generated buffer is not a valid PDF');
    }
    
    logger.debug('[PDFkit Server] PDF generated successfully', {
      size: pdfBuffer.length,
      quoteNumber: quote.quoteNumber,
      header: pdfHeader
    });
    
    return pdfBuffer;
    
  } catch (error) {
    logger.error('[PDFkit Server] Failed to generate quote PDF:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      quoteNumber: quote.quoteNumber,
      itemCount: quote.items?.length || 0
    });
    throw new Error(`PDFkit PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}