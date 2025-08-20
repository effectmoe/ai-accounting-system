import { Receipt } from '@/types/receipt';
import { logger } from '@/lib/logger';

/**
 * PDFKitを使用して領収書のPDFを生成する（日本語対応版）
 * HTMLの表示内容に基づいてシンプルなPDFを生成
 */
export async function generateReceiptPDFWithPDFKit(receipt: Receipt): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug('Generating receipt PDF with PDFKit for:', receipt.receiptNumber);
      
      // PDFKitを動的インポート
      const PDFDocument = (await import('pdfkit')).default;
      
      // PDFドキュメントを作成（フォントを含めない設定）
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        autoFirstPage: true,
        info: {
          Title: `領収書 ${receipt.receiptNumber}`,
          Author: receipt.issuerName || 'AAM Accounting System',
          Subject: '領収書',
          Keywords: 'receipt, 領収書',
          CreationDate: new Date(),
        }
      });
      
      // バッファにデータを集める
      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        logger.debug('PDFKit generated successfully, size:', pdfBuffer.length);
        resolve(pdfBuffer);
      });
      
      // エラーハンドリング
      doc.on('error', (error) => {
        logger.error('PDFKit error:', error);
        reject(error);
      });
      
      // フォント設定（システムフォントを使用）
      // 注意: 日本語フォントが必要な場合は、フォントファイルを追加する必要があります
      
      // タイトル
      doc.fontSize(24)
         .text('領 収 書', { align: 'center' });
      
      doc.moveDown();
      
      // 領収書番号
      doc.fontSize(10)
         .text(`No. ${receipt.receiptNumber}`, { align: 'center' });
      
      doc.moveDown(2);
      
      // 発行日
      const issueDate = new Date(receipt.issueDate);
      const formattedDate = `${issueDate.getFullYear()}年${issueDate.getMonth() + 1}月${issueDate.getDate()}日`;
      doc.fontSize(10)
         .text(`発行日: ${formattedDate}`, { align: 'right' });
      
      doc.moveDown();
      
      // 顧客名
      doc.fontSize(14)
         .text(receipt.customerName || '', 50, doc.y);
      
      doc.moveDown(2);
      
      // 金額（大きく表示）
      const totalAmount = (receipt.totalAmount ?? 0).toLocaleString('ja-JP');
      doc.fontSize(20)
         .text(`¥ ${totalAmount} -`, { align: 'center' });
      
      doc.moveDown();
      
      // 但し書き
      doc.fontSize(12)
         .text(`但: ${receipt.subject || 'お品代として'}`, 50, doc.y);
      
      doc.moveDown(2);
      
      // 区切り線
      doc.moveTo(50, doc.y)
         .lineTo(550, doc.y)
         .stroke();
      
      doc.moveDown();
      
      // 項目ヘッダー
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 250;
      const col3 = 350;
      const col4 = 450;
      
      doc.fontSize(10)
         .text('項目', col1, tableTop)
         .text('数量', col2, tableTop)
         .text('単価', col3, tableTop)
         .text('金額', col4, tableTop);
      
      // ヘッダー下線
      doc.moveTo(50, tableTop + 15)
         .lineTo(550, tableTop + 15)
         .stroke();
      
      // 項目詳細
      let currentY = tableTop + 25;
      (receipt.items || []).forEach((item) => {
        const quantity = (item.quantity ?? 1).toLocaleString('ja-JP');
        const unitPrice = (item.unitPrice ?? 0).toLocaleString('ja-JP');
        const amount = (item.amount ?? 0).toLocaleString('ja-JP');
        
        doc.fontSize(9)
           .text(item.description || '', col1, currentY, { width: 180 })
           .text(`${quantity} ${item.unit || ''}`, col2, currentY)
           .text(`¥${unitPrice}`, col3, currentY)
           .text(`¥${amount}`, col4, currentY);
        
        currentY += 20;
      });
      
      // 合計欄の線
      doc.moveTo(350, currentY)
         .lineTo(550, currentY)
         .stroke();
      
      currentY += 10;
      
      // 小計・税・合計
      const subtotal = (receipt.subtotal ?? 0).toLocaleString('ja-JP');
      const taxAmount = (receipt.taxAmount ?? 0).toLocaleString('ja-JP');
      const taxRate = Math.round((receipt.taxRate ?? 0.1) * 100);
      
      doc.fontSize(9)
         .text('小計:', col3, currentY)
         .text(`¥${subtotal}`, col4, currentY);
      
      currentY += 15;
      
      doc.text(`消費税(${taxRate}%):`, col3, currentY)
         .text(`¥${taxAmount}`, col4, currentY);
      
      currentY += 15;
      
      doc.fontSize(11)
         .text('合計:', col3, currentY)
         .text(`¥${totalAmount}`, col4, currentY);
      
      // 下部の発行者情報
      currentY = doc.page.height - 150;
      
      // 区切り線
      doc.moveTo(50, currentY)
         .lineTo(550, currentY)
         .stroke();
      
      currentY += 20;
      
      // 発行者情報
      if (receipt.issuerName) {
        doc.fontSize(10)
           .text(receipt.issuerName, 50, currentY);
        currentY += 15;
      }
      
      if (receipt.issuerAddress) {
        doc.fontSize(9)
           .text(receipt.issuerAddress, 50, currentY);
        currentY += 15;
      }
      
      if (receipt.issuerPhone) {
        doc.text(`TEL: ${receipt.issuerPhone}`, 50, currentY);
        currentY += 15;
      }
      
      if (receipt.issuerEmail) {
        doc.text(`Email: ${receipt.issuerEmail}`, 50, currentY);
      }
      
      // 備考
      if (receipt.notes) {
        currentY += 20;
        doc.fontSize(9)
           .text('備考:', 50, currentY);
        doc.text(receipt.notes, 50, currentY + 15, { width: 500 });
      }
      
      // PDFを完成させる
      doc.end();
      
    } catch (error) {
      logger.error('Error generating receipt PDF with PDFKit:', error);
      reject(new Error(`PDF生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  });
}