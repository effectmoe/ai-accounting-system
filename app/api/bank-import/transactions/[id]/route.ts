import { NextRequest, NextResponse } from 'next/server';
import { bankTransactionService } from '@/services/bank-transaction.service';
import { logger } from '@/lib/logger';
import { ObjectId } from 'mongodb';

/**
 * PATCH /api/bank-import/transactions/[id]
 * 取引のマッチング情報を更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { matchedInvoiceId, matchConfidence, matchReason, confirm } = body;

    // マッチング情報の更新
    if (matchedInvoiceId !== undefined || matchConfidence || matchReason) {
      await bankTransactionService.updateTransactionMatch(id, {
        matchedInvoiceId: matchedInvoiceId ? new ObjectId(matchedInvoiceId) : undefined,
        matchConfidence,
        matchReason,
      });
    }

    // 確認処理
    if (confirm) {
      await bankTransactionService.confirmTransaction(id, body.confirmedBy);
    }

    return NextResponse.json({
      success: true,
      message: '取引が更新されました',
    });
  } catch (error) {
    logger.error('Error in PATCH /api/bank-import/transactions/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '取引の更新に失敗しました' },
      { status: 500 }
    );
  }
}
