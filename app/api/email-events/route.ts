import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const TRACKING_WORKER_URL = process.env.TRACKING_WORKER_URL || '';

// メール送信記録を登録
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messageId,
      quoteId,
      invoiceId,
      deliveryNoteId,
      receiptId,
      recipientEmail,
      senderEmail,
      trackingId,
      sentAt,
      subject,
    } = body;

    // Cloudflare Workers に送信記録を登録
    if (TRACKING_WORKER_URL && trackingId) {
      const response = await fetch(`${TRACKING_WORKER_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingId,
          messageId,
          quoteId,
          invoiceId,
          deliveryNoteId,
          receiptId,
          recipientEmail,
          senderEmail,
          subject,
          sentAt: sentAt || new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({ success: true, data });
      } else {
        const errorText = await response.text();
        logger.error('Failed to record email event in Cloudflare:', errorText);
      }
    }

    return NextResponse.json({ success: true, message: 'Event recorded locally' });
  } catch (error) {
    logger.error('Error recording email event:', error);
    return NextResponse.json(
      { error: 'Failed to record email event' },
      { status: 500 }
    );
  }
}

// メールイベント履歴を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('quoteId');
    const invoiceId = searchParams.get('invoiceId');
    const trackingId = searchParams.get('trackingId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Cloudflare Workers からデータを取得
    if (TRACKING_WORKER_URL) {
      const id = trackingId || quoteId || invoiceId;

      if (id) {
        // 特定のIDの詳細統計を取得
        const response = await fetch(`${TRACKING_WORKER_URL}/stats?id=${id}`);
        if (response.ok) {
          const data = await response.json();

          // ダッシュボード用のフォーマットに変換
          const events = [];

          if (data.sendRecord) {
            events.push({
              _id: data.sendRecord.id,
              messageId: data.sendRecord.message_id,
              quoteId: data.sendRecord.quote_id,
              invoiceId: data.sendRecord.invoice_id,
              recipientEmail: data.sendRecord.recipient_email,
              trackingId: data.sendRecord.tracking_id,
              sentAt: data.sendRecord.sent_at,
              status: data.sendRecord.open_count > 0 ? 'opened' : data.sendRecord.status,
              openCount: data.sendRecord.open_count,
              clickCount: data.sendRecord.click_count,
              lastOpenedAt: data.sendRecord.last_opened_at,
              resendCount: data.sendRecord.resend_count,
              events: data.events?.map((e: any) => ({
                type: e.event_type,
                count: e.count,
                lastAt: e.last_at,
              })) || [],
            });
          }

          return NextResponse.json(events);
        }
      }

      // 未開封メール一覧を取得（再送信候補）
      const unopenedResponse = await fetch(
        `${TRACKING_WORKER_URL}/unopened?days=30&limit=${limit}`
      );
      if (unopenedResponse.ok) {
        const unopenedData = await unopenedResponse.json();
        const events = unopenedData.map((record: any) => ({
          _id: record.id,
          messageId: record.message_id,
          quoteId: record.quote_id,
          invoiceId: record.invoice_id,
          recipientEmail: record.recipient_email,
          trackingId: record.tracking_id,
          sentAt: record.sent_at,
          status: 'sent',
          openCount: 0,
          resendCount: record.resend_count || 0,
          events: [{ type: 'sent', timestamp: record.sent_at }],
        }));
        return NextResponse.json(events);
      }
    }

    // フォールバック: 空配列
    return NextResponse.json([]);
  } catch (error) {
    logger.error('Error fetching email events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email events' },
      { status: 500 }
    );
  }
}
