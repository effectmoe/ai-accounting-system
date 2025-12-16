/**
 * Square ロケーション API
 * Square のロケーション一覧を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { squareService } from '@/services/square.service';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-error-handler';

/**
 * GET /api/square/locations
 * Squareロケーション一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const locations = await squareService.listLocations();

    logger.info('[SquareLocations] Fetched locations:', { count: locations.length });

    return NextResponse.json({
      success: true,
      locations: locations.map(loc => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        status: loc.status,
        currency: loc.currency,
        country: loc.country,
        timezone: loc.timezone,
        businessName: loc.businessName,
      })),
    });
  } catch (error) {
    logger.error('[SquareLocations] Error fetching locations:', error);
    return createErrorResponse(error);
  }
}
