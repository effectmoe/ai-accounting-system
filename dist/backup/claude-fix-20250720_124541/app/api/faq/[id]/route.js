"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const structured_data_service_1 = require("@/services/structured-data.service");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
// GET: FAQ詳細取得
async function GET(request, { params }) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const { id } = params;
        logger_1.logger.debug('[FAQ API] GET request for ID:', id);
        // Validate ObjectId
        if (!mongodb_1.ObjectId.isValid(id)) {
            logger_1.logger.error('[FAQ API] Invalid FAQ ID format:', id);
            return server_1.NextResponse.json({ success: false, error: 'Invalid FAQ ID format' }, { status: 400 });
        }
        await knowledgeService.connect();
        // 最初にfaq_articlesコレクションを確認
        const faqArticlesCollection = knowledgeService.db.collection('faq_articles');
        const faqArticle = await faqArticlesCollection.findOne({ _id: new mongodb_1.ObjectId(id) });
        if (faqArticle) {
            await knowledgeService.disconnect();
            return server_1.NextResponse.json({
                success: true,
                faq: {
                    id: faqArticle._id.toString(),
                    question: faqArticle.question,
                    answer: faqArticle.answer,
                    category: faqArticle.category,
                    subcategory: faqArticle.subcategory,
                    tags: faqArticle.tags,
                    difficulty: faqArticle.difficulty,
                    priority: faqArticle.priority,
                    status: faqArticle.status,
                    isPublished: faqArticle.isPublished,
                    isFeatured: faqArticle.isFeatured,
                    qualityMetrics: faqArticle.qualityMetrics,
                    usageStats: faqArticle.usageStats,
                    structuredData: faqArticle.structuredData,
                    searchKeywords: faqArticle.searchKeywords,
                    relatedFaqIds: faqArticle.relatedFaqIds,
                    createdAt: faqArticle.createdAt,
                    updatedAt: faqArticle.updatedAt,
                    publishedAt: faqArticle.publishedAt,
                    version: faqArticle.version
                }
            });
        }
        // faq_articlesで見つからない場合、旧faqコレクションも確認
        const simpleFaqCollection = knowledgeService.db.collection('faq');
        const simpleFaq = await simpleFaqCollection.findOne({ _id: new mongodb_1.ObjectId(id) });
        if (simpleFaq) {
            await knowledgeService.disconnect();
            // 旧形式を新形式に変換
            return server_1.NextResponse.json({
                success: true,
                faq: {
                    id: simpleFaq._id.toString(),
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
                    structuredData: {
                        contentType: 'general',
                        taxLaw: [],
                        applicableBusinessTypes: [],
                        relatedRegulations: [],
                        effectiveDate: new Date()
                    },
                    searchKeywords: [simpleFaq.question],
                    relatedFaqIds: [],
                    createdAt: simpleFaq.createdAt || simpleFaq.savedAt,
                    updatedAt: simpleFaq.savedAt,
                    publishedAt: simpleFaq.savedAt,
                    version: 1
                },
                isOldFormat: true // 旧形式であることを示すフラグ
            });
        }
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({ success: false, error: 'FAQ not found' }, { status: 404 });
    }
    catch (error) {
        logger_1.logger.error('[FAQ API] GET error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to get FAQ',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
// PUT: FAQ更新
async function PUT(request, { params }) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const { id } = params;
        const updateData = await request.json();
        logger_1.logger.debug('[FAQ API] PUT request for ID:', id);
        logger_1.logger.debug('[FAQ API] Update data keys:', Object.keys(updateData));
        // Validate ObjectId
        if (!mongodb_1.ObjectId.isValid(id)) {
            logger_1.logger.error('[FAQ API] Invalid FAQ ID format:', id);
            return server_1.NextResponse.json({ success: false, error: 'Invalid FAQ ID format' }, { status: 400 });
        }
        await knowledgeService.connect();
        const faqArticlesCollection = knowledgeService.db.collection('faq_articles');
        const objectId = new mongodb_1.ObjectId(id);
        // 現在のFAQを取得（バージョン管理のため）
        let currentFaq = await faqArticlesCollection.findOne({ _id: objectId });
        // faq_articlesで見つからない場合、旧faqコレクションを確認
        if (!currentFaq) {
            logger_1.logger.debug('[FAQ API] FAQ not found in faq_articles, checking old faq collection');
            const simpleFaqCollection = knowledgeService.db.collection('faq');
            const simpleFaq = await simpleFaqCollection.findOne({ _id: objectId });
            if (simpleFaq) {
                logger_1.logger.debug('[FAQ API] Found FAQ in old collection, converting to new format');
                // 旧形式から新形式に変換して保存
                const newFaqArticle = {
                    question: updateData.question || simpleFaq.question,
                    answer: updateData.answer || simpleFaq.answer,
                    category: updateData.category || simpleFaq.category || 'tax-accounting',
                    subcategory: updateData.subcategory || '',
                    tags: updateData.tags || simpleFaq.tags || ['ai-generated'],
                    difficulty: updateData.difficulty || 'intermediate',
                    priority: updateData.priority || 5,
                    structuredData: updateData.structuredData || {
                        contentType: 'general',
                        taxLaw: [],
                        applicableBusinessTypes: [],
                        relatedRegulations: [],
                        effectiveDate: new Date()
                    },
                    sourceInfo: {
                        generatedBy: 'migration',
                        generatedAt: new Date(),
                        originalSource: 'faq',
                        originalId: simpleFaq._id
                    },
                    qualityMetrics: updateData.qualityMetrics || {
                        accuracy: 85,
                        completeness: 85,
                        clarity: 85,
                        usefulness: 85,
                        overallScore: 85
                    },
                    usageStats: updateData.usageStats || {
                        viewCount: 0,
                        helpfulVotes: 0,
                        unhelpfulVotes: 0,
                        relatedQuestions: []
                    },
                    status: updateData.status || 'published',
                    isPublished: updateData.isPublished !== undefined ? updateData.isPublished : true,
                    isFeatured: updateData.isFeatured || false,
                    version: 1,
                    previousVersions: [],
                    searchKeywords: updateData.searchKeywords || [simpleFaq.question, ...(simpleFaq.tags || [])],
                    relatedFaqIds: updateData.relatedFaqIds || [],
                    createdAt: simpleFaq.createdAt || simpleFaq.savedAt,
                    updatedAt: new Date(),
                    publishedAt: simpleFaq.savedAt
                };
                // 新形式で保存
                const insertResult = await faqArticlesCollection.insertOne({
                    ...newFaqArticle,
                    _id: objectId
                });
                // 旧形式を削除
                await simpleFaqCollection.deleteOne({ _id: objectId });
                logger_1.logger.debug('[FAQ API] Successfully migrated FAQ to new format');
                // 構造化データを生成
                try {
                    const structuredDataService = new structured_data_service_1.StructuredDataService();
                    const faqWithId = { ...newFaqArticle, _id: objectId };
                    const structuredResult = await structuredDataService.generateStructuredData(faqWithId, 'FAQPage', {
                        includeCompanyInfo: false,
                        includeCustomerInfo: false,
                        includeTaxInfo: false,
                        includeLineItems: false,
                        language: 'ja',
                        context: 'https://schema.org'
                    });
                    if (structuredResult.success && structuredResult.data) {
                        await structuredDataService.saveStructuredData(objectId, 'faq', 'FAQPage', structuredResult.data, {
                            isValid: structuredResult.success,
                            errors: structuredResult.errors || [],
                            warnings: structuredResult.warnings
                        }, structuredResult.metadata || {});
                    }
                    await structuredDataService.close();
                }
                catch (structuredError) {
                    logger_1.logger.error('[FAQ API] Failed to generate structured data:', structuredError);
                }
                await knowledgeService.disconnect();
                return server_1.NextResponse.json({
                    success: true,
                    message: 'FAQ migrated to new format and updated successfully'
                });
            }
            await knowledgeService.disconnect();
            return server_1.NextResponse.json({ success: false, error: 'FAQ not found' }, { status: 404 });
        }
        // 既存のfaq_articlesの更新
        const updateDoc = {
            ...updateData,
            version: (currentFaq.version || 1) + 1,
            updatedAt: new Date(),
            publishedAt: updateData.isPublished && !currentFaq.isPublished ? new Date() : currentFaq.publishedAt
        };
        // IDフィールドを削除（MongoDBの_idフィールドは更新できないため）
        delete updateDoc.id;
        delete updateDoc._id;
        // 品質メトリクスの総合スコアを再計算
        if (updateDoc.qualityMetrics) {
            const metrics = updateDoc.qualityMetrics;
            metrics.overallScore = Math.round((metrics.accuracy + metrics.completeness + metrics.clarity + metrics.usefulness) / 4);
        }
        const result = await faqArticlesCollection.updateOne({ _id: objectId }, { $set: updateDoc });
        // 構造化データを再生成
        if (result.modifiedCount > 0) {
            try {
                const structuredDataService = new structured_data_service_1.StructuredDataService();
                const updatedFaq = await faqArticlesCollection.findOne({ _id: objectId });
                if (updatedFaq) {
                    const structuredResult = await structuredDataService.generateStructuredData(updatedFaq, 'FAQPage', {
                        includeCompanyInfo: false,
                        includeCustomerInfo: false,
                        includeTaxInfo: false,
                        includeLineItems: false,
                        language: 'ja',
                        context: 'https://schema.org'
                    });
                    if (structuredResult.success && structuredResult.data) {
                        await structuredDataService.saveStructuredData(objectId, 'faq', 'FAQPage', structuredResult.data, {
                            isValid: structuredResult.success,
                            errors: structuredResult.errors || [],
                            warnings: structuredResult.warnings
                        }, structuredResult.metadata || {});
                    }
                }
                await structuredDataService.close();
            }
            catch (structuredError) {
                logger_1.logger.error('[FAQ API] Failed to update structured data:', structuredError);
            }
        }
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: true,
            message: 'FAQ updated successfully',
            modifiedCount: result.modifiedCount
        });
    }
    catch (error) {
        logger_1.logger.error('[FAQ API] PUT error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: 'Failed to update FAQ',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
// DELETE: FAQ削除（既存の削除処理を移動）
async function DELETE(request, { params }) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        const { id } = params;
        logger_1.logger.debug('[FAQ Delete API] Starting deletion for ID:', id);
        // Validate ObjectId
        if (!mongodb_1.ObjectId.isValid(id)) {
            logger_1.logger.error('[FAQ Delete API] Invalid FAQ ID format:', id);
            return server_1.NextResponse.json({ success: false, error: 'Invalid FAQ ID format' }, { status: 400 });
        }
        await knowledgeService.connect();
        // Delete from faq_articles collection
        const faqArticlesResult = await knowledgeService.db.collection('faq_articles').deleteOne({
            _id: new mongodb_1.ObjectId(id)
        });
        logger_1.logger.debug('[FAQ Delete API] FAQ articles deletion result:', faqArticlesResult);
        // Also try to delete from old faq collection
        const faqResult = await knowledgeService.db.collection('faq').deleteOne({
            _id: new mongodb_1.ObjectId(id)
        });
        logger_1.logger.debug('[FAQ Delete API] FAQ deletion result:', faqResult);
        // Delete associated structured data
        try {
            const structuredDataService = new structured_data_service_1.StructuredDataService();
            const structuredDataCollection = structuredDataService.db.collection('structuredData');
            const structuredDataResult = await structuredDataCollection.deleteMany({
                sourceId: new mongodb_1.ObjectId(id),
                sourceType: 'faq'
            });
            logger_1.logger.debug('[FAQ Delete API] Structured data deletion result:', structuredDataResult);
            await structuredDataService.close();
        }
        catch (structuredError) {
            logger_1.logger.error('[FAQ Delete API] Error deleting structured data:', structuredError);
            // Continue with FAQ deletion even if structured data deletion fails
        }
        await knowledgeService.disconnect();
        if (faqArticlesResult.deletedCount === 0 && faqResult.deletedCount === 0) {
            logger_1.logger.warn('[FAQ Delete API] FAQ not found with ID:', id);
            return server_1.NextResponse.json({ success: false, error: 'FAQ not found' }, { status: 404 });
        }
        logger_1.logger.debug('[FAQ Delete API] Successfully deleted FAQ and associated data');
        return server_1.NextResponse.json({
            success: true,
            deletedFaqArticle: faqArticlesResult.deletedCount,
            deletedFaq: faqResult.deletedCount
        });
    }
    catch (error) {
        logger_1.logger.error('[FAQ Delete API] Error deleting FAQ:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete FAQ'
        }, { status: 500 });
    }
}
