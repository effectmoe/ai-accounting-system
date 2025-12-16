/**
 * Square 接続テスト API
 * Square APIへの接続をテスト
 */

import { NextRequest, NextResponse } from 'next/server';
import { squareService } from '@/services/square.service';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-error-handler';

/**
 * GET /api/square/test-connection
 * Square API接続をテスト
 */
export async function GET(request: NextRequest) {
  try {
    const result = await squareService.testConnection();

    if (result.success) {
      logger.info('[SquareTestConnection] Connection successful:', result.merchant);
      return NextResponse.json({
        success: true,
        merchant: result.merchant,
        message: 'Square API接続に成功しました',
      });
    } else {
      logger.warn('[SquareTestConnection] Connection failed:', result.error);
      return NextResponse.json({
        success: false,
        error: result.error,
        message: 'Square API接続に失敗しました',
      }, { status: 400 });
    }
  } catch (error) {
    logger.error('[SquareTestConnection] Error:', error);
    return createErrorResponse(error);
  }
}
