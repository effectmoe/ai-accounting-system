#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkDashboardRevenue() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI環境変数が設定されていません');
    process.exit(1);
  }

  console.log('🔍 MongoDB接続中...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB接続成功');

    const db = client.db('accounting');
    
    // 利用可能なコレクションを表示
    const collections = await db.listCollections().toArray();
    console.log('\n📋 利用可能なコレクション:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // invoicesコレクションのデータを確認
    const invoicesExists = collections.some(col => col.name === 'invoices');
    if (invoicesExists) {
      console.log('\n💰 invoicesコレクションの確認:');
      
      // ドキュメント数
      const count = await db.collection('invoices').countDocuments();
      console.log(`  総ドキュメント数: ${count}`);

      // サンプルデータを3件取得
      const samples = await db.collection('invoices').find({}).limit(3).toArray();
      console.log('\n  サンプルデータ (最大3件):');
      samples.forEach((doc, index) => {
        console.log(`\n  ${index + 1}. Invoice ID: ${doc._id}`);
        console.log(`     Status: ${doc.status}`);
        console.log(`     Amount: ${doc.amount}`);
        console.log(`     TotalAmount: ${doc.totalAmount}`);
        console.log(`     Created: ${doc.createdAt}`);
        console.log(`     その他のフィールド: ${Object.keys(doc).join(', ')}`);
      });

      // 集計テスト
      console.log('\n💎 集計テスト:');
      
      // amountフィールドでの集計
      const amountAgg = await db.collection('invoices').aggregate([
        {
          $match: {
            status: { $in: ['paid', 'sent', 'unpaid', 'viewed'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      console.log('  amountフィールドでの集計:');
      console.log(`    合計金額: ¥${(amountAgg[0]?.totalRevenue || 0).toLocaleString()}`);
      console.log(`    対象件数: ${amountAgg[0]?.count || 0}`);

      // totalAmountフィールドがある場合の集計
      const totalAmountAgg = await db.collection('invoices').aggregate([
        {
          $match: {
            status: { $in: ['paid', 'sent', 'unpaid', 'viewed'] },
            totalAmount: { $exists: true }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      if (totalAmountAgg[0]?.count > 0) {
        console.log('\n  totalAmountフィールドでの集計:');
        console.log(`    合計金額: ¥${(totalAmountAgg[0]?.totalRevenue || 0).toLocaleString()}`);
        console.log(`    対象件数: ${totalAmountAgg[0]?.count || 0}`);
      }

      // ステータス別の件数
      const statusCount = await db.collection('invoices').aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      console.log('\n  ステータス別の件数:');
      statusCount.forEach(status => {
        console.log(`    ${status._id || 'null'}: ${status.count}件`);
      });

    } else {
      console.log('\n⚠️  invoicesコレクションが存在しません');
    }

    // quotesコレクションのデータを確認
    const quotesExists = collections.some(col => col.name === 'quotes');
    if (quotesExists) {
      console.log('\n📄 quotesコレクションの確認:');
      
      const count = await db.collection('quotes').countDocuments();
      console.log(`  総ドキュメント数: ${count}`);

      const acceptedQuotes = await db.collection('quotes').aggregate([
        {
          $match: {
            status: { $in: ['accepted', 'converted'] }
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]).toArray();
      
      console.log(`  承認済み見積の合計: ¥${(acceptedQuotes[0]?.totalRevenue || 0).toLocaleString()}`);
      console.log(`  承認済み件数: ${acceptedQuotes[0]?.count || 0}`);
    }

    // 最近のドキュメントの日付を確認
    console.log('\n📅 最近のドキュメントの日付:');
    if (invoicesExists) {
      const recentInvoices = await db.collection('invoices')
        .find({})
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();
      
      console.log('  最近のinvoices:');
      recentInvoices.forEach((doc, index) => {
        console.log(`    ${index + 1}. ${doc.createdAt} - ¥${(doc.amount || doc.totalAmount || 0).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続を閉じました');
  }
}

// スクリプトを実行
checkDashboardRevenue();