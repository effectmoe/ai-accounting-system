"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const chat_history_service_1 = require("@/services/chat-history.service");
/**
 * GET /api/chat-history/[sessionId]
 * 特定のセッション情報を取得
 */
async function GET(request, { params }) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        // MongoDBに接続
        await chatHistoryService.connect();
        const session = await chatHistoryService.getSession(params.sessionId);
        if (!session) {
            return server_1.NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            data: session
        });
    }
    catch (error) {
        console.error('Chat history GET error:', error);
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
        const body = await request.json();
        const { title, category, specialization } = body;
        await chatHistoryService.connect();
        const db = chatHistoryService.db;
        const result = await db.collection('chat_sessions').updateOne({ sessionId: params.sessionId }, {
            $set: {
                ...(title && { title }),
                ...(category && { category }),
                ...(specialization && { specialization }),
                updatedAt: new Date()
            }
        });
        return server_1.NextResponse.json({
            success: result.modifiedCount > 0,
            message: result.modifiedCount > 0 ? 'Session updated' : 'Session not found'
        });
    }
    catch (error) {
        console.error('Chat history PATCH error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update session'
        }, { status: 500 });
    }
}
