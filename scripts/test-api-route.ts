import { ReceiptService } from '../services/receipt.service';
import { generateReceiptHTML } from '../lib/receipt-html-generator';
import { generateReceiptPDFWithJsPDF } from '../lib/pdf-receipt-puppeteer-generator';
import { logger } from '../lib/logger';

async function testAPIRoute() {
  try {
    console.log('=== API Route Test ===');
    
    const receiptId = 'REC-0000000007';
    console.log('Testing with receipt ID:', receiptId);
    
    // Test receipt service
    const receiptService = new ReceiptService();
    console.log('\n1. Testing receipt service...');
    
    const receipt = await receiptService.getReceipt(receiptId);
    
    if (!receipt) {
      console.log('Receipt not found:', receiptId);
      return;
    }
    
    console.log('Receipt found:', receipt.receiptNumber);
    console.log('Customer:', receipt.customerName);
    console.log('Amount:', receipt.totalAmount);
    
    // Test HTML generation
    console.log('\n2. Testing HTML generation...');
    try {
      const html = generateReceiptHTML(receipt);
      console.log('HTML generated successfully, length:', html.length);
    } catch (error) {
      console.error('HTML generation failed:', error);
    }
    
    // Test PDF generation
    console.log('\n3. Testing PDF generation with jsPDF...');
    try {
      const pdfBuffer = await generateReceiptPDFWithJsPDF(receipt);
      console.log('PDF generated successfully, size:', pdfBuffer.length);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Run test
testAPIRoute().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});