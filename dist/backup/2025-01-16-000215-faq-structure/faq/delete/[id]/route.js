"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
const server_1 = require("next/server");
const mongodb_1 = __importDefault(require("@/lib/mongodb"));
const mongodb_2 = require("mongodb");
async function DELETE(request, { params }) {
    try {
        const { id } = params;
        console.log('[FAQ Delete API] Starting deletion for ID:', id);
        // Validate ObjectId
        if (!mongodb_2.ObjectId.isValid(id)) {
            console.error('[FAQ Delete API] Invalid FAQ ID format:', id);
            return server_1.NextResponse.json({ success: false, error: 'Invalid FAQ ID format' }, { status: 400 });
        }
        const client = await mongodb_1.default;
        const db = client.db('accounting-app');
        // Delete from faq collection
        const faqResult = await db.collection('faq').deleteOne({
            _id: new mongodb_2.ObjectId(id)
        });
        console.log('[FAQ Delete API] FAQ deletion result:', faqResult);
        // Delete from faq_articles collection
        const articleResult = await db.collection('faq_articles').deleteOne({
            faqId: id
        });
        console.log('[FAQ Delete API] FAQ article deletion result:', articleResult);
        if (faqResult.deletedCount === 0) {
            console.warn('[FAQ Delete API] FAQ not found with ID:', id);
            return server_1.NextResponse.json({ success: false, error: 'FAQ not found' }, { status: 404 });
        }
        console.log('[FAQ Delete API] Successfully deleted FAQ and article');
        return server_1.NextResponse.json({
            success: true,
            deletedFaq: faqResult.deletedCount,
            deletedArticle: articleResult.deletedCount
        });
    }
    catch (error) {
        console.error('[FAQ Delete API] Error deleting FAQ:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete FAQ'
        }, { status: 500 });
    }
}
