"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const chat_history_service_1 = require("@/services/chat-history.service");
/**
 * POST /api/chat-history/[sessionId]/archive
 * セッションをアーカイブ
 */
async function POST(request, { params }) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        const success = await chatHistoryService.archiveSession(params.sessionId);
        return server_1.NextResponse.json({
            success,
            message: success ? 'Session archived' : 'Session not found'
        });
    }
    catch (error) {
        console.error('Archive session error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to archive session'
        }, { status: 500 });
    }
}
