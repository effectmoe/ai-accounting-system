/**
 * 標準化されたエラーハンドリング
 */

import { logger } from '@/lib/logger';
import { ApiErrorResponse } from '@/lib/unified-error-handler';
import { sanitizeErrorForLogging } from '@/lib/log-sanitizer';

export class DatabaseError extends Error {
  constructor(
    message: string, 
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class MastraAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public agentName?: string
  ) {
    super(message);
    this.name = 'MastraAgentError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 標準化されたエラーハンドラー
 */
export class StandardizedErrorHandler {
  /**
   * Mastraエージェントエラーの処理
   */
  static handleMastraAgentError(error: unknown, context: string): never {
    const sanitizedError = sanitizeErrorForLogging(error);
    
    if (error instanceof MastraAgentError) {
      logger.error(`Mastra agent error in ${context}`, {
        code: error.code,
        message: error.message,
        agentName: error.agentName,
        context,
        timestamp: new Date().toISOString()
      });
      
      throw new ApiErrorResponse(
        `${context}の処理中にAIエージェントエラーが発生しました`,
        error.statusCode || 500,
        error.code
      );
    }
    
    // 一般的なエラー
    logger.error(`Mastra agent unexpected error in ${context}`, {
      error: sanitizedError,
      context,
      timestamp: new Date().toISOString()
    });
    
    throw new ApiErrorResponse(
      `${context}の処理中にエラーが発生しました`,
      500,
      'MASTRA_AGENT_ERROR'
    );
  }

  /**
   * データベースエラーの処理
   */
  static handleDatabaseError(error: unknown, context: string): never {
    const sanitizedError = sanitizeErrorForLogging(error);
    
    if (error instanceof DatabaseError) {
      logger.error(`Database error in ${context}`, {
        code: error.code,
        message: error.message,
        context,
        timestamp: new Date().toISOString()
      });
      
      throw new ApiErrorResponse(
        'データベース処理中にエラーが発生しました',
        error.statusCode || 503,
        error.code
      );
    }
    
    // MongoDB関連エラー
    if (error && typeof error === 'object' && 'code' in error) {
      const mongoError = error as any;
      
      logger.error(`MongoDB error in ${context}`, {
        code: mongoError.code,
        codeName: mongoError.codeName,
        message: mongoError.message,
        context,
        timestamp: new Date().toISOString()
      });
      
      // MongoDB固有エラーコードの処理
      switch (mongoError.code) {
        case 11000: // 重複キーエラー
          throw new ApiErrorResponse(
            '同じ情報が既に登録されています',
            409,
            'DUPLICATE_KEY_ERROR'
          );
        case 2: // BadValue
          throw new ApiErrorResponse(
            '不正な値が指定されました',
            400,
            'INVALID_VALUE_ERROR'
          );
        default:
          throw new ApiErrorResponse(
            'データベース接続エラーが発生しました',
            503,
            'DATABASE_CONNECTION_ERROR'
          );
      }
    }
    
    // 一般的なデータベースエラー
    logger.error(`Database unexpected error in ${context}`, {
      error: sanitizedError,
      context,
      timestamp: new Date().toISOString()
    });
    
    throw new ApiErrorResponse(
      'データベース処理中にエラーが発生しました',
      503,
      'DATABASE_ERROR'
    );
  }

  /**
   * バリデーションエラーの処理
   */
  static handleValidationError(error: unknown, context: string): never {
    if (error instanceof ValidationError) {
      logger.warn(`Validation error in ${context}`, {
        field: error.field,
        message: error.message,
        context,
        timestamp: new Date().toISOString()
      });
      
      throw new ApiErrorResponse(
        error.message,
        400,
        'VALIDATION_ERROR'
      );
    }
    
    // 一般的なバリデーションエラー
    const sanitizedError = sanitizeErrorForLogging(error);
    logger.warn(`Validation unexpected error in ${context}`, {
      error: sanitizedError,
      context,
      timestamp: new Date().toISOString()
    });
    
    throw new ApiErrorResponse(
      '入力データの検証でエラーが発生しました',
      400,
      'VALIDATION_ERROR'
    );
  }

  /**
   * 予期しないエラーの処理
   */
  static handleUnexpectedError(error: unknown, context: string): never {
    const sanitizedError = sanitizeErrorForLogging(error);
    
    logger.error(`Unexpected error in ${context}`, {
      error: sanitizedError,
      context,
      timestamp: new Date().toISOString()
    });
    
    throw new ApiErrorResponse(
      'システム内部エラーが発生しました',
      500,
      'INTERNAL_ERROR'
    );
  }

  /**
   * エラーの種類を判定して適切にハンドリング
   */
  static handleError(error: unknown, context: string): never {
    // APIエラーレスポンスはそのまま再スロー
    if (error instanceof ApiErrorResponse) {
      throw error;
    }
    
    // エラータイプごとの処理
    if (error instanceof MastraAgentError) {
      return this.handleMastraAgentError(error, context);
    }
    
    if (error instanceof DatabaseError) {
      return this.handleDatabaseError(error, context);
    }
    
    if (error instanceof ValidationError) {
      return this.handleValidationError(error, context);
    }
    
    // MongoDBエラーの検出
    if (error && typeof error === 'object' && 'code' in error) {
      return this.handleDatabaseError(error, context);
    }
    
    // その他の予期しないエラー
    return this.handleUnexpectedError(error, context);
  }
}

/**
 * エラーハンドリング用のデコレーター関数
 */
export function withStandardizedErrorHandling(context: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        StandardizedErrorHandler.handleError(error, `${target.constructor.name}.${propertyName}`);
      }
    };
  };
}

/**
 * 標準化されたエラーハンドリング関数（エクスポート用）
 */
export function handleStandardizedError(error: unknown, context: string): never {
  return StandardizedErrorHandler.handleError(error, context);
}