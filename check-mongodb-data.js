const { MongoClient } = require('mongodb');

// .env.localから設定読み込み
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.localファイルが見つかりません');
    return {};
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });
  
  return env;
}

async function checkMongoData() {
  console.log('🔍 MongoDB データ直接チェック開始\n');
  
  const env = loadEnvFile();
  const MONGODB_URI = env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI が設定されていません');
    console.log('現在の環境変数:');
    console.log(env);
    return;
  }

  console.log('📊 MongoDB URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//[USER]:[PASS]@'));

  let client;
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDB接続成功\n');

    // データベース一覧
    const admin = client.db().admin();
    const databases = await admin.listDatabases();
    console.log('📁 利用可能なデータベース:');
    databases.databases.forEach(db => {
      console.log(`  - ${db.name} (${Math.round(db.sizeOnDisk / 1024 / 1024 * 100) / 100} MB)`);
    });

    // accounting-automationデータベースをチェック
    console.log('\n🎯 accounting-automationデータベースの詳細:');
    const db = client.db('accounting-automation');
    
    const collections = await db.listCollections().toArray();
    console.log('コレクション一覧:');
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });

    // chat_sessionsコレクションの詳細確認
    const sessionsCollection = db.collection('chat_sessions');
    const totalSessions = await sessionsCollection.countDocuments();
    console.log(`\n📊 chat_sessions総数: ${totalSessions}`);

    if (totalSessions > 0) {
      // インデックス確認
      const indexes = await sessionsCollection.indexes();
      console.log('\nインデックス:');
      indexes.forEach(index => {
        console.log(`  - ${JSON.stringify(index.key)} (${index.name})`);
      });

      // フィールド別統計
      console.log('\n📈 データ構造分析:');
      
      // categoryフィールドの統計
      const categoryPipeline = [
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ];
      const categoryStats = await sessionsCollection.aggregate(categoryPipeline).toArray();
      console.log('category別:');
      categoryStats.forEach(stat => {
        console.log(`  ${stat._id || 'undefined'}: ${stat.count}`);
      });

      // messageCountフィールドの統計
      const messageCountPipeline = [
        { 
          $group: { 
            _id: {
              $switch: {
                branches: [
                  { case: { $eq: ["$messageCount", 0] }, then: "0 messages" },
                  { case: { $and: [{ $gt: ["$messageCount", 0] }, { $lte: ["$messageCount", 5] }] }, then: "1-5 messages" },
                  { case: { $gt: ["$messageCount", 5] }, then: "6+ messages" }
                ],
                default: "no messageCount field"
              }
            },
            count: { $sum: 1 }
          }
        }
      ];
      const messageCountStats = await sessionsCollection.aggregate(messageCountPipeline).toArray();
      console.log('messageCount別:');
      messageCountStats.forEach(stat => {
        console.log(`  ${stat._id}: ${stat.count}`);
      });

      // 最新ドキュメント5件
      console.log('\n📄 最新ドキュメント5件:');
      const latestDocs = await sessionsCollection
        .find({})
        .sort({ updatedAt: -1 })
        .limit(5)
        .toArray();
      
      latestDocs.forEach((doc, index) => {
        console.log(`\n${index + 1}. ${doc._id}`);
        console.log(`   タイトル: ${doc.title || 'undefined'}`);
        console.log(`   カテゴリ: ${doc.category || 'undefined'}`);
        console.log(`   メッセージ数: ${doc.messageCount || 'undefined'}`);
        console.log(`   作成日: ${doc.createdAt || 'undefined'}`);
        console.log(`   更新日: ${doc.updatedAt || 'undefined'}`);
        console.log(`   フィールド: [${Object.keys(doc).join(', ')}]`);
      });

      // API条件に一致するドキュメント確認
      console.log('\n🎯 API条件 (category=tax, messageCount>0) に一致するドキュメント:');
      const apiConditionDocs = await sessionsCollection
        .find({ 
          category: 'tax',
          messageCount: { $gt: 0 }
        })
        .sort({ updatedAt: -1 })
        .limit(10)
        .toArray();
      
      console.log(`条件に一致: ${apiConditionDocs.length}件`);
      apiConditionDocs.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.title} (${doc.messageCount} messages)`);
      });

    } else {
      console.log('⚠️  chat_sessionsコレクションは空です');
      
      // 他のコレクションでチャット関連データを確認
      console.log('\n🔍 他のコレクションでチャット関連データを確認:');
      for (const collection of collections) {
        if (collection.name.includes('chat') || collection.name.includes('session') || collection.name.includes('knowledge')) {
          const coll = db.collection(collection.name);
          const count = await coll.countDocuments();
          console.log(`  ${collection.name}: ${count}件`);
          
          if (count > 0) {
            const sample = await coll.findOne();
            console.log(`    サンプル: ${JSON.stringify(sample, null, 2).slice(0, 200)}...`);
          }
        }
      }
    }

    // accounting データベースもチェック
    console.log('\n🔍 accountingデータベースもチェック:');
    try {
      const accountingDb = client.db('accounting');
      const accountingCollections = await accountingDb.listCollections().toArray();
      console.log('accountingデータベースのコレクション:');
      accountingCollections.forEach(collection => {
        console.log(`  - ${collection.name}`);
      });

      if (accountingCollections.some(c => c.name === 'chat_sessions')) {
        const accountingSessionsCollection = accountingDb.collection('chat_sessions');
        const accountingSessionsCount = await accountingSessionsCollection.countDocuments();
        console.log(`accounting.chat_sessions: ${accountingSessionsCount}件`);
      }
    } catch (error) {
      console.log('accountingデータベースアクセスエラー:', error.message);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkMongoData()
  .then(() => {
    console.log('\n✅ MongoDB データチェック完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 予期しないエラー:', error);
    process.exit(1);
  });