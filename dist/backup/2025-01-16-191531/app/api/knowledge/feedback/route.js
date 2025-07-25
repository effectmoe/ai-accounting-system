"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
async function POST(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const body = await request.json();
        const { messageId, sessionId, feedback } = body;
        if (!messageId || !sessionId || !feedback) {
            return server_1.NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }
        if (!['good', 'bad'].includes(feedback)) {
            return server_1.NextResponse.json({ error: 'Invalid feedback value' }, { status: 400 });
        }
        await knowledgeService.connect();
        // フィードバックログを記録
        await knowledgeService.createProcessingLog({
            operation: 'user_feedback',
            status: 'completed',
            startTime: new Date(),
            endTime: new Date(),
            metadata: {
                messageId,
                sessionId,
                feedback,
                timestamp: new Date().toISOString()
            }
        });
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: true,
            message: 'Feedback recorded successfully'
        });
    }
    catch (error) {
        console.error('Feedback API error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to record feedback'
        }, { status: 500 });
    }
}
