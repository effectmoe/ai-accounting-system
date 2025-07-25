"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    try {
        logger_1.logger.debug('[FAQ API] FAQ save API called');
        const body = await request.json();
        logger_1.logger.debug('[FAQ API] リクエストボディ:', JSON.stringify(body));
        const { question, answer, sessionId, timestamp } = body;
        if (!question || !answer) {
            logger_1.logger.debug('[FAQ API] バリデーションエラー: questionまたはanswerが不足');
            return server_1.NextResponse.json({ success: false, error: 'Question and answer are required' }, { status: 400 });
        }
        logger_1.logger.debug('[FAQ API] データベース接続を確認中...');
        // FAQ保存
        const faqEntry = {
            question: question.trim(),
            answer: answer.trim(),
            sessionId,
            createdAt: new Date(timestamp),
            savedAt: new Date(),
            category: 'tax-accounting',
            status: 'active',
            tags: ['ai-generated', 'chat']
        };
        logger_1.logger.debug('[FAQ API] FAQエントリを挿入:', JSON.stringify(faqEntry));
        const result = await mongodb_client_1.db.create('faq', faqEntry);
        logger_1.logger.debug('[FAQ API] FAQ保存成功 ID:', result._id);
        return server_1.NextResponse.json({
            success: true,
            message: 'FAQに保存されました',
            id: result._id
        });
    }
    catch (error) {
        logger_1.logger.error('[FAQ API] FAQ保存エラー:', error);
        logger_1.logger.error('[FAQ API] エラー詳細:', error instanceof Error ? error.stack : 'Unknown error');
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'FAQ保存に失敗しました',
            details: error instanceof Error ? error.message : undefined
        }, { status: 500 });
    }
}
