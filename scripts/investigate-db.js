import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-db';
console.log('Using MongoDB URI:', uri.replace(/:[^:]*@/, ':****@')); // Log URI with masked password

async function investigateDatabase() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Investigate invoices collection
    console.log('\n=== INVOICES COLLECTION ===');
    const invoices = await db.collection('invoices').find({}).toArray();
    console.log(`Document count: ${invoices.length}`);
    
    let invoicesTotal = 0;
    invoices.forEach((invoice, index) => {
      console.log(`\nInvoice ${index + 1}:`);
      console.log(`  ID: ${invoice._id}`);
      console.log(`  Invoice Number: ${invoice.invoiceNumber}`);
      console.log(`  Customer: ${invoice.customerName}`);
      console.log(`  Amount: ¥${invoice.amount?.toLocaleString()}`);
      console.log(`  Status: ${invoice.status}`);
      console.log(`  Date: ${invoice.invoiceDate}`);
      invoicesTotal += invoice.amount || 0;
    });
    console.log(`\nTotal Invoices Amount: ¥${invoicesTotal.toLocaleString()}`);
    
    // Investigate quotes collection
    console.log('\n\n=== QUOTES COLLECTION ===');
    const quotes = await db.collection('quotes').find({}).toArray();
    console.log(`Document count: ${quotes.length}`);
    
    let quotesTotal = 0;
    quotes.forEach((quote, index) => {
      console.log(`\nQuote ${index + 1}:`);
      console.log(`  ID: ${quote._id}`);
      console.log(`  Quote Number: ${quote.quoteNumber}`);
      console.log(`  Customer: ${quote.customerName}`);
      console.log(`  Amount: ¥${quote.amount?.toLocaleString()}`);
      console.log(`  Status: ${quote.status}`);
      console.log(`  Date: ${quote.quoteDate}`);
      
      // Check if this might be a supplier quote
      if (quote.supplierName || quote.type === 'supplier') {
        console.log(`  ⚠️  POSSIBLE SUPPLIER QUOTE DETECTED!`);
        console.log(`  Supplier Name: ${quote.supplierName || 'N/A'}`);
        console.log(`  Type: ${quote.type || 'N/A'}`);
      }
      
      quotesTotal += quote.amount || 0;
    });
    console.log(`\nTotal Quotes Amount: ¥${quotesTotal.toLocaleString()}`);
    
    // Investigate supplierQuotes collection
    console.log('\n\n=== SUPPLIER QUOTES COLLECTION ===');
    const supplierQuotes = await db.collection('supplierQuotes').find({}).toArray();
    console.log(`Document count: ${supplierQuotes.length}`);
    
    let supplierQuotesTotal = 0;
    supplierQuotes.forEach((quote, index) => {
      console.log(`\nSupplier Quote ${index + 1}:`);
      console.log(`  ID: ${quote._id}`);
      console.log(`  Quote Number: ${quote.quoteNumber}`);
      console.log(`  Supplier: ${quote.supplierName}`);
      console.log(`  Amount: ¥${quote.amount?.toLocaleString()}`);
      console.log(`  Status: ${quote.status}`);
      console.log(`  Date: ${quote.quoteDate}`);
      supplierQuotesTotal += quote.amount || 0;
    });
    console.log(`\nTotal Supplier Quotes Amount: ¥${supplierQuotesTotal.toLocaleString()}`);
    
    // Investigate purchaseInvoices collection
    console.log('\n\n=== PURCHASE INVOICES COLLECTION ===');
    const purchaseInvoices = await db.collection('purchaseInvoices').find({}).toArray();
    console.log(`Document count: ${purchaseInvoices.length}`);
    
    let purchaseInvoicesTotal = 0;
    purchaseInvoices.forEach((invoice, index) => {
      console.log(`\nPurchase Invoice ${index + 1}:`);
      console.log(`  ID: ${invoice._id}`);
      console.log(`  Invoice Number: ${invoice.invoiceNumber}`);
      console.log(`  Supplier: ${invoice.supplierName}`);
      console.log(`  Amount: ¥${invoice.amount?.toLocaleString()}`);
      console.log(`  Status: ${invoice.status}`);
      console.log(`  Date: ${invoice.invoiceDate}`);
      purchaseInvoicesTotal += invoice.amount || 0;
    });
    console.log(`\nTotal Purchase Invoices Amount: ¥${purchaseInvoicesTotal.toLocaleString()}`);
    
    // Summary
    console.log('\n\n=== SUMMARY ===');
    console.log(`Invoices Total: ¥${invoicesTotal.toLocaleString()}`);
    console.log(`Quotes Total: ¥${quotesTotal.toLocaleString()}`);
    console.log(`Supplier Quotes Total: ¥${supplierQuotesTotal.toLocaleString()}`);
    console.log(`Purchase Invoices Total: ¥${purchaseInvoicesTotal.toLocaleString()}`);
    console.log(`\nPossible incorrect total (Invoices + Quotes): ¥${(invoicesTotal + quotesTotal).toLocaleString()}`);
    console.log(`Dashboard showing: ¥4,616,800`);
    
    // Check if the dashboard total matches any combination
    const combinations = [
      { name: 'Invoices + Quotes', total: invoicesTotal + quotesTotal },
      { name: 'Invoices + Quotes + Supplier Quotes', total: invoicesTotal + quotesTotal + supplierQuotesTotal },
      { name: 'All collections', total: invoicesTotal + quotesTotal + supplierQuotesTotal + purchaseInvoicesTotal },
    ];
    
    console.log('\n=== CHECKING POSSIBLE COMBINATIONS ===');
    combinations.forEach(combo => {
      console.log(`${combo.name}: ¥${combo.total.toLocaleString()}`);
      if (combo.total === 4616800) {
        console.log(`  ⚠️  THIS MATCHES THE DASHBOARD VALUE!`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

investigateDatabase();