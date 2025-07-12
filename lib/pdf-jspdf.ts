import jsPDF from 'jspdf';
import { generateDocumentHTML } from './document-generator';
import { DocumentData } from './document-generator';

export async function generatePDFFromHTML(documentData: DocumentData): Promise<Buffer> {
  try {
    console.log('[PDF] Starting PDF generation with jsPDF');
    
    // Generate HTML content
    const htmlContent = generateDocumentHTML(documentData);
    
    // Create PDF using jsPDF with Japanese font support
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Set up basic styling
    pdf.setFont('helvetica');
    pdf.setFontSize(12);
    
    // Add title
    pdf.setFontSize(20);
    pdf.text('請求書', 105, 30, { align: 'center' });
    
    // Add customer info
    pdf.setFontSize(12);
    let yPos = 50;
    
    if (documentData.partner.name) {
      pdf.text(`${documentData.partner.name} 御中`, 20, yPos);
      yPos += 10;
    }
    
    if (documentData.partner.address) {
      pdf.text(documentData.partner.address, 20, yPos);
      yPos += 10;
    }
    
    if (documentData.partner.phone) {
      pdf.text(`TEL: ${documentData.partner.phone}`, 20, yPos);
      yPos += 10;
    }
    
    // Add document info (right side)
    pdf.text(`発行日: ${documentData.issueDate}`, 130, 50);
    pdf.text(`文書番号: ${documentData.documentNumber}`, 130, 60);
    
    if (documentData.dueDate) {
      pdf.text(`支払期限: ${documentData.dueDate}`, 130, 70);
    }
    
    // Add company info
    yPos = 90;
    if (documentData.company?.name) {
      pdf.text(documentData.company.name, 130, yPos);
      yPos += 8;
    }
    if (documentData.company?.address) {
      pdf.text(documentData.company.address, 130, yPos);
      yPos += 8;
    }
    if (documentData.company?.phone) {
      pdf.text(documentData.company.phone, 130, yPos);
      yPos += 8;
    }
    
    // Add items table
    yPos = 120;
    
    // Table headers
    pdf.setFontSize(10);
    pdf.text('品目・仕様', 20, yPos);
    pdf.text('数量', 120, yPos);
    pdf.text('単価', 140, yPos);
    pdf.text('金額', 170, yPos);
    
    // Table line
    pdf.line(20, yPos + 2, 190, yPos + 2);
    yPos += 10;
    
    // Items
    documentData.items.forEach((item, index) => {
      if (yPos > 250) {
        // Add new page if needed
        pdf.addPage();
        yPos = 30;
      }
      
      pdf.text(item.name || '', 20, yPos);
      pdf.text(item.quantity.toString(), 120, yPos);
      pdf.text(`¥${item.unitPrice.toLocaleString()}`, 140, yPos);
      pdf.text(`¥${item.amount.toLocaleString()}`, 170, yPos);
      yPos += 8;
    });
    
    // Add total section
    yPos += 10;
    pdf.line(120, yPos, 190, yPos);
    yPos += 10;
    
    pdf.text('小計:', 120, yPos);
    pdf.text(`¥${documentData.subtotal.toLocaleString()}`, 170, yPos);
    yPos += 8;
    
    pdf.text('消費税:', 120, yPos);
    pdf.text(`¥${documentData.tax.toLocaleString()}`, 170, yPos);
    yPos += 8;
    
    pdf.setFontSize(12);
    pdf.text('合計金額:', 120, yPos);
    pdf.text(`¥${documentData.total.toLocaleString()}`, 170, yPos);
    
    // Add notes if available
    if (documentData.notes) {
      yPos += 20;
      pdf.setFontSize(10);
      pdf.text('備考:', 20, yPos);
      yPos += 8;
      
      // Split notes into lines if too long
      const noteLines = pdf.splitTextToSize(documentData.notes, 150);
      noteLines.forEach((line: string) => {
        if (yPos > 280) {
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
    
    console.log('[PDF] PDF generated successfully with jsPDF, size:', pdfBuffer.length);
    return pdfBuffer;
    
  } catch (error) {
    console.error('[PDF] jsPDF PDF generation failed:', error);
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
      name: invoice.customer?.companyName || invoice.customer?.name || '',
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