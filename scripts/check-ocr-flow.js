const { MongoClient } = require('mongodb');

async function checkOCRFlow() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://tonychus:Musubi0928@cluster0.cud6w.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('🔗 MongoDB接続成功\n');
    
    const db = client.db('accounting_system');
    
    // 1. 最新のタイムズ関連ドキュメントを確認
    console.log('=== 最新のタイムズ関連ドキュメントの詳細確認 ===\n');
    const documents = db.collection('documents');
    
    const timesDoc = await documents.findOne(
      { vendorName: /タイムズ/i },
      { sort: { createdAt: -1 } }
    );
    
    if (timesDoc) {
      console.log('ドキュメント情報:');
      console.log('- _id:', timesDoc._id);
      console.log('- vendorName:', timesDoc.vendorName);
      console.log('- type:', timesDoc.type);
      console.log('- ocrStatus:', timesDoc.ocrStatus);
      console.log('- createdAt:', timesDoc.createdAt);
      
      // ocrResultフィールドの詳細確認
      if (timesDoc.ocrResult) {
        console.log('\nocrResultフィールドの内容:');
        const ocrResult = timesDoc.ocrResult;
        console.log('- documentNumber:', ocrResult.documentNumber);
        console.log('- vendor.name:', ocrResult.vendor?.name);
        console.log('- totalAmount:', ocrResult.totalAmount);
        console.log('- notes:', ocrResult.notes);
        
        // 駐車場関連フィールドの確認
        console.log('\n駐車場関連フィールド（ocrResult内）:');
        console.log('- receiptType:', ocrResult.receiptType);
        console.log('- companyName:', ocrResult.companyName);
        console.log('- facilityName:', ocrResult.facilityName);
        console.log('- entryTime:', ocrResult.entryTime);
        console.log('- exitTime:', ocrResult.exitTime);
        console.log('- parkingDuration:', ocrResult.parkingDuration);
        
        // notesフィールドに駐車場情報が含まれているか確認
        if (ocrResult.notes) {
          console.log('\nnotesフィールドの解析:');
          console.log('notes内容:', ocrResult.notes);
          
          // notesから駐車場情報を抽出
          const parkingTimeMatch = ocrResult.notes.match(/駐車時間:\s*([^,]+)/);
          const paymentMatch = ocrResult.notes.match(/お預かり金額:\s*([^,]+)/);
          const changeMatch = ocrResult.notes.match(/お釣り:\s*([^,]+)/);
          
          if (parkingTimeMatch) console.log('- 駐車時間（notesから）:', parkingTimeMatch[1]);
          if (paymentMatch) console.log('- お預かり金額（notesから）:', paymentMatch[1]);
          if (changeMatch) console.log('- お釣り（notesから）:', changeMatch[1]);
        }
      }
      
      // ドキュメントのトップレベルフィールドも確認
      console.log('\nドキュメントのトップレベル駐車場フィールド:');
      console.log('- receiptType:', timesDoc.receiptType);
      console.log('- facilityName:', timesDoc.facilityName);
      console.log('- entryTime:', timesDoc.entryTime);
      console.log('- exitTime:', timesDoc.exitTime);
      console.log('- parkingDuration:', timesDoc.parkingDuration);
      console.log('- baseFee:', timesDoc.baseFee);
      console.log('- additionalFee:', timesDoc.additionalFee);
      
      // extracted_textフィールドの確認
      if (timesDoc.extracted_text) {
        console.log('\nextracted_textフィールドを解析中...');
        try {
          const extractedData = JSON.parse(timesDoc.extracted_text);
          console.log('extracted_text内の駐車場フィールド:');
          console.log('- receiptType:', extractedData.receiptType);
          console.log('- facilityName:', extractedData.facilityName);
          console.log('- companyName:', extractedData.companyName);
          console.log('- entryTime:', extractedData.entryTime);
          console.log('- exitTime:', extractedData.exitTime);
        } catch (e) {
          console.log('extracted_textのパースに失敗:', e.message);
        }
      }
    } else {
      console.log('タイムズ関連のドキュメントが見つかりません');
    }
    
    // 2. ocrResultsコレクションの確認
    console.log('\n\n=== ocrResultsコレクションの確認 ===');
    const ocrResults = db.collection('ocrResults');
    
    const ocrResultsCount = await ocrResults.countDocuments({});
    console.log('ocrResultsコレクションのドキュメント数:', ocrResultsCount);
    
    if (ocrResultsCount > 0) {
      const latestOcr = await ocrResults.findOne({}, { sort: { createdAt: -1 } });
      console.log('\n最新のOCR結果:');
      console.log('- _id:', latestOcr._id);
      console.log('- fileName:', latestOcr.fileName);
      console.log('- processedAt:', latestOcr.processedAt || latestOcr.createdAt);
      console.log('- ocrResultフィールド存在:', !!latestOcr.ocrResult);
      console.log('- extractedDataフィールド存在:', !!latestOcr.extractedData);
    }
    
    // 3. 処理フローの推定
    console.log('\n\n=== OCR処理フローの推定 ===');
    console.log('1. documentsコレクションに直接保存されている（ocrResultsは使用されていない）');
    console.log('2. 駐車場情報はocrResult.notesフィールドに文字列として格納');
    console.log('3. 個別の駐車場フィールドは作成されていない（undefined）');
    console.log('4. /api/ocr/analyzeで駐車場フィールドを設定しているが、別の処理経路を通っている可能性');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB接続を閉じました');
  }
}

// 実行
checkOCRFlow();