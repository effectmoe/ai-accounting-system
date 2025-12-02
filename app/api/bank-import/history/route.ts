import { NextRequest, NextResponse } from 'next/server';
import { bankTransactionService } from '@/services/bank-transaction.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/bank-import/history
 * インポート履歴一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') || undefined;

    const result = await bankTransactionService.getImportHistory({
      limit,
      offset,
      status,
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error in GET /api/bank-import/history:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'インポート履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}
