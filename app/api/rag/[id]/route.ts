import { NextRequest, NextResponse } from 'next/server';
import { getRAGRecordService } from '@/services/rag-record.service';
import { toAPIFormat } from '@/types/rag-record';
import type { AccountCategory } from '@/types/receipt';

/**
 * GET /api/rag/[id]
 * 特定のRAGレコードを取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getRAGRecordService();
    const record = await service.getById(id);

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      record: toAPIFormat(record),
    });
  } catch (error) {
    console.error('RAG get error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch RAG record' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rag/[id]
 * RAGレコードを更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const service = getRAGRecordService();
    const record = await service.update(id, {
      storeName: body.store_name || body.storeName,
      category: body.category as AccountCategory,
      description: body.description,
      itemDescription: body.item_description || body.itemDescription,
      verified: body.verified,
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      record: toAPIFormat(record),
    });
  } catch (error) {
    console.error('RAG update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update RAG record' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rag/[id]
 * RAGレコードを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getRAGRecordService();
    const deleted = await service.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted_id: id,
    });
  } catch (error) {
    console.error('RAG delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete RAG record' },
      { status: 500 }
    );
  }
}
