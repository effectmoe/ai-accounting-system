/**
 * Square 請求書 API
 * Square からの請求書一覧取得・個別取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { squareService } from '@/services/square.service';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-error-handler';

/**
 * GET /api/square/invoices
 * Square の請求書一覧を取得（日付範囲フィルタリング対応）
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    let locationId = searchParams.get('locationId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // locationId が省略された場合、デフォルトロケーションを自動取得
    if (!locationId) {
      const locations = await squareService.listLocations();
      if (locations.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No locations found in Square account',
        }, { status: 400 });
      }
      locationId = locations[0].id;
      logger.info('[SquareInvoices] Using default location:', { locationId });
    }

    const invoices = await squareService.listSquareInvoices(locationId, limit, dateFrom, dateTo);

    logger.info('[SquareInvoices] Fetched invoices:', {
      locationId,
      count: invoices.length,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      success: true,
      invoices: invoices.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoice_number,
        title: inv.title,
        status: inv.status,
        createdAt: inv.created_at,
        updatedAt: inv.updated_at,
        scheduledAt: inv.scheduled_at,
        orderId: inv.order_id,
        primaryRecipient: inv.primary_recipient,
        paymentRequests: inv.payment_requests?.map((pr: any) => ({
          uid: pr.uid,
          requestType: pr.request_type,
          dueDate: pr.due_date,
          computedAmountMoney: pr.computed_amount_money,
          totalCompletedAmountMoney: pr.total_completed_amount_money,
        })),
        publicUrl: inv.public_url,
      })),
      total: invoices.length,
    });
  } catch (error) {
    logger.error('[SquareInvoices] Error fetching invoices:', error);
    return createErrorResponse(error);
  }
}
