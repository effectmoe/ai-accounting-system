import { db } from '../lib/mongodb-client';

const Collections = {
  RECEIPTS: 'receipts',
  CUSTOMERS: 'customers'
};

async function testDBConnection() {
  console.log('=== Database Connection Test ===');
  console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
  console.log('USE_AZURE_MONGODB:', process.env.USE_AZURE_MONGODB);
  
  try {
    // Test basic connection by finding receipts
    console.log('\nTesting database connection...');
    const receipts = await db.find(Collections.RECEIPTS, {}, { limit: 1 });
    console.log('Successfully connected to database');
    console.log('Found receipts:', receipts.length);
    
    if (receipts.length > 0) {
      console.log('First receipt:', {
        id: receipts[0]._id,
        receiptNumber: receipts[0].receiptNumber,
        customerName: receipts[0].customerName
      });
    }
    
    // Test findById
    if (receipts.length > 0) {
      console.log('\nTesting findById...');
      const receipt = await db.findById(Collections.RECEIPTS, receipts[0]._id.toString());
      console.log('Found by ID:', receipt ? receipt.receiptNumber : 'null');
    }
    
  } catch (error) {
    console.error('Database test failed:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Run test
testDBConnection().then(() => {
  console.log('\n=== Test Complete ===');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});