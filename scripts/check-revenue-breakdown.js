const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || process.env.MASTRA_MONGODB_URI;
const DB_NAME = 'accounting';

async function checkRevenueBreakdown() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DB_NAME);
    
    // 1. invoicesコレクションの詳細確認
    console.log('🎯 === INVOICES COLLECTION ===');
    const invoices = await db.collection('invoices').find({}).toArray();
    console.log(`Total invoices count: ${invoices.length}`);
    
    // ステータス別に集計
    const invoicesByStatus = {};
    let totalInvoiceAmount = 0;
    let paidAndSentAmount = 0;
    
    invoices.forEach(invoice => {
      const status = invoice.status || 'no_status';
      if (!invoicesByStatus[status]) {
        invoicesByStatus[status] = { count: 0, totalAmount: 0, documents: [] };
      }
      invoicesByStatus[status].count++;
      invoicesByStatus[status].totalAmount += invoice.totalAmount || 0;
      invoicesByStatus[status].documents.push({
        number: invoice.invoiceNumber,
        customer: invoice.customerName || invoice.customerId,
        amount: invoice.totalAmount || 0,
        date: invoice.issueDate || invoice.createdAt,
        status: invoice.status
      });
      
      totalInvoiceAmount += invoice.totalAmount || 0;
      
      if (status === 'paid' || status === 'sent') {
        paidAndSentAmount += invoice.totalAmount || 0;
      }
    });
    
    console.log('\nInvoices by status:');
    Object.entries(invoicesByStatus).forEach(([status, data]) => {
      console.log(`- ${status}: ${data.count} invoices, ¥${data.totalAmount.toLocaleString()}`);
      data.documents.forEach(doc => {
        console.log(`  • ${doc.number} - ${doc.customer} - ¥${doc.amount.toLocaleString()} - ${new Date(doc.date).toLocaleDateString('ja-JP')}`);
      });
    });
    
    console.log(`\nTotal amount from all invoices: ¥${totalInvoiceAmount.toLocaleString()}`);
    console.log(`Amount from paid/sent invoices: ¥${paidAndSentAmount.toLocaleString()}`);
    
    // 2. quotesコレクションの詳細確認
    console.log('\n\n🎯 === QUOTES COLLECTION ===');
    const quotes = await db.collection('quotes').find({}).toArray();
    console.log(`Total quotes count: ${quotes.length}`);
    
    // ステータス別に集計
    const quotesByStatus = {};
    let totalQuoteAmount = 0;
    let acceptedAndConvertedAmount = 0;
    
    quotes.forEach(quote => {
      const status = quote.status || 'no_status';
      if (!quotesByStatus[status]) {
        quotesByStatus[status] = { count: 0, totalAmount: 0, documents: [] };
      }
      quotesByStatus[status].count++;
      quotesByStatus[status].totalAmount += quote.totalAmount || 0;
      quotesByStatus[status].documents.push({
        number: quote.quoteNumber,
        customer: quote.customerName || quote.customerId,
        amount: quote.totalAmount || 0,
        date: quote.issueDate || quote.createdAt,
        status: quote.status
      });
      
      totalQuoteAmount += quote.totalAmount || 0;
      
      if (status === 'accepted' || status === 'converted') {
        acceptedAndConvertedAmount += quote.totalAmount || 0;
      }
    });
    
    console.log('\nQuotes by status:');
    Object.entries(quotesByStatus).forEach(([status, data]) => {
      console.log(`- ${status}: ${data.count} quotes, ¥${data.totalAmount.toLocaleString()}`);
      data.documents.forEach(doc => {
        console.log(`  • ${doc.number} - ${doc.customer} - ¥${doc.amount.toLocaleString()} - ${new Date(doc.date).toLocaleDateString('ja-JP')}`);
      });
    });
    
    console.log(`\nTotal amount from all quotes: ¥${totalQuoteAmount.toLocaleString()}`);
    console.log(`Amount from accepted/converted quotes: ¥${acceptedAndConvertedAmount.toLocaleString()}`);
    
    // 3. 総収益の計算
    console.log('\n\n💰 === TOTAL REVENUE CALCULATION ===');
    const totalRevenue = paidAndSentAmount + acceptedAndConvertedAmount;
    console.log(`Revenue from invoices (paid/sent): ¥${paidAndSentAmount.toLocaleString()}`);
    console.log(`Revenue from quotes (accepted/converted): ¥${acceptedAndConvertedAmount.toLocaleString()}`);
    console.log(`-----------------------------------------`);
    console.log(`TOTAL REVENUE: ¥${totalRevenue.toLocaleString()}`);
    
    // 4. その他のコレクションの確認
    console.log('\n\n📋 === OTHER COLLECTIONS ===');
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    for (const collectionName of collectionNames) {
      if (!['invoices', 'quotes'].includes(collectionName)) {
        const count = await db.collection(collectionName).countDocuments();
        console.log(`- ${collectionName}: ${count} documents`);
        
        // totalAmountフィールドを持つドキュメントがあるか確認
        const docsWithAmount = await db.collection(collectionName).find({ totalAmount: { $exists: true } }).limit(5).toArray();
        if (docsWithAmount.length > 0) {
          console.log(`  → Contains totalAmount field. Sample documents:`);
          docsWithAmount.forEach(doc => {
            console.log(`    • ${doc._id} - ¥${(doc.totalAmount || 0).toLocaleString()} - Status: ${doc.status}`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

checkRevenueBreakdown().catch(console.error);