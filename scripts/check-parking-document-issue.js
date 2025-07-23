const { MongoClient, ObjectId } = require('mongodb');

async function checkParkingDocumentIssue() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://tonychus:Musubi0928@cluster0.cud6w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 MongoDB接続成功\n');
    
    const db = client.db('accounting_system');
    
    // 1. OCR結果コレクションから駐車場領収書を検索
    console.log('=== 1. OCR結果から駐車場領収書を検索 ===');
    const ocrResults = db.collection('ocrResults');
    
    const parkingOcrResults = await ocrResults.find({
      $or: [
        { 'ocrResult.receiptType': 'parking' },
        { 'extractedData.receiptType': 'parking' },
        { 'ocrResult.facilityName': { $exists: true } },
        { 'extractedData.facilityName': { $exists: true } },
        { 'ocrResult.vendorName': /タイムズ/i },
        { 'extractedData.vendorName': /タイムズ/i }
      ]
    }).limit(5).toArray();
    
    console.log(`見つかった駐車場OCR結果: ${parkingOcrResults.length}件\n`);
    
    for (const ocr of parkingOcrResults) {
      console.log(`OCR結果 ID: ${ocr._id}`);
      console.log(`ファイル名: ${ocr.fileName}`);
      console.log(`処理日時: ${ocr.processedAt || ocr.createdAt}`);
      
      // OCRデータの構造を確認
      const ocrData = ocr.ocrResult || ocr.extractedData || {};
      console.log('\nOCRデータ構造:');
      console.log('- receiptType:', ocrData.receiptType);
      console.log('- vendorName:', ocrData.vendorName);
      console.log('- facilityName:', ocrData.facilityName);
      console.log('- entryTime:', ocrData.entryTime);
      console.log('- exitTime:', ocrData.exitTime);
      console.log('- parkingDuration:', ocrData.parkingDuration);
      console.log('- totalAmount:', ocrData.totalAmount);
      
      // このOCR結果から作成されたドキュメントを検索
      console.log('\n関連ドキュメントを検索...');
      const documents = db.collection('documents');
      const relatedDoc = await documents.findOne({
        ocrResultId: ocr._id
      });
      
      if (relatedDoc) {
        console.log(`\n✅ 関連ドキュメント発見: ${relatedDoc._id}`);
        console.log(`ドキュメント番号: ${relatedDoc.documentNumber || 'なし'}`);
        console.log('\nドキュメントの駐車場フィールド:');
        console.log('- receiptType:', relatedDoc.receiptType);
        console.log('- facilityName:', relatedDoc.facilityName);
        console.log('- entryTime:', relatedDoc.entryTime);
        console.log('- exitTime:', relatedDoc.exitTime);
        console.log('- parkingDuration:', relatedDoc.parkingDuration);
        console.log('- baseFee:', relatedDoc.baseFee);
        console.log('- additionalFee:', relatedDoc.additionalFee);
        
        // フィールドの存在をチェック
        const hasParkingFields = !!(
          relatedDoc.receiptType === 'parking' ||
          relatedDoc.facilityName ||
          relatedDoc.entryTime ||
          relatedDoc.exitTime
        );
        
        if (!hasParkingFields) {
          console.log('\n❌ 問題: 駐車場フィールドがドキュメントに存在しません！');
          console.log('OCRデータには存在するのに、ドキュメントには反映されていません。');
        } else {
          console.log('\n✅ 駐車場フィールドは正しく保存されています。');
        }
      } else {
        console.log('\n⚠️ このOCR結果から作成されたドキュメントが見つかりません。');
      }
      
      console.log('\n' + '='.repeat(50) + '\n');
    }
    
    // 2. 最新のドキュメントから駐車場情報を持つものを検索
    console.log('=== 2. 最新のドキュメントから駐車場情報を検索 ===');
    const documents = db.collection('documents');
    
    const parkingDocuments = await documents.find({
      $or: [
        { receiptType: 'parking' },
        { facilityName: { $exists: true } },
        { vendorName: /タイムズ/i }
      ]
    }).sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log(`見つかった駐車場ドキュメント: ${parkingDocuments.length}件\n`);
    
    for (const doc of parkingDocuments) {
      console.log(`ドキュメント ID: ${doc._id}`);
      console.log(`作成日時: ${doc.createdAt}`);
      console.log(`ベンダー名: ${doc.vendorName}`);
      console.log('駐車場フィールド:');
      console.log('- receiptType:', doc.receiptType);
      console.log('- facilityName:', doc.facilityName);
      console.log('- entryTime:', doc.entryTime);
      console.log('- exitTime:', doc.exitTime);
      console.log('- parkingDuration:', doc.parkingDuration);
      console.log('\n' + '-'.repeat(30) + '\n');
    }
    
    // 3. 最新の仕訳伝票を確認
    console.log('=== 3. 最新の仕訳伝票（J202500004）を確認 ===');
    const targetDoc = await documents.findOne({
      documentNumber: 'J202500004'
    });
    
    if (targetDoc) {
      console.log('仕訳伝票 J202500004 の詳細:');
      console.log('- _id:', targetDoc._id);
      console.log('- vendorName:', targetDoc.vendorName);
      console.log('- category:', targetDoc.category);
      console.log('- totalAmount:', targetDoc.totalAmount);
      console.log('\n駐車場関連フィールド:');
      console.log('- receiptType:', targetDoc.receiptType);
      console.log('- facilityName:', targetDoc.facilityName);
      console.log('- entryTime:', targetDoc.entryTime);
      console.log('- exitTime:', targetDoc.exitTime);
      console.log('- parkingDuration:', targetDoc.parkingDuration);
      console.log('- baseFee:', targetDoc.baseFee);
      console.log('- additionalFee:', targetDoc.additionalFee);
      
      if (targetDoc.ocrResultId) {
        console.log('\n元のOCR結果を確認...');
        const sourceOcr = await ocrResults.findOne({
          _id: targetDoc.ocrResultId
        });
        
        if (sourceOcr) {
          const ocrData = sourceOcr.ocrResult || sourceOcr.extractedData || {};
          console.log('\n元のOCRデータ:');
          console.log('- receiptType:', ocrData.receiptType);
          console.log('- facilityName:', ocrData.facilityName);
          console.log('- vendorName:', ocrData.vendorName);
        }
      }
    } else {
      console.log('仕訳伝票 J202500004 が見つかりませんでした。');
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB接続を閉じました');
  }
}

// 実行
checkParkingDocumentIssue();