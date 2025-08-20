import { ReceiptService } from '../services/receipt.service';
import { generateReceiptPDFWithJsPDF } from '../lib/pdf-receipt-puppeteer-generator';
import { logger } from '../lib/logger';

async function testReceiptPDF() {
  try {
    console.log('=== Receipt PDF Test ===');
    console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
    console.log('USE_AZURE_MONGODB:', process.env.USE_AZURE_MONGODB);
    
    // Test receipt service
    const receiptService = new ReceiptService();
    console.log('\nFetching receipt...');
    
    // Try to get any receipt
    const searchResult = await receiptService.searchReceipts({ limit: 1 });
    const receipts = searchResult.receipts;
    
    if (!receipts || receipts.length === 0) {
      console.log('No receipts found in database');
      
      // Create a test receipt
      const testReceipt = {
        _id: 'test-id',
        receiptNumber: 'R2025-001',
        issueDate: new Date().toISOString(),
        customerName: 'テスト顧客',
        totalAmount: 10000,
        taxAmount: 1000,
        subtotal: 9000,
        taxRate: 0.1,
        subject: 'テスト商品',
        items: [
          {
            description: 'テスト項目1',
            quantity: 1,
            unit: '個',
            unitPrice: 9000,
            amount: 9000
          }
        ],
        issuerName: '株式会社テスト',
        issuerAddress: '東京都テスト区',
        issuerPhone: '03-1234-5678',
        notes: 'テスト用領収書です',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('\nUsing test receipt data');
      console.log('Generating PDF with jsPDF...');
      
      const pdfBuffer = await generateReceiptPDFWithJsPDF(testReceipt as any);
      console.log('PDF generated successfully!');
      console.log('PDF size:', pdfBuffer.length, 'bytes');
      
    } else {
      const receipt = receipts[0];
      console.log('Found receipt:', receipt.receiptNumber);
      
      console.log('\nGenerating PDF with jsPDF...');
      const pdfBuffer = await generateReceiptPDFWithJsPDF(receipt);
      console.log('PDF generated successfully!');
      console.log('PDF size:', pdfBuffer.length, 'bytes');
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
testReceiptPDF().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});