const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkOCRDetails() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ MongoDBに接続しました');
    
    const dbName = process.env.MONGODB_DB_NAME || 'accounting';
    const db = client.db(dbName.trim());
    const collection = db.collection('documents');
    
    // 最新のOCR処理されたドキュメントを5件取得
    const documents = await collection.find({
      ocrStatus: 'completed'
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .toArray();
    
    console.log(`\n📄 OCR処理済みドキュメント数: ${documents.length}`);
    
    documents.forEach((doc, index) => {
      console.log(`\n=== ドキュメント ${index + 1} ===`);
      console.log('ID:', doc._id.toString());
      console.log('作成日時:', doc.createdAt);
      console.log('ドキュメントタイプ:', doc.type || doc.documentType);
      console.log('ファイル名:', doc.fileName);
      console.log('OCRステータス:', doc.ocrStatus);
      
      // 基本情報
      console.log('\n📌 基本情報:');
      console.log('  ドキュメント番号:', doc.documentNumber || doc.receiptNumber || '未設定');
      console.log('  発行日:', doc.issueDate || doc.invoiceDate || doc.receiptDate || '未設定');
      console.log('  ベンダー名:', doc.vendor_name || doc.vendorName || '未設定');
      console.log('  顧客名:', doc.customer_name || doc.customerName || '未設定');
      console.log('  店舗名:', doc.store_name || '未設定');
      
      // 金額情報
      console.log('\n💰 金額情報:');
      console.log('  合計金額:', doc.totalAmount || doc.total_amount || 0);
      console.log('  税額:', doc.taxAmount || doc.tax_amount || 0);
      console.log('  小計:', doc.subtotal_amount || 0);
      
      // OCR結果
      if (doc.ocrResult) {
        console.log('\n🔍 OCR結果（構造化データ）:');
        console.log(JSON.stringify(doc.ocrResult, null, 2));
      }
      
      // 駐車場関連フィールド（もしあれば）
      if (doc.ocrResult?.parkingInfo || doc.ocrResult?.isParkingReceipt) {
        console.log('\n🚗 駐車場情報:');
        console.log('  駐車場領収書:', doc.ocrResult.isParkingReceipt ? 'はい' : 'いいえ');
        if (doc.ocrResult.parkingInfo) {
          console.log('  入場時刻:', doc.ocrResult.parkingInfo.entryTime);
          console.log('  出場時刻:', doc.ocrResult.parkingInfo.exitTime);
          console.log('  駐車時間:', doc.ocrResult.parkingInfo.duration);
          console.log('  車両番号:', doc.ocrResult.parkingInfo.vehicleNumber);
        }
      }
      
      // ファイルID
      console.log('\n📎 ファイル情報:');
      console.log('  GridFS File ID:', doc.gridfsFileId || doc.gridfs_file_id || doc.sourceFileId || '未設定');
      console.log('  OCR Result ID:', doc.ocrResultId || doc.ocr_result_id || '未設定');
      
      console.log('\n' + '='.repeat(50));
    });
    
    // 駐車場領収書を特定して確認
    console.log('\n\n🔎 駐車場領収書の検索...');
    const parkingReceipts = await collection.find({
      $or: [
        { 'ocrResult.isParkingReceipt': true },
        { 'ocrResult.parkingInfo': { $exists: true } },
        { vendor_name: /パーキング|駐車場|PARKING/i },
        { store_name: /パーキング|駐車場|PARKING/i }
      ]
    }).limit(5).toArray();
    
    console.log(`駐車場領収書の候補数: ${parkingReceipts.length}`);
    parkingReceipts.forEach((doc, index) => {
      console.log(`\n駐車場領収書 ${index + 1}:`);
      console.log('  ID:', doc._id.toString());
      console.log('  ベンダー名:', doc.vendor_name || doc.vendorName || '未設定');
      console.log('  金額:', doc.totalAmount || doc.total_amount || 0);
      console.log('  作成日時:', doc.createdAt);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ 接続を閉じました');
  }
}

checkOCRDetails();