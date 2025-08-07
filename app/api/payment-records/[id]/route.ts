import { NextRequest, NextResponse } from 'next/server';
import { PaymentRecordService } from '@/services/payment-record.service';
import { logger } from '@/lib/logger';

const paymentRecordService = new PaymentRecordService();

/**
 * GET /api/payment-records/[id]
 * 特定の入金記録を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const paymentRecord = await paymentRecordService.getPaymentRecord(params.id);

    if (!paymentRecord) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(paymentRecord);
  } catch (error) {
    logger.error(`Error in GET /api/payment-records/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch payment record' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payment-records/[id]
 * 入金記録を更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const updatedRecord = await paymentRecordService.updatePaymentRecord(params.id, body);

    if (!updatedRecord) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedRecord);
  } catch (error) {
    logger.error(`Error in PATCH /api/payment-records/${params.id}:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update payment record' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/payment-records/[id]
 * 入金記録を削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await paymentRecordService.deletePaymentRecord(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(`Error in DELETE /api/payment-records/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to delete payment record' },
      { status: 500 }
    );
  }
}