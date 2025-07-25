"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.trackUIAction = trackUIAction;
exports.trackAPICall = trackAPICall;
exports.trackDBOperation = trackDBOperation;
exports.trackBusinessOperation = trackBusinessOperation;
exports.captureErrorWithContext = captureErrorWithContext;
const Sentry = __importStar(require("@sentry/nextjs"));
// Sentryロガーの取得
exports.logger = Sentry.logger;
/**
 * UIアクション（ボタンクリックなど）のパフォーマンストラッキング
 * @param operationName - 操作名（例: "Save Invoice", "Delete Customer"）
 * @param attributes - 追加の属性
 * @param callback - 実行する処理
 */
function trackUIAction(operationName, attributes, callback) {
    return Sentry.startSpan({
        op: "ui.click",
        name: operationName,
    }, (span) => {
        // 属性を追加
        Object.entries(attributes).forEach(([key, value]) => {
            span.setAttribute(key, value);
        });
        try {
            const result = callback();
            span.setStatus({ code: 1 }); // OK
            return result;
        }
        catch (error) {
            span.setStatus({ code: 2 }); // ERROR
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * APIコールのパフォーマンストラッキング
 * @param method - HTTPメソッド
 * @param endpoint - エンドポイント
 * @param callback - 実行する処理
 */
async function trackAPICall(method, endpoint, callback) {
    return Sentry.startSpan({
        op: "http.client",
        name: `${method} ${endpoint}`,
    }, async (span) => {
        span.setAttribute("http.method", method);
        span.setAttribute("http.url", endpoint);
        try {
            const result = await callback();
            span.setStatus({ code: 1 }); // OK
            return result;
        }
        catch (error) {
            span.setStatus({ code: 2 }); // ERROR
            // HTTPエラーの場合、ステータスコードを記録
            if (error instanceof Response) {
                span.setAttribute("http.status_code", error.status);
            }
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * データベース操作のトラッキング
 * @param operation - 操作名（例: "find", "update", "delete"）
 * @param collection - コレクション名
 * @param callback - 実行する処理
 */
async function trackDBOperation(operation, collection, callback) {
    return Sentry.startSpan({
        op: `db.${operation}`,
        name: `${operation} ${collection}`,
    }, async (span) => {
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
                exports.logger.warn(exports.logger.fmt `Slow DB operation: ${operation} on ${collection} took ${duration}ms`);
            }
            return result;
        }
        catch (error) {
            span.setStatus({ code: 2 }); // ERROR
            Sentry.captureException(error);
            throw error;
        }
    });
}
/**
 * ビジネスロジックのトラッキング
 * @param operationName - 操作名
 * @param context - コンテキスト情報
 * @param callback - 実行する処理
 */
async function trackBusinessOperation(operationName, context, callback) {
    return Sentry.startSpan({
        op: "business.operation",
        name: operationName,
    }, async (span) => {
        // コンテキストを属性として追加
        Object.entries(context).forEach(([key, value]) => {
            span.setAttribute(`business.${key}`, value);
        });
        exports.logger.info(exports.logger.fmt `Starting business operation: ${operationName}`, context);
        try {
            const result = await callback();
            span.setStatus({ code: 1 }); // OK
            exports.logger.info(exports.logger.fmt `Completed business operation: ${operationName}`);
            return result;
        }
        catch (error) {
            span.setStatus({ code: 2 }); // ERROR
            exports.logger.error(exports.logger.fmt `Failed business operation: ${operationName}`, {
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
    });
}
/**
 * エラーをコンテキスト付きでキャプチャ
 * @param error - エラー
 * @param context - エラーのコンテキスト
 */
function captureErrorWithContext(error, context) {
    Sentry.captureException(error, {
        tags: {
            operation: context.operation,
            entityType: context.entityType,
        },
        extra: context,
        user: context.userId ? { id: context.userId } : undefined,
    });
    // エラーログも出力
    exports.logger.error("Error captured with context", {
        error: error instanceof Error ? error.message : String(error),
        ...context,
    });
}
