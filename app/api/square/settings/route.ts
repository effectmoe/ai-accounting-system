/**
 * Square 設定 API
 * Square連携の設定を管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { squareService } from '@/services/square.service';
import { logger } from '@/lib/logger';
import { createErrorResponse } from '@/lib/api-error-handler';

/**
 * GET /api/square/settings
 * Square設定を取得
 */
export async function GET(request: NextRequest) {
  try {
    const settings = await squareService.getSettings();

    // アクセストークンはマスクして返す
    const maskedSettings = settings ? {
      ...settings,
      accessToken: settings.accessToken
        ? `****${settings.accessToken.slice(-4)}`
        : null,
      webhookSignatureKey: settings.webhookSignatureKey
        ? `****${settings.webhookSignatureKey.slice(-4)}`
        : null,
    } : null;

    return NextResponse.json({
      success: true,
      settings: maskedSettings,
    });
  } catch (error) {
    logger.error('[SquareSettings] Failed to get settings:', error);
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/square/settings
 * Square設定を更新
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const { locationId, autoSync } = body;

    // 設定を保存
    await squareService.saveSettings({
      locationId,
      autoSync,
    });

    logger.info('[SquareSettings] Settings updated:', { locationId, autoSync });

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    logger.error('[SquareSettings] Failed to update settings:', error);
    return createErrorResponse(error);
  }
}
