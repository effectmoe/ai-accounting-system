"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalAPIError = exports.DatabaseConnectionError = exports.TimeoutError = exports.APIError = void 0;
exports.createErrorResponse = createErrorResponse;
exports.isRetryableError = isRetryableError;
exports.retryWithBackoff = retryWithBackoff;
exports.createTimeoutPromise = createTimeoutPromise;
const server_1 = require("next/server");
// カスタムエラークラス
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
class TimeoutError extends APIError {
    constructor(message = 'Request timeout') {
        super(message, 504, 'TIMEOUT');
    }
}
exports.TimeoutError = TimeoutError;
class DatabaseConnectionError extends APIError {
    constructor(message = 'Database connection failed') {
        super(message, 503, 'DB_CONNECTION_ERROR');
    }
}
exports.DatabaseConnectionError = DatabaseConnectionError;
class ExternalAPIError extends APIError {
    constructor(service, message, statusCode = 502) {
        super(`${service} API error: ${message}`, statusCode, 'EXTERNAL_API_ERROR');
    }
}
exports.ExternalAPIError = ExternalAPIError;
// エラーレスポンスの標準化
function createErrorResponse(error) {
    console.error('API Error:', error);
    // タイムアウトエラー
    if (error instanceof TimeoutError) {
        return server_1.NextResponse.json({
            error: 'Request timeout',
            message: 'リクエストがタイムアウトしました。もう一度お試しください。',
            code: error.code,
        }, { status: error.statusCode });
    }
    // データベース接続エラー
    if (error instanceof DatabaseConnectionError) {
        return server_1.NextResponse.json({
            error: 'Database connection error',
            message: 'データベースへの接続に失敗しました。しばらくしてからもう一度お試しください。',
            code: error.code,
        }, { status: error.statusCode });
    }
    // 外部APIエラー
    if (error instanceof ExternalAPIError) {
        return server_1.NextResponse.json({
            error: 'External API error',
            message: '外部サービスとの通信に失敗しました。しばらくしてからもう一度お試しください。',
            code: error.code,
            details: error.message,
        }, { status: error.statusCode });
    }
    // APIError
    if (error instanceof APIError) {
        return server_1.NextResponse.json({
            error: error.message,
            code: error.code,
        }, { status: error.statusCode });
    }
    // MongoDB関連のエラー
    if (error instanceof Error) {
        // MongoDB接続エラー
        if (error.message.includes('MongoDB') ||
            error.message.includes('ECONNREFUSED') ||
            error.message.includes('ETIMEDOUT') ||
            error.message.includes('getaddrinfo')) {
            return server_1.NextResponse.json({
                error: 'Database connection error',
                message: 'データベースへの接続に失敗しました。',
                code: 'DB_CONNECTION_ERROR',
            }, { status: 503 });
        }
        // ネットワークタイムアウト
        if (error.message.includes('timeout') ||
            error.message.includes('Timeout') ||
            error.name === 'AbortError') {
            return server_1.NextResponse.json({
                error: 'Request timeout',
                message: 'リクエストがタイムアウトしました。',
                code: 'TIMEOUT',
            }, { status: 504 });
        }
    }
    // その他のエラー
    return server_1.NextResponse.json({
        error: 'Internal server error',
        message: 'サーバーエラーが発生しました。',
        code: 'INTERNAL_ERROR',
    }, { status: 500 });
}
// リトライ可能なエラーかチェック
function isRetryableError(error) {
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
async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (!isRetryableError(error) || i === maxRetries - 1) {
                throw error;
            }
            const delay = initialDelay * Math.pow(2, i);
            console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    throw lastError;
}
// Vercelのタイムアウトを考慮したタイムアウト設定
function createTimeoutPromise(promise, timeoutMs = 8000) {
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
