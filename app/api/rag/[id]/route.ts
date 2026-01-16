import { NextRequest, NextResponse } from 'next/server';
import { getRAGRecordService } from '@/services/rag-record.service';
import { toAPIFormat } from '@/types/rag-record';
import type { AccountCategory } from '@/types/receipt';
import { ReceiptService } from '@/services/receipt.service';
import { logger } from '@/lib/logger';

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
 * 双方向同期: 学習データを更新した際、対応する領収書も同期更新
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const service = getRAGRecordService();

    // 更新前のレコードを取得（sourceReceiptIdを確認するため）
    const existingRecord = await service.getById(id);

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

    // 双方向同期: 対応する領収書も更新
    // sourceReceiptIdがある場合、対応する領収書のsubjectとaccountCategoryを同期
    if (existingRecord?.sourceReceiptId) {
      try {
        const receiptService = new ReceiptService();
        const updateData: { subject?: string; accountCategory?: AccountCategory } = {};

        // 但し書き（description）が更新された場合
        if (body.description !== undefined) {
          updateData.subject = body.description;
        }

        // 勘定科目（category）が更新された場合
        if (body.category !== undefined) {
          updateData.accountCategory = body.category as AccountCategory;
        }

        // 更新するデータがある場合のみ実行
        if (Object.keys(updateData).length > 0) {
          const updatedReceipt = await receiptService.updateReceipt(
            existingRecord.sourceReceiptId,
            updateData
          );

          if (updatedReceipt) {
            logger.info('[PUT /api/rag/[id]] Receipt synced from RAG update:', {
              ragRecordId: id,
              receiptId: existingRecord.sourceReceiptId,
              syncedFields: Object.keys(updateData),
            });
          } else {
            logger.warn('[PUT /api/rag/[id]] Receipt not found for sync:', {
              sourceReceiptId: existingRecord.sourceReceiptId,
            });
          }
        }
      } catch (syncError) {
        // 同期失敗はRAG更新の成功に影響しない
        logger.warn('[PUT /api/rag/[id]] Receipt sync error (non-fatal):', syncError);
      }
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
