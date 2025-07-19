import { NextRequest, NextResponse } from 'next/server';
import { PurchaseInvoiceService } from '@/services/purchase-invoice.service';

import { logger } from '@/lib/logger';
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET: 月次集計を取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    
    if (!year || !month) {
      return NextResponse.json(
        { error: 'Year and month are required' },
        { status: 400 }
      );
    }
    
    const purchaseInvoiceService = new PurchaseInvoiceService();
    const aggregation = await purchaseInvoiceService.getMonthlyAggregation(
      parseInt(year, 10),
      parseInt(month, 10)
    );
    
    return NextResponse.json(aggregation);
  } catch (error) {
    logger.error('Error in GET /api/purchase-invoices/monthly-aggregation:', error);
    return NextResponse.json(
      { error: 'Failed to get monthly aggregation' },
      { status: 500 }
    );
  }
}