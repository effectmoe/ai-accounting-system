/**
 * Square 顧客 API
 * Square からの顧客一覧取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { squareService } from '@/services/square.service';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-error-handler';

/**
 * GET /api/square/customers
 * Square の顧客一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const customers = await squareService.listSquareCustomers(limit);

    logger.info('[SquareCustomers] Fetched customers:', {
      count: customers.length,
    });

    return NextResponse.json({
      success: true,
      customers: customers.map(cust => ({
        id: cust.id,
        givenName: cust.givenName,
        familyName: cust.familyName,
        companyName: cust.companyName,
        emailAddress: cust.emailAddress,
        phoneNumber: cust.phoneNumber,
        address: cust.address,
        createdAt: cust.createdAt,
        updatedAt: cust.updatedAt,
      })),
      total: customers.length,
    });
  } catch (error) {
    logger.error('[SquareCustomers] Error fetching customers:', error);
    return createErrorResponse(error);
  }
}
