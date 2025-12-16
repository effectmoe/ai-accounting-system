/**
 * Email Resend Service
 * 未開封メールの検出と再送信機能
 */

import { logger } from '@/lib/logger';

// 再送信設定
export const RESEND_CONFIG = {
  // 再送信間隔（日数）
  INTERVALS: [3, 7, 14], // 3日後、7日後、14日後
  // 最大再送信回数
  MAX_RESEND_COUNT: 3,
  // 再送信対象とするステータス
  TARGET_STATUSES: ['sent', 'delivered'] as const,
};

export interface EmailSendRecord {
  id: string;
  trackingId: string;
  messageId?: string;
  quoteId?: string;
  invoiceId?: string;
  deliveryNoteId?: string;
  receiptId?: string;
  recipientEmail: string;
  senderEmail?: string;
  subject?: string;
  sentAt: string;
  status: string;
  openCount: number;
  clickCount: number;
  lastOpenedAt?: string;
  lastClickedAt?: string;
  resendCount?: number;
  lastResendAt?: string;
}

export interface ResendCandidate {
  record: EmailSendRecord;
  daysSinceSent: number;
  suggestedAction: 'resend' | 'skip' | 'max_reached';
  reason: string;
}

/**
 * 再送信対象のメールを検出
 */
export async function findResendCandidates(): Promise<ResendCandidate[]> {
  const trackingWorkerUrl = process.env.TRACKING_WORKER_URL;

  if (!trackingWorkerUrl) {
    logger.warn('TRACKING_WORKER_URL not configured - cannot find resend candidates');
    return [];
  }

  try {
    // Cloudflare Workers から未開封メール一覧を取得
    const response = await fetch(`${trackingWorkerUrl}/events?limit=1000`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`);
    }

    const data = await response.json();
    const candidates: ResendCandidate[] = [];

    // 各送信記録を分析
    // Note: 実際の実装では、email_send_recordsテーブルから直接取得する必要がある
    // ここではCloudflare Workersに追加のAPIエンドポイントが必要

    return candidates;
  } catch (error) {
    logger.error('Error finding resend candidates:', { error });
    return [];
  }
}

/**
 * 未開封メールをCloudflare Workersから取得
 */
export async function getUnopenedEmails(options: {
  minDaysSinceSent?: number;
  maxDaysSinceSent?: number;
  limit?: number;
}): Promise<EmailSendRecord[]> {
  const trackingWorkerUrl = process.env.TRACKING_WORKER_URL;

  if (!trackingWorkerUrl) {
    logger.warn('TRACKING_WORKER_URL not configured');
    return [];
  }

  const { minDaysSinceSent = 3, maxDaysSinceSent = 30, limit = 100 } = options;

  try {
    // 未開封メール取得用のAPIエンドポイントを呼び出し
    const params = new URLSearchParams({
      minDays: minDaysSinceSent.toString(),
      maxDays: maxDaysSinceSent.toString(),
      limit: limit.toString(),
      unopened: 'true',
    });

    const response = await fetch(`${trackingWorkerUrl}/unopened?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      // エンドポイントがまだ実装されていない場合
      if (response.status === 404) {
        logger.debug('Unopened emails endpoint not available');
        return [];
      }
      throw new Error(`Failed to fetch unopened emails: ${response.status}`);
    }

    const data = await response.json();
    return data.records || [];
  } catch (error) {
    logger.error('Error fetching unopened emails:', { error });
    return [];
  }
}

/**
 * メールの再送信が必要かどうかを判定
 */
export function shouldResend(record: EmailSendRecord): ResendCandidate {
  const sentAt = new Date(record.sentAt);
  const now = new Date();
  const daysSinceSent = Math.floor((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24));

  // 既に開封済み
  if (record.openCount > 0) {
    return {
      record,
      daysSinceSent,
      suggestedAction: 'skip',
      reason: '既に開封済みです',
    };
  }

  // 再送信回数上限チェック
  const resendCount = record.resendCount || 0;
  if (resendCount >= RESEND_CONFIG.MAX_RESEND_COUNT) {
    return {
      record,
      daysSinceSent,
      suggestedAction: 'max_reached',
      reason: `再送信上限（${RESEND_CONFIG.MAX_RESEND_COUNT}回）に達しました`,
    };
  }

  // 次の再送信タイミングを計算
  const nextInterval = RESEND_CONFIG.INTERVALS[resendCount];
  if (!nextInterval) {
    return {
      record,
      daysSinceSent,
      suggestedAction: 'max_reached',
      reason: '再送信スケジュールが終了しました',
    };
  }

  // 再送信タイミングに達しているか
  if (daysSinceSent >= nextInterval) {
    return {
      record,
      daysSinceSent,
      suggestedAction: 'resend',
      reason: `${nextInterval}日経過: 再送信をおすすめします`,
    };
  }

  return {
    record,
    daysSinceSent,
    suggestedAction: 'skip',
    reason: `次の再送信まで${nextInterval - daysSinceSent}日`,
  };
}

/**
 * 再送信件名を生成
 */
export function generateResendSubject(originalSubject: string, resendCount: number): string {
  const prefixes = ['【再送】', '【リマインド】', '【最終確認】'];
  const prefix = prefixes[Math.min(resendCount, prefixes.length - 1)];

  // 既に再送プレフィックスがある場合は置換
  const cleanSubject = originalSubject
    .replace(/^【再送】/, '')
    .replace(/^【リマインド】/, '')
    .replace(/^【最終確認】/, '')
    .trim();

  return `${prefix} ${cleanSubject}`;
}

/**
 * 再送信用のカスタムメッセージを生成
 */
export function generateResendMessage(resendCount: number): string {
  const messages = [
    '先日お送りした内容をご確認いただけましたでしょうか。ご不明点がございましたらお気軽にお問い合わせください。',
    '以前お送りした内容について、改めてご連絡させていただきます。ご検討のほどよろしくお願いいたします。',
    '度々のご連絡となり恐れ入ります。こちらが最終確認となりますので、ご確認いただけますと幸いです。',
  ];

  return messages[Math.min(resendCount, messages.length - 1)];
}

/**
 * 再送信記録を更新（Cloudflare Workers経由）
 */
export async function updateResendRecord(
  trackingId: string,
  newResendCount: number
): Promise<boolean> {
  const trackingWorkerUrl = process.env.TRACKING_WORKER_URL;

  if (!trackingWorkerUrl) {
    logger.warn('TRACKING_WORKER_URL not configured');
    return false;
  }

  try {
    const response = await fetch(`${trackingWorkerUrl}/resend-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId,
        resendCount: newResendCount,
        lastResendAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update resend record: ${response.status}`);
    }

    return true;
  } catch (error) {
    logger.error('Error updating resend record:', { error });
    return false;
  }
}

/**
 * 再送信統計を取得
 */
export async function getResendStats(): Promise<{
  totalSent: number;
  totalOpened: number;
  pendingResend: number;
  resendSuccessRate: number;
}> {
  const trackingWorkerUrl = process.env.TRACKING_WORKER_URL;

  if (!trackingWorkerUrl) {
    return {
      totalSent: 0,
      totalOpened: 0,
      pendingResend: 0,
      resendSuccessRate: 0,
    };
  }

  try {
    const response = await fetch(`${trackingWorkerUrl}/resend-stats`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch resend stats: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Error fetching resend stats:', { error });
    return {
      totalSent: 0,
      totalOpened: 0,
      pendingResend: 0,
      resendSuccessRate: 0,
    };
  }
}
