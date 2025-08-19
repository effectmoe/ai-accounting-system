import { NextRequest, NextResponse } from 'next/server';
import { ReceiptService } from '@/services/receipt.service';
import { CreateReceiptParams } from '@/types/receipt';
import { logger } from '@/lib/logger';

const receiptService = new ReceiptService();

/**
 * GET /api/receipts - 領収書一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    const params = {
      customerId: searchParams.get('customerId') || undefined,
      invoiceId: searchParams.get('invoiceId') || undefined,
      status: searchParams.get('status') as any || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
      skip: searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0,
      sortBy: searchParams.get('sortBy') || 'issueDate',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    const result = await receiptService.searchReceipts(params);
    
    return NextResponse.json(result);
  } catch (error) {
    logger.error('Error fetching receipts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/receipts - 領収書を作成（請求書から）
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateReceiptParams;
    
    if (!body.invoiceId) {
      return NextResponse.json(
        { error: 'Invoice ID is required' },
        { status: 400 }
      );
    }

    const receipt = await receiptService.createReceiptFromInvoice(body);
    
    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    logger.error('Error creating receipt:', error);
    const message = error instanceof Error ? error.message : 'Failed to create receipt';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}