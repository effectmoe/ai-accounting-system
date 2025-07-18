import { NextRequest, NextResponse } from 'next/server';
import { PurchaseInvoiceService } from '@/services/purchase-invoice.service';
import { PurchaseInvoiceStatus } from '@/types/collections';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// PATCH: 仕入請求書のステータスを更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }
    
    const purchaseInvoiceService = new PurchaseInvoiceService();
    const invoice = await purchaseInvoiceService.updateStatus(params.id, status as PurchaseInvoiceStatus);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Purchase invoice not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error in PATCH /api/purchase-invoices/[id]/status:', error);
    return NextResponse.json(
      { error: 'Failed to update purchase invoice status' },
      { status: 500 }
    );
  }
}