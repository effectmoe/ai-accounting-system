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
exports.GET = GET;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const chat_history_service_1 = require("@/services/chat-history.service");
const logger_1 = require("@/lib/logger");
/**
 * GET /api/chat-history/[sessionId]
 * 特定のセッション情報を取得
 */
async function GET(request, { params }) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        logger_1.logger.debug(`[API] GET /api/chat-history/${params.sessionId}`);
        // MongoDBに接続
        await chatHistoryService.connect();
        const session = await chatHistoryService.getSession(params.sessionId);
        if (!session) {
            logger_1.logger.debug(`[API] セッションが見つかりません: ${params.sessionId}`);
            return server_1.NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }
        logger_1.logger.debug(`[API] セッション取得成功: ${params.sessionId}`);
        return server_1.NextResponse.json({
            success: true,
            data: session
        });
    }
    catch (error) {
        logger_1.logger.error('[API] Chat history GET error:', error);
        logger_1.logger.error('[API] エラー詳細:', error instanceof Error ? error.stack : 'Unknown error');
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch session'
        }, { status: 500 });
    }
}
/**
 * PATCH /api/chat-history/[sessionId]
 * セッション情報を更新
 */
async function PATCH(request, { params }) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        logger_1.logger.debug(`[API] PATCH /api/chat-history/${params.sessionId}`);
        const body = await request.json();
        const { title, category, specialization } = body;
        logger_1.logger.debug('[API] 更新データ:', { title, category, specialization });
        await chatHistoryService.connect();
        const db = chatHistoryService.db;
        // sessionIdと_idの両方で検索を試みる
        let result = await db.collection('chat_sessions').updateOne({ sessionId: params.sessionId }, {
            $set: {
                ...(title && { title }),
                ...(category && { category }),
                ...(specialization && { specialization }),
                updatedAt: new Date()
            }
        });
        // sessionIdで見つからない場合は_idでも試す
        if (result.modifiedCount === 0) {
            try {
                const { ObjectId } = await Promise.resolve().then(() => __importStar(require('mongodb')));
                const objectId = new ObjectId(params.sessionId);
                result = await db.collection('chat_sessions').updateOne({ _id: objectId }, {
                    $set: {
                        ...(title && { title }),
                        ...(category && { category }),
                        ...(specialization && { specialization }),
                        updatedAt: new Date()
                    }
                });
            }
            catch (e) {
                logger_1.logger.debug('[API] ObjectId変換エラー:', e);
            }
        }
        logger_1.logger.debug(`[API] 更新結果: ${result.modifiedCount > 0 ? '成功' : '失敗'}`);
        return server_1.NextResponse.json({
            success: result.modifiedCount > 0,
            message: result.modifiedCount > 0 ? 'Session updated' : 'Session not found'
        });
    }
    catch (error) {
        logger_1.logger.error('[API] Chat history PATCH error:', error);
        logger_1.logger.error('[API] エラー詳細:', error instanceof Error ? error.stack : 'Unknown error');
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update session'
        }, { status: 500 });
    }
}
