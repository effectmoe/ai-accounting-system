import { NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const companyId = '11111111-1111-1111-1111-111111111111';
    
    // ocr_resultsコレクションのデータを取得（companyIdとcompany_idの両方を試す）
    const ocrResults = await db.find('ocr_results', {
      $or: [
        { company_id: companyId },
        { companyId: companyId }
      ]
    }, {
      limit: 10,
      sort: { created_at: -1, createdAt: -1 }
    });
    
    // documentsコレクションのOCR関連データを取得
    const documents = await db.find('documents', {
      companyId: companyId,
      $or: [
        { ocrStatus: { $exists: true } },
        { documentType: 'receipt' },
        { document_type: 'receipt' }
      ]
    }, {
      limit: 10,
      sort: { createdAt: -1 }
    });
    
    // 統計情報
    const ocrResultsCount = await db.count('ocr_results', {
      $or: [
        { company_id: companyId },
        { companyId: companyId }
      ]
    });
    
    const documentsCount = await db.count('documents', {
      companyId: companyId,
      $or: [
        { ocrStatus: { $exists: true } },
        { documentType: 'receipt' },
        { document_type: 'receipt' }
      ],
      status: { $ne: 'archived' }
    });
    
    return NextResponse.json({
      success: true,
      stats: {
        ocrResultsCount,
        documentsCount
      },
      ocrResults: {
        count: ocrResults.length,
        data: ocrResults.map(r => ({
          id: r._id,
          file_name: r.file_name,
          vendor_name: r.vendor_name,
          total_amount: r.total_amount,
          created_at: r.created_at || r.createdAt,
          status: r.status,
          linked_document_id: r.linked_document_id
        }))
      },
      documents: {
        count: documents.length,
        data: documents.map(d => ({
          id: d._id,
          fileName: d.fileName,
          documentType: d.documentType || d.document_type,
          vendorName: d.vendorName || d.vendor_name,
          totalAmount: d.totalAmount || d.total_amount,
          createdAt: d.createdAt,
          ocrStatus: d.ocrStatus,
          status: d.status,
          linked_document_id: d.linked_document_id
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Debug OCR data error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}