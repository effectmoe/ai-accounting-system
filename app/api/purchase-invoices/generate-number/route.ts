import { NextRequest, NextResponse } from 'next/server';
import { PurchaseInvoiceService } from '@/services/purchase-invoice.service';

import { logger } from '@/lib/logger';
// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET: 仕入請求書番号を生成
export async function GET(request: NextRequest) {
  try {
    const purchaseInvoiceService = new PurchaseInvoiceService();
    const invoiceNumber = await purchaseInvoiceService.generatePurchaseInvoiceNumber();
    
    return NextResponse.json({ invoiceNumber });
  } catch (error) {
    logger.error('Error in GET /api/purchase-invoices/generate-number:', error);
    return NextResponse.json(
      { error: 'Failed to generate purchase invoice number' },
      { status: 500 }
    );
  }
}