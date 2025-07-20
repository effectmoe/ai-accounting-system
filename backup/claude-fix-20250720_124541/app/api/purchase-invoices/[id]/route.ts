import { NextRequest, NextResponse } from 'next/server';
import { PurchaseInvoiceService } from '@/services/purchase-invoice.service';

import { logger } from '@/lib/logger';
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET: 特定の仕入請求書を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const purchaseInvoiceService = new PurchaseInvoiceService();
    const invoice = await purchaseInvoiceService.getPurchaseInvoice(params.id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Purchase invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    logger.error('Error in GET /api/purchase-invoices/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch purchase invoice' },
      { status: 500 }
    );
  }
}

// PUT: 仕入請求書を更新
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceData = await request.json();
    const purchaseInvoiceService = new PurchaseInvoiceService();
    
    logger.debug('[Purchase Invoice PUT] Updating invoice:', params.id, JSON.stringify(invoiceData, null, 2));
    
    const invoice = await purchaseInvoiceService.updatePurchaseInvoice(params.id, invoiceData);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Purchase invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    logger.error('Error in PUT /api/purchase-invoices/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update purchase invoice' },
      { status: 500 }
    );
  }
}

// DELETE: 仕入請求書を削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const purchaseInvoiceService = new PurchaseInvoiceService();
    const deleted = await purchaseInvoiceService.deletePurchaseInvoice(params.id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Purchase invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error in DELETE /api/purchase-invoices/[id]:', error);
    return NextResponse.json(
      { error: 'Failed to delete purchase invoice' },
      { status: 500 }
    );
  }
}