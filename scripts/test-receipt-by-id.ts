import { db } from '../lib/mongodb-client';
import { ReceiptService } from '../services/receipt.service';
import { generateReceiptPDFWithJsPDF } from '../lib/pdf-receipt-puppeteer-generator';

const Collections = {
  RECEIPTS: 'receipts'
};

async function testReceiptById() {
  console.log('=== Receipt by ID Test ===');
  
  try {
    // First, get a real receipt ID from database
    console.log('\n1. Getting receipt from database...');
    const receipts = await db.find(Collections.RECEIPTS, {}, { limit: 1 });
    
    if (receipts.length === 0) {
      console.log('No receipts found in database');
      return;
    }
    
    const dbReceipt = receipts[0];
    const receiptId = dbReceipt._id.toString();
    console.log('Found receipt with ID:', receiptId);
    console.log('Receipt number:', dbReceipt.receiptNumber);
    
    // Test receipt service with real ID
    console.log('\n2. Testing ReceiptService.getReceipt with real ID...');
    const receiptService = new ReceiptService();
    
    try {
      const receipt = await receiptService.getReceipt(receiptId);
      if (receipt) {
        console.log('Successfully retrieved receipt:', receipt.receiptNumber);
        console.log('Customer:', receipt.customerName);
        
        // Test PDF generation
        console.log('\n3. Testing PDF generation...');
        const pdfBuffer = await generateReceiptPDFWithJsPDF(receipt);
        console.log('PDF generated successfully, size:', pdfBuffer.length);
        
        // Save the real ID for testing
        console.log('\n✅ Use this URL for testing:');
        console.log(`http://localhost:3000/api/receipts/${receiptId}/pdf?format=pdf&engine=jspdf`);
        
      } else {
        console.log('Receipt not found by service');
      }
    } catch (error) {
      console.error('ReceiptService.getReceipt failed:', error);
    }
    
    // Also test with receipt number (might be used in some cases)
    console.log('\n4. Testing with receipt number as ID...');
    try {
      const receiptByNumber = await receiptService.getReceipt(dbReceipt.receiptNumber);
      if (receiptByNumber) {
        console.log('Found by receipt number:', receiptByNumber.receiptNumber);
      } else {
        console.log('Not found by receipt number (expected)');
      }
    } catch (error) {
      console.log('Failed with receipt number (expected):', error.message);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run test
testReceiptById().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});