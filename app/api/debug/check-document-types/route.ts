import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const companyId = '11111111-1111-1111-1111-111111111111';
    
    // OCRステータスを持つすべてのドキュメントを取得
    const filter = {
      companyId: companyId,
      ocrStatus: { $exists: true }
    };
    
    const allOcrDocs = await db.find('documents', filter);
    
    // ドキュメントタイプごとに分類
    const typeDistribution: any = {};
    const samplesByType: any = {};
    
    allOcrDocs.forEach(doc => {
      const docType = doc.documentType || doc.type || 'unknown';
      typeDistribution[docType] = (typeDistribution[docType] || 0) + 1;
      
      // 各タイプのサンプルを3つまで保存
      if (!samplesByType[docType]) {
        samplesByType[docType] = [];
      }
      if (samplesByType[docType].length < 3) {
        samplesByType[docType].push({
          _id: doc._id.toString(),
          documentType: doc.documentType,
          type: doc.type,
          fileName: doc.fileName || doc.file_name,
          vendor: doc.vendor_name || doc.vendorName || doc.partnerName,
          amount: doc.total_amount || doc.totalAmount,
          date: doc.receipt_date || doc.documentDate || doc.issueDate,
          ocrStatus: doc.ocrStatus,
          linked_document_id: doc.linked_document_id,
          createdAt: doc.createdAt
        });
      }
    });
    
    // 結果を返す
    return NextResponse.json({
      total: allOcrDocs.length,
      typeDistribution,
      samplesByType,
      message: 'OCRドキュメントのタイプ分布を確認しました'
    });
    
  } catch (error) {
    console.error('Document types check error:', error);
    return NextResponse.json({
      error: 'ドキュメントタイプの確認中にエラーが発生しました',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}