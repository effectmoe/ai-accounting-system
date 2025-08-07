import { NextRequest, NextResponse } from 'next/server';
import { PaymentRecordService } from '@/services/payment-record.service';
import { logger } from '@/lib/logger';

const paymentRecordService = new PaymentRecordService();

/**
 * GET /api/payment-records
 * 入金記録を検索
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const invoiceId = searchParams.get('invoiceId');
    const status = searchParams.get('status') as 'pending' | 'confirmed' | 'cancelled' | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = parseInt(searchParams.get('skip') || '0');

    const params = {
      ...(invoiceId && { invoiceId }),
      ...(status && { status }),
      ...(dateFrom && { dateFrom: new Date(dateFrom) }),
      ...(dateTo && { dateTo: new Date(dateTo) }),
      limit,
      skip,
    };

    const result = await paymentRecordService.searchPaymentRecords(params);

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error in GET /api/payment-records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment records' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payment-records
 * 新規入金記録を作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 必須フィールドのバリデーション
    if (!body.invoiceId || !body.amount || !body.paymentDate || !body.paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const paymentRecord = await paymentRecordService.createPaymentRecord(body);

    return NextResponse.json(paymentRecord, { status: 201 });
  } catch (error) {
    logger.error('Error in POST /api/payment-records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment record' },
      { status: 500 }
    );
  }
}