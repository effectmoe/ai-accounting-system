const { MongoClient, ObjectId } = require('mongodb');

async function checkAllOcrData() {
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
    
    // 1. documentsコレクションのOCRデータを確認
    console.log('\n=== documents コレクションのOCRデータ ===');
    const documents = await db.collection('documents').find({
      documentType: { $in: ['supplier-quote', 'supplier-quote-attachment'] }
    }).limit(10).toArray();
    
    console.log(`見つかったドキュメント数: ${documents.length}`);
    documents.forEach((doc, index) => {
      console.log(`\n${index + 1}. ファイル名: ${doc.fileName}`);
      console.log(`   タイプ: ${doc.documentType}`);
      console.log(`   作成日: ${doc.createdAt}`);
      console.log(`   OCRステータス: ${doc.ocrStatus}`);
      if (doc.metadata?.quoteId) {
        console.log(`   関連見積書ID: ${doc.metadata.quoteId}`);
      }
    });

    // 2. GridFSのファイルを確認
    console.log('\n=== GridFS のファイル ===');
    const files = await db.collection('fs.files').find({
      'metadata.documentType': { $in: ['supplier-quote', 'supplier-quote-attachment'] }
    }).limit(10).toArray();
    
    console.log(`見つかったGridFSファイル数: ${files.length}`);
    files.forEach((file, index) => {
      console.log(`\n${index + 1}. ファイル名: ${file.filename}`);
      console.log(`   アップロード日: ${file.uploadDate}`);
      console.log(`   サイズ: ${(file.length / 1024 / 1024).toFixed(2)} MB`);
      if (file.metadata?.documentType) {
        console.log(`   ドキュメントタイプ: ${file.metadata.documentType}`);
      }
    });

    // 3. 特定の見積書番号でOCRファイルを探す
    const quoteNumber = 'SQ-20250730-002'; // 画面に表示されている見積書番号
    console.log(`\n=== 見積書番号 ${quoteNumber} の関連ファイル検索 ===`);
    
    const quote = await db.collection('supplierQuotes').findOne({ quoteNumber });
    if (quote) {
      console.log(`見積書ID: ${quote._id}`);
      
      // documentsコレクションから関連ファイルを検索
      const relatedDocs = await db.collection('documents').find({
        $or: [
          { 'metadata.quoteId': quote._id.toString() },
          { 'metadata.quoteNumber': quoteNumber },
          { fileName: new RegExp(quoteNumber, 'i') }
        ]
      }).toArray();
      
      console.log(`関連ドキュメント数: ${relatedDocs.length}`);
      relatedDocs.forEach((doc, index) => {
        console.log(`  ${index + 1}. ${doc.fileName} (${doc.documentType})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkAllOcrData();