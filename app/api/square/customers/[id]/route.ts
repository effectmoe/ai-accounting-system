/**
 * Square 顧客詳細 API
 * Square から特定の顧客を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { squareService } from '@/services/square.service';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-error-handler';

/**
 * GET /api/square/customers/[id]
 * Square の特定顧客を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const customerId = params.id;

    const customer = await squareService.getSquareCustomer(customerId);

    if (!customer) {
      return NextResponse.json({
        success: false,
        error: 'Customer not found',
      }, { status: 404 });
    }

    logger.info('[SquareCustomer] Fetched customer:', { customerId });

    return NextResponse.json({
      success: true,
      customer,
    });
  } catch (error) {
    logger.error('[SquareCustomer] Error fetching customer:', error);
    return createErrorResponse(error);
  }
}
