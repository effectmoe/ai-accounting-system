import * as Sentry from "@sentry/nextjs";

// Sentryロガーの取得
export const { logger } = Sentry;

/**
 * UIアクション（ボタンクリックなど）のパフォーマンストラッキング
 * @param operationName - 操作名（例: "Save Invoice", "Delete Customer"）
 * @param attributes - 追加の属性
 * @param callback - 実行する処理
 */
export function trackUIAction<T>(
  operationName: string,
  attributes: Record<string, any>,
  callback: () => T
): T {
  return Sentry.startSpan(
    {
      op: "ui.click",
      name: operationName,
    },
    (span) => {
      // 属性を追加
      Object.entries(attributes).forEach(([key, value]) => {
        span.setAttribute(key, value);
      });

      try {
        const result = callback();
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.setStatus({ code: 2 }); // ERROR
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * APIコールのパフォーマンストラッキング
 * @param method - HTTPメソッド
 * @param endpoint - エンドポイント
 * @param callback - 実行する処理
 */
export async function trackAPICall<T>(
  method: string,
  endpoint: string,
  callback: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: "http.client",
      name: `${method} ${endpoint}`,
    },
    async (span) => {
      span.setAttribute("http.method", method);
      span.setAttribute("http.url", endpoint);

      try {
        const result = await callback();
        span.setStatus({ code: 1 }); // OK
        return result;
      } catch (error) {
        span.setStatus({ code: 2 }); // ERROR
        
        // HTTPエラーの場合、ステータスコードを記録
        if (error instanceof Response) {
          span.setAttribute("http.status_code", error.status);
        }
        
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * データベース操作のトラッキング
 * @param operation - 操作名（例: "find", "update", "delete"）
 * @param collection - コレクション名
 * @param callback - 実行する処理
 */
export async function trackDBOperation<T>(
  operation: string,
  collection: string,
  callback: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: `db.${operation}`,
      name: `${operation} ${collection}`,
    },
    async (span) => {
      span.setAttribute("db.collection", collection);
      span.setAttribute("db.operation", operation);

      try {
        const startTime = Date.now();
        const result = await callback();
        const duration = Date.now() - startTime;
        
        span.setAttribute("db.duration", duration);
        span.setStatus({ code: 1 }); // OK
        
        // 遅いクエリの警告
        if (duration > 1000) {
          logger.warn(logger.fmt`Slow DB operation: ${operation} on ${collection} took ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        span.setStatus({ code: 2 }); // ERROR
        Sentry.captureException(error);
        throw error;
      }
    }
  );
}

/**
 * ビジネスロジックのトラッキング
 * @param operationName - 操作名
 * @param context - コンテキスト情報
 * @param callback - 実行する処理
 */
export async function trackBusinessOperation<T>(
  operationName: string,
  context: Record<string, any>,
  callback: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      op: "business.operation",
      name: operationName,
    },
    async (span) => {
      // コンテキストを属性として追加
      Object.entries(context).forEach(([key, value]) => {
        span.setAttribute(`business.${key}`, value);
      });

      logger.info(logger.fmt`Starting business operation: ${operationName}`, context);

      try {
        const result = await callback();
        span.setStatus({ code: 1 }); // OK
        logger.info(logger.fmt`Completed business operation: ${operationName}`);
        return result;
      } catch (error) {
        span.setStatus({ code: 2 }); // ERROR
        logger.error(logger.fmt`Failed business operation: ${operationName}`, {
          error: error instanceof Error ? error.message : String(error),
          context,
        });
        Sentry.captureException(error, {
          tags: {
            operation: operationName,
          },
          extra: context,
        });
        throw error;
      }
    }
  );
}

/**
 * エラーをコンテキスト付きでキャプチャ
 * @param error - エラー
 * @param context - エラーのコンテキスト
 */
export function captureErrorWithContext(
  error: Error | unknown,
  context: {
    operation?: string;
    userId?: string;
    entityId?: string;
    entityType?: string;
    [key: string]: any;
  }
): void {
  Sentry.captureException(error, {
    tags: {
      operation: context.operation,
      entityType: context.entityType,
    },
    extra: context,
    user: context.userId ? { id: context.userId } : undefined,
  });

  // エラーログも出力
  logger.error("Error captured with context", {
    error: error instanceof Error ? error.message : String(error),
    ...context,
  });
}