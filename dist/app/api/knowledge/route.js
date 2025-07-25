"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const logger_1 = require("@/lib/logger");
const knowledgeService = new knowledge_service_1.KnowledgeService();
async function GET(request) {
    try {
        await knowledgeService.connect();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        switch (action) {
            case 'search':
                return await handleSearch(searchParams);
            case 'sources':
                return await handleGetSources();
            case 'categories':
                return await handleGetCategories();
            case 'logs':
                return await handleGetLogs(searchParams);
            case 'stats':
                return await handleGetStats();
            default:
                return server_1.NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    }
    catch (error) {
        logger_1.logger.error('Knowledge API error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    finally {
        await knowledgeService.disconnect();
    }
}
async function POST(request) {
    try {
        await knowledgeService.connect();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const body = await request.json();
        switch (action) {
            case 'articles':
                return await handleCreateArticle(body);
            case 'sources':
                return await handleCreateSource(body);
            case 'categories':
                return await handleCreateCategory(body);
            case 'crawl':
                return await handleCrawlSource(body);
            case 'bulk-import':
                return await handleBulkImport(body);
            default:
                return server_1.NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    }
    catch (error) {
        logger_1.logger.error('Knowledge API error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    finally {
        await knowledgeService.disconnect();
    }
}
async function PUT(request) {
    try {
        await knowledgeService.connect();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const id = searchParams.get('id');
        const body = await request.json();
        if (!id) {
            return server_1.NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }
        switch (action) {
            case 'articles':
                return await handleUpdateArticle(id, body);
            case 'sources':
                return await handleUpdateSource(id, body);
            case 'verify':
                return await handleVerifyArticle(id, body);
            default:
                return server_1.NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    }
    catch (error) {
        logger_1.logger.error('Knowledge API error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    finally {
        await knowledgeService.disconnect();
    }
}
async function DELETE(request) {
    try {
        await knowledgeService.connect();
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');
        const id = searchParams.get('id');
        if (!id) {
            return server_1.NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }
        switch (action) {
            case 'articles':
                return await handleDeleteArticle(id);
            case 'sources':
                return await handleDeleteSource(id);
            default:
                return server_1.NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    }
    catch (error) {
        logger_1.logger.error('Knowledge API error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
    finally {
        await knowledgeService.disconnect();
    }
}
// === ハンドラー関数 ===
async function handleSearch(searchParams) {
    const query = {
        text: searchParams.get('q') || undefined,
        categories: searchParams.get('categories')?.split(',') || undefined,
        tags: searchParams.get('tags')?.split(',') || undefined,
        sourceTypes: searchParams.get('sourceTypes')?.split(',') || undefined,
        difficulty: searchParams.get('difficulty') || undefined,
        contentType: searchParams.get('contentType') || undefined,
        isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
        isVerified: searchParams.get('isVerified') === 'true' ? true : searchParams.get('isVerified') === 'false' ? false : undefined,
        limit: parseInt(searchParams.get('limit') || '20'),
        offset: parseInt(searchParams.get('offset') || '0'),
        dateRange: searchParams.get('dateStart') && searchParams.get('dateEnd') ? {
            start: new Date(searchParams.get('dateStart')),
            end: new Date(searchParams.get('dateEnd'))
        } : undefined
    };
    const result = await knowledgeService.searchArticles(query);
    return server_1.NextResponse.json(result);
}
async function handleGetSources() {
    const sources = await knowledgeService.getAllSources();
    return server_1.NextResponse.json({ sources });
}
async function handleGetCategories() {
    const categories = await knowledgeService.getAllCategories();
    return server_1.NextResponse.json({ categories });
}
async function handleGetLogs(searchParams) {
    const filter = {
        operation: searchParams.get('operation') || undefined,
        status: searchParams.get('status') || undefined,
        limit: parseInt(searchParams.get('limit') || '100'),
        dateRange: searchParams.get('dateStart') && searchParams.get('dateEnd') ? {
            start: new Date(searchParams.get('dateStart')),
            end: new Date(searchParams.get('dateEnd'))
        } : undefined
    };
    const logs = await knowledgeService.getProcessingLogs(filter);
    return server_1.NextResponse.json({ logs });
}
async function handleGetStats() {
    // 統計情報を取得
    const stats = {
        totalArticles: 0,
        totalSources: 0,
        totalCategories: 0,
        articlesBySource: {},
        articlesByCategory: {},
        qualityDistribution: {
            high: 0,
            medium: 0,
            low: 0
        },
        processingStats: {
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0
        }
    };
    // 実装は後で追加（集計クエリが必要）
    return server_1.NextResponse.json({ stats });
}
async function handleCreateArticle(body) {
    const article = await knowledgeService.createArticle(body);
    return server_1.NextResponse.json({ article }, { status: 201 });
}
async function handleCreateSource(body) {
    const source = await knowledgeService.createSource(body);
    return server_1.NextResponse.json({ source }, { status: 201 });
}
async function handleCreateCategory(body) {
    const category = await knowledgeService.createCategory(body);
    return server_1.NextResponse.json({ category }, { status: 201 });
}
async function handleCrawlSource(body) {
    const { sourceId } = body;
    if (!sourceId) {
        return server_1.NextResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }
    // 非同期でクロールを実行
    const result = await knowledgeService.crawlSource(sourceId);
    return server_1.NextResponse.json({ result });
}
async function handleBulkImport(body) {
    const { articles } = body;
    if (!articles || !Array.isArray(articles)) {
        return server_1.NextResponse.json({ error: 'Articles array is required' }, { status: 400 });
    }
    const results = [];
    const errors = [];
    for (const articleData of articles) {
        try {
            const article = await knowledgeService.createArticle(articleData);
            results.push(article);
        }
        catch (error) {
            errors.push({
                data: articleData,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    return server_1.NextResponse.json({
        imported: results.length,
        errors: errors.length,
        results,
        errors
    });
}
async function handleUpdateArticle(id, body) {
    const article = await knowledgeService.updateArticle(id, body);
    if (!article) {
        return server_1.NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    return server_1.NextResponse.json({ article });
}
async function handleUpdateSource(id, body) {
    const source = await knowledgeService.updateSource(id, body);
    if (!source) {
        return server_1.NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }
    return server_1.NextResponse.json({ source });
}
async function handleVerifyArticle(id, body) {
    const { isVerified } = body;
    const article = await knowledgeService.updateArticle(id, { isVerified });
    if (!article) {
        return server_1.NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    return server_1.NextResponse.json({ article });
}
async function handleDeleteArticle(id) {
    const deleted = await knowledgeService.deleteArticle(id);
    if (!deleted) {
        return server_1.NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    return server_1.NextResponse.json({ success: true });
}
async function handleDeleteSource(id) {
    // ソースの削除は慎重に行う必要があるため、非アクティブ化のみ
    const source = await knowledgeService.updateSource(id, { isActive: false });
    if (!source) {
        return server_1.NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }
    return server_1.NextResponse.json({ source });
}
