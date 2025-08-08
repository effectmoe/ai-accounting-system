const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkInvoiceCustomer() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'accounting');
    
    // 最新の請求書を取得
    const invoice = await db.collection('invoices').findOne(
      { invoiceNumber: 'INV-20250808-003' },
      { projection: { 
        invoiceNumber: 1,
        customerId: 1,
        customer: 1,
        customerSnapshot: 1
      }}
    );
    
    if (invoice) {
      console.log('=== 請求書情報 ===');
      console.log('請求書番号:', invoice.invoiceNumber);
      console.log('customerId:', invoice.customerId);
      console.log('customer._id:', invoice.customer?._id);
      console.log('customer.id:', invoice.customer?.id);
      console.log('customerSnapshot.email:', invoice.customerSnapshot?.email);
      console.log('customerSnapshot.companyName:', invoice.customerSnapshot?.companyName);
      
      // 顧客情報が含まれているか確認
      if (invoice.customer) {
        console.log('\n=== invoice.customer の内容 ===');
        console.log('_id:', invoice.customer._id);
        console.log('companyName:', invoice.customer.companyName);
        console.log('email:', invoice.customer.email);
        console.log('emailRecipientPreference:', invoice.customer.emailRecipientPreference);
        if (invoice.customer.contacts && invoice.customer.contacts.length > 0) {
          console.log('contacts[0].email:', invoice.customer.contacts[0].email);
        }
      }
    } else {
      console.log('請求書が見つかりません');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.close();
  }
}

checkInvoiceCustomer();