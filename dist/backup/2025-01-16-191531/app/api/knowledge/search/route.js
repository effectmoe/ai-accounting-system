"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const knowledgeService = new knowledge_service_1.KnowledgeService();
async function POST(request) {
    try {
        await knowledgeService.connect();
        const body = await request.json();
        const { query, categories, tags, sourceTypes, difficulty, contentType, dateRange, isActive = true, isVerified, limit = 20, offset = 0, searchType = 'text' // 'text' | 'semantic' | 'hybrid'
         } = body;
        let result;
        switch (searchType) {
            case 'semantic':
                result = await handleSemanticSearch(query, {
                    categories,
                    tags,
                    sourceTypes,
                    difficulty,
                    contentType,
                    dateRange,
                    isActive,
                    isVerified,
                    limit,
                    offset
                });
                break;
            case 'hybrid':
                result = await handleHybridSearch(query, {
                    categories,
                    tags,
                    sourceTypes,
                    difficulty,
                    contentType,
                    dateRange,
                    isActive,
                    isVerified,
                    limit,
                    offset
                });
                break;
            default:
                result = await knowledgeService.searchArticles({
                    text: query,
                    categories,
                    tags,
                    sourceTypes,
                    difficulty,
                    contentType,
                    dateRange: dateRange ? {
                        start: new Date(dateRange.start),
                        end: new Date(dateRange.end)
                    } : undefined,
                    isActive,
                    isVerified,
                    limit,
                    offset
                });
        }
        return server_1.NextResponse.json({
            ...result,
            searchType,
            query,
            filters: {
                categories,
                tags,
                sourceTypes,
                difficulty,
                contentType,
                dateRange,
                isActive,
                isVerified
            }
        });
    }
    catch (error) {
        console.error('Knowledge search error:', error);
        return server_1.NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
    finally {
        await knowledgeService.disconnect();
    }
}
async function GET(request) {
    try {
        await knowledgeService.connect();
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        if (!query) {
            return server_1.NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
        }
        const result = await knowledgeService.searchArticles({
            text: query,
            categories: searchParams.get('categories')?.split(','),
            tags: searchParams.get('tags')?.split(','),
            sourceTypes: searchParams.get('sourceTypes')?.split(','),
            difficulty: searchParams.get('difficulty') || undefined,
            contentType: searchParams.get('contentType') || undefined,
            isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
            isVerified: searchParams.get('isVerified') === 'true' ? true : searchParams.get('isVerified') === 'false' ? false : undefined,
            limit: parseInt(searchParams.get('limit') || '20'),
            offset: parseInt(searchParams.get('offset') || '0')
        });
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        console.error('Knowledge search error:', error);
        return server_1.NextResponse.json({ error: 'Search failed' }, { status: 500 });
    }
    finally {
        await knowledgeService.disconnect();
    }
}
// === 検索関数 ===
async function handleSemanticSearch(query, filters) {
    // セマンティック検索の実装
    // 実際の実装では、クエリをベクトル化してベクトル検索を実行
    // 現在は簡易実装として、テキスト検索を使用
    const textResult = await knowledgeService.searchArticles({
        text: query,
        ...filters
    });
    // 今後、OpenAI Embeddings APIを使用してベクトル化
    // const queryVector = await generateEmbedding(query);
    // const similarArticles = await knowledgeService.searchSimilarArticles(queryVector, filters.limit);
    return {
        ...textResult,
        searchMethod: 'semantic'
    };
}
async function handleHybridSearch(query, filters) {
    // ハイブリッド検索の実装
    // テキスト検索とセマンティック検索の結果を組み合わせ
    const textResult = await knowledgeService.searchArticles({
        text: query,
        ...filters,
        limit: Math.ceil(filters.limit / 2)
    });
    const semanticResult = await handleSemanticSearch(query, {
        ...filters,
        limit: Math.ceil(filters.limit / 2)
    });
    // 重複を除去して結果をマージ
    const mergedArticles = mergeDuplicateArticles(textResult.articles, semanticResult.articles);
    return {
        articles: mergedArticles.slice(0, filters.limit),
        total: textResult.total + semanticResult.total,
        searchMethod: 'hybrid'
    };
}
function mergeDuplicateArticles(textArticles, semanticArticles) {
    const merged = [...textArticles];
    const existingIds = new Set(textArticles.map(article => article._id.toString()));
    for (const article of semanticArticles) {
        if (!existingIds.has(article._id.toString())) {
            merged.push(article);
            existingIds.add(article._id.toString());
        }
    }
    return merged;
}
// 将来的に実装予定のEmbedding生成関数
async function generateEmbedding(text) {
    // OpenAI Embeddings APIを使用してベクトル化
    // const response = await openai.embeddings.create({
    //   model: 'text-embedding-3-small',
    //   input: text
    // });
    // return response.data[0].embedding;
    // 現在は仮の実装
    return new Array(1536).fill(0).map(() => Math.random());
}
