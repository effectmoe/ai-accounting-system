"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const embeddings_1 = require("@/lib/embeddings");
const logger_1 = require("@/lib/logger");
/**
 * POST /api/vector-search
 * MongoDB Atlas Vector Searchを使用したセマンティック検索
 */
async function POST(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const body = await request.json();
        const { query, collections = ['faq_articles', 'knowledgeArticles'], limit = 10, threshold = 0.7, includeMetadata = false } = body;
        if (!query?.trim()) {
            return server_1.NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
        }
        await knowledgeService.connect();
        // 1. クエリの埋め込みを生成
        logger_1.logger.debug('Generating embeddings for query:', query);
        const embeddingsService = (0, embeddings_1.getEmbeddingsService)();
        const queryEmbedding = await embeddingsService.generateEmbedding(query);
        const results = [];
        // 2. 各コレクションでVector Search実行
        for (const collectionName of collections) {
            try {
                logger_1.logger.debug(`Searching in collection: ${collectionName}`);
                const collection = knowledgeService.db.collection(collectionName);
                // Vector Search pipeline
                const pipeline = [
                    {
                        $vectorSearch: {
                            index: "vector_index", // MongoDB Atlasで作成したインデックス名
                            path: "embeddings",
                            queryVector: queryEmbedding.embedding,
                            numCandidates: limit * 10, // 候補数を多めに設定
                            limit: limit
                        }
                    },
                    {
                        $addFields: {
                            score: { $meta: "vectorSearchScore" }
                        }
                    },
                    {
                        $match: {
                            score: { $gte: threshold } // 閾値でフィルタリング
                        }
                    }
                ];
                // コレクション固有の投影を追加
                if (collectionName === 'faq_articles') {
                    pipeline.push({
                        $project: {
                            question: 1,
                            answer: 1,
                            category: 1,
                            tags: 1,
                            score: 1,
                            ...(includeMetadata && {
                                qualityMetrics: 1,
                                usageStats: 1,
                                createdAt: 1,
                                updatedAt: 1
                            })
                        }
                    });
                }
                else if (collectionName === 'knowledgeArticles') {
                    pipeline.push({
                        $project: {
                            title: 1,
                            content: 1,
                            excerpt: 1,
                            sourceUrl: 1,
                            tags: 1,
                            categories: 1,
                            score: 1,
                            ...(includeMetadata && {
                                qualityScore: 1,
                                isVerified: 1,
                                metadata: 1,
                                createdAt: 1,
                                updatedAt: 1
                            })
                        }
                    });
                }
                const searchResults = await collection.aggregate(pipeline).toArray();
                // 結果を統一フォーマットに変換
                const formattedResults = searchResults.map(doc => {
                    let content = '';
                    let title = '';
                    if (collectionName === 'faq_articles') {
                        content = `Q: ${doc.question}\nA: ${doc.answer}`;
                        title = doc.question;
                    }
                    else if (collectionName === 'knowledgeArticles') {
                        content = doc.content || doc.excerpt || '';
                        title = doc.title || '';
                    }
                    return {
                        id: doc._id.toString(),
                        collection: collectionName,
                        content,
                        title,
                        score: doc.score,
                        ...(includeMetadata && { metadata: doc })
                    };
                });
                results.push(...formattedResults);
                logger_1.logger.debug(`Found ${formattedResults.length} results in ${collectionName}`);
            }
            catch (collectionError) {
                logger_1.logger.error(`Error searching ${collectionName}:`, collectionError);
                // 個別コレクションのエラーは無視して続行
            }
        }
        // 3. 結果をスコア順にソート
        results.sort((a, b) => b.score - a.score);
        // 4. レスポンス生成
        const response = {
            success: true,
            results: results.slice(0, limit),
            query: {
                embedding: queryEmbedding.embedding,
                originalText: query,
                processingTime: 0 // TODO: 実際の処理時間を計測
            }
        };
        // 5. 結果が少ない場合の提案生成
        if (results.length < 3) {
            response.suggestions = [
                '質問をより具体的にしてみてください',
                '別の言葉で表現してみてください',
                'カテゴリやタグで絞り込んでみてください'
            ];
        }
        await knowledgeService.disconnect();
        return server_1.NextResponse.json(response);
    }
    catch (error) {
        logger_1.logger.error('Vector search error:', error);
        await knowledgeService.disconnect();
        let errorMessage = 'Vector search failed';
        let suggestions = [];
        if (error instanceof Error) {
            if (error.message.includes('index')) {
                errorMessage = 'Vector search index not configured';
                suggestions = [
                    'MongoDB Atlas Vector Search インデックスを作成してください',
                    'インデックス名が "vector_index" であることを確認してください',
                    'embeddings フィールドにVector Searchが設定されていることを確認してください'
                ];
            }
            else if (error.message.includes('embeddings')) {
                errorMessage = 'Failed to generate query embeddings';
                suggestions = [
                    'OPENAI_API_KEY が正しく設定されているか確認してください',
                    'インターネット接続を確認してください'
                ];
            }
            else {
                errorMessage = error.message;
            }
        }
        return server_1.NextResponse.json({
            success: false,
            error: errorMessage,
            suggestions
        }, { status: 500 });
    }
}
/**
 * GET /api/vector-search
 * Vector Search設定状況の確認
 */
async function GET(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        await knowledgeService.connect();
        const collections = ['faq_articles', 'knowledgeArticles'];
        const status = {
            atlasConnection: true,
            collections: {},
            recommendations: []
        };
        for (const collectionName of collections) {
            const collection = knowledgeService.db.collection(collectionName);
            const docCount = await collection.countDocuments();
            const sampleDoc = await collection.findOne();
            const hasEmbeddings = sampleDoc?.embeddings ? true : false;
            const embeddingDimensions = hasEmbeddings ? sampleDoc.embeddings.length : 0;
            status.collections[collectionName] = {
                documentCount: docCount,
                hasEmbeddings,
                embeddingDimensions,
                sampleFields: sampleDoc ? Object.keys(sampleDoc) : []
            };
            if (!hasEmbeddings && docCount > 0) {
                status.recommendations.push(`${collectionName}: embeddings フィールドを追加してください`);
            }
        }
        // Embeddings Service の状態確認
        try {
            const embeddingsService = (0, embeddings_1.getEmbeddingsService)();
            const modelInfo = embeddingsService.getModelInfo();
            status.embeddingsService = {
                available: true,
                model: modelInfo.model,
                dimensions: modelInfo.dimensions,
                maxTokens: modelInfo.maxTokens
            };
        }
        catch (embeddingError) {
            status.embeddingsService = {
                available: false,
                error: embeddingError instanceof Error ? embeddingError.message : 'Unknown error'
            };
        }
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: true,
            status
        });
    }
    catch (error) {
        logger_1.logger.error('Vector search status check error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Status check failed'
        }, { status: 500 });
    }
}
