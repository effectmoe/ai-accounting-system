import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { generateDocumentHTML } from './document-generator';
import { DocumentData } from './document-generator';

export async function generatePDFFromHTML(documentData: DocumentData): Promise<Buffer> {
  let browser;
  
  try {
    console.log('[PDF] Starting PDF generation with Puppeteer on Vercel');
    
    // Generate HTML content
    const htmlContent = generateDocumentHTML(documentData);
    
    // Launch browser with Vercel-optimized settings
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    
    const page = await browser.newPage();
    
    // Set content and wait for fonts to load
    await page.setContent(htmlContent, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '15mm',
        bottom: '20mm',
        left: '15mm'
      }
    });
    
    console.log('[PDF] PDF generated successfully, size:', pdfBuffer.length);
    return pdfBuffer;
    
  } catch (error) {
    console.error('[PDF] Puppeteer PDF generation failed:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
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