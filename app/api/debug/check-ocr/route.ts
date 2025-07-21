import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');
    const showAll = searchParams.get('all') === 'true';
    
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const client = new MongoClient(uri);
    
    await client.connect();
    const db = client.db('accounting_system');
    const collection = db.collection('documents');
    
    if (documentId) {
      // 特定のドキュメントを検索
      const document = await collection.findOne({ 
        _id: new ObjectId(documentId) 
      });
      
      if (document) {
        // フィルター条件をチェック
        const filterChecks = {
          hasOcrStatus: !!document.ocrStatus,
          ocrStatusValue: document.ocrStatus,
          hasLinkedDocumentId: 'linked_document_id' in document,
          linkedDocumentIdValue: document.linked_document_id,
          statusValue: document.status,
          isNotArchived: document.status !== 'archived',
          hiddenFromListValue: document.hiddenFromList,
          isNotHidden: document.hiddenFromList !== true,
          companyIdValue: document.companyId,
          isCorrectCompany: document.companyId === '11111111-1111-1111-1111-111111111111'
        };
        
        const passesAllFilters = 
          filterChecks.hasOcrStatus && 
          (!filterChecks.hasLinkedDocumentId || filterChecks.linkedDocumentIdValue === null) &&
          filterChecks.isNotArchived &&
          filterChecks.isNotHidden &&
          filterChecks.isCorrectCompany;
        
        await client.close();
        
        return NextResponse.json({
          found: true,
          document: document,
          filterChecks: filterChecks,
          passesAllFilters: passesAllFilters,
          message: passesAllFilters 
            ? 'ドキュメントが見つかり、全てのフィルター条件を満たしています' 
            : 'ドキュメントは見つかりましたが、フィルター条件を満たしていません'
        });
      }
      
      await client.close();
      
      return NextResponse.json({
        found: false,
        document: null,
        message: 'ドキュメントが見つかりません'
      });
    }
    
    // 最新のOCRドキュメントを表示
    const filter = {
      ocrStatus: { $exists: true },
      companyId: '11111111-1111-1111-1111-111111111111'
    };
    
    const limit = showAll ? 0 : 10;
    const documents = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    // 総数を取得
    const total = await collection.countDocuments(filter);
    
    await client.close();
    
    return NextResponse.json({
      total,
      showing: documents.length,
      documents: documents.map(doc => ({
        _id: doc._id.toString(),
        createdAt: doc.createdAt,
        receipt_date: doc.receipt_date,
        vendor_name: doc.vendor_name || doc.vendorName,
        total_amount: doc.total_amount || doc.totalAmount,
        ocrStatus: doc.ocrStatus,
        documentNumber: doc.documentNumber,
        fileName: doc.fileName
      }))
    });
    
  } catch (error) {
    console.error('Debug OCR check error:', error);
    return NextResponse.json({
      error: 'デバッグチェック中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}