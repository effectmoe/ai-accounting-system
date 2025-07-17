import { NextRequest, NextResponse } from 'next/server';
import { SupplierQuoteService } from '@/services/supplier-quote.service';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET: 仕入先見積書月次集計
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    
    if (!yearParam || !monthParam) {
      return NextResponse.json(
        { error: 'Year and month are required' },
        { status: 400 }
      );
    }
    
    const year = parseInt(yearParam, 10);
    const month = parseInt(monthParam, 10);
    
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'Invalid year or month' },
        { status: 400 }
      );
    }
    
    const supplierQuoteService = new SupplierQuoteService();
    const aggregation = await supplierQuoteService.getMonthlyAggregation(year, month);
    
    return NextResponse.json(aggregation);
  } catch (error) {
    console.error('Error in GET /api/supplier-quotes/monthly-aggregation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch monthly aggregation' },
      { status: 500 }
    );
  }
}