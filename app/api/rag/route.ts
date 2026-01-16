import { NextRequest, NextResponse } from 'next/server';
import { getRAGRecordService } from '@/services/rag-record.service';
import { toAPIFormat } from '@/types/rag-record';
import type { AccountCategory } from '@/types/receipt';

/**
 * GET /api/rag
 * 全RAGレコードを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = {
      verified: searchParams.get('verified') === 'true' ? true :
                searchParams.get('verified') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      storeName: searchParams.get('storeName') || undefined,
      category: searchParams.get('category') as AccountCategory | undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      skip: searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0,
    };

    const service = getRAGRecordService();
    const { records, total } = await service.search(params);

    // API形式に変換（ChromaDB互換）
    const apiRecords = records.map(toAPIFormat);

    return NextResponse.json({
      success: true,
      records: apiRecords,
      total,
    });
  } catch (error) {
    console.error('RAG list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch RAG records' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rag
 * RAGレコードを作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    if (!body.store_name && !body.storeName) {
      return NextResponse.json(
        { success: false, error: '店舗名は必須です' },
        { status: 400 }
      );
    }

    if (!body.category) {
      return NextResponse.json(
        { success: false, error: '勘定科目は必須です' },
        { status: 400 }
      );
    }

    const service = getRAGRecordService();
    const record = await service.create({
      storeName: body.store_name || body.storeName,
      category: body.category,
      description: body.description || '',
      itemDescription: body.item_description || body.itemDescription,
      totalAmount: body.total_amount || body.totalAmount,
      issueDate: body.issue_date || body.issueDate,
      verified: body.verified ?? false,
      sourceReceiptId: body.source_receipt_id || body.sourceReceiptId,
    });

    return NextResponse.json({
      success: true,
      record: toAPIFormat(record),
    }, { status: 201 });
  } catch (error) {
    console.error('RAG create error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create RAG record' },
      { status: 500 }
    );
  }
}
