/**
 * Email Resend API
 * 手動再送信と再送信対象一覧取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getUnopenedEmails,
  shouldResend,
  generateResendSubject,
  generateResendMessage,
  updateResendRecord,
  getResendStats,
  RESEND_CONFIG,
} from '@/lib/email-resend-service';
import { sendQuoteEmail } from '@/lib/gmail-service';
import { QuoteService } from '@/services/quote.service';

const quoteService = new QuoteService();

/**
 * GET: 再送信対象一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    // 統計情報の取得
    if (action === 'stats') {
      const stats = await getResendStats();
      return NextResponse.json(stats);
    }

    // 再送信設定の取得
    if (action === 'config') {
      return NextResponse.json({
        intervals: RESEND_CONFIG.INTERVALS,
        maxResendCount: RESEND_CONFIG.MAX_RESEND_COUNT,
        targetStatuses: RESEND_CONFIG.TARGET_STATUSES,
      });
    }

    // 未開封メール一覧の取得
    const minDays = parseInt(searchParams.get('minDays') || '3', 10);
    const maxDays = parseInt(searchParams.get('maxDays') || '30', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const unopenedEmails = await getUnopenedEmails({
      minDaysSinceSent: minDays,
      maxDaysSinceSent: maxDays,
      limit,
    });

    // 各メールの再送信判定を実行
    const candidates = unopenedEmails.map((record) => shouldResend(record));

    // 再送信推奨のみをフィルタリング
    const resendRecommended = candidates.filter((c) => c.suggestedAction === 'resend');

    return NextResponse.json({
      total: candidates.length,
      resendRecommended: resendRecommended.length,
      candidates: candidates,
      config: {
        intervals: RESEND_CONFIG.INTERVALS,
        maxResendCount: RESEND_CONFIG.MAX_RESEND_COUNT,
      },
    });
  } catch (error) {
    logger.error('Error in email-resend GET:', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST: メール再送信実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackingId, quoteId, invoiceId, force = false } = body;

    if (!trackingId && !quoteId && !invoiceId) {
      return NextResponse.json(
        { error: 'trackingId, quoteId, or invoiceId is required' },
        { status: 400 }
      );
    }

    // 見積書の再送信
    if (quoteId) {
      const quote = await quoteService.getQuoteById(quoteId);
      if (!quote) {
        return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
      }

      // 顧客のメールアドレスを取得
      const recipientEmail =
        quote.customer?.email || quote.customer?.contacts?.[0]?.email;
      if (!recipientEmail) {
        return NextResponse.json(
          { error: 'Customer email not found' },
          { status: 400 }
        );
      }

      // 再送信カウントを取得（実際にはCloudflare Workersから取得する必要がある）
      const resendCount = 0; // TODO: 実際の再送信カウントを取得

      // 再送信用の件名とメッセージを生成
      const originalSubject = `お見積書 ${quote.quoteNumber}`;
      const resendSubject = generateResendSubject(originalSubject, resendCount);
      const resendMessage = generateResendMessage(resendCount);

      // メール送信
      const result = await sendQuoteEmail({
        quote: quote as any,
        recipientEmail,
        recipientName:
          quote.customer?.contacts?.[0]?.name || quote.customer?.companyName,
        subject: resendSubject,
        customMessage: resendMessage,
        isResend: true,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to resend email', details: result.error },
          { status: 500 }
        );
      }

      // 再送信記録を更新
      if (trackingId) {
        await updateResendRecord(trackingId, resendCount + 1);
      }

      logger.info('Quote email resent successfully', {
        quoteId,
        recipientEmail,
        resendCount: resendCount + 1,
      });

      return NextResponse.json({
        success: true,
        message: 'Email resent successfully',
        quoteId,
        resendCount: resendCount + 1,
        messageId: result.messageId,
      });
    }

    // TODO: 請求書、納品書、領収書の再送信実装

    return NextResponse.json(
      { error: 'Resend not implemented for this document type' },
      { status: 501 }
    );
  } catch (error) {
    logger.error('Error in email-resend POST:', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
