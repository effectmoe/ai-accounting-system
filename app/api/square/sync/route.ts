/**
 * Square 同期 API
 * Square からデータを手動で同期
 */

import { NextRequest, NextResponse } from 'next/server';
import { squareService } from '@/services/square.service';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-error-handler';

/**
 * POST /api/square/sync
 * Square からデータを同期
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, locationId, invoiceId, customerId, dateFrom, dateTo, invoiceIds } = body;

    let result: any;

    switch (type) {
      case 'all':
        // 全請求書を同期
        if (!locationId) {
          return NextResponse.json({
            success: false,
            error: 'locationId is required for full sync',
          }, { status: 400 });
        }
        result = await squareService.importAllInvoices(locationId);
        logger.info('[SquareSync] Full sync completed:', result);
        return NextResponse.json({
          success: true,
          message: '全請求書の同期が完了しました',
          result,
        });

      case 'dateRange':
        // 日付範囲を指定して請求書を同期
        if (!locationId) {
          return NextResponse.json({
            success: false,
            error: 'locationId is required for date range sync',
          }, { status: 400 });
        }
        if (!dateFrom || !dateTo) {
          return NextResponse.json({
            success: false,
            error: 'dateFrom and dateTo are required for date range sync',
          }, { status: 400 });
        }
        result = await squareService.importInvoicesByDateRange(locationId, dateFrom, dateTo);
        logger.info('[SquareSync] Date range sync completed:', result);
        return NextResponse.json({
          success: true,
          message: `${result.total}件中${result.success}件の請求書を同期しました`,
          result,
        });

      case 'selected':
        // 選択した請求書を同期
        if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'invoiceIds (array) is required for selected sync',
          }, { status: 400 });
        }
        result = await squareService.importSelectedInvoices(invoiceIds);
        logger.info('[SquareSync] Selected sync completed:', result);
        return NextResponse.json({
          success: true,
          message: `${result.total}件中${result.success}件の請求書を同期しました`,
          result,
        });

      case 'invoice':
        // 特定の請求書を同期
        if (!invoiceId) {
          return NextResponse.json({
            success: false,
            error: 'invoiceId is required',
          }, { status: 400 });
        }
        result = await squareService.syncInvoiceFromSquare(invoiceId);
        if (result) {
          logger.info('[SquareSync] Invoice synced:', { invoiceId, systemId: result._id });
          return NextResponse.json({
            success: true,
            message: '請求書の同期が完了しました',
            invoice: {
              _id: result._id,
              invoiceNumber: result.invoiceNumber,
              totalAmount: result.totalAmount,
              status: result.status,
            },
          });
        } else {
          return NextResponse.json({
            success: false,
            error: '請求書の同期に失敗しました',
          }, { status: 500 });
        }

      case 'customer':
        // 特定の顧客を同期
        if (!customerId) {
          return NextResponse.json({
            success: false,
            error: 'customerId is required',
          }, { status: 400 });
        }
        result = await squareService.syncCustomerFromSquare(customerId);
        if (result) {
          logger.info('[SquareSync] Customer synced:', { customerId, systemId: result._id });
          return NextResponse.json({
            success: true,
            message: '顧客の同期が完了しました',
            customer: {
              _id: result._id,
              companyName: result.companyName,
              email: result.email,
            },
          });
        } else {
          return NextResponse.json({
            success: false,
            error: '顧客の同期に失敗しました',
          }, { status: 500 });
        }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid sync type. Use: all, dateRange, selected, invoice, or customer',
        }, { status: 400 });
    }
  } catch (error) {
    logger.error('[SquareSync] Error:', error);
    return createErrorResponse(error);
  }
}

/**
 * GET /api/square/sync
 * 同期ステータスを取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let invoiceMappings: any[] = [];
    let customerMappings: any[] = [];

    if (type === 'all' || type === 'invoices') {
      invoiceMappings = await squareService.getInvoiceMappings(limit);
    }

    if (type === 'all' || type === 'customers') {
      customerMappings = await squareService.getCustomerMappings(limit);
    }

    // 統計を計算
    const invoiceStats = {
      total: invoiceMappings.length,
      synced: invoiceMappings.filter(m => m.syncStatus === 'synced').length,
      failed: invoiceMappings.filter(m => m.syncStatus === 'failed').length,
      pending: invoiceMappings.filter(m => m.syncStatus === 'pending').length,
    };

    const customerStats = {
      total: customerMappings.length,
      synced: customerMappings.filter(m => m.syncStatus === 'synced').length,
      failed: customerMappings.filter(m => m.syncStatus === 'failed').length,
      pending: customerMappings.filter(m => m.syncStatus === 'pending').length,
    };

    return NextResponse.json({
      success: true,
      stats: {
        invoices: invoiceStats,
        customers: customerStats,
      },
      invoiceMappings: type === 'all' || type === 'invoices' ? invoiceMappings : undefined,
      customerMappings: type === 'all' || type === 'customers' ? customerMappings : undefined,
    });
  } catch (error) {
    logger.error('[SquareSync] Error getting sync status:', error);
    return createErrorResponse(error);
  }
}
