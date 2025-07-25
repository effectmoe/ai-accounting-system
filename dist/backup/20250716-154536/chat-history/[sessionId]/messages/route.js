"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const chat_history_service_1 = require("@/services/chat-history.service");
/**
 * POST /api/chat-history/[sessionId]/messages
 * セッションにメッセージを追加
 */
async function POST(request, { params }) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        const body = await request.json();
        const message = await chatHistoryService.addMessage(params.sessionId, body);
        return server_1.NextResponse.json({
            success: true,
            data: message
        });
    }
    catch (error) {
        console.error('Add message error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add message'
        }, { status: 500 });
    }
}
