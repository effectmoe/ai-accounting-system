import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { logger } from '@/lib/logger';

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

    // 指定された見積書のメールイベントを集計
    const events = await db
      .collection('email_events')
      .find({ quoteId })
      .toArray();

    // イベントタイプごとに集計
    const stats = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
    };

    events.forEach((event) => {
      if (event.events && Array.isArray(event.events)) {
        event.events.forEach((e: any) => {
          switch (e.type) {
            case 'sent':
              stats.sent++;
              break;
            case 'delivered':
              stats.delivered++;
              break;
            case 'opened':
              stats.opened++;
              break;
            case 'clicked':
              stats.clicked++;
              break;
            case 'bounced':
              stats.bounced++;
              break;
            case 'complained':
              stats.complained++;
              break;
          }
        });
      }
    });

    // 開封率とクリック率を計算
    const openRate = stats.sent > 0 ? (stats.opened / stats.sent) * 100 : 0;
    const clickRate = stats.sent > 0 ? (stats.clicked / stats.sent) * 100 : 0;

    return NextResponse.json({
      ...stats,
      openRate: Math.round(openRate * 10) / 10,
      clickRate: Math.round(clickRate * 10) / 10,
      totalEmails: events.length,
    });
  } catch (error) {
    logger.error('Error fetching email stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email stats' },
      { status: 500 }
    );
  }
}