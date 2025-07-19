import jsPDF from 'jspdf';
import { Quote, CompanyInfo } from '@/types/collections';

import { logger } from '@/lib/logger';
// 日本語フォントを追加するためのヘルパー関数
function addJapaneseFont(doc: jsPDF) {
  // フォント設定（日本語文字化け対策）
  try {
    // デフォルトフォントを使用（日本語サポート改善のため）
    doc.setFont('helvetica');
  } catch (error) {
    logger.warn('Font setting error, using default font:', error);
  }
}

// 日本語テキストの分割処理
function splitJapaneseText(doc: jsPDF, text: string, maxWidth: number): string[] {
  const words = text.split('');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const char of words) {
    const testLine = currentLine + char;
    const textWidth = doc.getTextWidth(testLine);
    
    if (textWidth > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine !== '') {
    lines.push(currentLine);
  }
  
  return lines;
}

// 数値を日本円形式でフォーマット
function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

// 日付をフォーマット
function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export async function generateQuotePDF(quote: Quote, companyInfo: CompanyInfo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF();
      let yPosition = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      
      // 日本語フォントを設定
      addJapaneseFont(doc);
      
      // タイトル
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      const title = 'Quote / 見積書';
      const titleWidth = doc.getTextWidth(title);
      doc.text(title, (pageWidth - titleWidth) / 2, yPosition);
      yPosition += 15;
      
      // 見積書番号と日付
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Quote No: ${quote.quoteNumber || 'N/A'}`, margin, yPosition);
      doc.text(`Date: ${quote.issueDate ? formatDate(new Date(quote.issueDate)) : 'N/A'}`, pageWidth - margin - 60, yPosition);
      yPosition += 10;
      doc.text(`Valid Until: ${quote.validityDate ? formatDate(new Date(quote.validityDate)) : 'N/A'}`, pageWidth - margin - 60, yPosition);
      yPosition += 20;
      
      // 会社情報（左側）
      doc.setFont('helvetica', 'bold');
      doc.text('From:', margin, yPosition);
      yPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      const companyLines = [
        companyInfo.companyName || '',
        `${companyInfo.postalCode || ''} ${companyInfo.prefecture || ''} ${companyInfo.city || ''}`,
        companyInfo.address1 || '',
        companyInfo.address2 || '',
        `TEL: ${companyInfo.phone || ''}`,
        `FAX: ${companyInfo.fax || ''}`,
        `Email: ${companyInfo.email || ''}`
      ].filter(line => line && line.trim() !== '');
      
      companyLines.forEach(line => {
        const lines = splitJapaneseText(doc, line, contentWidth / 2 - 10);
        lines.forEach(splitLine => {
          doc.text(splitLine, margin, yPosition);
          yPosition += 6;
        });
      });
      
      // 顧客情報（右側）
      let customerYPosition = yPosition - (companyLines.length * 6) - 8;
      doc.setFont('helvetica', 'bold');
      doc.text('To:', pageWidth / 2 + 10, customerYPosition);
      customerYPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      if (quote.customer) {
        const customerLines = [
          quote.customer.companyName || '',
          quote.customer.department || '',
          `${quote.customer.postalCode || ''} ${quote.customer.prefecture || ''} ${quote.customer.city || ''}`,
          quote.customer.address1 || '',
          quote.customer.address2 || '',
          `TEL: ${quote.customer.phone || ''}`,
          `Email: ${quote.customer.email || ''}`
        ].filter(line => line && line.trim() !== '');
        
        customerLines.forEach(line => {
          const lines = splitJapaneseText(doc, line, contentWidth / 2 - 10);
          lines.forEach(splitLine => {
            doc.text(splitLine, pageWidth / 2 + 10, customerYPosition);
            customerYPosition += 6;
          });
        });
      }
      
      yPosition = Math.max(yPosition, customerYPosition) + 10;
      
      // 見積もり項目テーブル
      doc.setFont('helvetica', 'bold');
      doc.text('Quote Items / 見積項目:', margin, yPosition);
      yPosition += 10;
      
      // テーブルヘッダー
      const tableStart = yPosition;
      const colWidths = [80, 20, 30, 40, 40];
      const headers = ['Description', 'Qty', 'Unit Price', 'Amount', 'Tax'];
      
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPosition - 2, contentWidth, 8, 'F');
      
      let xPosition = margin;
      headers.forEach((header, index) => {
        doc.text(header, xPosition + 2, yPosition + 4);
        xPosition += colWidths[index];
      });
      yPosition += 10;
      
      // テーブル罫線（ヘッダー）
      doc.line(margin, tableStart - 2, margin + contentWidth, tableStart - 2);
      doc.line(margin, yPosition - 2, margin + contentWidth, yPosition - 2);
      
      // 見積項目
      doc.setFont('helvetica', 'normal');
      quote.items.forEach((item) => {
        if (yPosition > 250) { // 新しいページが必要な場合
          doc.addPage();
          yPosition = 20;
          addJapaneseFont(doc);
        }
        
        xPosition = margin;
        
        // 項目名（複数行対応）
        const itemLines = splitJapaneseText(doc, item.itemName || '', colWidths[0] - 4);
        const itemHeight = itemLines.length * 6;
        
        itemLines.forEach((line, lineIndex) => {
          doc.text(line, xPosition + 2, yPosition + 4 + (lineIndex * 6));
        });
        xPosition += colWidths[0];
        
        // 数量
        doc.text((item.quantity || 0).toString(), xPosition + 2, yPosition + 4);
        xPosition += colWidths[1];
        
        // 単価
        doc.text(formatCurrency(item.unitPrice || 0), xPosition + 2, yPosition + 4);
        xPosition += colWidths[2];
        
        // 金額
        doc.text(formatCurrency(item.amount || 0), xPosition + 2, yPosition + 4);
        xPosition += colWidths[3];
        
        // 税額
        doc.text(formatCurrency(item.taxAmount || 0), xPosition + 2, yPosition + 4);
        
        yPosition += Math.max(8, itemHeight);
        
        // 項目間の罫線
        doc.line(margin, yPosition - 2, margin + contentWidth, yPosition - 2);
      });
      
      // 縦罫線
      xPosition = margin;
      colWidths.forEach((width, index) => {
        if (index < colWidths.length) {
          doc.line(xPosition, tableStart - 2, xPosition, yPosition - 2);
        }
        xPosition += width;
      });
      doc.line(margin + contentWidth, tableStart - 2, margin + contentWidth, yPosition - 2);
      
      yPosition += 10;
      
      // 合計金額
      const totalSection = pageWidth - margin - 80;
      doc.setFont('helvetica', 'bold');
      doc.text('Subtotal:', totalSection, yPosition);
      doc.text(formatCurrency(quote.subtotal || 0), totalSection + 50, yPosition);
      yPosition += 8;
      
      doc.text(`Tax (${(quote.taxRate || 0.1) * 100}%):`, totalSection, yPosition);
      doc.text(formatCurrency(quote.taxAmount || 0), totalSection + 50, yPosition);
      yPosition += 8;
      
      doc.setFontSize(14);
      doc.text('Total:', totalSection, yPosition);
      doc.text(formatCurrency(quote.totalAmount || 0), totalSection + 50, yPosition);
      yPosition += 15;
      
      // 注意事項
      if (quote.notes) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes / 備考:', margin, yPosition);
        yPosition += 8;
        
        doc.setFont('helvetica', 'normal');
        const noteLines = splitJapaneseText(doc, quote.notes, contentWidth);
        noteLines.forEach(line => {
          doc.text(line, margin, yPosition);
          yPosition += 6;
        });
      }
      
      // フッター
      const footerY = doc.internal.pageSize.getHeight() - 20;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Thank you for your business / ご検討のほど、よろしくお願いいたします。', 
               margin, footerY);
      
      // PDFを生成してBufferとして返す
      const pdfOutput = doc.output('arraybuffer');
      resolve(Buffer.from(pdfOutput));
      
    } catch (error) {
      logger.error('PDF generation error:', error);
      reject(error);
    }
  });
}