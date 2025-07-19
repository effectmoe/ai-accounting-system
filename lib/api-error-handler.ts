import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
// カスタムエラークラス
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class TimeoutError extends APIError {
  constructor(message: string = 'Request timeout') {
    super(message, 504, 'TIMEOUT');
  }
}

export class DatabaseConnectionError extends APIError {
  constructor(message: string = 'Database connection failed') {
    super(message, 503, 'DB_CONNECTION_ERROR');
  }
}

export class ExternalAPIError extends APIError {
  constructor(
    service: string,
    message: string,
    statusCode: number = 502
  ) {
    super(`${service} API error: ${message}`, statusCode, 'EXTERNAL_API_ERROR');
  }
}

// エラーレスポンスの標準化
export function createErrorResponse(error: unknown) {
  logger.error('API Error:', error);

  // タイムアウトエラー
  if (error instanceof TimeoutError) {
    return NextResponse.json(
      {
        error: 'Request timeout',
        message: 'リクエストがタイムアウトしました。もう一度お試しください。',
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // データベース接続エラー
  if (error instanceof DatabaseConnectionError) {
    return NextResponse.json(
      {
        error: 'Database connection error',
        message: 'データベースへの接続に失敗しました。しばらくしてからもう一度お試しください。',
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // 外部APIエラー
  if (error instanceof ExternalAPIError) {
    return NextResponse.json(
      {
        error: 'External API error',
        message: '外部サービスとの通信に失敗しました。しばらくしてからもう一度お試しください。',
        code: error.code,
        details: error.message,
      },
      { status: error.statusCode }
    );
  }

  // APIError
  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // MongoDB関連のエラー
  if (error instanceof Error) {
    // MongoDB接続エラー
    if (
      error.message.includes('MongoDB') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('getaddrinfo')
    ) {
      return NextResponse.json(
        {
          error: 'Database connection error',
          message: 'データベースへの接続に失敗しました。',
          code: 'DB_CONNECTION_ERROR',
        },
        { status: 503 }
      );
    }

    // ネットワークタイムアウト
    if (
      error.message.includes('timeout') ||
      error.message.includes('Timeout') ||
      error.name === 'AbortError'
    ) {
      return NextResponse.json(
        {
          error: 'Request timeout',
          message: 'リクエストがタイムアウトしました。',
          code: 'TIMEOUT',
        },
        { status: 504 }
      );
    }
  }

  // その他のエラー
  return NextResponse.json(
    {
      error: 'Internal server error',
      message: 'サーバーエラーが発生しました。',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

// リトライ可能なエラーかチェック
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const retryableMessages = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'timeout',
      'Timeout',
      'socket hang up',
      'getaddrinfo',
    ];

    return retryableMessages.some((msg) => error.message.includes(msg));
  }
  return false;
}

// エクスポネンシャルバックオフでリトライ
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || i === maxRetries - 1) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, i);
      logger.debug(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Vercelのタイムアウトを考慮したタイムアウト設定
export function createTimeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}