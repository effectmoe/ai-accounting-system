"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
const server_1 = require("next/server");
const knowledge_service_1 = require("@/services/knowledge.service");
const structured_data_service_1 = require("@/services/structured-data.service");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
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
