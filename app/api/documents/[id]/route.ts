import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../src/lib/mongodb-client';
import { ObjectId, GridFSBucket } from 'mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid document ID'
      }, { status: 400 });
    }

    // まずドキュメントを取得してGridFS IDを確認
    const document = await db.findOne('documents', id);
    
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
      await db.delete('journals', document.journalId.toString());
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

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid document ID'
      }, { status: 400 });
    }

    // ドキュメントを更新
    const result = await db.update('documents', id, {
      ...body,
      updatedAt: new Date()
    });

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Document not found'
      }, { status: 404 });
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