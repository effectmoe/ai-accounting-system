/**
 * Square Webhook エンドポイント
 * Square からの webhook イベントを受信し、システムに同期する
 */

import { NextRequest, NextResponse } from 'next/server';
import { squareService } from '@/services/square.service';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

/**
 * Square Webhook 署名を検証
 * Square は HMAC-SHA256 を使用
 */
function verifySquareWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    return false;
  }

  // Square の署名検証
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('base64');

  // タイミング攻撃を防ぐため、定数時間比較を使用
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/square
 * Square Webhook イベントを受信
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Square の署名ヘッダーを取得
    const signature = request.headers.get('x-square-hmacsha256-signature');
    const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    // 環境設定を確認（開発環境では署名検証をスキップ可能）
    const skipSignatureVerification = process.env.SQUARE_SKIP_WEBHOOK_VERIFICATION === 'true';

    // リクエストボディを取得
    const rawBody = await request.text();

    // 署名検証（本番環境では必須）
    if (!skipSignatureVerification) {
      if (!webhookSecret) {
        logger.warn('[SquareWebhook] Missing SQUARE_WEBHOOK_SIGNATURE_KEY');
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      if (!verifySquareWebhookSignature(rawBody, signature, webhookSecret)) {
        logger.warn('[SquareWebhook] Invalid signature', {
          hasSignature: !!signature,
          hasSecret: !!webhookSecret,
        });
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    // JSONをパース
    const event = JSON.parse(rawBody);

    // イベント情報をログ
    logger.info('[SquareWebhook] Event received', {
      type: event.type,
      merchantId: event.merchant_id,
      eventId: event.event_id,
      createdAt: event.created_at,
    });

    // イベントの重複チェック（event_idでチェック）
    // TODO: event_id を記録して重複処理を防ぐ（将来的な改善）

    // サービス層でWebhookを処理
    await squareService.handleWebhook(event.type, event.data);

    const processingTime = Date.now() - startTime;
    logger.info('[SquareWebhook] Event processed successfully', {
      type: event.type,
      processingTime,
    });

    return NextResponse.json({
      success: true,
      eventId: event.event_id,
      processingTime,
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('[SquareWebhook] Error processing webhook:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
    });

    // Square は 200 以外のレスポンスでリトライするため、
    // 一時的なエラーの場合は 500 を返す
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/square
 * Webhook エンドポイントの健全性チェック（テスト用）
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    endpoint: '/api/webhooks/square',
    supportedEvents: [
      'invoice.created',
      'invoice.published',
      'invoice.updated',
      'invoice.payment_made',
      'invoice.scheduled_charge_failed',
      'invoice.canceled',
      'invoice.refunded',
      'customer.created',
      'customer.updated',
    ],
    timestamp: new Date().toISOString(),
  });
}
