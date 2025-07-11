import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { ObjectId, GridFSBucket } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('Getting document with ID:', id);

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid document ID'
      }, { status: 400 });
    }

    // ドキュメントを取得
    const document = await db.findById('documents', id);
    
    if (!document) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 });
    }

    // Supabase形式に変換（既存のUIとの互換性のため）
    const formattedDocument = {
      id: document._id.toString(),
      _id: document._id.toString(),
      company_id: document.companyId?.toString() || '11111111-1111-1111-1111-111111111111',
      document_type: document.documentType || 'receipt',
      document_number: document.documentNumber || `DOC-${document._id.toString().slice(-8)}`,
      status: document.status || 'draft',
      issue_date: document.issueDate || document.documentDate || document.createdAt,
      partner_name: document.partnerName || document.vendorName || '不明',
      partner_address: document.partnerAddress || '',
      total_amount: document.totalAmount || 0,
      tax_amount: document.taxAmount || 0,
      subtotal: (document.totalAmount || 0) - (document.taxAmount || 0),
      notes: document.notes || '',
      created_at: document.createdAt,
      updated_at: document.updatedAt,
      
      // OCR関連フィールド
      file_name: document.fileName,
      file_type: document.fileType,
      file_size: document.fileSize,
      vendor_name: document.vendorName,
      receipt_date: document.documentDate,
      category: document.category || '未分類',
      extracted_text: document.extractedText,
      confidence: document.confidence,
      ocr_status: document.ocrStatus || 'completed',
      ocr_result_id: document.ocrResultId?.toString(),
      gridfs_file_id: document.gridfsFileId?.toString() || document.gridfs_file_id?.toString(),
      
      // 仕訳関連フィールド
      journalId: document.journalId?.toString()
    };

    console.log('Formatted document:', formattedDocument);

    return NextResponse.json({
      success: true,
      document: formattedDocument
    });

  } catch (error) {
    console.error('Document fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch document'
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    console.log('Delete request for document ID:', id);

    // IDの検証をより柔軟に
    if (!id || id.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Document ID is required'
      }, { status: 400 });
    }

    // ObjectIDの検証
    let isValidObjectId = false;
    try {
      // ObjectIDとして解析を試みる
      if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
        isValidObjectId = true;
      }
    } catch (e) {
      console.log('Not a valid ObjectId:', id);
    }

    if (!isValidObjectId) {
      return NextResponse.json({
        success: false,
        error: `Invalid document ID format: ${id}`
      }, { status: 400 });
    }

    // まずドキュメントを取得してGridFS IDを確認
    const document = await db.findOne('documents', { _id: new ObjectId(id) });
    
    if (!document) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 });
    }

    // GridFSファイルも削除（存在する場合）
    if (document.gridfs_file_id) {
      try {
        const bucket = new GridFSBucket(db.getDb(), { bucketName: 'uploads' });
        await bucket.delete(new ObjectId(document.gridfs_file_id));
      } catch (error) {
        console.error('GridFS deletion error:', error);
        // GridFS削除エラーは無視して続行
      }
    }

    // 関連する仕訳も削除（存在する場合）
    if (document.journalId) {
      try {
        await db.delete('journals', document.journalId.toString());
      } catch (error) {
        console.error('Journal deletion error:', error);
        // 仕訳削除エラーも無視して続行
      }
    }

    // ドキュメントを削除
    const result = await db.delete('documents', id);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Document deletion error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete document'
    }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    console.log('Updating document with ID:', id);
    console.log('Update data:', body);

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid document ID'
      }, { status: 400 });
    }

    // まずドキュメントが存在するか確認
    const existingDoc = await db.findById('documents', id);
    if (!existingDoc) {
      console.log('Document not found for update:', id);
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 });
    }

    // ドキュメントを更新
    const result = await db.update('documents', id, {
      ...body,
      updatedAt: new Date()
    });

    console.log('Update result:', result);

    if (!result) {
      // updateが失敗した場合でも、ドキュメントが存在することは確認済みなので
      // 更新後のドキュメントを取得して返す
      const updatedDoc = await db.findById('documents', id);
      if (updatedDoc) {
        return NextResponse.json({
          success: true,
          document: updatedDoc
        });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to update document'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: result
    });

  } catch (error) {
    console.error('Document update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update document'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';