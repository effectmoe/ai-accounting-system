const { MongoClient } = require('mongodb');
require('dotenv').config();

async function checkOcrDocumentTypes() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ MongoDB接続成功');
    
    const db = client.db('accounting-automation');
    const collection = db.collection('documents');
    
    // 1. ocrStatusが存在するドキュメントの文書タイプを集計
    console.log('\n📊 ocrStatusが存在するドキュメントの文書タイプ別集計:');
    
    const ocrDocuments = await collection.find({
      ocrStatus: { $exists: true }
    }).toArray();
    
    const typeStats = {};
    const samplesByType = {};
    
    ocrDocuments.forEach(doc => {
      // 文書タイプを特定（複数のフィールド名に対応）
      const docType = doc.documentType || doc.document_type || doc.type || 'unknown';
      
      if (!typeStats[docType]) {
        typeStats[docType] = 0;
        samplesByType[docType] = [];
      }
      
      typeStats[docType]++;
      
      // 各タイプから最大3件のサンプルを保存
      if (samplesByType[docType].length < 3) {
        samplesByType[docType].push({
          _id: doc._id,
          fileName: doc.fileName || doc.file_name || 'N/A',
          vendorName: doc.vendorName || doc.vendor_name || doc.partnerName || 'N/A',
          date: doc.receipt_date || doc.documentDate || doc.issueDate || doc.createdAt,
          amount: doc.totalAmount || doc.total_amount || 0,
          ocrStatus: doc.ocrStatus,
          linked_document_id: doc.linked_document_id
        });
      }
    });
    
    console.log('\n文書タイプ別の件数:');
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}件`);
    });
    
    // 2. 各文書タイプのサンプルデータを表示
    console.log('\n📋 各文書タイプのサンプルデータ:');
    Object.entries(samplesByType).forEach(([type, samples]) => {
      console.log(`\n【${type}】`);
      samples.forEach((sample, index) => {
        console.log(`  ${index + 1}. ID: ${sample._id}`);
        console.log(`     ファイル名: ${sample.fileName}`);
        console.log(`     ベンダー: ${sample.vendorName}`);
        console.log(`     日付: ${sample.date}`);
        console.log(`     金額: ¥${sample.amount.toLocaleString()}`);
        console.log(`     OCRステータス: ${sample.ocrStatus}`);
        console.log(`     リンク済み: ${sample.linked_document_id ? 'Yes' : 'No'}`);
      });
    });
    
    // 3. 見積書（quotation/estimate）と請求書（invoice）の詳細確認
    console.log('\n🔍 見積書と請求書の詳細確認:');
    
    const targetTypes = ['quotation', 'estimate', 'invoice', '見積書', '請求書'];
    
    for (const type of targetTypes) {
      const count = await collection.countDocuments({
        $or: [
          { documentType: type },
          { document_type: type },
          { type: type }
        ],
        ocrStatus: { $exists: true }
      });
      
      if (count > 0) {
        console.log(`\n${type}: ${count}件`);
        
        const samples = await collection.find({
          $or: [
            { documentType: type },
            { document_type: type },
            { type: type }
          ],
          ocrStatus: { $exists: true }
        }).limit(2).toArray();
        
        samples.forEach((doc, index) => {
          console.log(`  サンプル${index + 1}:`);
          console.log(`    全フィールド:`, Object.keys(doc).join(', '));
        });
      }
    }
    
    // 4. OCR結果タブに表示される条件を満たすドキュメントの確認
    console.log('\n✅ OCR結果タブに表示される条件を満たすドキュメント:');
    
    const ocrTabFilter = {
      companyId: '11111111-1111-1111-1111-111111111111',
      ocrStatus: { $exists: true },
      $or: [
        { linked_document_id: { $exists: false } },
        { linked_document_id: null }
      ],
      status: { $ne: 'archived' },
      hiddenFromList: { $ne: true }
    };
    
    const ocrTabResults = await collection.find(ocrTabFilter).toArray();
    
    const ocrTabTypeStats = {};
    ocrTabResults.forEach(doc => {
      const docType = doc.documentType || doc.document_type || doc.type || 'unknown';
      ocrTabTypeStats[docType] = (ocrTabTypeStats[docType] || 0) + 1;
    });
    
    console.log('\nOCR結果タブに表示される文書タイプ:');
    Object.entries(ocrTabTypeStats).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}件`);
    });
    
    // 5. documentTypeフィールドの値のバリエーションを確認
    console.log('\n📝 documentTypeフィールドの全バリエーション:');
    
    const allTypes = await collection.distinct('documentType');
    const allTypes2 = await collection.distinct('document_type');
    const allTypes3 = await collection.distinct('type');
    
    const uniqueTypes = new Set([...allTypes, ...allTypes2, ...allTypes3]);
    console.log('発見された文書タイプ:', Array.from(uniqueTypes).filter(t => t).join(', '));
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ 接続を閉じました');
  }
}

checkOcrDocumentTypes();