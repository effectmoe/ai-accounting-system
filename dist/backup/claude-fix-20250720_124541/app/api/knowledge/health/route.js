"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const logger_1 = require("@/lib/logger");
/**
 * GET /api/knowledge/health
 * ナレッジサービスの動作確認
 */
async function GET(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        // 環境変数の確認
        const hasDeepSeekKey = !!process.env.DEEPSEEK_API_KEY;
        const hasMongoUri = !!process.env.MONGODB_URI;
        // MongoDB接続テスト
        let mongoStatus = 'disconnected';
        let articlesFound = 0;
        try {
            await knowledgeService.connect();
            const testSearch = await knowledgeService.searchArticles({
                text: 'test',
                limit: 1
            });
            await knowledgeService.disconnect();
            mongoStatus = 'connected';
            articlesFound = testSearch.total;
        }
        catch (mongoError) {
            logger_1.logger.error('MongoDB test error:', mongoError);
            mongoStatus = `error: ${mongoError instanceof Error ? mongoError.message : 'Unknown error'}`;
        }
        // DeepSeek API接続テスト
        let deepseekStatus = 'not_tested';
        if (hasDeepSeekKey) {
            try {
                const testResponse = await fetch('https://api.deepseek.com/v1/models', {
                    headers: {
                        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    }
                });
                deepseekStatus = testResponse.ok ? 'connected' : `error: ${testResponse.status}`;
            }
            catch (deepseekError) {
                deepseekStatus = `error: ${deepseekError instanceof Error ? deepseekError.message : 'Unknown error'}`;
            }
        }
        else {
            deepseekStatus = 'no_api_key';
        }
        return server_1.NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: {
                hasDeepSeekKey,
                hasMongoUri,
                nodeEnv: process.env.NODE_ENV
            },
            services: {
                mongodb: mongoStatus,
                deepseek: deepseekStatus
            },
            data: {
                articlesFound
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Health check error:', error);
        return server_1.NextResponse.json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
            environment: {
                hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
                hasMongoUri: !!process.env.MONGODB_URI,
                nodeEnv: process.env.NODE_ENV
            }
        }, { status: 500 });
    }
}
