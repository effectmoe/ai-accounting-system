"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const body = await request.json();
        await knowledgeService.connect();
        const collection = knowledgeService.db.collection('faq_articles');
        // 複雑な検索クエリを構築
        const query = {};
        const andConditions = [];
        // テキスト検索
        if (body.query) {
            const searchRegex = new RegExp(body.query, 'i');
            andConditions.push({
                $or: [
                    { question: searchRegex },
                    { answer: searchRegex },
                    { tags: searchRegex },
                    { searchKeywords: searchRegex },
                    { 'structuredData.taxLaw': searchRegex },
                    { 'structuredData.applicableBusinessTypes': searchRegex }
                ]
            });
        }
        // カテゴリフィルター
        if (body.categories && body.categories.length > 0) {
            andConditions.push({ category: { $in: body.categories } });
        }
        // タグフィルター
        if (body.tags && body.tags.length > 0) {
            andConditions.push({ tags: { $in: body.tags } });
        }
        // 難易度フィルター
        if (body.difficulties && body.difficulties.length > 0) {
            andConditions.push({ difficulty: { $in: body.difficulties } });
        }
        // コンテンツタイプフィルター
        if (body.contentTypes && body.contentTypes.length > 0) {
            andConditions.push({ 'structuredData.contentType': { $in: body.contentTypes } });
        }
        // 税法フィルター
        if (body.taxLaws && body.taxLaws.length > 0) {
            andConditions.push({ 'structuredData.taxLaw': { $in: body.taxLaws } });
        }
        // 業種フィルター
        if (body.businessTypes && body.businessTypes.length > 0) {
            andConditions.push({ 'structuredData.applicableBusinessTypes': { $in: body.businessTypes } });
        }
        // 品質スコアフィルター
        if (body.qualityScoreMin !== undefined || body.qualityScoreMax !== undefined) {
            const qualityCondition = {};
            if (body.qualityScoreMin !== undefined) {
                qualityCondition.$gte = body.qualityScoreMin;
            }
            if (body.qualityScoreMax !== undefined) {
                qualityCondition.$lte = body.qualityScoreMax;
            }
            andConditions.push({ 'qualityMetrics.overallScore': qualityCondition });
        }
        // 日付フィルター
        if (body.dateFrom || body.dateTo) {
            const dateCondition = {};
            if (body.dateFrom) {
                dateCondition.$gte = new Date(body.dateFrom);
            }
            if (body.dateTo) {
                dateCondition.$lte = new Date(body.dateTo);
            }
            andConditions.push({ createdAt: dateCondition });
        }
        // ステータスフィルター
        if (body.status && body.status.length > 0) {
            andConditions.push({ status: { $in: body.status } });
        }
        else {
            // デフォルトは公開済みのみ
            andConditions.push({ status: 'published', isPublished: true });
        }
        // 最終的なクエリを構築
        if (andConditions.length > 0) {
            query.$and = andConditions;
        }
        // ソート条件
        let sort = {};
        switch (body.sortBy) {
            case 'date':
                sort.createdAt = body.sortOrder === 'asc' ? 1 : -1;
                break;
            case 'popularity':
                sort['usageStats.viewCount'] = body.sortOrder === 'asc' ? 1 : -1;
                break;
            case 'quality':
                sort['qualityMetrics.overallScore'] = body.sortOrder === 'asc' ? 1 : -1;
                break;
            case 'relevance':
            default:
                // テキスト検索がある場合は、テキストスコアでソート
                if (body.query) {
                    sort.score = { $meta: 'textScore' };
                }
                else {
                    sort.priority = -1;
                    sort.createdAt = -1;
                }
        }
        // 検索実行
        const totalCount = await collection.countDocuments(query);
        let cursor = collection.find(query);
        // テキストスコアを含める
        if (body.query && body.sortBy === 'relevance') {
            cursor = cursor.project({ score: { $meta: 'textScore' } });
        }
        const results = await cursor
            .sort(sort)
            .skip(body.offset || 0)
            .limit(body.limit || 20)
            .toArray();
        // 集計情報を取得
        const aggregations = await collection.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    categories: { $addToSet: '$category' },
                    tags: { $addToSet: '$tags' },
                    difficulties: { $addToSet: '$difficulty' },
                    contentTypes: { $addToSet: '$structuredData.contentType' },
                    avgQualityScore: { $avg: '$qualityMetrics.overallScore' },
                    totalViews: { $sum: '$usageStats.viewCount' }
                }
            }
        ]).toArray();
        const agg = aggregations[0] || {};
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: true,
            results: results.map(faq => ({
                id: faq._id.toString(),
                question: faq.question,
                answer: faq.answer,
                category: faq.category,
                tags: faq.tags,
                difficulty: faq.difficulty,
                structuredData: faq.structuredData,
                qualityMetrics: faq.qualityMetrics,
                usageStats: faq.usageStats,
                createdAt: faq.createdAt,
                relevanceScore: faq.score
            })),
            pagination: {
                total: totalCount,
                limit: body.limit || 20,
                offset: body.offset || 0,
                hasMore: (body.offset || 0) + (body.limit || 20) < totalCount
            },
            aggregations: {
                categories: agg.categories || [],
                tags: agg.tags ? agg.tags.flat().filter((tag, index, self) => self.indexOf(tag) === index) : [],
                difficulties: agg.difficulties || [],
                contentTypes: agg.contentTypes || [],
                avgQualityScore: Math.round(agg.avgQualityScore || 0),
                totalViews: agg.totalViews || 0
            }
        });
    }
    catch (error) {
        logger_1.logger.error('[FAQ Advanced Search API] Error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: 'Search failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
