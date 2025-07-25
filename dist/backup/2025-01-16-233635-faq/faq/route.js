"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const structured_data_service_1 = require("@/services/structured-data.service");
const mongodb_1 = require("mongodb");
async function GET(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const { searchParams } = new URL(request.url);
        const includeStructuredData = searchParams.get('includeStructuredData') === 'true';
        const searchRequest = {
            query: searchParams.get('query') || undefined,
            category: searchParams.get('category') || undefined,
            tags: searchParams.get('tags')?.split(',') || undefined,
            difficulty: searchParams.get('difficulty') || undefined,
            status: searchParams.get('status') || 'published',
            limit: parseInt(searchParams.get('limit') || '20'),
            offset: parseInt(searchParams.get('offset') || '0'),
            sortBy: searchParams.get('sortBy') || 'popularity',
            sortOrder: searchParams.get('sortOrder') || 'desc'
        };
        await knowledgeService.connect();
        // 両方のコレクションを確認
        const faqArticlesCollection = knowledgeService.db.collection('faq_articles');
        const simpleFaqCollection = knowledgeService.db.collection('faq');
        // 検索条件を構築
        const filter = {};
        if (searchRequest.status) {
            filter.status = searchRequest.status;
        }
        if (searchRequest.category) {
            filter.category = searchRequest.category;
        }
        if (searchRequest.tags && searchRequest.tags.length > 0) {
            filter.tags = { $in: searchRequest.tags };
        }
        if (searchRequest.difficulty) {
            filter.difficulty = searchRequest.difficulty;
        }
        if (searchRequest.query) {
            filter.$or = [
                { question: { $regex: searchRequest.query, $options: 'i' } },
                { answer: { $regex: searchRequest.query, $options: 'i' } },
                { tags: { $regex: searchRequest.query, $options: 'i' } },
                { searchKeywords: { $regex: searchRequest.query, $options: 'i' } }
            ];
        }
        // ソート条件を構築
        let sort = {};
        switch (searchRequest.sortBy) {
            case 'date':
                sort.createdAt = searchRequest.sortOrder === 'asc' ? 1 : -1;
                break;
            case 'popularity':
                sort['usageStats.viewCount'] = searchRequest.sortOrder === 'asc' ? 1 : -1;
                break;
            case 'quality':
                sort['qualityMetrics.overallScore'] = searchRequest.sortOrder === 'asc' ? 1 : -1;
                break;
            default:
                sort.priority = -1; // デフォルトは優先度順
                sort.createdAt = -1;
        }
        // FAQを検索（faq_articlesコレクション）
        const faqArticles = await faqArticlesCollection
            .find(filter)
            .sort(sort)
            .skip(searchRequest.offset || 0)
            .limit(searchRequest.limit || 20)
            .toArray();
        // シンプルFAQも取得（faqコレクション）
        const simpleFaqs = await simpleFaqCollection
            .find({ status: 'active' })
            .sort({ savedAt: -1 })
            .limit(20)
            .toArray();
        // 結果を統合
        const allFaqs = [...faqArticles];
        // シンプルFAQを変換して追加
        for (const simpleFaq of simpleFaqs) {
            allFaqs.push({
                _id: simpleFaq._id,
                question: simpleFaq.question,
                answer: simpleFaq.answer,
                category: simpleFaq.category || 'tax-accounting',
                subcategory: '',
                tags: simpleFaq.tags || ['ai-generated'],
                difficulty: 'intermediate',
                priority: 5,
                status: 'published',
                isPublished: true,
                isFeatured: false,
                qualityMetrics: {
                    accuracy: 85,
                    completeness: 85,
                    clarity: 85,
                    usefulness: 85,
                    overallScore: 85
                },
                usageStats: {
                    viewCount: 0,
                    helpfulVotes: 0,
                    unhelpfulVotes: 0,
                    relatedQuestions: []
                },
                createdAt: simpleFaq.createdAt || simpleFaq.savedAt,
                updatedAt: simpleFaq.savedAt,
                publishedAt: simpleFaq.savedAt
            });
        }
        // 総件数を取得
        const faqArticlesCount = await faqArticlesCollection.countDocuments(filter);
        const simpleFaqsCount = await simpleFaqCollection.countDocuments({ status: 'active' });
        const totalCount = faqArticlesCount + simpleFaqsCount;
        // 構造化データを取得（必要な場合）
        let structuredDataMap = new Map();
        if (includeStructuredData && allFaqs.length > 0) {
            try {
                const structuredDataService = new structured_data_service_1.StructuredDataService();
                const faqIds = allFaqs.map(faq => faq._id);
                for (const faqId of faqIds) {
                    const structuredData = await structuredDataService.getStructuredData(faqId, 'faq');
                    if (structuredData.length > 0) {
                        structuredDataMap.set(faqId.toString(), structuredData[0].jsonLd);
                    }
                }
                await structuredDataService.close();
            }
            catch (structuredError) {
                console.error('Failed to get structured data for FAQs:', structuredError);
                // 構造化データ取得エラーは検索結果を停止しない
            }
        }
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: true,
            faqs: allFaqs.map(faq => ({
                id: faq._id.toString(),
                question: faq.question,
                answer: faq.answer,
                category: faq.category,
                subcategory: faq.subcategory,
                tags: faq.tags,
                difficulty: faq.difficulty,
                priority: faq.priority,
                status: faq.status,
                isPublished: faq.isPublished,
                isFeatured: faq.isFeatured,
                qualityScore: faq.qualityMetrics.overallScore,
                viewCount: faq.usageStats.viewCount,
                helpfulVotes: faq.usageStats.helpfulVotes,
                unhelpfulVotes: faq.usageStats.unhelpfulVotes,
                createdAt: faq.createdAt,
                updatedAt: faq.updatedAt,
                publishedAt: faq.publishedAt,
                structuredData: includeStructuredData ? structuredDataMap.get(faq._id.toString()) : undefined
            })),
            pagination: {
                total: totalCount,
                limit: searchRequest.limit,
                offset: searchRequest.offset,
                hasMore: (searchRequest.offset || 0) + (searchRequest.limit || 20) < totalCount
            }
        });
    }
    catch (error) {
        console.error('[FAQ API] Search error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to search FAQs',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function POST(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const body = await request.json();
        const { question, answer, category, subcategory, tags, difficulty, priority = 5, contentType, isPublished = false, isFeatured = false } = body;
        // 必須フィールドのバリデーション
        if (!question || !answer || !category || !tags || !difficulty || !contentType) {
            return server_1.NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
        }
        await knowledgeService.connect();
        // FAQ記事を作成
        const faqArticle = {
            question,
            answer,
            category,
            subcategory,
            tags,
            difficulty,
            priority,
            structuredData: {
                contentType,
                taxLaw: [],
                applicableBusinessTypes: [],
                relatedRegulations: [],
                effectiveDate: new Date()
            },
            sourceInfo: {
                generatedBy: 'manual',
                generatedAt: new Date()
            },
            qualityMetrics: {
                accuracy: 90,
                completeness: 85,
                clarity: 88,
                usefulness: 87,
                overallScore: 88
            },
            usageStats: {
                viewCount: 0,
                helpfulVotes: 0,
                unhelpfulVotes: 0,
                relatedQuestions: []
            },
            status: isPublished ? 'published' : 'draft',
            isPublished,
            isFeatured,
            version: 1,
            previousVersions: [],
            searchKeywords: [question, ...tags],
            relatedFaqIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            publishedAt: isPublished ? new Date() : undefined
        };
        const collection = knowledgeService.db.collection('faq_articles');
        const result = await collection.insertOne(faqArticle);
        // 構造化データを生成して保存
        try {
            const structuredDataService = new structured_data_service_1.StructuredDataService();
            const faqWithId = { ...faqArticle, _id: result.insertedId };
            const structuredResult = await structuredDataService.generateStructuredData(faqWithId, 'FAQPage', {
                includeCompanyInfo: false,
                includeCustomerInfo: false,
                includeTaxInfo: false,
                includeLineItems: false,
                language: 'ja',
                context: 'https://schema.org'
            });
            if (structuredResult.success && structuredResult.data) {
                await structuredDataService.saveStructuredData(result.insertedId, 'faq', 'FAQPage', structuredResult.data, {
                    isValid: structuredResult.success,
                    errors: structuredResult.errors || [],
                    warnings: structuredResult.warnings
                }, structuredResult.metadata || {});
                console.log('Structured data generated for FAQ:', result.insertedId);
            }
            await structuredDataService.close();
        }
        catch (structuredError) {
            console.error('Failed to generate structured data for FAQ:', structuredError);
            // 構造化データの生成エラーはFAQ作成を停止しない
        }
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: true,
            faqId: result.insertedId.toString(),
            message: 'FAQ article created successfully'
        });
    }
    catch (error) {
        console.error('[FAQ API] Create error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to create FAQ',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function PUT(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const body = await request.json();
        const { id, ...updateData } = body;
        if (!id) {
            return server_1.NextResponse.json({ error: 'FAQ ID is required' }, { status: 400 });
        }
        await knowledgeService.connect();
        const collection = knowledgeService.db.collection('faq_articles');
        // バージョン管理のために現在のFAQを取得
        const currentFaq = await collection.findOne({ _id: new mongodb_1.ObjectId(id) });
        if (!currentFaq) {
            return server_1.NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }
        // 更新データを準備
        const updateDoc = {
            ...updateData,
            version: currentFaq.version + 1,
            updatedAt: new Date(),
            publishedAt: updateData.isPublished && !currentFaq.isPublished ? new Date() : currentFaq.publishedAt
        };
        const result = await collection.updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: updateDoc });
        await knowledgeService.disconnect();
        if (result.matchedCount === 0) {
            return server_1.NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'FAQ updated successfully'
        });
    }
    catch (error) {
        console.error('[FAQ API] Update error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to update FAQ',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function DELETE(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
            return server_1.NextResponse.json({ error: 'FAQ ID is required' }, { status: 400 });
        }
        await knowledgeService.connect();
        const collection = knowledgeService.db.collection('faq_articles');
        const result = await collection.deleteOne({ _id: new mongodb_1.ObjectId(id) });
        await knowledgeService.disconnect();
        if (result.deletedCount === 0) {
            return server_1.NextResponse.json({ error: 'FAQ not found' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'FAQ deleted successfully'
        });
    }
    catch (error) {
        console.error('[FAQ API] Delete error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to delete FAQ',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
