const { MongoClient } = require('mongodb');

async function checkLatestOCR() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://tonychus:Musubi0928@cluster0.cud6w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 MongoDB接続成功\n');
    
    const db = client.db('accounting_system');
    const documents = db.collection('documents');
    
    // 最新のOCR処理済みドキュメントを取得
    console.log('=== 最新のOCR処理済みドキュメント（5件）===\n');
    const latestDocs = await documents.find({ 
      ocrStatus: 'completed',
      $or: [
        { vendorName: /タイムズ/i },
        { vendor_name: /タイムズ/i },
        { 'ocrResult.vendor.name': /タイムズ/i }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
    
    latestDocs.forEach((doc, index) => {
      console.log(`\n--- ドキュメント ${index + 1} ---`);
      console.log('ID:', doc._id);
      console.log('作成日時:', doc.createdAt);
      console.log('ベンダー名:', doc.vendorName || doc.vendor_name);
      console.log('タイプ:', doc.type);
      console.log('ファイル名:', doc.fileName);
      
      if (doc.ocrResult) {
        console.log('\nOCR結果の詳細:');
        console.log('- documentNumber:', doc.ocrResult.documentNumber);
        console.log('- totalAmount:', doc.ocrResult.totalAmount);
        console.log('- notes:', doc.ocrResult.notes);
        console.log('- receiptType:', doc.ocrResult.receiptType);
        console.log('- facilityName:', doc.ocrResult.facilityName);
        console.log('- entryTime:', doc.ocrResult.entryTime);
        console.log('- exitTime:', doc.ocrResult.exitTime);
        console.log('- parkingDuration:', doc.ocrResult.parkingDuration);
      }
      
      // トップレベルの駐車場フィールドも確認
      console.log('\nトップレベルの駐車場フィールド:');
      console.log('- receipt_type:', doc.receipt_type);
      console.log('- facility_name:', doc.facility_name);
      console.log('- entry_time:', doc.entry_time);
      console.log('- exit_time:', doc.exit_time);
      console.log('- parking_duration:', doc.parking_duration);
      
      // extracted_textの内容も確認
      if (doc.extracted_text) {
        try {
          const extracted = JSON.parse(doc.extracted_text);
          console.log('\nextracted_text内の駐車場フィールド:');
          console.log('- receiptType:', extracted.receiptType);
          console.log('- facilityName:', extracted.facilityName);
          console.log('- parkingDuration:', extracted.parkingDuration);
        } catch (e) {
          console.log('extracted_textのパースに失敗');
        }
      }
    });
    
    // 最新のJ202500004を詳しく確認
    console.log('\n\n=== J202500004の詳細確認 ===');
    const j202500004 = await documents.findOne({ 
      documentNumber: 'J202500004'
    });
    
    if (j202500004) {
      console.log('ドキュメントID:', j202500004._id);
      console.log('作成日時:', j202500004.createdAt);
      console.log('OCRステータス:', j202500004.ocrStatus);
      console.log('ベンダー名:', j202500004.vendorName || j202500004.vendor_name);
      
      // 全フィールドを表示
      console.log('\n全フィールド:');
      Object.keys(j202500004).forEach(key => {
        if (key.includes('parking') || key.includes('facility') || key.includes('entry') || 
            key.includes('exit') || key.includes('receipt')) {
          console.log(`- ${key}:`, j202500004[key]);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB接続を閉じました');
  }
}

// 実行
checkLatestOCR();