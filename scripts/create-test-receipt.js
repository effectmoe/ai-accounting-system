const { MongoClient, ObjectId } = require('mongodb');

async function createTestReceipt() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://tonychustudio:A3fKpNgQ4hH5TtQ@cluster0.lgo3h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('accounting-automation');
    const collection = db.collection('documents');
    
    // テスト用の駐車場領収書データ
    const parkingReceipt = {
      _id: new ObjectId(),
      companyId: '11111111-1111-1111-1111-111111111111',
      documentType: 'receipt',
      documentNumber: 'REC-2025-001',
      status: 'confirmed', // 確定済みステータス
      issueDate: new Date('2025-01-23'),
      partnerName: 'タイムズ駐車場',
      partnerAddress: '東京都渋谷区神宮前1-2-3',
      totalAmount: 1100,
      taxAmount: 100,
      subtotal: 1000,
      notes: '駐車場代（打ち合わせのため）',
      
      // OCR関連フィールド
      vendorName: 'タイムズ駐車場',
      receiptDate: new Date('2025-01-23'),
      category: '交通費',
      ocrStatus: 'completed',
      confidence: 0.95,
      fileName: 'parking-receipt-001.jpg',
      fileType: 'image/jpeg',
      fileSize: 245678,
      
      // 駐車場固有フィールド
      receiptType: 'parking',
      facilityName: 'タイムズ渋谷駅前第3',
      entryTime: '14:30',
      exitTime: '16:45',
      parkingDuration: '2時間15分',
      baseFee: 800,
      additionalFee: 300,
      
      // 明細
      items: [
        {
          item_name: '基本料金（最初の1時間）',
          amount: 800
        },
        {
          item_name: '追加料金（1時間15分）',
          amount: 300
        }
      ],
      
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // 通常の領収書データ（比較用）
    const generalReceipt = {
      _id: new ObjectId(),
      companyId: '11111111-1111-1111-1111-111111111111',
      documentType: 'receipt',
      documentNumber: 'REC-2025-002',
      status: 'draft', // 下書きステータス
      issueDate: new Date('2025-01-23'),
      partnerName: '文房具店ABC',
      partnerAddress: '東京都新宿区西新宿2-3-4',
      totalAmount: 3300,
      taxAmount: 300,
      subtotal: 3000,
      notes: '事務用品購入',
      
      // OCR関連フィールド
      vendorName: '文房具店ABC',
      receiptDate: new Date('2025-01-23'),
      category: '消耗品費',
      ocrStatus: 'completed',
      confidence: 0.92,
      fileName: 'general-receipt-002.jpg',
      fileType: 'image/jpeg',
      fileSize: 189456,
      
      receiptType: 'general',
      
      // 明細
      items: [
        {
          item_name: 'A4コピー用紙',
          amount: 1500
        },
        {
          item_name: 'ボールペン（10本セット）',
          amount: 1500
        }
      ],
      
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // データを挿入
    const result = await collection.insertMany([parkingReceipt, generalReceipt]);
    
    console.log('=== Test Receipts Created ===');
    console.log('Inserted documents:', result.insertedCount);
    console.log('\nDocument IDs:');
    console.log('1. Parking Receipt (confirmed):', parkingReceipt._id.toString());
    console.log('   - URL: http://localhost:3000/documents/' + parkingReceipt._id.toString());
    console.log('2. General Receipt (draft):', generalReceipt._id.toString());
    console.log('   - URL: http://localhost:3000/documents/' + generalReceipt._id.toString());
    
    // 作成したデータを確認
    const created = await collection.find({
      _id: { $in: [parkingReceipt._id, generalReceipt._id] }
    }).toArray();
    
    console.log('\n=== Created Documents Summary ===');
    created.forEach(doc => {
      console.log('---');
      console.log('Number:', doc.documentNumber);
      console.log('Type:', doc.documentType);
      console.log('Status:', doc.status);
      console.log('Receipt Type:', doc.receiptType);
      console.log('Total:', doc.totalAmount);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createTestReceipt();