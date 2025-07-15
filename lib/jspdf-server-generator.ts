import { DocumentData } from './document-generator';

// サーバーサイドでjsPDFを使用するための設定
export async function generateJsPDFDocument(data: DocumentData): Promise<string> {
  console.log('=== jsPDF Server Generation START ===');
  console.log('Document:', data.documentNumber);
  
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
    
    // ヘッダー
    doc.setFontSize(20);
    doc.text(data.documentType === 'quote' ? 'MITSUMORI-SHO' : 'SEIKYU-SHO', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;
    
    // 書類番号
    doc.setFontSize(12);
    doc.text(`No. ${data.documentNumber}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 10;
    
    // 発行日
    doc.setFontSize(10);
    doc.text(`Hakko-bi: ${data.issueDate ? new Date(data.issueDate).toLocaleDateString('ja-JP') : ''}`, margin, currentY);
    currentY += 15;
    
    // 顧客情報
    doc.setFontSize(14);
    doc.text(`${data.customerName || 'Customer'} sama`, margin, currentY);
    currentY += 10;
    
    if (data.customerAddress) {
      doc.setFontSize(10);
      doc.text(data.customerAddress, margin, currentY);
      currentY += 10;
    }
    
    // 会社情報（右側）
    const companyX = pageWidth - margin - 60;
    let companyY = 60;
    doc.setFontSize(10);
    if (data.companyInfo?.name) {
      doc.text(data.companyInfo.name, companyX, companyY);
      companyY += 5;
    }
    if (data.companyInfo?.address) {
      doc.text(data.companyInfo.address, companyX, companyY);
      companyY += 5;
    }
    if (data.companyInfo?.phone) {
      doc.text(`TEL: ${data.companyInfo.phone}`, companyX, companyY);
      companyY += 5;
    }
    if (data.companyInfo?.email) {
      doc.text(data.companyInfo.email, companyX, companyY);
    }
    
    // 項目テーブル
    currentY = Math.max(currentY + 10, companyY + 15);
    
    // テーブルヘッダー
    doc.setFontSize(10);
    doc.text('Komoku', margin, currentY);
    doc.text('Suryo', margin + 80, currentY);
    doc.text('Tanka', margin + 110, currentY);
    doc.text('Kingaku', margin + 140, currentY);
    
    // ヘッダー下線
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);
    currentY += 10;
    
    // 項目
    (data.items || []).forEach((item, index) => {
      doc.text(item.description || `Item ${index + 1}`, margin, currentY);
      doc.text(item.quantity?.toString() || '1', margin + 80, currentY);
      doc.text(`${(item.unitPrice || 0).toLocaleString()}`, margin + 110, currentY);
      doc.text(`${(item.amount || 0).toLocaleString()}`, margin + 140, currentY);
      currentY += 7;
    });
    
    // 合計欄
    currentY += 5;
    doc.line(margin + 100, currentY, pageWidth - margin, currentY);
    currentY += 7;
    
    doc.text('Shokei:', margin + 110, currentY);
    doc.text(`${(data.subtotal || 0).toLocaleString()}`, margin + 140, currentY);
    currentY += 7;
    
    doc.text('Zeikin:', margin + 110, currentY);
    doc.text(`${(data.tax || 0).toLocaleString()}`, margin + 140, currentY);
    currentY += 7;
    
    doc.setFontSize(12);
    doc.text('Gokei:', margin + 110, currentY);
    doc.text(`${(data.total || 0).toLocaleString()}`, margin + 140, currentY);
    
    // 備考
    if (data.notes) {
      currentY += 15;
      doc.setFontSize(10);
      doc.text('Biko:', margin, currentY);
      currentY += 5;
      const lines = doc.splitTextToSize(data.notes, pageWidth - margin * 2);
      doc.text(lines, margin, currentY);
    }
    
    // 請求書の場合、支払い情報を追加
    if (data.documentType === 'invoice') {
      currentY += 20;
      
      if (data.dueDate) {
        doc.text(`Shiharai Kigen: ${new Date(data.dueDate).toLocaleDateString('ja-JP')}`, margin, currentY);
        currentY += 10;
      }
      
      if (data.bankAccount) {
        doc.text('Furikomi-saki:', margin, currentY);
        currentY += 5;
        doc.setFontSize(9);
        doc.text(`Ginko: ${data.bankAccount.bankName}`, margin + 10, currentY);
        currentY += 5;
        doc.text(`Shiten: ${data.bankAccount.branchName}`, margin + 10, currentY);
        currentY += 5;
        doc.text(`Koza: ${data.bankAccount.accountType} ${data.bankAccount.accountNumber}`, margin + 10, currentY);
        currentY += 5;
        doc.text(`Meigi: ${data.bankAccount.accountHolder}`, margin + 10, currentY);
      }
    }
    
    // PDFをBase64文字列として出力
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    console.log('jsPDF generated successfully, size:', pdfBase64.length);
    
    return pdfBase64;
  } catch (error) {
    console.error('jsPDF generation error:', error);
    throw error;
  }
}