import { logger } from '@/lib/logger';
import { generateInvoiceFilename, generateSafeFilename } from './pdf-html-generator';

export async function generateInvoicePDFWithJsPDF(invoice: any, companyInfo: any, showDescriptions: boolean = true): Promise<Buffer> {
  logger.debug('=== jsPDF Invoice Generation START ===');
  logger.debug('Invoice:', invoice.invoiceNumber);
  logger.debug('Show descriptions:', showDescriptions);
  
  try {
    // jsPDFの動的インポート（サーバーサイド用）
    const { jsPDF } = await import('jspdf');
    
    // A4サイズのPDFを作成
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // 基本設定
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;
    
    // 日本語フォントの設定（利用可能な場合）
    try {
      doc.setFont('helvetica');
    } catch (error) {
      logger.debug('Japanese font not available, using default');
    }
    
    // データの準備
    const customerName = invoice.customer?.companyName || invoice.customer?.name || invoice.customerSnapshot?.companyName || '';
    const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date()).toISOString().split('T')[0];
    const dueDate = new Date(invoice.dueDate).toISOString().split('T')[0];
    
    const subtotal = invoice.subtotal || 0;
    const taxAmount = invoice.taxAmount || 0;
    const totalAmount = invoice.totalAmount || 0;
    
    // ヘッダー（請求書）
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('SEIKYU-SHO', pageWidth / 2, currentY, { align: 'center' });
    doc.text('(Invoice)', pageWidth / 2, currentY + 8, { align: 'center' });
    currentY += 25;
    
    // 請求書番号
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`No. ${invoice.invoiceNumber}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;
    
    // 顧客情報と会社情報を2列で配置
    const leftColumnX = margin;
    const rightColumnX = pageWidth - margin - 60;
    
    // 左側：顧客情報
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${customerName} sama`, leftColumnX, currentY);
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (invoice.customer?.address) {
      const addressLines = doc.splitTextToSize(invoice.customer.address, 80);
      doc.text(addressLines, leftColumnX, currentY);
      currentY += addressLines.length * 4;
    }
    
    if (invoice.customer?.phone) {
      doc.text(`TEL: ${invoice.customer.phone}`, leftColumnX, currentY);
      currentY += 5;
    }
    
    if (invoice.customer?.email) {
      doc.text(`Email: ${invoice.customer.email}`, leftColumnX, currentY);
    }
    
    // 右側：会社情報と日付
    let rightY = currentY - 20;
    
    // 発行日と支払期限
    doc.setFontSize(10);
    doc.text(`Hakko-bi: ${issueDate}`, rightColumnX, rightY);
    rightY += 5;
    doc.text(`Shiharai Kigen: ${dueDate}`, rightColumnX, rightY);
    rightY += 10;
    
    // 会社情報
    if (companyInfo?.companyName) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(companyInfo.companyName, rightColumnX, rightY);
      rightY += 6;
    }
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (companyInfo?.address) {
      const companyAddressLines = doc.splitTextToSize(companyInfo.address, 60);
      doc.text(companyAddressLines, rightColumnX, rightY);
      rightY += companyAddressLines.length * 4;
    }
    
    if (companyInfo?.phone) {
      doc.text(`TEL: ${companyInfo.phone}`, rightColumnX, rightY);
      rightY += 4;
    }
    
    if (companyInfo?.email) {
      doc.text(companyInfo.email, rightColumnX, rightY);
    }
    
    // Y位置を調整
    currentY = Math.max(currentY + 20, rightY + 15);
    
    // 請求金額合計ボックス
    const totalBoxHeight = 15;
    const totalBoxWidth = pageWidth - 2 * margin;
    
    doc.setFillColor(230, 242, 255); // 薄いブルー
    doc.rect(margin, currentY, totalBoxWidth, totalBoxHeight, 'F');
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Seikyuu Kingaku Gokei', margin + 5, currentY + 6);
    doc.text(`¥${totalAmount.toLocaleString()} (zeikomi)`, pageWidth - margin - 5, currentY + 6, { align: 'right' });
    
    currentY += totalBoxHeight + 10;
    
    // 明細テーブル
    const tableStartY = currentY;
    const colWidths = [90, 20, 30, 30]; // 品目、数量、単価、金額
    const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    
    // テーブルヘッダー
    doc.setFillColor(52, 73, 94); // ダークグレー
    doc.setTextColor(255, 255, 255); // 白文字
    doc.rect(margin, currentY, tableWidth, 10, 'F');
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let colX = margin;
    doc.text('Hinmoku/Shiyou', colX + 2, currentY + 7);
    colX += colWidths[0];
    doc.text('Suryo', colX + 2, currentY + 7, { align: 'center' });
    colX += colWidths[1];
    doc.text('Tanka', colX + 2, currentY + 7, { align: 'right' });
    colX += colWidths[2];
    doc.text('Kingaku', colX + 2, currentY + 7, { align: 'right' });
    
    currentY += 10;
    doc.setTextColor(0, 0, 0); // 黒文字に戻す
    
    // 明細行
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    invoice.items.forEach((item: any, index: number) => {
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = margin;
      }
      
      const rowHeight = 8;
      
      // 項目名と説明
      colX = margin;
      let itemText = item.itemName || item.description || `Item ${index + 1}`;
      
      if (showDescriptions && item.description && item.itemName !== item.description) {
        itemText += `\n${item.description}`;
      }
      
      if (showDescriptions && item.notes) {
        itemText += `\n※ ${item.notes}`;
      }
      
      const itemLines = doc.splitTextToSize(itemText, colWidths[0] - 4);
      doc.text(itemLines, colX + 2, currentY + 5);
      
      // 数量
      colX += colWidths[0];
      doc.text((item.quantity || 1).toString(), colX + colWidths[1] - 2, currentY + 5, { align: 'right' });
      
      // 単価
      colX += colWidths[1];
      doc.text(`¥${(item.unitPrice || 0).toLocaleString()}`, colX + colWidths[2] - 2, currentY + 5, { align: 'right' });
      
      // 金額
      colX += colWidths[2];
      doc.text(`¥${(item.amount || 0).toLocaleString()}`, colX + colWidths[3] - 2, currentY + 5, { align: 'right' });
      
      // 行の下線
      const actualRowHeight = Math.max(rowHeight, itemLines.length * 3.5);
      doc.setDrawColor(221, 221, 221);
      doc.line(margin, currentY + actualRowHeight, margin + tableWidth, currentY + actualRowHeight);
      
      currentY += actualRowHeight;
    });
    
    // 合計セクション
    currentY += 10;
    const summaryStartX = margin + 100;
    const summaryWidth = 50;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // 小計
    doc.text('Shokei:', summaryStartX, currentY);
    doc.text(`¥${subtotal.toLocaleString()}`, summaryStartX + summaryWidth, currentY, { align: 'right' });
    currentY += 6;
    
    // 消費税
    doc.text('Shouhizei (10%):', summaryStartX, currentY);
    doc.text(`¥${taxAmount.toLocaleString()}`, summaryStartX + summaryWidth, currentY, { align: 'right' });
    currentY += 6;
    
    // 合計（太線で区切り）
    doc.setLineWidth(0.5);
    doc.line(summaryStartX, currentY, summaryStartX + summaryWidth, currentY);
    currentY += 4;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Gokei Kingaku:', summaryStartX, currentY);
    doc.text(`¥${totalAmount.toLocaleString()}`, summaryStartX + summaryWidth, currentY, { align: 'right' });
    
    currentY += 15;
    
    // 支払情報
    if (invoice.paymentMethod === 'bank_transfer' && companyInfo?.bankAccount) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Furikomi-saki:', margin, currentY);
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ginko: ${companyInfo.bankAccount.bankName}`, margin + 5, currentY);
      currentY += 5;
      doc.text(`Shiten: ${companyInfo.bankAccount.branchName}`, margin + 5, currentY);
      currentY += 5;
      doc.text(`Koza: ${companyInfo.bankAccount.accountType} ${companyInfo.bankAccount.accountNumber}`, margin + 5, currentY);
      currentY += 5;
      doc.text(`Meigi: ${companyInfo.bankAccount.accountHolder}`, margin + 5, currentY);
      currentY += 10;
    }
    
    // 備考
    if (showDescriptions && invoice.notes) {
      if (currentY > pageHeight - 40) {
        doc.addPage();
        currentY = margin;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Biko:', margin, currentY);
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 2 * margin);
      doc.text(notesLines, margin, currentY);
    }
    
    // PDFをBufferとして出力
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    logger.debug('jsPDF Invoice generated successfully, size:', pdfBuffer.length);
    
    return pdfBuffer;
  } catch (error) {
    logger.error('jsPDF Invoice generation error:', error);
    throw error;
  }
}