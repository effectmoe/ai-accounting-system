const { MongoClient, ObjectId } = require('mongodb');

async function checkRecentQuotes() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(process.env.MONGODB_DB_NAME || 'accounting');
    const collection = db.collection('supplierQuotes');

    // 最新の5件の仕入先見積書を取得
    const quotes = await collection.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log('\n=== 最新の仕入先見積書 ===');
    quotes.forEach((quote, index) => {
      console.log(`\n${index + 1}. 見積書番号: ${quote.quoteNumber}`);
      console.log(`   ID: ${quote._id}`);
      console.log(`   ステータス: ${quote.status}`);
      console.log(`   AI作成: ${quote.isGeneratedByAI ? 'はい' : 'いいえ'}`);
      console.log(`   作成日時: ${quote.createdAt}`);
      console.log(`   更新日時: ${quote.updatedAt}`);
      
      if (quote.title) {
        console.log(`   タイトル: ${quote.title}`);
      }
      
      if (quote.aiGenerationMetadata) {
        console.log(`   AI生成メタデータ: あり`);
      }
    });

    // "コピー"を含む見積書を検索
    const copyQuotes = await collection.find({
      $or: [
        { title: { $regex: 'コピー', $options: 'i' } },
        { quoteNumber: { $regex: 'copy', $options: 'i' } }
      ]
    }).sort({ createdAt: -1 }).toArray();

    if (copyQuotes.length > 0) {
      console.log('\n=== コピーされた見積書 ===');
      copyQuotes.forEach((quote, index) => {
        console.log(`\n${index + 1}. 見積書番号: ${quote.quoteNumber}`);
        console.log(`   タイトル: ${quote.title}`);
        console.log(`   ステータス: ${quote.status}`);
        console.log(`   AI作成: ${quote.isGeneratedByAI ? 'はい' : 'いいえ'}`);
        console.log(`   作成日時: ${quote.createdAt}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkRecentQuotes();