import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DocumentData } from './document-generator';

// 日本語テキストを安全な形式に変換
function convertJapaneseText(text: string): string {
  if (!text) return '';
  
  // 日本語文字を含む場合はローマ字に変換または英語表記に
  const translations: { [key: string]: string } = {
    '請求書': 'Invoice',
    '御中': 'Co., Ltd.',
    '発行日': 'Issue Date',
    '文書番号': 'Document No.',
    '支払期限': 'Due Date',
    '品目・仕様': 'Description',
    '数量': 'Qty',
    '単価': 'Unit Price',
    '金額': 'Amount',
    '小計': 'Subtotal',
    '消費税': 'Tax',
    '合計金額': 'Total',
    '備考': 'Notes',
    '円': 'JPY',
    '株式会社': 'Co., Ltd.',
    '有限会社': 'Ltd.',
    '商事': 'Trading',
    '山田': 'Yamada',
    '谷川': 'Tanigawa',
    '田中': 'Tanaka',
    '佐藤': 'Sato',
    '鈴木': 'Suzuki',
    '高橋': 'Takahashi',
    '工業': 'Industry',
    '製作所': 'Manufacturing',
    'システム構築費': 'System Development',
    'システム保守料': 'System Maintenance',
    '年間契約': 'Annual Contract',
    'ヶ月分': 'months'
  };
  
  let convertedText = text;
  
  // 翻訳辞書を使用して変換
  Object.entries(translations).forEach(([japanese, english]) => {
    convertedText = convertedText.replace(new RegExp(japanese, 'g'), english);
  });
  
  // 残った日本語文字を安全な文字に置換
  convertedText = convertedText.replace(/[^\x00-\x7F]/g, '?');
  
  return convertedText;
}

// 数値のフォーマット（日本語通貨記号を避ける）
function formatCurrency(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

// 日本語フォントの設定
function setupJapaneseFont(pdf: jsPDF) {
  try {
    // 安全なフォントを使用
    pdf.setFont('helvetica');
  } catch (error) {
    console.warn('Font setup failed, using default font:', error);
    pdf.setFont('helvetica');
  }
}

export async function generatePDFFromHTML(documentData: DocumentData): Promise<Buffer> {
  try {
    console.log('[PDF] Starting PDF generation with Japanese support');
    console.log('[PDF] Document data:', JSON.stringify({
      documentType: documentData.documentType,
      documentNumber: documentData.documentNumber,
      issueDate: documentData.issueDate,
      partnerName: documentData.partner?.name,
      itemsCount: documentData.items?.length,
      total: documentData.total
    }, null, 2));
    
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
    pdf.text(convertJapaneseText('請求書'), 105, yPos, { align: 'center' });
    yPos += 20;
    
    // Document info (right aligned)
    pdf.setFontSize(12);
    const rightX = 180;
    pdf.text(`${convertJapaneseText('発行日')}: ${documentData.issueDate}`, rightX, yPos, { align: 'right' });
    yPos += 7;
    pdf.text(`${convertJapaneseText('文書番号')}: ${documentData.documentNumber}`, rightX, yPos, { align: 'right' });
    yPos += 7;
    
    if (documentData.dueDate) {
      pdf.text(`${convertJapaneseText('支払期限')}: ${documentData.dueDate}`, rightX, yPos, { align: 'right' });
      yPos += 7;
    }
    
    yPos += 10;
    
    // Customer section
    pdf.setFontSize(16);
    pdf.text(`${convertJapaneseText(documentData.partner.name)} ${convertJapaneseText('御中')}`, 20, yPos);
    yPos += 10;
    
    pdf.setFontSize(10);
    if (documentData.partner.address) {
      pdf.text(convertJapaneseText(documentData.partner.address), 20, yPos);
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
      pdf.text(convertJapaneseText(documentData.company.name), rightX, yPos, { align: 'right' });
      yPos += 8;
    }
    
    pdf.setFontSize(10);
    if (documentData.company?.address) {
      const addressLines = pdf.splitTextToSize(convertJapaneseText(documentData.company.address), 50);
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
    pdf.text(convertJapaneseText('合計金額'), 25, yPos + 5);
    pdf.setFontSize(18);
    pdf.text(`${formatCurrency(documentData.total)} (Tax Incl.)`, rightX - 5, yPos + 8, { align: 'right' });
    
    yPos += 25;
    
    // Items table using autoTable
    const tableColumns = [
      { header: convertJapaneseText('品目・仕様'), dataKey: 'name' },
      { header: convertJapaneseText('数量'), dataKey: 'quantity' },
      { header: convertJapaneseText('単価'), dataKey: 'unitPrice' },
      { header: convertJapaneseText('金額'), dataKey: 'amount' }
    ];
    
    const tableData = documentData.items.map(item => ({
      name: convertJapaneseText(item.name || ''),
      quantity: item.quantity.toString(),
      unitPrice: formatCurrency(item.unitPrice),
      amount: formatCurrency(item.amount)
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
    
    pdf.text(`${convertJapaneseText('小計')}:`, summaryX, yPos);
    pdf.text(formatCurrency(documentData.subtotal), rightX - 5, yPos, { align: 'right' });
    yPos += 7;
    
    pdf.text(`${convertJapaneseText('消費税')}(10%):`, summaryX, yPos);
    pdf.text(formatCurrency(documentData.tax), rightX - 5, yPos, { align: 'right' });
    yPos += 7;
    
    // Total line
    pdf.line(summaryX, yPos, rightX - 5, yPos);
    yPos += 7;
    
    pdf.setFontSize(14);
    pdf.text(`${convertJapaneseText('合計金額')}:`, summaryX, yPos);
    pdf.text(formatCurrency(documentData.total), rightX - 5, yPos, { align: 'right' });
    
    yPos += 20;
    
    // Notes section
    if (documentData.notes) {
      pdf.setFontSize(12);
      pdf.text(`${convertJapaneseText('備考')}:`, 20, yPos);
      yPos += 8;
      
      pdf.setFontSize(10);
      const convertedNotes = convertJapaneseText(documentData.notes);
      const noteLines = pdf.splitTextToSize(convertedNotes, 150);
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
  
  // 日本語の顧客名を維持（ファイル名に使えない文字のみ置換）
  const cleanCustomerName = customerName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 20); // 長さ制限
  
  return `${dateStr}_請求書_${cleanCustomerName}.pdf`;
}

// Generate filename with ASCII-safe format (for Content-Disposition header)
export function generateSafeFilename(invoice: any): string {
  const issueDate = new Date(invoice.issueDate || invoice.invoiceDate || new Date());
  const dateStr = issueDate.toISOString().split('T')[0].replace(/-/g, '');
  
  const customerName = invoice.customer?.companyName || 
                      invoice.customer?.name || 
                      invoice.customerSnapshot?.companyName || 
                      'Customer';
  
  // Convert Japanese customer name to safe ASCII format
  const convertedCustomerName = convertJapaneseText(customerName);
  
  // Clean customer name for filename (remove invalid characters)
  const cleanCustomerName = convertedCustomerName
    .replace(/[<>:"/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^\x00-\x7F]/g, '_') // Remove any remaining non-ASCII
    .substring(0, 20); // Limit length
  
  return `${dateStr}_Invoice_${cleanCustomerName}.pdf`;
}