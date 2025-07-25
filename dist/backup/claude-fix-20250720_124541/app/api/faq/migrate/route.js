"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const structured_data_service_1 = require("@/services/structured-data.service");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    const knowledgeService = new knowledge_service_1.KnowledgeService();
    try {
        await knowledgeService.connect();
        // 既存のfaqコレクションからデータを取得
        const simpleFaqCollection = knowledgeService.db.collection('faq');
        const faqArticlesCollection = knowledgeService.db.collection('faq_articles');
        const simpleFaqs = await simpleFaqCollection
            .find({ status: 'active' })
            .toArray();
        logger_1.logger.debug(`[FAQ Migration] Found ${simpleFaqs.length} FAQs to migrate`);
        let migratedCount = 0;
        let failedCount = 0;
        const errors = [];
        for (const simpleFaq of simpleFaqs) {
            try {
                // 既に移行済みかチェック
                const existing = await faqArticlesCollection.findOne({
                    $or: [
                        { 'sourceInfo.chatMessageId': simpleFaq.sourceMessageId },
                        { question: simpleFaq.question }
                    ]
                });
                if (existing) {
                    logger_1.logger.debug(`[FAQ Migration] FAQ already migrated: ${simpleFaq.question}`);
                    continue;
                }
                // FaqArticle形式に変換
                const faqArticle = {
                    question: simpleFaq.question,
                    answer: simpleFaq.answer,
                    category: simpleFaq.category || 'tax-accounting',
                    subcategory: '',
                    tags: simpleFaq.tags || ['ai-generated', 'migrated'],
                    difficulty: 'intermediate',
                    priority: 5,
                    structuredData: {
                        contentType: mapCategoryToContentType(simpleFaq.category),
                        taxLaw: extractTaxLaws(simpleFaq.answer),
                        applicableBusinessTypes: ['general'],
                        relatedRegulations: [],
                        effectiveDate: new Date()
                    },
                    sourceInfo: {
                        chatSessionId: simpleFaq.sessionId,
                        chatMessageId: simpleFaq.sourceMessageId,
                        originalQuestion: simpleFaq.originalQuestion || simpleFaq.question,
                        generatedBy: 'chat',
                        generatedAt: simpleFaq.createdAt || simpleFaq.savedAt,
                        verifiedBy: 'migration',
                        verifiedAt: new Date()
                    },
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
                    status: 'published',
                    isPublished: true,
                    isFeatured: false,
                    version: 1,
                    previousVersions: [],
                    searchKeywords: extractKeywords(simpleFaq.question, simpleFaq.answer),
                    relatedFaqIds: [],
                    createdAt: simpleFaq.createdAt || simpleFaq.savedAt,
                    updatedAt: new Date(),
                    publishedAt: simpleFaq.savedAt
                };
                // faq_articlesコレクションに挿入
                const result = await faqArticlesCollection.insertOne(faqArticle);
                // 構造化データを生成
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
                    }
                    await structuredDataService.close();
                }
                catch (structuredError) {
                    logger_1.logger.error(`Failed to generate structured data for migrated FAQ:`, structuredError);
                }
                // 元のFAQを非アクティブに更新
                await simpleFaqCollection.updateOne({ _id: simpleFaq._id }, {
                    $set: {
                        status: 'migrated',
                        migratedAt: new Date(),
                        migratedToId: result.insertedId.toString()
                    }
                });
                migratedCount++;
                logger_1.logger.debug(`[FAQ Migration] Successfully migrated: ${simpleFaq.question}`);
            }
            catch (error) {
                failedCount++;
                const errorMessage = `Failed to migrate FAQ "${simpleFaq.question}": ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(errorMessage);
                logger_1.logger.error(`[FAQ Migration] ${errorMessage}`);
            }
        }
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: true,
            migratedCount,
            failedCount,
            totalProcessed: simpleFaqs.length,
            errors: errors.length > 0 ? errors : undefined,
            message: `移行完了: ${migratedCount}件成功, ${failedCount}件失敗`
        });
    }
    catch (error) {
        logger_1.logger.error('[FAQ Migration] Error:', error);
        await knowledgeService.disconnect();
        return server_1.NextResponse.json({
            success: false,
            error: 'Migration failed',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
// カテゴリをコンテンツタイプにマッピング
function mapCategoryToContentType(category) {
    if (!category)
        return 'general';
    const mapping = {
        'tax': 'tax',
        'tax-accounting': 'tax',
        'accounting': 'accounting',
        'invoice': 'invoice',
        'compliance': 'compliance',
        'procedure': 'procedure'
    };
    return mapping[category.toLowerCase()] || 'general';
}
// 回答から税法を抽出
function extractTaxLaws(answer) {
    const taxLaws = [];
    const patterns = [
        /法人税法/g,
        /所得税法/g,
        /消費税法/g,
        /相続税法/g,
        /印紙税法/g,
        /地方税法/g,
        /国税通則法/g,
        /租税特別措置法/g
    ];
    patterns.forEach(pattern => {
        const matches = answer.match(pattern);
        if (matches) {
            matches.forEach(match => {
                if (!taxLaws.includes(match)) {
                    taxLaws.push(match);
                }
            });
        }
    });
    return taxLaws;
}
// 質問と回答からキーワードを抽出
function extractKeywords(question, answer) {
    const keywords = [];
    const text = question + ' ' + answer;
    // 重要なキーワードパターン
    const patterns = [
        /確定申告/g,
        /年末調整/g,
        /源泉徴収/g,
        /青色申告/g,
        /白色申告/g,
        /減価償却/g,
        /経費/g,
        /控除/g,
        /税額/g,
        /納税/g,
        /申告/g,
        /決算/g,
        /仕訳/g,
        /勘定科目/g,
        /請求書/g,
        /領収書/g,
        /インボイス/g,
        /電子帳簿/g
    ];
    patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) {
            matches.forEach(match => {
                if (!keywords.includes(match)) {
                    keywords.push(match);
                }
            });
        }
    });
    return keywords;
}
