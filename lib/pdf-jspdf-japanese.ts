import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DocumentData } from './document-generator';

// 日本語フォントの設定
function setupJapaneseFont(pdf: jsPDF) {
  try {
    // デフォルトのフォントを使用（日本語対応）
    pdf.setFont('helvetica');
  } catch (error) {
    console.warn('Japanese font setup failed, using default font:', error);
    pdf.setFont('helvetica');
  }
}

export async function generatePDFFromHTML(documentData: DocumentData): Promise<Buffer> {
  try {
    console.log('[PDF] Starting PDF generation with Japanese support');
    
    // Create PDF with A4 size
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Setup Japanese font
    setupJapaneseFont(pdf);
    
    let yPos = 30;
    
    // Title
    pdf.setFontSize(24);
    pdf.text('請求書', 105, yPos, { align: 'center' });
    yPos += 20;
    
    // Document info (right aligned)
    pdf.setFontSize(12);
    const rightX = 180;
    pdf.text(`発行日: ${documentData.issueDate}`, rightX, yPos, { align: 'right' });
    yPos += 7;
    pdf.text(`文書番号: ${documentData.documentNumber}`, rightX, yPos, { align: 'right' });
    yPos += 7;
    
    if (documentData.dueDate) {
      pdf.text(`支払期限: ${documentData.dueDate}`, rightX, yPos, { align: 'right' });
      yPos += 7;
    }
    
    yPos += 10;
    
    // Customer section
    pdf.setFontSize(16);
    pdf.text(`${documentData.partner.name} 御中`, 20, yPos);
    yPos += 10;
    
    pdf.setFontSize(10);
    if (documentData.partner.address) {
      pdf.text(documentData.partner.address, 20, yPos);
      yPos += 6;
    }
    
    if (documentData.partner.phone) {
      pdf.text(`TEL: ${documentData.partner.phone}`, 20, yPos);
      yPos += 6;
    }
    
    yPos += 10;
    
    // Company info (right side)
    const companyStartY = yPos;
    if (documentData.company?.name) {
      pdf.setFontSize(12);
      pdf.text(documentData.company.name, rightX, yPos, { align: 'right' });
      yPos += 8;
    }
    
    pdf.setFontSize(10);
    if (documentData.company?.address) {
      const addressLines = pdf.splitTextToSize(documentData.company.address, 50);
      addressLines.forEach((line: string) => {
        pdf.text(line, rightX, yPos, { align: 'right' });
        yPos += 6;
      });
    }
    
    if (documentData.company?.phone) {
      pdf.text(documentData.company.phone, rightX, yPos, { align: 'right' });
      yPos += 6;
    }
    
    if (documentData.company?.email) {
      pdf.text(documentData.company.email, rightX, yPos, { align: 'right' });
      yPos += 6;
    }
    
    yPos = Math.max(yPos, companyStartY + 30);
    yPos += 15;
    
    // Total amount highlight
    pdf.setFillColor(230, 242, 255);
    pdf.rect(20, yPos - 5, 170, 20, 'F');
    pdf.setFontSize(14);
    pdf.text('合計金額', 25, yPos + 5);
    pdf.setFontSize(18);
    pdf.text(`¥${documentData.total.toLocaleString()}（税込）`, rightX - 5, yPos + 8, { align: 'right' });
    
    yPos += 25;
    
    // Items table using autoTable
    const tableColumns = [
      { header: '品目・仕様', dataKey: 'name' },
      { header: '数量', dataKey: 'quantity' },
      { header: '単価', dataKey: 'unitPrice' },
      { header: '金額', dataKey: 'amount' }
    ];
    
    const tableData = documentData.items.map(item => ({
      name: item.name || '',
      quantity: item.quantity.toString(),
      unitPrice: `¥${item.unitPrice.toLocaleString()}`,
      amount: `¥${item.amount.toLocaleString()}`
    }));
    
    // Add empty rows to make table look more professional
    while (tableData.length < 10) {
      tableData.push({
        name: '',
        quantity: '',
        unitPrice: '',
        amount: ''
      });
    }
    
    (pdf as any).autoTable({
      startY: yPos,
      head: [tableColumns.map(col => col.header)],
      body: tableData.map(row => [row.name, row.quantity, row.unitPrice, row.amount]),
      styles: {
        font: 'helvetica',
        fontSize: 10,
        cellPadding: 5,
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 80 }, // 品目
        1: { cellWidth: 25, halign: 'center' }, // 数量
        2: { cellWidth: 35, halign: 'right' }, // 単価
        3: { cellWidth: 40, halign: 'right' } // 金額
      },
      margin: { left: 20, right: 20 },
      tableWidth: 'wrap'
    });
    
    // Get final Y position after table
    yPos = (pdf as any).lastAutoTable.finalY + 10;
    
    // Summary section
    const summaryX = 130;
    pdf.setFontSize(11);
    
    pdf.text('小計:', summaryX, yPos);
    pdf.text(`¥${documentData.subtotal.toLocaleString()}`, rightX - 5, yPos, { align: 'right' });
    yPos += 7;
    
    pdf.text('消費税（10%）:', summaryX, yPos);
    pdf.text(`¥${documentData.tax.toLocaleString()}`, rightX - 5, yPos, { align: 'right' });
    yPos += 7;
    
    // Total line
    pdf.line(summaryX, yPos, rightX - 5, yPos);
    yPos += 7;
    
    pdf.setFontSize(14);
    pdf.text('合計金額:', summaryX, yPos);
    pdf.text(`¥${documentData.total.toLocaleString()}`, rightX - 5, yPos, { align: 'right' });
    
    yPos += 20;
    
    // Notes section
    if (documentData.notes) {
      pdf.setFontSize(12);
      pdf.text('備考:', 20, yPos);
      yPos += 8;
      
      pdf.setFontSize(10);
      const noteLines = pdf.splitTextToSize(documentData.notes, 150);
      noteLines.forEach((line: string) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 30;
        }
        pdf.text(line, 20, yPos);
        yPos += 6;
      });
    }
    
    // Convert to buffer
    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    
    console.log('[PDF] PDF generated successfully with Japanese support, size:', pdfBuffer.length);
    return pdfBuffer;
    
  } catch (error) {
    console.error('[PDF] Japanese PDF generation failed:', error);
    throw error;
  }
}

export async function generatePDFFromInvoiceData(invoice: any, companyInfo: any): Promise<Buffer> {
  const documentData: DocumentData = {
    documentType: 'invoice',
    documentNumber: invoice.invoiceNumber,
    issueDate: new Date(invoice.issueDate || invoice.invoiceDate || new Date()).toISOString().split('T')[0],
    dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
    partner: {
      name: invoice.customer?.companyName || invoice.customer?.name || invoice.customerSnapshot?.companyName || '',
      address: [
        invoice.customer?.postalCode ? `〒${invoice.customer.postalCode}` : '',
        invoice.customer?.prefecture || '',
        invoice.customer?.city || '',
        invoice.customer?.address1 || '',
        invoice.customer?.address2 || ''
      ].filter(Boolean).join(' '),
      phone: invoice.customer?.phone || '',
      email: invoice.customer?.email || '',
      postal_code: invoice.customer?.postalCode || ''
    },
    items: invoice.items.map((item: any) => ({
      name: item.description || item.itemName || '',
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || 0,
      taxRate: item.taxRate || 0.1,
      amount: item.amount || 0
    })),
    subtotal: invoice.subtotal || 0,
    tax: invoice.taxAmount || 0,
    total: invoice.totalAmount || 0,
    notes: invoice.notes || '',
    paymentTerms: invoice.paymentTerms || '銀行振込',
    paymentMethod: invoice.paymentMethod || 'bank_transfer',
    company: {
      name: companyInfo?.companyName || '会社名未設定',
      address: companyInfo ? [
        companyInfo.postalCode ? `〒${companyInfo.postalCode}` : '',
        companyInfo.prefecture || '',
        companyInfo.city || '',
        companyInfo.address1 || '',
        companyInfo.address2 || ''
      ].filter(Boolean).join(' ') : '',
      phone: companyInfo?.phone || '',
      email: companyInfo?.email || '',
      registrationNumber: companyInfo?.registrationNumber || ''
    },
    bankInfo: invoice.bankAccount ? {
      bankName: invoice.bankAccount.bankName,
      branchName: invoice.bankAccount.branchName,
      accountType: invoice.bankAccount.accountType,
      accountNumber: invoice.bankAccount.accountNumber,
      accountHolder: invoice.bankAccount.accountName
    } : undefined,
    projectName: `請求書 ${invoice.invoiceNumber}`
  };
  
  return generatePDFFromHTML(documentData);
}

// Generate filename with new naming convention: 請求日_帳表名_顧客名
export function generateInvoiceFilename(invoice: any): string {
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const customerName = invoice.customer?.companyName || 
                      invoice.customer?.name || 
                      invoice.customerSnapshot?.companyName || 
                      '顧客名未設定';
  
  // Clean customer name for filename (remove invalid characters)
  const cleanCustomerName = customerName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 20); // Limit length
  
  return `${dateStr}_請求書_${cleanCustomerName}.pdf`;
}