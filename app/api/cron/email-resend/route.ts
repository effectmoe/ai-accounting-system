/**
 * Email Resend Cron Job
 * Vercel Cronで毎日実行され、未開封メールの自動再送信を行う
 *
 * vercel.json に以下を追加:
 * {
 *   "crons": [{
 *     "path": "/api/cron/email-resend",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  getUnopenedEmails,
  shouldResend,
  generateResendSubject,
  generateResendMessage,
  updateResendRecord,
  RESEND_CONFIG,
} from '@/lib/email-resend-service';
import { sendQuoteEmail } from '@/lib/gmail-service';
import { QuoteService } from '@/services/quote.service';

const quoteService = new QuoteService();

// Cronシークレットによる認証（オプション）
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET: Cron Job実行
 */
export async function GET(request: NextRequest) {
  try {
    // Cron認証（Vercel Cronの場合はAUTHORIZATION headerをチェック）
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      // Vercel Cronからの呼び出しでない場合は拒否
      logger.warn('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const results = {
      processed: 0,
      resent: 0,
      skipped: 0,
      failed: 0,
      errors: [] as string[],
    };

    // 未開封メールを取得
    const unopenedEmails = await getUnopenedEmails({
      minDaysSinceSent: RESEND_CONFIG.INTERVALS[0], // 最初の再送間隔以上
      maxDaysSinceSent: 30, // 30日以内
      limit: 50, // 一度に処理する最大数
    });

    logger.info('Cron: Found unopened emails', { count: unopenedEmails.length });

    // 各メールを処理
    for (const record of unopenedEmails) {
      results.processed++;

      const candidate = shouldResend(record);

      if (candidate.suggestedAction !== 'resend') {
        results.skipped++;
        continue;
      }

      try {
        // 見積書の再送信
        if (record.quoteId) {
          const quote = await quoteService.getQuoteById(record.quoteId);
          if (!quote) {
            results.skipped++;
            continue;
          }

          const recipientEmail =
            quote.customer?.email || quote.customer?.contacts?.[0]?.email;
          if (!recipientEmail) {
            results.skipped++;
            continue;
          }

          const resendCount = record.resendCount || 0;
          const originalSubject = record.subject || `お見積書 ${quote.quoteNumber}`;
          const resendSubject = generateResendSubject(originalSubject, resendCount);
          const resendMessage = generateResendMessage(resendCount);

          const result = await sendQuoteEmail({
            quote: quote as any,
            recipientEmail,
            recipientName:
              quote.customer?.contacts?.[0]?.name || quote.customer?.companyName,
            subject: resendSubject,
            customMessage: resendMessage,
            isResend: true,
          });

          if (result.success) {
            await updateResendRecord(record.trackingId, resendCount + 1);
            results.resent++;
            logger.info('Cron: Email resent', {
              quoteId: record.quoteId,
              resendCount: resendCount + 1,
            });
          } else {
            results.failed++;
            results.errors.push(
              `Quote ${record.quoteId}: ${result.error || 'Unknown error'}`
            );
          }
        } else {
          // 他のドキュメントタイプは未実装
          results.skipped++;
        }
      } catch (error) {
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Record ${record.trackingId}: ${errorMessage}`);
        logger.error('Cron: Error processing record', { error, trackingId: record.trackingId });
      }

      // レート制限: 1件ごとに1秒待機
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const duration = Date.now() - startTime;

    logger.info('Cron: Email resend job completed', {
      ...results,
      durationMs: duration,
    });

    return NextResponse.json({
      success: true,
      message: 'Cron job completed',
      results,
      durationMs: duration,
    });
  } catch (error) {
    logger.error('Cron: Email resend job failed', { error });
    return NextResponse.json(
      { error: 'Cron job failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
