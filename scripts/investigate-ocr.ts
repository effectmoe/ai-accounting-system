import { db } from '../lib/mongodb-client';

async function investigateOCR() {
  console.log('=== MongoDB OCR調査開始 ===');

  try {
    const companyId = '11111111-1111-1111-1111-111111111111';
    
    // documentsコレクション内のOCR結果を確認
    const filter = {
      companyId: companyId,
      ocrStatus: { $exists: true },
      $or: [
        { linked_document_id: { $exists: false } },
        { linked_document_id: null }
      ],
      status: { $ne: 'archived' },
      hiddenFromList: { $ne: true }
    };
    
    console.log('フィルター条件:', JSON.stringify(filter, null, 2));
    
    const ocrResults = await db.find('documents', filter, {
      limit: 20,
      skip: 0,
      sort: { createdAt: -1 }
    });
    
    console.log('OCR結果数:', ocrResults.length);
    
    if (ocrResults.length > 0) {
      console.log('最初のOCR結果サンプル:', JSON.stringify(ocrResults[0], null, 2));
    }
    
    // 総数を取得
    const total = await db.count('documents', filter);
    console.log('総数:', total);
    
    // 全documentsコレクションの状況も確認
    const allDocuments = await db.find('documents', { companyId }, { limit: 5 });
    console.log('全ドキュメント数（最初の5件）:');
    allDocuments.forEach((doc, i) => {
      console.log(`${i + 1}:`, {
        id: doc._id,
        ocrStatus: doc.ocrStatus,
        status: doc.status,
        hiddenFromList: doc.hiddenFromList,
        linked_document_id: doc.linked_document_id
      });
    });
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    process.exit(0);
  }
}

investigateOCR();