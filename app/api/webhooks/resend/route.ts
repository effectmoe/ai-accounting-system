import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { handleResendWebhook } from '@/lib/resend-service';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

// Resend Webhook署名を検証（Svix形式）
function verifyWebhookSignature(
  payload: string,
  headers: {
    signature?: string | null;
    timestamp?: string | null;
    id?: string | null;
  },
  secret: string
): boolean {
  if (!headers.signature || !headers.timestamp || !headers.id) {
    return false;
  }

  // whsec_ プレフィックスを削除
  const webhookSecret = secret.startsWith('whsec_') 
    ? secret.substring(6) 
    : secret;

  // Svix形式の署名検証
  const signedContent = `${headers.id}.${headers.timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', Buffer.from(webhookSecret, 'base64'))
    .update(signedContent)
    .digest('base64');
  
  // 署名ヘッダーは "v1,signature1 v1,signature2" の形式
  const signatures = headers.signature.split(' ');
  return signatures.some(sig => {
    const [version, hash] = sig.split(',');
    return version === 'v1' && hash === expectedSignature;
  });
}

export async function POST(request: NextRequest) {
  try {
    // Svixヘッダーを取得（Resendの新しいWebhook形式）
    const svixSignature = request.headers.get('svix-signature');
    const svixTimestamp = request.headers.get('svix-timestamp');
    const svixId = request.headers.get('svix-id');
    
    // 旧形式のヘッダーもチェック（互換性のため）
    const resendSignature = request.headers.get('resend-signature');
    
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      logger.warn('Missing webhook secret');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    
    // Svix形式の署名検証を優先
    if (svixSignature && svixTimestamp && svixId) {
      const isValid = verifyWebhookSignature(
        rawBody,
        {
          signature: svixSignature,
          timestamp: svixTimestamp,
          id: svixId,
        },
        webhookSecret
      );
      
      if (!isValid) {
        logger.warn('Invalid Svix webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    } else if (!resendSignature) {
      // 署名がまったくない場合はエラー
      logger.warn('Missing webhook signature headers');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const event = JSON.parse(rawBody);
    
    // Resend Webhookイベントを処理
    const result = await handleResendWebhook(event);
    
    if (!result.success) {
      logger.error('Failed to handle webhook event:', result.error);
      return NextResponse.json(
        { error: 'Failed to process webhook' },
        { status: 500 }
      );
    }

    // データベースにイベントを記録
    const { db } = await connectToDatabase();
    
    // email_eventsコレクションを更新
    if (event.data?.email_id) {
      await db.collection('email_events').updateOne(
        { messageId: event.data.email_id },
        {
          $push: {
            events: {
              type: event.type.replace('email.', ''),
              timestamp: new Date(),
              data: event.data,
            },
          },
          $set: {
            status: event.type.replace('email.', ''),
            updatedAt: new Date(),
          },
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error processing Resend webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}