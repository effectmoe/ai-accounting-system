// 顧客データを作成するスクリプト
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-automation';

async function seedCustomers() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const customersCollection = db.collection('customers');
    
    // テスト用顧客データ
    const testCustomers = [
      {
        name: '株式会社テストカンパニー',
        companyName: '株式会社テストカンパニー',
        email: 'test@testcompany.co.jp',
        phone: '03-1234-5678',
        address: '東京都千代田区丸の内1-1-1',
        company: '株式会社テストカンパニー',
        postalCode: '100-0005',
        prefecture: '東京都',
        city: '千代田区',
        address1: '丸の内1-1-1',
        isActive: true,
        contacts: [],
        tags: ['テスト'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'サンプル商事株式会社',
        companyName: 'サンプル商事株式会社',
        email: 'info@sample-shoji.jp',
        phone: '06-9876-5432',
        address: '大阪府大阪市北区梅田2-2-2',
        company: 'サンプル商事株式会社',
        postalCode: '530-0001',
        prefecture: '大阪府',
        city: '大阪市北区',
        address1: '梅田2-2-2',
        isActive: true,
        contacts: [],
        tags: ['サンプル'],
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: '山田商事',
        companyName: '山田商事',
        email: 'yamada@yamada-shoji.com',
        phone: '045-123-4567',
        address: '神奈川県横浜市西区みなとみらい3-3-3',
        company: '山田商事',
        postalCode: '220-0012',
        prefecture: '神奈川県',
        city: '横浜市西区',
        address1: 'みなとみらい3-3-3',
        isActive: true,
        contacts: [],
        tags: ['重要顧客'],
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    // 既存の顧客をチェック
    for (const customer of testCustomers) {
      const existing = await customersCollection.findOne({ email: customer.email });
      if (!existing) {
        const result = await customersCollection.insertOne(customer);
        console.log(`Created customer: ${customer.companyName} (${result.insertedId})`);
      } else {
        console.log(`Customer already exists: ${customer.companyName}`);
      }
    }
    
    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error seeding customers:', error);
  } finally {
    await client.close();
  }
}

seedCustomers();