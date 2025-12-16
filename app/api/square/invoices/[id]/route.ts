/**
 * Square 請求書詳細 API
 * Square から特定の請求書を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { squareService } from '@/services/square.service';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-error-handler';

/**
 * GET /api/square/invoices/[id]
 * Square の特定請求書を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const invoiceId = params.id;

    const invoice = await squareService.getSquareInvoice(invoiceId);

    if (!invoice) {
      return NextResponse.json({
        success: false,
        error: 'Invoice not found',
      }, { status: 404 });
    }

    logger.info('[SquareInvoice] Fetched invoice:', { invoiceId });

    return NextResponse.json({
      success: true,
      invoice,
    });
  } catch (error) {
    logger.error('[SquareInvoice] Error fetching invoice:', error);
    return createErrorResponse(error);
  }
}
