import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/mongodb-client';

export async function GET(request: NextRequest) {
  try {
    // 環境変数チェック
    const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
    
    if (!useAzureMongoDB) {
      return NextResponse.json({
        success: false,
        error: 'This endpoint is only available when USE_AZURE_MONGODB is true'
      }, { status: 400 });
    }

    // クエリパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');
    const documentType = searchParams.get('documentType');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // フィルター条件を構築
    const filter: any = {};
    if (companyId && companyId !== 'all') {
      filter.companyId = companyId;
    }
    if (documentType && documentType !== 'all') {
      filter.documentType = documentType;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    // ドキュメントを取得
    const documents = await db.find('documents', filter, {
      limit,
      skip,
      sort: { createdAt: -1 }
    });

    // Supabase形式に変換（既存のUIとの互換性のため）
    const formattedDocuments = documents.map(doc => ({
      id: doc._id.toString(),
      company_id: doc.companyId?.toString() || '11111111-1111-1111-1111-111111111111',
      document_type: doc.documentType || 'receipt',
      document_number: doc.documentNumber || `DOC-${doc._id.toString().slice(-8)}`,
      status: doc.status || 'draft',
      issue_date: doc.issueDate || doc.documentDate || doc.createdAt,
      partner_name: doc.partnerName || doc.vendorName || '不明',
      partner_address: doc.partnerAddress || '',
      total_amount: doc.totalAmount || 0,
      tax_amount: doc.taxAmount || 0,
      subtotal: (doc.totalAmount || 0) - (doc.taxAmount || 0),
      notes: doc.notes || '',
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
      
      // OCR関連フィールド
      file_name: doc.fileName,
      file_type: doc.fileType,
      file_size: doc.fileSize,
      vendor_name: doc.vendorName,
      receipt_date: doc.documentDate,
      category: doc.category || '未分類',
      extracted_text: doc.extractedText,
      confidence: doc.confidence,
      ocr_status: doc.ocrStatus || 'completed',
      ocr_result_id: doc.ocrResultId?.toString(),
      gridfs_file_id: doc.gridfsFileId?.toString()
    }));

    // 総数を取得
    const totalCount = await db.count('documents', filter);

    return NextResponse.json({
      success: true,
      documents: formattedDocuments,
      totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit)
    });

  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';