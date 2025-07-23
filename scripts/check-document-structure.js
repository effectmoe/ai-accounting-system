const { MongoClient } = require('mongodb');

async function checkDocumentStructure() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://tonychus:Musubi0928@cluster0.cud6w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 MongoDB接続成功\n');
    
    const db = client.db('accounting_system');
    const documents = db.collection('documents');
    
    // 最新のタイムズ関連ドキュメントを1件取得
    console.log('=== 最新のタイムズ駐車場ドキュメントの完全な構造 ===\n');
    
    const latestParkingDoc = await documents.findOne(
      { vendorName: /タイムズ/i },
      { sort: { createdAt: -1 } }
    );
    
    if (latestParkingDoc) {
      console.log('ドキュメントID:', latestParkingDoc._id);
      console.log('作成日時:', latestParkingDoc.createdAt);
      console.log('\n全フィールド:');
      console.log(JSON.stringify(latestParkingDoc, null, 2));
      
      console.log('\n\nフィールド名一覧:');
      Object.keys(latestParkingDoc).forEach(key => {
        const value = latestParkingDoc[key];
        const type = Array.isArray(value) ? 'array' : typeof value;
        console.log(`- ${key}: ${type}`);
      });
      
      // OCR関連の値を持つフィールドを探す
      console.log('\n\n駐車場関連の可能性があるフィールド:');
      Object.entries(latestParkingDoc).forEach(([key, value]) => {
        if (value && typeof value === 'string') {
          if (value.includes('駐車') || value.includes('入庫') || value.includes('出庫') || 
              value.includes(':') || value.includes('時間') || value.includes('タイムズ')) {
            console.log(`- ${key}: "${value}"`);
          }
        }
      });
    }
    
    // 番号を指定して検索
    console.log('\n\n=== 文書番号での検索 ===');
    const docNumbers = ['J202500004', 'R-2025-0001', 'R-2025-0002', 'R-2025-0003', 'R-2025-0004'];
    
    for (const num of docNumbers) {
      const doc = await documents.findOne({ documentNumber: num });
      if (doc) {
        console.log(`\n文書番号 ${num} を発見:`);
        console.log('- _id:', doc._id);
        console.log('- vendorName:', doc.vendorName);
        console.log('- category:', doc.category);
        console.log('- totalAmount:', doc.totalAmount);
        console.log('- notes:', doc.notes);
        
        // メタデータやその他のフィールドを確認
        if (doc.metadata) {
          console.log('- metadata:', JSON.stringify(doc.metadata));
        }
        if (doc.extractedData) {
          console.log('- extractedData:', JSON.stringify(doc.extractedData));
        }
        if (doc.ocrData) {
          console.log('- ocrData:', JSON.stringify(doc.ocrData));
        }
        
        // 駐車場関連フィールドの存在確認
        const parkingFields = ['receiptType', 'facilityName', 'entryTime', 'exitTime', 'parkingDuration', 'baseFee', 'additionalFee'];
        console.log('\n駐車場フィールドの存在確認:');
        parkingFields.forEach(field => {
          const exists = field in doc;
          const value = doc[field];
          console.log(`  - ${field}: ${exists ? `存在 (値: ${value})` : '存在しない'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB接続を閉じました');
  }
}

// 実行
checkDocumentStructure();