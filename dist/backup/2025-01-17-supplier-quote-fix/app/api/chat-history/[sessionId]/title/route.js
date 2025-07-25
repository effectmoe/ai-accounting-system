"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const chat_history_service_1 = require("@/services/chat-history.service");
/**
 * POST /api/chat-history/[sessionId]/title
 * セッションのタイトルを自動生成
 */
async function POST(request, { params }) {
    const chatHistoryService = (0, chat_history_service_1.getChatHistoryService)();
    try {
        const title = await chatHistoryService.generateSessionTitle(params.sessionId);
        return server_1.NextResponse.json({
            success: true,
            data: { title }
        });
    }
    catch (error) {
        console.error('Generate title error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate title'
        }, { status: 500 });
    }
}
