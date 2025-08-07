import { NextRequest, NextResponse } from 'next/server';
import { PaymentRecordService } from '@/services/payment-record.service';
import { logger } from '@/lib/logger';

const paymentRecordService = new PaymentRecordService();

/**
 * POST /api/payment-records/[id]/cancel
 * 入金記録を取り消す
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const cancelledBy = body.cancelledBy || 'system';
    const cancelReason = body.cancelReason;

    const cancelledRecord = await paymentRecordService.cancelPaymentRecord(
      params.id,
      cancelledBy,
      cancelReason
    );

    if (!cancelledRecord) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(cancelledRecord);
  } catch (error) {
    logger.error(`Error in POST /api/payment-records/${params.id}/cancel:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel payment record' },
      { status: 500 }
    );
  }
}