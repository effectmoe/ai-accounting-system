import { NextRequest, NextResponse } from 'next/server';
import { SupplierQuoteService } from '@/services/supplier-quote.service';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET: 仕入先見積書一覧取得
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const supplierId = searchParams.get('supplierId');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const isGeneratedByAI = searchParams.get('isGeneratedByAI');
    const limit = searchParams.get('limit');
    const skip = searchParams.get('skip');

    const supplierQuoteService = new SupplierQuoteService();
    const searchParams_ = {
      supplierId: supplierId || undefined,
      status: status as any,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      isGeneratedByAI: isGeneratedByAI === 'true' ? true : isGeneratedByAI === 'false' ? false : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    };

    const result = await supplierQuoteService.searchSupplierQuotes(searchParams_);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in GET /api/supplier-quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier quotes' },
      { status: 500 }
    );
  }
}

// POST: 仕入先見積書作成
export async function POST(request: NextRequest) {
  try {
    const quoteData = await request.json();
    const supplierQuoteService = new SupplierQuoteService();
    
    // 見積書番号が指定されていない場合は自動生成
    if (!quoteData.quoteNumber) {
      quoteData.quoteNumber = await supplierQuoteService.generateSupplierQuoteNumber();
    }
    
    const quote = await supplierQuoteService.createSupplierQuote(quoteData);
    
    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/supplier-quotes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create supplier quote' },
      { status: 500 }
    );
  }
}