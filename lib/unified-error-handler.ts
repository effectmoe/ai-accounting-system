import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { logger } from './logger';

export interface ApiError {
  message: string;
  code?: string;
  details?: any;
  statusCode?: number;
}

export class ApiErrorResponse extends Error {
  statusCode: number;
  code?: string;
  details?: any;

  constructor(message: string, statusCode = 500, code?: string, details?: any) {
    super(message);
    this.name = 'ApiErrorResponse';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// 標準的なエラーレスポンスを生成
export function createErrorResponse(error: unknown, defaultMessage = 'エラーが発生しました'): NextResponse {
  let statusCode = 500;
  let message = defaultMessage;
  let code = 'INTERNAL_ERROR';
  let details: any = undefined;

  if (error instanceof ApiErrorResponse) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || code;
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message || message;
    
    // MongoDBエラーの処理
    if (error.name === 'MongoServerError') {
      const mongoError = error as any;
      if (mongoError.code === 11000) {
        statusCode = 409;
        code = 'DUPLICATE_ERROR';
        message = '既に登録されているデータです';
      }
    }
    
    // バリデーションエラー
    if (error.name === 'ValidationError') {
      statusCode = 400;
      code = 'VALIDATION_ERROR';
    }
    
    // 認証エラー
    if (error.message.includes('Unauthorized') || error.message.includes('認証')) {
      statusCode = 401;
      code = 'UNAUTHORIZED';
    }
    
    // 権限エラー
    if (error.message.includes('Forbidden') || error.message.includes('権限')) {
      statusCode = 403;
      code = 'FORBIDDEN';
    }
    
    // Not Found
    if (error.message.includes('Not Found') || error.message.includes('見つかりません')) {
      statusCode = 404;
      code = 'NOT_FOUND';
    }
  }

  // エラーログとSentry送信
  const errorContext = {
    statusCode,
    code,
    message,
    details,
    stack: error instanceof Error ? error.stack : undefined,
  };

  if (statusCode >= 500) {
    logger.error('API Error', errorContext);
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: errorContext,
      });
    }
  } else {
    logger.warn('API Warning', errorContext);
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        code,
        ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
      },
    },
    { status: statusCode }
  );
}

// APIルートハンドラーのラッパー
export function withErrorHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await handler(...args);
    } catch (error) {
      return createErrorResponse(error);
    }
  }) as T;
}

// 共通のバリデーション関数
export function validateRequired(data: any, fields: string[]): void {
  const missingFields = fields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    throw new ApiErrorResponse(
      `必須項目が入力されていません: ${missingFields.join(', ')}`,
      400,
      'MISSING_REQUIRED_FIELDS',
      { missingFields }
    );
  }
}

// ページネーションパラメータの検証
export function validatePagination(searchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

// メールアドレスの検証
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 日付の検証
export function validateDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

// 金額の検証
export function validateAmount(amount: any): number {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed < 0) {
    throw new ApiErrorResponse('無効な金額です', 400, 'INVALID_AMOUNT');
  }
  return parsed;
}