import { DocumentData } from './document-generator';

import { logger } from '@/lib/logger';
// 日本語対応のPDF生成（pdfkitベース）
export async function generateServerSidePDF(data: DocumentData): Promise<string> {
  logger.debug('PDF generation started for document:', data.documentNumber);
  
  try {
    const PDFDocument = await import('pdfkit');
    logger.debug('PDFDocument imported successfully');
    
    return new Promise((resolve, reject) => {
      try {
        logger.debug('Creating PDF document...');
        // Vercelのサーバーレス環境向けの設定
        const doc = new (PDFDocument.default)({ 
        size: 'A4',
        margin: 40,
        info: {
          Title: data.documentNumber,
          Author: data.companyInfo?.name || '',
          Subject: data.documentType === 'quote' ? '見積書' : '請求書',
          Creator: 'AI会計システム',
        }
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      doc.on('end', () => {
        logger.debug('PDF generation completed, chunks:', chunks.length);
        const pdfBuffer = Buffer.concat(chunks);
        const base64 = pdfBuffer.toString('base64');
        logger.debug('PDF base64 length:', base64.length);
        resolve(base64);
      });

      doc.on('error', (error) => {
        logger.error('PDF generation error:', error);
        reject(error);
      });

      // 日本語対応のPDF生成
      logger.debug('Starting PDF content generation...');
      try {
        doc.fontSize(24)
           .text(data.documentType === 'quote' ? '見積書' : '請求書', { align: 'center' });
        logger.debug('Title added successfully');
      } catch (error) {
        logger.error('Error adding title:', error);
        throw error;
      }
      
      doc.moveDown()
         .fontSize(12)
         .text(data.documentNumber, { align: 'center' });

      doc.moveDown(2)
         .fontSize(14)
         .text(`${data.customerName} 様`);

      doc.moveDown()
         .fontSize(18)
         .fillColor('#0066cc')
         .text(`${data.documentType === 'quote' ? '見積' : '請求'}金額合計: ¥${(data.total || 0).toLocaleString()}`, { align: 'right' });

      doc.fillColor('black')
         .moveDown()
         .fontSize(10)
         .text('明細:');

      (data.items || []).forEach((item, index) => {
        doc.text(`${index + 1}. ${item.description || ''} - 数量: ${item.quantity} - 金額: ¥${(item.amount || 0).toLocaleString()}`);
      });

      doc.moveDown()
         .fontSize(10)
         .text(`小計: ¥${(data.subtotal || 0).toLocaleString()}`, { align: 'right' })
         .text(`消費税: ¥${(data.tax || 0).toLocaleString()}`, { align: 'right' })
         .fontSize(12)
         .text(`合計: ¥${(data.total || 0).toLocaleString()}`, { align: 'right' });

      if (data.notes) {
        doc.moveDown()
           .fontSize(10)
           .text('備考:')
           .text(data.notes);
      }

      if (data.documentType === 'invoice' && data.bankAccount) {
        doc.moveDown()
           .fontSize(10)
           .text('振込先:')
           .text(`${data.bankAccount.bankName} ${data.bankAccount.branchName}`)
           .text(`${data.bankAccount.accountType} ${data.bankAccount.accountNumber}`)
           .text(data.bankAccount.accountHolder);
      }

      logger.debug('Finalizing PDF document...');
      doc.end();
    } catch (error) {
      logger.error('PDF creation error:', error);
      reject(error);
    }
  });
  } catch (error) {
    logger.error('PDF generation outer error:', error);
    throw error;
  }
}