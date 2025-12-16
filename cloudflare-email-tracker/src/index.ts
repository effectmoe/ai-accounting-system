/**
 * Cloudflare Workers - Email Tracking Service
 * AI会計システム用メール開封率トラッキング
 */

export interface Env {
  DB: D1Database;
  CORS_ORIGIN: string;
}

// 1x1 透明GIF画像
const TRACKING_PIXEL = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00,
  0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21,
  0xf9, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00,
  0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
  0x01, 0x00, 0x3b
]);

// UUID生成
function generateId(): string {
  return crypto.randomUUID();
}

// デバイス種別を判定
function detectDeviceType(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile';
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet';
  }
  return 'desktop';
}

// メールクライアントを判定
function detectEmailClient(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('googleimageproxy') || ua.includes('gmail')) return 'Gmail';
  if (ua.includes('outlook') || ua.includes('microsoft')) return 'Outlook';
  if (ua.includes('yahoo')) return 'Yahoo Mail';
  if (ua.includes('thunderbird')) return 'Thunderbird';
  if (ua.includes('apple-mail') || ua.includes('webkit')) return 'Apple Mail';

  return 'Unknown';
}

// CORSヘッダー
function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // CORS プリフライト
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(env.CORS_ORIGIN),
      });
    }

    try {
      // ルーティング
      if (pathname === '/pixel' || pathname === '/pixel.gif') {
        return await handleTrackingPixel(request, env, ctx);
      }

      if (pathname === '/click') {
        return await handleClickTracking(request, env, ctx);
      }

      if (pathname === '/stats') {
        return await handleGetStats(request, env);
      }

      if (pathname === '/record' && request.method === 'POST') {
        return await handleRecordSend(request, env);
      }

      if (pathname === '/events' && request.method === 'GET') {
        return await handleGetEvents(request, env);
      }

      if (pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 404
      return new Response('Not Found', { status: 404 });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },
};

/**
 * 開封トラッキングピクセル
 * GET /pixel?id=xxx
 */
async function handleTrackingPixel(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const trackingId = url.searchParams.get('id');

  if (!trackingId) {
    return new Response(TRACKING_PIXEL, {
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
    });
  }

  const userAgent = request.headers.get('User-Agent') || '';
  const cfData = (request as any).cf || {};

  // 非同期でイベント記録（レスポンスを遅延させない）
  ctx.waitUntil(
    recordEvent(env.DB, {
      trackingId,
      eventType: 'open',
      ipAddress: request.headers.get('CF-Connecting-IP') || '',
      userAgent,
      deviceType: detectDeviceType(userAgent),
      emailClient: detectEmailClient(userAgent),
      country: cfData.country || '',
      city: cfData.city || '',
    })
  );

  // 開封カウントを更新
  ctx.waitUntil(
    updateOpenCount(env.DB, trackingId)
  );

  return new Response(TRACKING_PIXEL, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

/**
 * クリックトラッキング
 * GET /click?id=xxx&url=xxx
 */
async function handleClickTracking(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const trackingId = url.searchParams.get('id');
  const targetUrl = url.searchParams.get('url');

  if (!trackingId || !targetUrl) {
    return new Response('Missing parameters', { status: 400 });
  }

  // URLデコード
  const decodedUrl = decodeURIComponent(targetUrl);

  const userAgent = request.headers.get('User-Agent') || '';
  const cfData = (request as any).cf || {};

  // 非同期でイベント記録
  ctx.waitUntil(
    recordEvent(env.DB, {
      trackingId,
      eventType: 'click',
      ipAddress: request.headers.get('CF-Connecting-IP') || '',
      userAgent,
      deviceType: detectDeviceType(userAgent),
      emailClient: detectEmailClient(userAgent),
      country: cfData.country || '',
      city: cfData.city || '',
      linkUrl: decodedUrl,
    })
  );

  // クリックカウントを更新
  ctx.waitUntil(
    updateClickCount(env.DB, trackingId)
  );

  // リダイレクト
  return Response.redirect(decodedUrl, 302);
}

/**
 * メール送信記録
 * POST /record
 */
async function handleRecordSend(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      trackingId: string;
      messageId?: string;
      quoteId?: string;
      invoiceId?: string;
      deliveryNoteId?: string;
      receiptId?: string;
      recipientEmail: string;
      senderEmail?: string;
      subject?: string;
    };

    const id = generateId();
    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO email_send_records (
        id, tracking_id, message_id, quote_id, invoice_id,
        delivery_note_id, receipt_id, recipient_email, sender_email,
        subject, sent_at, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent')
    `).bind(
      id,
      body.trackingId,
      body.messageId || null,
      body.quoteId || null,
      body.invoiceId || null,
      body.deliveryNoteId || null,
      body.receiptId || null,
      body.recipientEmail,
      body.senderEmail || null,
      body.subject || null,
      now
    ).run();

    return new Response(JSON.stringify({ success: true, id }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(env.CORS_ORIGIN),
      },
    });
  } catch (error) {
    console.error('Record send error:', error);
    return new Response(JSON.stringify({ error: 'Failed to record' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(env.CORS_ORIGIN),
      },
    });
  }
}

/**
 * 統計取得
 * GET /stats?id=xxx (trackingId) or ?quoteId=xxx or ?invoiceId=xxx
 */
async function handleGetStats(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const trackingId = url.searchParams.get('id');
  const quoteId = url.searchParams.get('quoteId');
  const invoiceId = url.searchParams.get('invoiceId');

  let whereClause = '';
  let bindValue = '';

  if (trackingId) {
    whereClause = 'tracking_id = ?';
    bindValue = trackingId;
  } else if (quoteId) {
    whereClause = 'quote_id = ?';
    bindValue = quoteId;
  } else if (invoiceId) {
    whereClause = 'invoice_id = ?';
    bindValue = invoiceId;
  } else {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env.CORS_ORIGIN) },
    });
  }

  try {
    // 送信記録を取得
    const sendRecord = await env.DB.prepare(`
      SELECT * FROM email_send_records WHERE ${whereClause}
    `).bind(bindValue).first();

    // イベント統計を取得
    const eventStats = await env.DB.prepare(`
      SELECT
        event_type,
        COUNT(*) as count,
        MAX(timestamp) as last_at
      FROM email_tracking_events
      WHERE ${whereClause}
      GROUP BY event_type
    `).bind(bindValue).all();

    // デバイス別統計
    const deviceStats = await env.DB.prepare(`
      SELECT
        device_type,
        COUNT(*) as count
      FROM email_tracking_events
      WHERE ${whereClause} AND event_type = 'open'
      GROUP BY device_type
    `).bind(bindValue).all();

    // メールクライアント別統計
    const clientStats = await env.DB.prepare(`
      SELECT
        email_client,
        COUNT(*) as count
      FROM email_tracking_events
      WHERE ${whereClause} AND event_type = 'open'
      GROUP BY email_client
    `).bind(bindValue).all();

    const stats = {
      sendRecord: sendRecord || null,
      events: eventStats.results || [],
      deviceBreakdown: deviceStats.results || [],
      clientBreakdown: clientStats.results || [],
    };

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env.CORS_ORIGIN) },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env.CORS_ORIGIN) },
    });
  }
}

/**
 * イベント一覧取得
 * GET /events?quoteId=xxx&limit=50
 */
async function handleGetEvents(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const quoteId = url.searchParams.get('quoteId');
  const invoiceId = url.searchParams.get('invoiceId');
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);

  let whereClause = '1=1';
  const bindings: string[] = [];

  if (quoteId) {
    whereClause += ' AND quote_id = ?';
    bindings.push(quoteId);
  }
  if (invoiceId) {
    whereClause += ' AND invoice_id = ?';
    bindings.push(invoiceId);
  }

  try {
    const events = await env.DB.prepare(`
      SELECT * FROM email_tracking_events
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(...bindings, limit).all();

    return new Response(JSON.stringify({ events: events.results || [] }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env.CORS_ORIGIN) },
    });
  } catch (error) {
    console.error('Get events error:', error);
    return new Response(JSON.stringify({ error: 'Failed to get events' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env.CORS_ORIGIN) },
    });
  }
}

// Helper: イベントを記録
async function recordEvent(db: D1Database, event: {
  trackingId: string;
  eventType: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  emailClient?: string;
  country?: string;
  city?: string;
  linkUrl?: string;
}): Promise<void> {
  const id = generateId();
  const timestamp = new Date().toISOString();

  // まず送信記録からquoteId/invoiceIdを取得
  const sendRecord = await db.prepare(`
    SELECT quote_id, invoice_id, delivery_note_id, receipt_id, message_id, recipient_email
    FROM email_send_records
    WHERE tracking_id = ?
  `).bind(event.trackingId).first() as {
    quote_id?: string;
    invoice_id?: string;
    delivery_note_id?: string;
    receipt_id?: string;
    message_id?: string;
    recipient_email?: string;
  } | null;

  await db.prepare(`
    INSERT INTO email_tracking_events (
      id, tracking_id, email_id, message_id, quote_id, invoice_id,
      delivery_note_id, receipt_id, recipient_email, event_type, timestamp,
      ip_address, user_agent, device_type, email_client, country, city, link_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    event.trackingId,
    null, // email_id
    sendRecord?.message_id || null,
    sendRecord?.quote_id || null,
    sendRecord?.invoice_id || null,
    sendRecord?.delivery_note_id || null,
    sendRecord?.receipt_id || null,
    sendRecord?.recipient_email || null,
    event.eventType,
    timestamp,
    event.ipAddress || null,
    event.userAgent || null,
    event.deviceType || null,
    event.emailClient || null,
    event.country || null,
    event.city || null,
    event.linkUrl || null
  ).run();
}

// Helper: 開封カウントを更新
async function updateOpenCount(db: D1Database, trackingId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE email_send_records
    SET open_count = open_count + 1,
        last_opened_at = ?,
        updated_at = ?
    WHERE tracking_id = ?
  `).bind(now, now, trackingId).run();
}

// Helper: クリックカウントを更新
async function updateClickCount(db: D1Database, trackingId: string): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE email_send_records
    SET click_count = click_count + 1,
        last_clicked_at = ?,
        updated_at = ?
    WHERE tracking_id = ?
  `).bind(now, now, trackingId).run();
}
