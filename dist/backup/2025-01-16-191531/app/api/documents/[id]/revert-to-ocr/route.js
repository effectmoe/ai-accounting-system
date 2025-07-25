"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
async function POST(request, { params }) {
    try {
        const documentId = params.id;
        const body = await request.json();
        const { journalId, sourceDocumentId } = body;
        console.log('Reverting to OCR:', {
            documentId,
            journalId,
            sourceDocumentId
        });
        // 1. 仕訳伝票を削除
        if (journalId) {
            await mongodb_client_1.db.delete('journals', journalId);
            console.log('Deleted journal:', journalId);
        }
        // 2. 作成済み文書（仕訳伝票ドキュメント）を削除
        await mongodb_client_1.db.delete('documents', documentId);
        console.log('Deleted journal document:', documentId);
        // 3. 元のOCRドキュメントを復元（hiddenFromListフラグを削除）
        if (sourceDocumentId) {
            // sourceDocumentIdをObjectIdに変換
            const sourceObjectId = mongodb_1.ObjectId.isValid(sourceDocumentId)
                ? new mongodb_1.ObjectId(sourceDocumentId)
                : sourceDocumentId;
            console.log('Converting sourceDocumentId:', {
                original: sourceDocumentId,
                converted: sourceObjectId,
                isValid: mongodb_1.ObjectId.isValid(sourceDocumentId)
            });
            const updateResult = await mongodb_client_1.db.update('documents', sourceObjectId, {
                status: 'pending',
                journalId: null,
                hiddenFromList: false,
                updatedAt: new Date()
            });
            console.log('Update result:', updateResult);
            console.log('Restored original OCR document:', sourceObjectId);
        }
        else {
            console.log('WARNING: No sourceDocumentId provided, cannot restore original OCR document');
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'OCR結果に戻しました'
        });
    }
    catch (error) {
        console.error('Revert to OCR error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'OCR結果への復元に失敗しました'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
