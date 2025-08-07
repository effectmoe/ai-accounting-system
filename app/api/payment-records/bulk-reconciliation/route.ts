import { NextRequest, NextResponse } from 'next/server';
import { PaymentRecordService } from '@/services/payment-record.service';
import { logger } from '@/lib/logger';

const paymentRecordService = new PaymentRecordService();

/**
 * POST /api/payment-records/bulk-reconciliation
 * 一括消し込み処理
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    if (!body.paymentRecords || !Array.isArray(body.paymentRecords)) {
      return NextResponse.json(
        { error: 'paymentRecords array is required' },
        { status: 400 }
      );
    }

    // 各レコードのバリデーション
    for (const record of body.paymentRecords) {
      if (!record.invoiceId || !record.amount || !record.paymentDate || !record.paymentMethod) {
        return NextResponse.json(
          { error: 'Each payment record must have invoiceId, amount, paymentDate, and paymentMethod' },
          { status: 400 }
        );
      }
    }

    const createdRecords = await paymentRecordService.bulkReconciliation(body.paymentRecords);

    return NextResponse.json({
      success: true,
      createdCount: createdRecords.length,
      paymentRecords: createdRecords,
    });
  } catch (error) {
    logger.error('Error in POST /api/payment-records/bulk-reconciliation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process bulk reconciliation' },
      { status: 500 }
    );
  }
}