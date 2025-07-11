import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // MongoDB接続確認
    console.log('Documents list API - MongoDB URI exists:', !!process.env.MONGODB_URI);

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
    
    // 重複表示防止：hiddenFromListがtrueのドキュメントを除外
    filter.hiddenFromList = { $ne: true };

    // ドキュメントを取得
    const documents = await db.find('documents', filter, {
      limit,
      skip,
      sort: { createdAt: -1 }
    });

    console.log('Raw documents from database:', documents.length);
    if (documents.length > 0) {
      console.log('First document raw data:', documents[0]);
      // Check for journal entries specifically
      const journalEntries = documents.filter(doc => doc.documentType === 'journal_entry');
      if (journalEntries.length > 0) {
        console.log('First journal entry raw data:', {
          _id: journalEntries[0]._id,
          documentType: journalEntries[0].documentType,
          sourceDocumentId: journalEntries[0].sourceDocumentId,
          journalId: journalEntries[0].journalId,
          hiddenFromList: journalEntries[0].hiddenFromList
        });
      }
    }

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
      gridfs_file_id: doc.gridfsFileId?.toString() || doc.gridfs_file_id?.toString(),
      
      // 仕訳関連フィールド
      journalId: doc.journalId?.toString(),
      sourceDocumentId: doc.sourceDocumentId?.toString(),
      source_document_id: doc.sourceDocumentId?.toString() // 互換性のため両方の形式で提供
    }));

    console.log('Formatted documents:', formattedDocuments.length);
    if (formattedDocuments.length > 0) {
      console.log('First formatted document:', formattedDocuments[0]);
    }

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
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // より詳細なエラーメッセージ
    let errorMessage = '予期しないエラーが発生しました';
    if (error instanceof Error) {
      if (error.message.includes('MONGODB_URI')) {
        errorMessage = 'データベース接続設定が不足しています';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'データベースに接続できません';
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';