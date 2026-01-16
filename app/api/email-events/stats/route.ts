import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const TRACKING_WORKER_URL = process.env.TRACKING_WORKER_URL || '';

// 日付範囲の開始日を計算
function getDateRangeStart(dateRange: string): string {
  const now = new Date();
  let startDate: Date;

  switch (dateRange) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  return startDate.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('quoteId');
    const trackingId = searchParams.get('trackingId');
    const dateRange = searchParams.get('dateRange') || 'week';

    // 日付範囲の計算
    const startDate = getDateRangeStart(dateRange);

    // Cloudflare Workers からデータを取得
    if (TRACKING_WORKER_URL) {
      // 特定のトラッキングIDまたは見積書IDの統計を取得
      if (trackingId || quoteId) {
        const id = trackingId || quoteId;
        const response = await fetch(`${TRACKING_WORKER_URL}/stats?id=${id}`);
        if (response.ok) {
          const data = await response.json();

          // ダッシュボード用のフォーマットに変換
          const stats = {
            sent: data.sendRecord ? 1 : 0,
            delivered: data.sendRecord?.status === 'delivered' ? 1 : 0,
            opened: data.events?.find((e: any) => e.event_type === 'open')?.count || 0,
            clicked: data.events?.find((e: any) => e.event_type === 'click')?.count || 0,
            bounced: 0,
            complained: 0,
            openRate: 0,
            clickRate: 0,
            totalEmails: data.sendRecord ? 1 : 0,
            deviceBreakdown: data.deviceBreakdown || [],
            clientBreakdown: data.clientBreakdown || [],
          };

          // 開封率とクリック率を計算
          if (stats.sent > 0) {
            stats.openRate = Math.round((stats.opened / stats.sent) * 100 * 10) / 10;
            stats.clickRate = Math.round((stats.clicked / stats.sent) * 100 * 10) / 10;
          }

          return NextResponse.json(stats);
        }
      }

      // 全体統計を取得（dateRangeパラメータ付き）
      const resendStatsUrl = new URL(`${TRACKING_WORKER_URL}/resend-stats`);
      resendStatsUrl.searchParams.set('startDate', startDate);
      resendStatsUrl.searchParams.set('dateRange', dateRange);

      const resendStatsResponse = await fetch(resendStatsUrl.toString());
      if (resendStatsResponse.ok) {
        const resendStats = await resendStatsResponse.json();
        return NextResponse.json({
          sent: resendStats.totalSent || 0,
          delivered: resendStats.totalSent || 0,
          opened: resendStats.totalOpened || 0,
          clicked: resendStats.totalClicked || 0,
          bounced: resendStats.totalBounced || 0,
          complained: resendStats.totalComplained || 0,
          openRate: resendStats.openRate || 0,
          clickRate: resendStats.clickRate || 0,
          totalEmails: resendStats.totalSent || 0,
          pendingResend: resendStats.pendingResend || 0,
          resendSuccessRate: resendStats.resendSuccessRate || 0,
          timelineData: resendStats.timelineData || [],
          dailyStats: resendStats.dailyStats || [],
        });
      }
    }

    // フォールバック: データなし
    return NextResponse.json({
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      openRate: 0,
      clickRate: 0,
      totalEmails: 0,
      timelineData: [],
      dailyStats: [],
    });
  } catch (error) {
    logger.error('Error fetching email stats:', error as Record<string, any>);
    return NextResponse.json(
      { error: 'Failed to fetch email stats' },
      { status: 500 }
    );
  }
}
