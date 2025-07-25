"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const logger_1 = require("@/lib/logger");
const knowledgeService = new knowledge_service_1.KnowledgeService();
async function POST(request) {
    try {
        await knowledgeService.connect();
        const body = await request.json();
        const { sourceId, force = false } = body;
        if (!sourceId) {
            return server_1.NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
        }
        // ソースの存在確認
        const source = await knowledgeService.getSourceById(sourceId);
        if (!source) {
            return server_1.NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }
        if (!source.isActive) {
            return server_1.NextResponse.json({ error: 'Source is not active' }, { status: 400 });
        }
        // 強制実行でない場合は、前回のクロールからの経過時間をチェック
        if (!force && source.crawlSettings.lastCrawled) {
            const now = new Date();
            const lastCrawled = new Date(source.crawlSettings.lastCrawled);
            const timeDiff = now.getTime() - lastCrawled.getTime();
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            let requiredHours = 24; // デフォルトは24時間
            switch (source.crawlSettings.frequency) {
                case 'daily':
                    requiredHours = 24;
                    break;
                case 'weekly':
                    requiredHours = 24 * 7;
                    break;
                case 'monthly':
                    requiredHours = 24 * 30;
                    break;
            }
            if (hoursDiff < requiredHours) {
                return server_1.NextResponse.json({
                    error: `Too soon to crawl again. Please wait ${Math.ceil(requiredHours - hoursDiff)} hours.`,
                    nextCrawlTime: new Date(lastCrawled.getTime() + (requiredHours * 60 * 60 * 1000))
                }, { status: 429 });
            }
        }
        // クロールを実行
        const result = await knowledgeService.crawlSource(sourceId);
        return server_1.NextResponse.json({
            success: true,
            sourceId,
            sourceName: source.name,
            sourceType: source.type,
            articlesCreated: result.articlesCreated,
            errors: result.errors,
            timestamp: new Date()
        });
    }
    catch (error) {
        logger_1.logger.error('Knowledge crawl error:', error);
        return server_1.NextResponse.json({
            error: 'Failed to crawl source',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
    finally {
        await knowledgeService.disconnect();
    }
}
async function GET(request) {
    try {
        await knowledgeService.connect();
        const { searchParams } = new URL(request.url);
        const sourceId = searchParams.get('sourceId');
        if (!sourceId) {
            return server_1.NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
        }
        // ソースの情報とクロール履歴を取得
        const source = await knowledgeService.getSourceById(sourceId);
        if (!source) {
            return server_1.NextResponse.json({ error: 'Source not found' }, { status: 404 });
        }
        // 最近のクロールログを取得
        const logs = await knowledgeService.getProcessingLogs({
            operation: 'crawl',
            limit: 10
        });
        const sourceSpecificLogs = logs.filter(log => log.sourceId?.toString() === sourceId);
        return server_1.NextResponse.json({
            source,
            recentLogs: sourceSpecificLogs,
            canCrawl: source.isActive,
            nextScheduledCrawl: source.crawlSettings.nextCrawl
        });
    }
    catch (error) {
        logger_1.logger.error('Knowledge crawl status error:', error);
        return server_1.NextResponse.json({ error: 'Failed to get crawl status' }, { status: 500 });
    }
    finally {
        await knowledgeService.disconnect();
    }
}
