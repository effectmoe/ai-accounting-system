const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkCustomerDataMapping() {
  const client = new MongoClient(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  try {
    await client.connect();
    console.log('✅ MongoDB接続成功');
    
    // MongoDBのURIからデータベース名を抽出
    const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
    const dbNameMatch = mongoUri.match(/\/([^/?]+)\?/);
    const dbName = dbNameMatch ? dbNameMatch[1] : 'accounting';
    
    console.log(`📁 使用するデータベース: ${dbName}`);
    const db = client.db(dbName);
    const collection = db.collection('customers');
    
    // 最新の顧客データを5件取得
    const customers = await collection.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`\n📊 最新の顧客データ ${customers.length} 件を確認:`);
    
    customers.forEach((customer, index) => {
      console.log(`\n========== 顧客 ${index + 1} ==========`);
      console.log(`会社名: ${customer.companyName}`);
      console.log(`\n住所情報の詳細:`);
      console.log(`  郵便番号: ${customer.postalCode || '(未設定)'}`);
      console.log(`  都道府県: ${customer.prefecture || '(未設定)'}`);
      console.log(`  市区町村: ${customer.city || '(未設定)'}`);
      console.log(`  住所1: ${customer.address1 || '(未設定)'}`);
      console.log(`  住所2: ${customer.address2 || '(未設定)'}`);
      console.log(`\n連絡先情報:`);
      console.log(`  電話番号: ${customer.phone || '(未設定)'}`);
      console.log(`  FAX: ${customer.fax || '(未設定)'}`);
      console.log(`  メール: ${customer.email || '(未設定)'}`);
      console.log(`  ウェブサイト: ${customer.website || '(未設定)'}`);
      
      // 特定の会社名の詳細確認
      if (customer.companyName && customer.companyName.includes('ペイプランニング')) {
        console.log(`\n🔍 ペイプランニングワークスの詳細データ:`);
        console.log(JSON.stringify(customer, null, 2));
      }
    });
    
    // 住所フィールドに問題がありそうなデータを検索
    console.log('\n\n🚨 住所データに問題がありそうな顧客を検索:');
    
    // 郵便番号が100-0001の顧客
    const wrongPostalCode = await collection.find({ postalCode: '100-0001' }).toArray();
    if (wrongPostalCode.length > 0) {
      console.log(`\n郵便番号が「100-0001」の顧客: ${wrongPostalCode.length} 件`);
      wrongPostalCode.forEach(c => {
        console.log(`  - ${c.companyName}: ${c.prefecture} ${c.city} ${c.address1}`);
      });
    }
    
    // 都道府県に「市」が含まれる顧客
    const wrongPrefecture = await collection.find({ 
      prefecture: { $regex: '市', $options: 'i' } 
    }).toArray();
    if (wrongPrefecture.length > 0) {
      console.log(`\n都道府県フィールドに「市」が含まれる顧客: ${wrongPrefecture.length} 件`);
      wrongPrefecture.forEach(c => {
        console.log(`  - ${c.companyName}: 都道府県="${c.prefecture}" 市区町村="${c.city}"`);
      });
    }
    
    // 住所2に「〇〇ビル」のような不自然なデータ
    const wrongAddress2 = await collection.find({ 
      address2: { $regex: '^〇', $options: 'i' } 
    }).toArray();
    if (wrongAddress2.length > 0) {
      console.log(`\n住所2に「〇〇」が含まれる顧客: ${wrongAddress2.length} 件`);
      wrongAddress2.forEach(c => {
        console.log(`  - ${c.companyName}: 住所2="${c.address2}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続を閉じました');
  }
}

checkCustomerDataMapping().catch(console.error);