const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkCustomerEmailPreference() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'accounting');
    
    // ピアソラ様の顧客情報を検索
    const customer = await db.collection('customers').findOne({
      $or: [
        { companyName: 'ピアソラ' },
        { companyName: { $regex: 'ピアソラ', $options: 'i' } },
        { email: 'info@piazzolla.co.jp' }
      ]
    });
    
    if (customer) {
      console.log('=== 顧客情報 ===');
      console.log('会社名:', customer.companyName);
      console.log('顧客ID:', customer._id);
      console.log('代表メール:', customer.email);
      console.log('\n=== メール送信設定 ===');
      console.log('emailRecipientPreference:', customer.emailRecipientPreference || '未設定');
      
      if (customer.contacts && customer.contacts.length > 0) {
        console.log('\n=== 担当者情報 ===');
        customer.contacts.forEach((contact, idx) => {
          console.log(`担当者${idx + 1}:`, contact.name);
          console.log('  メール:', contact.email);
          console.log('  主担当:', contact.isPrimary ? 'はい' : 'いいえ');
        });
        
        if (customer.primaryContactIndex !== undefined) {
          console.log('\n主担当者インデックス:', customer.primaryContactIndex);
        }
      }
    } else {
      console.log('顧客が見つかりません');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.close();
  }
}

checkCustomerEmailPreference();