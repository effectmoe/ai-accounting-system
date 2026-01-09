/**
 * OCR Queue Client
 *
 * Cloudflare Workers OCR Queueと通信するためのクライアントライブラリ。
 * ジョブの送信、ステータス確認、結果取得を行います。
 *
 * 環境変数:
 * - OCR_QUEUE_URL: Workers QueueのURL（未設定時はローカルOllamaを直接使用）
 * - OCR_QUEUE_ENABLED: キューを有効にするかどうか（'true' | 'false'）
 */

import { logger } from '@/lib/logger';

// OCRジョブの結果型
export interface OCRResult {
  issuerName?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issueDate?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  accountCategory?: string;
  confidence?: number;
}

// ジョブのステータス
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

// ジョブ情報
export interface OCRJob {
  id: string;
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  result?: OCRResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

// 送信レスポンス
interface SubmitResponse {
  success: boolean;
  jobId: string;
  message: string;
}

// ステータスレスポンス
interface StatusResponse {
  success: boolean;
  job?: OCRJob;
  error?: string;
}

// 結果レスポンス
interface ResultResponse {
  success: boolean;
  result?: OCRResult;
  error?: string;
  status: JobStatus;
  retryCount: number;
  processingTime?: number;
}

// キュー統計レスポンス
interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

interface StatsResponse {
  success: boolean;
  stats: QueueStats;
}

// ヘルスチェックレスポンス
interface HealthResponse {
  success: boolean;
  status: string;
  ollama: string;
  queueSize: number;
  totalJobs: number;
  isProcessing: boolean;
}

/**
 * OCR Queue Client クラス
 */
export class OCRQueueClient {
  private baseURL: string;
  private enabled: boolean;
  private timeout: number;

  constructor() {
    this.baseURL = (process.env.OCR_QUEUE_URL || '').trim();
    // 環境変数の値をtrimして比較（改行文字対策）
    const enabledValue = (process.env.OCR_QUEUE_ENABLED || '').trim().toLowerCase();
    this.enabled = enabledValue === 'true' && !!this.baseURL;
    this.timeout = parseInt(process.env.OCR_QUEUE_TIMEOUT || '300000', 10); // 5分

    logger.info('[OCRQueueClient] Initialized', {
      enabled: this.enabled,
      baseURL: this.baseURL || '(not set)',
    });
  }

  /**
   * キューが有効かどうか
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * キューのヘルスチェック
   */
  async checkHealth(): Promise<HealthResponse | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json() as HealthResponse;
    } catch (error) {
      logger.error('[OCRQueueClient] Health check failed:', error);
      return null;
    }
  }

  /**
   * OCRジョブを送信
   */
  async submitJob(imageBase64: string, fileName?: string): Promise<{ jobId: string } | null> {
    if (!this.enabled) {
      logger.debug('[OCRQueueClient] Queue not enabled, skipping');
      return null;
    }

    try {
      logger.info('[OCRQueueClient] Submitting OCR job...', {
        imageSize: imageBase64.length,
        fileName,
      });

      const response = await fetch(`${this.baseURL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, fileName }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Submit failed: ${response.status} ${errorText}`);
      }

      const data = await response.json() as SubmitResponse;

      logger.info('[OCRQueueClient] Job submitted:', { jobId: data.jobId });
      return { jobId: data.jobId };
    } catch (error) {
      logger.error('[OCRQueueClient] Failed to submit job:', error);
      throw error;
    }
  }

  /**
   * ジョブのステータスを確認
   */
  async getJobStatus(jobId: string): Promise<OCRJob | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/status?jobId=${encodeURIComponent(jobId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Status check failed: ${response.status}`);
      }

      const data = await response.json() as StatusResponse;
      return data.job || null;
    } catch (error) {
      logger.error('[OCRQueueClient] Failed to get job status:', error);
      throw error;
    }
  }

  /**
   * ジョブの結果を取得（完了まで待機）
   */
  async getJobResult(jobId: string): Promise<ResultResponse> {
    if (!this.enabled) {
      throw new Error('OCR Queue is not enabled');
    }

    try {
      const response = await fetch(`${this.baseURL}/result?jobId=${encodeURIComponent(jobId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return await response.json() as ResultResponse;
    } catch (error) {
      logger.error('[OCRQueueClient] Failed to get job result:', error);
      throw error;
    }
  }

  /**
   * ジョブが完了するまでポーリング
   * @param jobId ジョブID
   * @param pollInterval ポーリング間隔（ミリ秒）
   * @param maxWaitTime 最大待機時間（ミリ秒）
   */
  async waitForResult(
    jobId: string,
    pollInterval: number = 2000,
    maxWaitTime?: number
  ): Promise<OCRResult> {
    const timeout = maxWaitTime || this.timeout;
    const startTime = Date.now();

    logger.info('[OCRQueueClient] Waiting for job result...', {
      jobId,
      pollInterval,
      maxWaitTime: timeout,
    });

    while (Date.now() - startTime < timeout) {
      const result = await this.getJobResult(jobId);

      if (result.status === 'completed') {
        logger.info('[OCRQueueClient] Job completed:', {
          jobId,
          processingTime: result.processingTime,
        });
        return result.result || {};
      }

      if (result.status === 'failed') {
        logger.error('[OCRQueueClient] Job failed:', {
          jobId,
          error: result.error,
          retryCount: result.retryCount,
        });
        throw new Error(result.error || 'OCR job failed');
      }

      // まだ処理中なので待機
      logger.debug('[OCRQueueClient] Job still processing...', {
        jobId,
        status: result.status,
        retryCount: result.retryCount,
        elapsed: Date.now() - startTime,
      });

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`OCR job timed out after ${timeout}ms`);
  }

  /**
   * OCRジョブを送信して結果を待機（便利メソッド）
   */
  async processImage(imageBase64: string, fileName?: string): Promise<OCRResult> {
    const submitted = await this.submitJob(imageBase64, fileName);

    if (!submitted) {
      throw new Error('Failed to submit OCR job');
    }

    return this.waitForResult(submitted.jobId);
  }

  /**
   * キューの統計情報を取得
   */
  async getQueueStats(): Promise<QueueStats | null> {
    if (!this.enabled) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseURL}/stats`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Stats fetch failed: ${response.status}`);
      }

      const data = await response.json() as StatsResponse;
      return data.stats;
    } catch (error) {
      logger.error('[OCRQueueClient] Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * 設定情報を取得
   */
  getConfig() {
    return {
      enabled: this.enabled,
      baseURL: this.baseURL,
      timeout: this.timeout,
    };
  }
}

/**
 * OCRQueueClientを取得
 * サーバーレス環境では毎回新しいインスタンスを作成して環境変数の変更を反映
 */
export function getOCRQueueClient(): OCRQueueClient {
  // サーバーレス環境では毎回新しいインスタンスを作成
  // これにより環境変数の変更が即座に反映される
  return new OCRQueueClient();
}

/**
 * キューが有効かどうかを確認するヘルパー関数
 */
export function isOCRQueueEnabled(): boolean {
  return getOCRQueueClient().isEnabled();
}
