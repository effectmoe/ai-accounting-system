import { NextRequest, NextResponse } from 'next/server';
import { PaymentRecordService } from '@/services/payment-record.service';
import { logger } from '@/lib/logger';

const paymentRecordService = new PaymentRecordService();

/**
 * POST /api/payment-records/[id]/confirm
 * 入金記録を確認済みにする
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const confirmedBy = body.confirmedBy || 'system';

    const confirmedRecord = await paymentRecordService.confirmPaymentRecord(params.id, confirmedBy);

    if (!confirmedRecord) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(confirmedRecord);
  } catch (error) {
    logger.error(`Error in POST /api/payment-records/${params.id}/confirm:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm payment record' },
      { status: 500 }
    );
  }
}