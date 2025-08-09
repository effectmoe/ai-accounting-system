import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messageId,
      quoteId,
      recipientEmail,
      trackingId,
      sentAt,
      type = 'quote',
    } = body;

    const { db } = await connectToDatabase();

    // メールイベントを記録
    const emailEvent = {
      messageId,
      quoteId,
      recipientEmail,
      trackingId,
      sentAt: new Date(sentAt),
      type,
      status: 'sent',
      events: [
        {
          type: 'sent',
          timestamp: new Date(sentAt),
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('email_events').insertOne(emailEvent);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error recording email event:', error);
    return NextResponse.json(
      { error: 'Failed to record email event' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('quoteId');

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // 指定された見積書のメールイベントを取得
    const events = await db
      .collection('email_events')
      .find({ quoteId })
      .sort({ sentAt: -1 })
      .toArray();

    return NextResponse.json(events);
  } catch (error) {
    logger.error('Error fetching email events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email events' },
      { status: 500 }
    );
  }
}