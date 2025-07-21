const { MongoClient } = require('mongodb');

async function checkRecentOCR() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://tonychus:Musubi0928@cluster0.cud6w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 MongoDB接続成功');
    
    const db = client.db('accounting_system');
    const collection = db.collection('documents');
    
    // 最新のOCR結果を確認
    console.log('\n📊 最新のOCR結果を確認中...');
    
    const filter = {
      companyId: '11111111-1111-1111-1111-111111111111',
      ocrStatus: { $exists: true },
      $or: [
        { linked_document_id: { $exists: false } },
        { linked_document_id: null }
      ],
      status: { $ne: 'archived' },
      hiddenFromList: { $ne: true }
    };
    
    console.log('🔍 使用するフィルター:', JSON.stringify(filter, null, 2));
    
    const recentOcr = await collection.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    console.log(`\n📋 取得したOCR結果: ${recentOcr.length}件`);
    
    if (recentOcr.length > 0) {
      recentOcr.forEach((doc, index) => {
        console.log(`\n--- ${index + 1}. ${doc.fileName || doc.file_name || 'Unknown'} ---`);
        console.log('ID:', doc._id);
        console.log('作成日時:', doc.createdAt);
        console.log('OCRステータス:', doc.ocrStatus);
        console.log('仕入先:', doc.vendor_name || doc.vendorName || 'N/A');
        console.log('金額:', doc.amount || doc.totalAmount || 'N/A');
        console.log('ドキュメント番号:', doc.documentNumber || 'N/A');
        console.log('linked_document_id:', doc.linked_document_id);
        console.log('hiddenFromList:', doc.hiddenFromList);
      });
    } else {
      console.log('\n⚠️ OCR結果が見つかりません。');
      
      // すべてのドキュメントを確認
      const allDocs = await collection.find({ companyId: '11111111-1111-1111-1111-111111111111' })
        .limit(5)
        .toArray();
      
      console.log(`\n📄 すべてのドキュメント: ${allDocs.length}件`);
      allDocs.forEach((doc, index) => {
        console.log(`\n--- ${index + 1}. ${doc.fileName || doc.file_name || 'Unknown'} ---`);
        console.log('ID:', doc._id);
        console.log('OCRステータス:', doc.ocrStatus);
      });
    }
    
    // 総数を確認
    const totalCount = await collection.countDocuments(filter);
    console.log(`\n📊 フィルターに一致する総数: ${totalCount}件`);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB接続を閉じました');
  }
}

checkRecentOCR();