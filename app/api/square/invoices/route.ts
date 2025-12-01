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
      const locations = await squareService.listSquareLocations();
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
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        title: inv.title,
        status: inv.status,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        scheduledAt: inv.scheduledAt,
        orderId: inv.orderId,
        primaryRecipient: inv.primaryRecipient,
        paymentRequests: inv.paymentRequests?.map((pr: any) => ({
          uid: pr.uid,
          requestType: pr.requestType,
          dueDate: pr.dueDate,
          computedAmountMoney: pr.computedAmountMoney,
          totalCompletedAmountMoney: pr.totalCompletedAmountMoney,
        })),
        publicUrl: inv.publicUrl,
      })),
      total: invoices.length,
    });
  } catch (error) {
    logger.error('[SquareInvoices] Error fetching invoices:', error);
    return createErrorResponse(error);
  }
}
