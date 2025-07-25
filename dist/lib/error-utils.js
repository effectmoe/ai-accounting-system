"use strict";
// 共通エラーハンドリングユーティリティ
Object.defineProperty(exports, "__esModule", { value: true });
exports.APIError = void 0;
exports.createErrorResponse = createErrorResponse;
exports.withErrorHandling = withErrorHandling;
exports.createValidationError = createValidationError;
exports.createAuthError = createAuthError;
exports.createForbiddenError = createForbiddenError;
exports.createNotFoundError = createNotFoundError;
exports.createSuccessResponse = createSuccessResponse;
const server_1 = require("next/server");
const logger_1 = require("@/lib/logger");
class APIError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'APIError';
    }
}
exports.APIError = APIError;
/**
 * APIエラーレスポンスを生成
 */
function createErrorResponse(error, defaultMessage = 'エラーが発生しました') {
    logger_1.logger.error('API Error:', error);
    if (error instanceof APIError) {
        return server_1.NextResponse.json({
            success: false,
            error: error.message,
            code: error.code
        }, { status: error.statusCode });
    }
    if (error instanceof Error) {
        // MongoDBエラーの処理
        if (error.message.includes('MongoDB')) {
            return server_1.NextResponse.json({
                success: false,
                error: 'データベース接続エラーが発生しました',
                code: 'DATABASE_ERROR',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }, { status: 503 });
        }
        // タイムアウトエラー
        if (error.message.includes('timeout')) {
            return server_1.NextResponse.json({
                success: false,
                error: '処理がタイムアウトしました',
                code: 'TIMEOUT_ERROR'
            }, { status: 504 });
        }
        return server_1.NextResponse.json({
            success: false,
            error: error.message || defaultMessage,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
    return server_1.NextResponse.json({
        success: false,
        error: defaultMessage
    }, { status: 500 });
}
/**
 * 非同期関数のエラーハンドリングラッパー
 */
function withErrorHandling(fn, defaultMessage) {
    return (async (...args) => {
        try {
            return await fn(...args);
        }
        catch (error) {
            return createErrorResponse(error, defaultMessage);
        }
    });
}
/**
 * データ検証エラーレスポンス
 */
function createValidationError(field, message) {
    return server_1.NextResponse.json({
        success: false,
        error: `入力エラー: ${message}`,
        code: 'VALIDATION_ERROR',
        details: { field }
    }, { status: 400 });
}
/**
 * 認証エラーレスポンス
 */
function createAuthError(message = '認証が必要です') {
    return server_1.NextResponse.json({
        success: false,
        error: message,
        code: 'AUTH_ERROR'
    }, { status: 401 });
}
/**
 * 権限エラーレスポンス
 */
function createForbiddenError(message = 'アクセス権限がありません') {
    return server_1.NextResponse.json({
        success: false,
        error: message,
        code: 'FORBIDDEN_ERROR'
    }, { status: 403 });
}
/**
 * NotFoundエラーレスポンス
 */
function createNotFoundError(resource) {
    return server_1.NextResponse.json({
        success: false,
        error: `${resource}が見つかりません`,
        code: 'NOT_FOUND'
    }, { status: 404 });
}
/**
 * 成功レスポンスを生成
 */
function createSuccessResponse(data, message) {
    return server_1.NextResponse.json({
        success: true,
        data,
        message
    });
}
