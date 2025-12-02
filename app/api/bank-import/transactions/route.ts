import { NextRequest, NextResponse } from 'next/server';
import { bankTransactionService } from '@/services/bank-transaction.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/bank-import/transactions
 * インポート済み取引一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') as 'deposit' | 'withdrawal' | undefined;
    const isConfirmed = searchParams.get('isConfirmed');
    const importId = searchParams.get('importId') || undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const result = await bankTransactionService.getImportedTransactions({
      limit,
      offset,
      type,
      importId,
      isConfirmed: isConfirmed !== null ? isConfirmed === 'true' : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Error in GET /api/bank-import/transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取引一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
