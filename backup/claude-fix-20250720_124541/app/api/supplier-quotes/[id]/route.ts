import { NextRequest, NextResponse } from 'next/server';
import { SupplierQuoteService } from '@/services/supplier-quote.service';

import { logger } from '@/lib/logger';
// GET: 仕入先見積書詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplierQuoteService = new SupplierQuoteService();
    const quote = await supplierQuoteService.getSupplierQuote(params.id);
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Supplier quote not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(quote);
  } catch (error) {
    logger.error('Error in GET /api/supplier-quotes/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier quote' },
      { status: 500 }
    );
  }
}

// PUT: 仕入先見積書更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updateData = await request.json();
    const supplierQuoteService = new SupplierQuoteService();
    
    const quote = await supplierQuoteService.updateSupplierQuote(params.id, updateData);
    
    if (!quote) {
      return NextResponse.json(
        { error: 'Supplier quote not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(quote);
  } catch (error) {
    logger.error('Error in PUT /api/supplier-quotes/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update supplier quote' },
      { status: 500 }
    );
  }
}

// DELETE: 仕入先見積書削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supplierQuoteService = new SupplierQuoteService();
    const success = await supplierQuoteService.deleteSupplierQuote(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Supplier quote not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/supplier-quotes/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier quote' },
      { status: 500 }
    );
  }
}