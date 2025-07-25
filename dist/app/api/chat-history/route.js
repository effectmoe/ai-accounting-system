"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const chat_history_service_1 = require("@/services/chat-history.service");
const logger_1 = require("@/lib/logger");
/**
 * GET /api/chat-history
 * チャットセッション一覧の取得
 */
async function GET(request) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const status = searchParams.get('status') || 'active';
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const sortBy = searchParams.get('sortBy') || 'updatedAt';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        const query = searchParams.get('q');
        let result;
        if (query) {
            // 検索モード
            result = await chatHistoryService.searchSessions(query, userId || undefined, {
                limit,
                offset
            });
        }
        else {
            // 通常の一覧取得
            result = await chatHistoryService.getUserSessions(userId || undefined, {
                limit,
                offset,
                status,
                sortBy,
                sortOrder
            });
        }
        return server_1.NextResponse.json({
            success: true,
            data: result.sessions,
            pagination: {
                total: result.total,
                limit,
                offset,
                hasMore: offset + limit < result.total
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Chat history GET error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch chat history'
        }, { status: 500 });
    }
}
/**
 * POST /api/chat-history
 * 新しいチャットセッションの作成
 */
async function POST(request) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        const body = await request.json();
        const { userId, title } = body;
        const session = await chatHistoryService.createSession(userId, title);
        return server_1.NextResponse.json({
            success: true,
            data: session
        });
    }
    catch (error) {
        logger_1.logger.error('Chat history POST error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create chat session'
        }, { status: 500 });
    }
}
/**
 * DELETE /api/chat-history
 * チャットセッションの削除
 */
async function DELETE(request) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');
        const permanent = searchParams.get('permanent') === 'true';
        if (!sessionId) {
            return server_1.NextResponse.json({ success: false, error: 'sessionId is required' }, { status: 400 });
        }
        const success = await chatHistoryService.deleteSession(sessionId, !permanent);
        return server_1.NextResponse.json({
            success,
            message: success
                ? (permanent ? 'Session permanently deleted' : 'Session moved to trash')
                : 'Session not found'
        });
    }
    catch (error) {
        logger_1.logger.error('Chat history DELETE error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete chat session'
        }, { status: 500 });
    }
}
