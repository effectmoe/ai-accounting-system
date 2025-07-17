import { DocumentData } from './document-generator';
const PDFDocument = require('pdfkit');
import path from 'path';
import fs from 'fs';

export async function generatePDFKitDocument(data: DocumentData): Promise<string> {
  console.log('=== PDFKit Japanese PDF Generation START ===');
  console.log('Document:', data.documentNumber);
  console.log('Customer:', data.customerName);
  
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: data.documentType === 'quote' ? '見積書' : '請求書',
          Author: data.companyInfo?.name || 'Company',
          Subject: data.documentNumber,
        }
      });

      // Buffer to store PDF data
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const base64 = pdfBuffer.toString('base64');
        console.log('PDF generated successfully, size:', base64.length);
        resolve(base64);
      });

      // Vercel環境では日本語フォントファイルへのアクセスが制限されるため
      // 一旦組み込みフォントを使用
      try {
        const fontPath = path.join(process.cwd(), 'public/fonts/NotoSansJP-Regular.ttf');
        if (fs.existsSync(fontPath)) {
          doc.registerFont('NotoSansJP', fontPath);
          doc.font('NotoSansJP');
        } else {
          console.log('Font file not found, using built-in font');
          doc.font('Helvetica');
        }
      } catch (error) {
        console.log('Font loading error:', error);
        doc.font('Helvetica');
      }

      // Header
      doc.fontSize(20)
         .text(data.documentType === 'quote' ? '見積書' : '請求書', 50, 50, { align: 'center' });

      // Document number and date
      doc.fontSize(12)
         .text(`No. ${data.documentNumber}`, 50, 100)
         .text(`発行日: ${data.issueDate ? new Date(data.issueDate).toLocaleDateString('ja-JP') : ''}`, 50, 120);

      // Customer info
      doc.fontSize(14)
         .text(`${data.customerName || ''} 様`, 50, 160);
      
      if (data.customerAddress) {
        doc.fontSize(10)
           .text(data.customerAddress, 50, 180);
      }

      // Company info (right side)
      const companyY = 160;
      doc.fontSize(10)
         .text(data.companyInfo?.name || '', 350, companyY, { align: 'right' })
         .text(data.companyInfo?.address || '', 350, companyY + 15, { align: 'right' })
         .text(data.companyInfo?.phone || '', 350, companyY + 30, { align: 'right' })
         .text(data.companyInfo?.email || '', 350, companyY + 45, { align: 'right' });

      // Table header
      const tableTop = 250;
      doc.fontSize(10)
         .text('項目', 50, tableTop)
         .text('数量', 250, tableTop, { width: 50, align: 'right' })
         .text('単価', 320, tableTop, { width: 80, align: 'right' })
         .text('金額', 420, tableTop, { width: 80, align: 'right' });

      // Draw line under header
      doc.moveTo(50, tableTop + 15)
         .lineTo(500, tableTop + 15)
         .stroke();

      // Items
      let currentY = tableTop + 25;
      (data.items || []).forEach((item, index) => {
        doc.text(item.description || `項目 ${index + 1}`, 50, currentY, { width: 190 })
           .text(item.quantity?.toString() || '1', 250, currentY, { width: 50, align: 'right' })
           .text(`¥${(item.unitPrice || 0).toLocaleString()}`, 320, currentY, { width: 80, align: 'right' })
           .text(`¥${(item.amount || 0).toLocaleString()}`, 420, currentY, { width: 80, align: 'right' });
        
        currentY += 20;
      });

      // Draw line above totals
      currentY += 10;
      doc.moveTo(300, currentY)
         .lineTo(500, currentY)
         .stroke();

      // Totals
      currentY += 15;
      doc.text('小計:', 320, currentY, { width: 80, align: 'right' })
         .text(`¥${(data.subtotal || 0).toLocaleString()}`, 420, currentY, { width: 80, align: 'right' });
      
      currentY += 20;
      doc.text('消費税:', 320, currentY, { width: 80, align: 'right' })
         .text(`¥${(data.tax || 0).toLocaleString()}`, 420, currentY, { width: 80, align: 'right' });
      
      currentY += 20;
      doc.fontSize(12)
         .text('合計:', 320, currentY, { width: 80, align: 'right' })
         .text(`¥${(data.total || 0).toLocaleString()}`, 420, currentY, { width: 80, align: 'right' });

      // Notes
      if (data.notes) {
        currentY += 40;
        doc.fontSize(10)
           .text('備考:', 50, currentY)
           .text(data.notes, 50, currentY + 15, { width: 450 });
      }

      // Payment info for invoice
      if (data.documentType === 'invoice') {
        currentY += 60;
        
        if (data.dueDate) {
          doc.text(`支払期限: ${new Date(data.dueDate).toLocaleDateString('ja-JP')}`, 50, currentY);
          currentY += 20;
        }
        
        if (data.bankAccount) {
          doc.text('振込先:', 50, currentY);
          currentY += 15;
          doc.fontSize(9)
             .text(`銀行名: ${data.bankAccount.bankName}`, 70, currentY)
             .text(`支店名: ${data.bankAccount.branchName}`, 70, currentY + 15)
             .text(`口座種別: ${data.bankAccount.accountType}`, 70, currentY + 30)
             .text(`口座番号: ${data.bankAccount.accountNumber}`, 70, currentY + 45)
             .text(`口座名義: ${data.bankAccount.accountHolder}`, 70, currentY + 60);
        }
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      console.error('PDFKit generation error:', error);
      reject(error);
    }
  });
}