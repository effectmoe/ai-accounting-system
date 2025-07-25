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
exports.ApiErrorResponse = void 0;
exports.createErrorResponse = createErrorResponse;
exports.withErrorHandler = withErrorHandler;
exports.validateRequired = validateRequired;
exports.validatePagination = validatePagination;
exports.validateEmail = validateEmail;
exports.validateDate = validateDate;
exports.validateAmount = validateAmount;
const server_1 = require("next/server");
const Sentry = __importStar(require("@sentry/nextjs"));
const logger_1 = require("./logger");
class ApiErrorResponse extends Error {
    statusCode;
    code;
    details;
    constructor(message, statusCode = 500, code, details) {
        super(message);
        this.name = 'ApiErrorResponse';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
exports.ApiErrorResponse = ApiErrorResponse;
// 標準的なエラーレスポンスを生成
function createErrorResponse(error, defaultMessage = 'エラーが発生しました') {
    let statusCode = 500;
    let message = defaultMessage;
    let code = 'INTERNAL_ERROR';
    let details = undefined;
    if (error instanceof ApiErrorResponse) {
        statusCode = error.statusCode;
        message = error.message;
        code = error.code || code;
        details = error.details;
    }
    else if (error instanceof Error) {
        message = error.message || message;
        // MongoDBエラーの処理
        if (error.name === 'MongoServerError') {
            const mongoError = error;
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
        logger_1.logger.error('API Error', errorContext);
        if (error instanceof Error) {
            Sentry.captureException(error, {
                extra: errorContext,
            });
        }
    }
    else {
        logger_1.logger.warn('API Warning', errorContext);
    }
    return server_1.NextResponse.json({
        success: false,
        error: {
            message,
            code,
            ...(process.env.NODE_ENV === 'development' && details ? { details } : {}),
        },
    }, { status: statusCode });
}
// APIルートハンドラーのラッパー
function withErrorHandler(handler) {
    return (async (...args) => {
        try {
            return await handler(...args);
        }
        catch (error) {
            return createErrorResponse(error);
        }
    });
}
// 共通のバリデーション関数
function validateRequired(data, fields) {
    const missingFields = fields.filter(field => !data[field]);
    if (missingFields.length > 0) {
        throw new ApiErrorResponse(`必須項目が入力されていません: ${missingFields.join(', ')}`, 400, 'MISSING_REQUIRED_FIELDS', { missingFields });
    }
}
// ページネーションパラメータの検証
function validatePagination(searchParams) {
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}
// メールアドレスの検証
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
// 日付の検証
function validateDate(dateString) {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}
// 金額の検証
function validateAmount(amount) {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed < 0) {
        throw new ApiErrorResponse('無効な金額です', 400, 'INVALID_AMOUNT');
    }
    return parsed;
}
