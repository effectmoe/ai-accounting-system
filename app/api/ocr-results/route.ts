import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '11111111-1111-1111-1111-111111111111';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // まず、ocr_resultsコレクションから取得を試みる（companyIdとcompany_idの両方を試す）
    let ocrResults = await db.find('ocr_results', {
      $and: [
        {
          $or: [
            { company_id: companyId },
            { companyId: companyId }
          ]
        },
        { status: { $ne: 'deleted' } }
      ]
    }, {
      limit,
      skip,
      sort: { created_at: -1, createdAt: -1 }
    });

    // documentsコレクションからも取得して結合
    if (ocrResults.length < limit) {
      const filter = {
        companyId: companyId,
        $and: [
          {
            $or: [
              { ocrStatus: { $exists: true } },
              { documentType: 'receipt' },
              { document_type: 'receipt' }
            ]
          },
          {
            $or: [
              { status: { $ne: 'archived' } },
              { status: { $exists: false } }
            ]
          },
          {
            $or: [
              { linked_document_id: { $exists: false } },
              { linked_document_id: null }
            ]
          }
        ]
      };

      const documentsResults = await db.find('documents', filter, {
        limit: limit - ocrResults.length,
        skip: Math.max(0, skip - ocrResultsCount),
        sort: { createdAt: -1 }
      });
      
      // 結果を結合
      ocrResults = [...ocrResults, ...documentsResults];
    }

    // OCR結果の形式に変換（両方のコレクションに対応）
    const formattedResults = ocrResults.map(doc => ({
      id: doc._id.toString(),
      company_id: doc.company_id || companyId,
      file_name: doc.file_name || doc.fileName || '',
      vendor_name: doc.vendor_name || doc.vendorName || doc.partnerName || doc.store_name || '',
      receipt_date: doc.receipt_date || doc.documentDate || doc.issueDate || doc.issue_date || doc.createdAt || doc.created_at,
      subtotal_amount: doc.subtotal_amount || ((doc.total_amount || doc.totalAmount || 0) - (doc.tax_amount || doc.taxAmount || 0)),
      tax_amount: doc.tax_amount || doc.taxAmount || 0,
      total_amount: doc.total_amount || doc.totalAmount || 0,
      payment_amount: doc.payment_amount || 0,
      change_amount: doc.change_amount || 0,
      receipt_number: doc.receipt_number || doc.receiptNumber || doc.documentNumber || doc.document_number || '',
      store_name: doc.store_name || doc.vendor_name || doc.vendorName || '',
      store_phone: doc.store_phone || '',
      company_name: doc.company_name || '',
      notes: doc.notes || '',
      extracted_text: doc.extracted_text || doc.extractedText || '',
      created_at: doc.created_at || doc.createdAt,
      status: doc.status || doc.ocrStatus || 'completed',
      linked_document_id: doc.linked_document_id || null
    }));

    // 総数を取得（両方のコレクションから）
    let total = 0;
    
    // まずocr_resultsコレクションの数を取得
    const ocrResultsCount = await db.count('ocr_results', {
      $and: [
        {
          $or: [
            { company_id: companyId },
            { companyId: companyId }
          ]
        },
        { status: { $ne: 'deleted' } }
      ]
    });
    
    // documentsコレクションの数も取得
    const documentsCount = await db.count('documents', {
        companyId: companyId,
        $and: [
          {
            $or: [
              { ocrStatus: { $exists: true } },
              { documentType: 'receipt' },
              { document_type: 'receipt' }
            ]
          },
          {
            $or: [
              { status: { $ne: 'archived' } },
              { status: { $exists: false } }
            ]
          },
          {
            $or: [
              { linked_document_id: { $exists: false } },
              { linked_document_id: null }
            ]
          }
        ]
    });
    
    // 総数は両方のコレクションの合計
    total = ocrResultsCount + documentsCount;

    logger.debug('Fetched OCR results:', formattedResults.length, 'total:', total);

    return NextResponse.json({
      success: true,
      data: formattedResults,
      total,
      page,
      limit
    });
  } catch (error) {
    logger.error('OCR results API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}