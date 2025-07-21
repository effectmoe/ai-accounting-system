const { MongoClient } = require('mongodb');

async function checkProductionData() {
  let client;
  
  try {
    // 本番環境のMongoDB URIを直接使用
    const uri = 'mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster';
    
    console.log('🔍 本番MongoDB接続中...');
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    
    await client.connect();
    console.log('✅ 本番MongoDB接続成功');
    
    // 利用可能なデータベース一覧を取得
    const admin = client.db().admin();
    const dbList = await admin.listDatabases();
    console.log('\n📦 利用可能なデータベース:');
    dbList.databases.forEach(db => {
      console.log(`  - ${db.name} (サイズ: ${db.sizeOnDisk || 'N/A'})`);
    });
    
    // 各データベースをチェック
    const targetDatabases = ['accounting', 'accounting_system', 'mastra-accounting'];
    
    for (const dbName of targetDatabases) {
      console.log(`\n🗄️ データベース "${dbName}" をチェック:`);
      const db = client.db(dbName);
      
      try {
        // コレクション一覧を取得
        const collections = await db.listCollections().toArray();
        console.log(`  コレクション数: ${collections.length}件`);
        
        if (collections.length > 0) {
          console.log('  コレクション一覧:');
          for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            console.log(`    - ${col.name}: ${count}件`);
          }
          
          // supplierQuotesコレクションの詳細
          const supplierQuotesCol = collections.find(c => c.name === 'supplierQuotes');
          if (supplierQuotesCol) {
            console.log(`\n  📋 supplierQuotesコレクションの詳細:`);
            const quotes = await db.collection('supplierQuotes').find({}).limit(3).toArray();
            quotes.forEach((quote, index) => {
              console.log(`    ${index + 1}. ID: ${quote._id}`);
              console.log(`       見積番号: ${quote.quoteNumber || '不明'}`);
              console.log(`       仕入先名: ${quote.vendorName || quote.supplier?.companyName || '不明'}`);
              console.log(`       金額: ¥${quote.totalAmount || 0}`);
              if (quote.createdAt) {
                console.log(`       作成日: ${new Date(quote.createdAt).toLocaleString('ja-JP')}`);
              }
            });
          }
        } else {
          console.log('  ❌ コレクションなし');
        }
      } catch (error) {
        console.log(`  ❌ データベース "${dbName}" アクセスエラー:`, error.message);
      }
    }
    
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

checkProductionData().catch(console.error);