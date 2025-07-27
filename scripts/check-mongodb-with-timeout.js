#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkMongoDBData() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI環境変数が設定されていません');
    process.exit(1);
  }

  console.log('🔍 MongoDB接続中...');
  console.log('  Azure MongoDB: ' + process.env.USE_AZURE_MONGODB);
  
  // タイムアウトを30秒に設定
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  });

  try {
    await client.connect();
    console.log('✅ MongoDB接続成功');

    const db = client.db('accounting');
    
    // 利用可能なコレクションを表示
    const collections = await db.listCollections().toArray();
    console.log('\n📋 利用可能なコレクション:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // 各コレクションのドキュメント数を確認
    console.log('\n📊 コレクションのドキュメント数:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  ${col.name}: ${count}件`);
    }

    // invoicesコレクションの詳細確認
    if (collections.some(col => col.name === 'invoices')) {
      console.log('\n💰 invoicesコレクションの詳細:');
      
      // フィールドの構造を確認
      const sample = await db.collection('invoices').findOne();
      if (sample) {
        console.log('\n  サンプルドキュメントのフィールド:');
        Object.keys(sample).forEach(key => {
          const value = sample[key];
          const type = Array.isArray(value) ? 'array' : typeof value;
          console.log(`    ${key}: ${type}`);
        });
        
        // 金額フィールドの値を確認
        console.log('\n  金額関連フィールドの値:');
        console.log(`    amount: ${sample.amount}`);
        console.log(`    totalAmount: ${sample.totalAmount}`);
        console.log(`    subtotal: ${sample.subtotal}`);
        console.log(`    tax: ${sample.tax}`);
      }

      // nullまたは0の金額を持つドキュメントを確認
      const zeroAmounts = await db.collection('invoices').countDocuments({
        $or: [
          { amount: null },
          { amount: 0 },
          { amount: { $exists: false } }
        ]
      });
      console.log(`\n  金額が0またはnullのドキュメント: ${zeroAmounts}件`);

      // 有効な金額を持つドキュメントを確認
      const validAmounts = await db.collection('invoices').countDocuments({
        amount: { $gt: 0 }
      });
      console.log(`  有効な金額（amount > 0）のドキュメント: ${validAmounts}件`);
    }

  } catch (error) {
    console.error('\n❌ エラー:', error.message);
    
    if (error.message.includes('ETIMEDOUT')) {
      console.log('\n💡 接続タイムアウトの可能性:');
      console.log('  1. MongoDB AtlasのIPホワイトリストを確認してください');
      console.log('  2. ネットワーク接続を確認してください');
      console.log('  3. VPNを使用している場合は無効にしてみてください');
    }
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続を閉じました');
  }
}

// スクリプトを実行
checkMongoDBData();