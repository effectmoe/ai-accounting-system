const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function checkAllData() {
  let client;
  
  try {
    const uri = process.env.MONGODB_URI || process.env.AZURE_COSMOS_CONNECTIONSTRING;
    
    if (!uri) {
      console.error('❌ MongoDBの接続情報が設定されていません');
      console.log('MONGODB_URI:', process.env.MONGODB_URI);
      console.log('AZURE_COSMOS_CONNECTIONSTRING:', process.env.AZURE_COSMOS_CONNECTIONSTRING);
      process.exit(1);
    }

    console.log('🔍 MongoDB接続中...');
    console.log('接続URI:', uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // パスワードを隠す
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    
    await client.connect();
    console.log('✅ MongoDB接続成功');
    
    const dbName = process.env.MONGODB_DB_NAME || 'accounting';
    console.log('🗄️ データベース名:', dbName);
    const db = client.db(dbName);
    
    // コレクション一覧を取得
    const collections = await db.listCollections().toArray();
    console.log('\n📦 コレクション一覧:');
    collections.forEach(col => console.log(`  - ${col.name}`));
    
    // 各コレクションのドキュメント数を確認
    console.log('\n📊 ドキュメント数:');
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count}件`);
    }
    
    // 主要なコレクションの詳細を確認
    const mainCollections = ['customers', 'suppliers', 'documents', 'supplier_quotes', 'purchase_invoices'];
    
    for (const colName of mainCollections) {
      if (collections.some(c => c.name === colName)) {
        console.log(`\n📋 ${colName}コレクションの詳細:`);
        const docs = await db.collection(colName).find({}).limit(3).toArray();
        
        if (docs.length > 0) {
          console.log(`  最初の${docs.length}件:`);
          docs.forEach((doc, index) => {
            console.log(`  ${index + 1}. ID: ${doc._id}`);
            if (doc.name) console.log(`     名前: ${doc.name}`);
            if (doc.customerName) console.log(`     顧客名: ${doc.customerName}`);
            if (doc.supplierName) console.log(`     仕入先名: ${doc.supplierName}`);
            if (doc.documentNumber) console.log(`     文書番号: ${doc.documentNumber}`);
            if (doc.createdAt) console.log(`     作成日: ${new Date(doc.createdAt).toLocaleString('ja-JP')}`);
          });
        } else {
          console.log('  データがありません');
        }
      }
    }
    
    // documentsコレクションの詳細確認
    console.log('\n🔍 documentsコレクションの詳細分析:');
    const documentsCol = db.collection('documents');
    
    // ドキュメントタイプ別の集計
    const typeAggregation = await documentsCol.aggregate([
      { $group: { _id: '$documentType', count: { $sum: 1 } } }
    ]).toArray();
    
    console.log('  ドキュメントタイプ別:');
    typeAggregation.forEach(type => {
      console.log(`    - ${type._id || '未分類'}: ${type.count}件`);
    });
    
    // OCRステータス別の集計
    const ocrStatusAggregation = await documentsCol.aggregate([
      { $group: { _id: '$ocrStatus', count: { $sum: 1 } } }
    ]).toArray();
    
    console.log('  OCRステータス別:');
    ocrStatusAggregation.forEach(status => {
      console.log(`    - ${status._id || 'なし'}: ${status.count}件`);
    });
    
    // 最新のOCR処理済みドキュメント
    console.log('\n  最新のOCR処理済みドキュメント:');
    const recentOcr = await documentsCol.find({ 
      ocrStatus: { $exists: true },
      $or: [
        { linked_document_id: { $exists: false } },
        { linked_document_id: null }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
    
    recentOcr.forEach((doc, index) => {
      console.log(`    ${index + 1}. ID: ${doc._id}`);
      console.log(`       ファイル名: ${doc.fileName || doc.file_name || '不明'}`);
      console.log(`       取引先: ${doc.vendor_name || doc.vendorName || '不明'}`);
      console.log(`       金額: ¥${doc.total_amount || doc.totalAmount || 0}`);
      console.log(`       作成日: ${new Date(doc.createdAt).toLocaleString('ja-JP')}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('スタックトレース:', error.stack);
    }
  } finally {
    if (client) {
      await client.close();
      console.log('\n✅ MongoDB接続を閉じました');
    }
  }
}

checkAllData().catch(console.error);