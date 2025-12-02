import { NextRequest, NextResponse } from 'next/server';
import { bankTransactionService } from '@/services/bank-transaction.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/bank-import/history/[importId]
 * インポート履歴の詳細と関連取引を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> }
) {
  try {
    const { importId } = await params;

    // インポートIDに関連する取引を取得
    const transactions = await bankTransactionService.getImportedTransactions({
      importId,
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      importId,
      transactions: transactions.items,
      total: transactions.total,
    });
  } catch (error) {
    logger.error('Error in GET /api/bank-import/history/[importId]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'インポート詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}
