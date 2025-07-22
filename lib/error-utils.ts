// 共通エラーハンドリングユーティリティ

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

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

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

/**
 * APIエラーレスポンスを生成
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = 'エラーが発生しました'
): NextResponse<ErrorResponse> {
  logger.error('API Error:', error);

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error) {
    // MongoDBエラーの処理
    if (error.message.includes('MongoDB')) {
      return NextResponse.json(
        {
          success: false,
          error: 'データベース接続エラーが発生しました',
          code: 'DATABASE_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 503 }
      );
    }

    // タイムアウトエラー
    if (error.message.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: '処理がタイムアウトしました',
          code: 'TIMEOUT_ERROR'
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || defaultMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      success: false,
      error: defaultMessage
    },
    { status: 500 }
  );
}

/**
 * 非同期関数のエラーハンドリングラッパー
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  defaultMessage?: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      return createErrorResponse(error, defaultMessage);
    }
  }) as T;
}

/**
 * データ検証エラーレスポンス
 */
export function createValidationError(
  field: string,
  message: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: `入力エラー: ${message}`,
      code: 'VALIDATION_ERROR',
      details: { field }
    },
    { status: 400 }
  );
}

/**
 * 認証エラーレスポンス
 */
export function createAuthError(
  message: string = '認証が必要です'
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'AUTH_ERROR'
    },
    { status: 401 }
  );
}

/**
 * 権限エラーレスポンス
 */
export function createForbiddenError(
  message: string = 'アクセス権限がありません'
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: message,
      code: 'FORBIDDEN_ERROR'
    },
    { status: 403 }
  );
}

/**
 * NotFoundエラーレスポンス
 */
export function createNotFoundError(
  resource: string
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: `${resource}が見つかりません`,
      code: 'NOT_FOUND'
    },
    { status: 404 }
  );
}

/**
 * 成功レスポンスの型
 */
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * 成功レスポンスを生成
 */
export function createSuccessResponse<T>(
  data?: T,
  message?: string
): NextResponse<SuccessResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message
  });
}