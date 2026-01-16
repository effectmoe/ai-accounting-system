import { renderToBuffer } from '@react-pdf/renderer';
import { InvoicePDF, DeliveryNotePDF } from './pdf-generator';
import { ReceiptPDF } from './pdf-receipt-generator';
import { logger } from './logger';

/**
 * 請求書PDF生成（@react-pdf/renderer使用）
 */
export async function generateInvoicePDFWithPuppeteer(invoice: any, companyInfo: any): Promise<Buffer> {
  try {
    logger.info('[PDF] Generating invoice PDF with @react-pdf/renderer:', invoice.invoiceNumber);
    const pdfBuffer = await renderToBuffer(
      InvoicePDF({ invoice, companyInfo })
    );
    logger.info('[PDF] Invoice PDF generated successfully, size:', pdfBuffer.length);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    logger.error('[PDF] Error generating invoice PDF:', error);
    throw error;
  }
}

/**
 * 領収書PDF生成（@react-pdf/renderer使用）
 */
export async function generateReceiptPDFWithPuppeteer(receipt: any, companyInfo: any): Promise<Buffer> {
  try {
    logger.info('[PDF] Generating receipt PDF with @react-pdf/renderer:', receipt.receiptNumber);
    const pdfBuffer = await renderToBuffer(
      ReceiptPDF({ receipt, companyInfo })
    );
    logger.info('[PDF] Receipt PDF generated successfully, size:', pdfBuffer.length);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    logger.error('[PDF] Error generating receipt PDF:', error);
    throw error;
  }
}

/**
 * 納品書PDF生成（@react-pdf/renderer使用）
 */
export async function generateDeliveryNotePDFWithPuppeteer(deliveryNote: any, companyInfo: any): Promise<Buffer> {
  try {
    logger.info('[PDF] Generating delivery note PDF with @react-pdf/renderer:', deliveryNote.deliveryNoteNumber);
    const pdfBuffer = await renderToBuffer(
      DeliveryNotePDF({ deliveryNote, customer: deliveryNote.customer })
    );
    logger.info('[PDF] Delivery note PDF generated successfully, size:', pdfBuffer.length);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    logger.error('[PDF] Error generating delivery note PDF:', error);
    throw error;
  }
}