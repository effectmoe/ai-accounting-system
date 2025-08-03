const { MongoClient, ObjectId } = require('mongodb');

async function checkOcrFiles() {
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

    console.log('\n=== 仕入先見積書のOCRファイル状況 ===');
    quotes.forEach((quote, index) => {
      console.log(`\n${index + 1}. 見積書番号: ${quote.quoteNumber}`);
      console.log(`   ID: ${quote._id}`);
      console.log(`   ocrFiles フィールド: ${quote.ocrFiles ? `存在 (${quote.ocrFiles.length}件)` : '未定義'}`);
      
      if (quote.ocrFiles && quote.ocrFiles.length > 0) {
        quote.ocrFiles.forEach((file, fileIndex) => {
          console.log(`     ファイル${fileIndex + 1}: ${file.filename} (ID: ${file.id})`);
        });
      }
    });

    // ocrFilesフィールドを持つ見積書の数を確認
    const countWithOcrFiles = await collection.countDocuments({ ocrFiles: { $exists: true } });
    const countWithFiles = await collection.countDocuments({ 'ocrFiles.0': { $exists: true } });
    
    console.log(`\n=== 統計情報 ===`);
    console.log(`ocrFilesフィールドを持つ見積書: ${countWithOcrFiles}件`);
    console.log(`実際にファイルがある見積書: ${countWithFiles}件`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkOcrFiles();