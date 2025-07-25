"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const chat_history_service_1 = require("@/services/chat-history.service");
/**
 * POST /api/chat-history/[sessionId]/bookmark
 * セッションのブックマークを切り替え
 */
async function POST(request, { params }) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        const success = await chatHistoryService.toggleBookmark(params.sessionId);
        return server_1.NextResponse.json({
            success,
            message: success ? 'Bookmark toggled' : 'Session not found'
        });
    }
    catch (error) {
        console.error('Toggle bookmark error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle bookmark'
        }, { status: 500 });
    }
}
