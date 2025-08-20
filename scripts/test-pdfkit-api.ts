import { db } from '../lib/mongodb-client';
import { generateReceiptPDFWithPDFKit } from '../lib/pdf-receipt-pdfkit-generator';

const Collections = {
  RECEIPTS: 'receipts'
};

async function testPDFKitAPI() {
  console.log('=== PDFKit API Test ===');
  
  try {
    // Get a receipt from database
    const receipts = await db.find(Collections.RECEIPTS, {}, { limit: 1 });
    
    if (receipts.length === 0) {
      console.log('No receipts found');
      return;
    }
    
    const receipt = receipts[0];
    console.log('Testing with receipt:', receipt.receiptNumber);
    
    // Test PDFKit generation
    console.log('\nGenerating PDF with PDFKit...');
    const pdfBuffer = await generateReceiptPDFWithPDFKit(receipt);
    console.log('PDF generated successfully!');
    console.log('Size:', pdfBuffer.length);
    console.log('First bytes:', pdfBuffer.slice(0, 10).toString());
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test
testPDFKitAPI().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});