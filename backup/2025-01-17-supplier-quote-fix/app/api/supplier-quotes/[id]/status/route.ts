import { NextRequest, NextResponse } from 'next/server';
import { SupplierQuoteService } from '@/services/supplier-quote.service';
import { SupplierQuoteStatus } from '@/types/collections';

// PUT: 仕入先見積書ステータス更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, statusDate } = await request.json();
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    const supplierQuoteService = new SupplierQuoteService();
    const quote = await supplierQuoteService.updateSupplierQuoteStatus(
      params.id,
      status as SupplierQuoteStatus,
      statusDate ? new Date(statusDate) : new Date()
    );
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Supplier quote not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error in PUT /api/supplier-quotes/[id]/status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update supplier quote status' },
      { status: 500 }
    );
  }
}