"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const body = await request.json();
        const { faqId, voteType } = body;
        if (!faqId || !voteType) {
            return server_1.NextResponse.json({ error: 'Required fields missing: faqId, voteType' }, { status: 400 });
        }
        if (!['helpful', 'unhelpful'].includes(voteType)) {
            return server_1.NextResponse.json({ error: 'Invalid vote type' }, { status: 400 });
        }
        await knowledgeService.connect();
        const collection = knowledgeService.db.collection('faq_articles');
        // 投票数を更新
        const updateField = voteType === 'helpful' ? 'usageStats.helpfulVotes' : 'usageStats.unhelpfulVotes';
        const result = await collection.updateOne({ _id: new mongodb_1.ObjectId(faqId) }, {
            $inc: { [updateField]: 1 },
            $set: {
                'usageStats.lastViewed': new Date(),
                updatedAt: new Date()
            }
        });
        if (result.matchedCount === 0) {
            return server_1.NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }
        // 利用ログを記録
        const usageLogCollection = knowledgeService.db.collection('faq_usage_logs');
        await usageLogCollection.insertOne({
            faqId,
            action: voteType,
            sessionId: request.headers.get('x-session-id') || undefined,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
            timestamp: new Date()
        });
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: true,
            message: 'Vote recorded successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('[FAQ Vote] Error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to record vote',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
