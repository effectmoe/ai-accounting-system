const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkDocuments() {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db('accounting');
    
    // documentsコレクションから最新10件を取得
    const documents = await db.collection('documents')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();
    
    console.log('=== 最新のドキュメント ===');
    documents.forEach((doc, index) => {
      console.log(`\n--- Document ${index + 1} ---`);
      console.log('ID:', doc._id);
      console.log('ファイル名:', doc.fileName);
      console.log('日付 (documentDate):', doc.documentDate);
      console.log('日付 (receipt_date):', doc.receipt_date);
      console.log('日付 (issue_date):', doc.issue_date);
      console.log('ベンダー名:', doc.vendorName);
      console.log('金額:', doc.totalAmount);
      console.log('カテゴリ:', doc.category);
      console.log('作成日時:', doc.createdAt);
      
      // extractedTextから日付を探す
      if (doc.extractedText) {
        const dateMatches = doc.extractedText.match(/\d{4}[年/-]\d{1,2}[月/-]\d{1,2}[日]?/g);
        if (dateMatches) {
          console.log('抽出テキスト内の日付:', dateMatches);
        }
      }
    });
    
    // 5月のデータを検索
    console.log('\n\n=== 5月のデータ検索 ===');
    const mayQuery = {
      $or: [
        { documentDate: /2025-05/ },
        { receipt_date: /2025-05/ },
        { extractedText: /5月25日|05-25|05\/25/ }
      ]
    };
    
    const mayDocuments = await db.collection('documents')
      .find(mayQuery)
      .toArray();
    
    console.log('5月のドキュメント数:', mayDocuments.length);
    
    if (mayDocuments.length > 0) {
      mayDocuments.forEach((doc, index) => {
        console.log(`\n--- 5月のDocument ${index + 1} ---`);
        console.log('ファイル名:', doc.fileName);
        console.log('documentDate:', doc.documentDate);
        console.log('receipt_date:', doc.receipt_date);
      });
    }
    
  } finally {
    await client.close();
  }
}

checkDocuments().catch(console.error);