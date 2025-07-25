"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
exports.DELETE = DELETE;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
async function GET(request, { params }) {
    try {
        const { id } = params;
        logger_1.logger.debug('Getting document with ID:', id);
        if (!id || !mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid document ID'
            }, { status: 400 });
        }
        // ドキュメントを取得
        const document = await mongodb_client_1.db.findById('documents', id);
        if (!document) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Document not found'
            }, { status: 404 });
        }
        // Supabase形式に変換（既存のUIとの互換性のため）
        const formattedDocument = {
            id: document._id.toString(),
            _id: document._id.toString(),
            company_id: document.companyId?.toString() || '11111111-1111-1111-1111-111111111111',
            document_type: document.documentType || 'receipt',
            document_number: document.documentNumber || `DOC-${document._id.toString().slice(-8)}`,
            status: document.status || 'draft',
            issue_date: document.issueDate || document.documentDate || document.createdAt,
            partner_name: document.partnerName || document.vendorName || '不明',
            partner_address: document.partnerAddress || '',
            total_amount: document.totalAmount || 0,
            tax_amount: document.taxAmount || 0,
            subtotal: (document.totalAmount || 0) - (document.taxAmount || 0),
            notes: document.notes || '',
            created_at: document.createdAt,
            updated_at: document.updatedAt,
            // OCR関連フィールド
            file_name: document.fileName,
            file_type: document.fileType,
            file_size: document.fileSize,
            vendor_name: document.vendorName,
            receipt_date: document.documentDate,
            category: document.category || '未分類',
            extracted_text: document.extractedText,
            confidence: document.confidence,
            ocr_status: document.ocrStatus || 'completed',
            ocr_result_id: document.ocrResultId?.toString(),
            gridfs_file_id: document.gridfsFileId?.toString() || document.gridfs_file_id?.toString(),
            // 仕訳関連フィールド
            journalId: document.journalId?.toString()
        };
        logger_1.logger.debug('Formatted document:', formattedDocument);
        return server_1.NextResponse.json({
            success: true,
            document: formattedDocument
        });
    }
    catch (error) {
        logger_1.logger.error('Document fetch error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch document'
        }, { status: 500 });
    }
}
async function DELETE(request, { params }) {
    try {
        const { id } = params;
        logger_1.logger.debug('Delete request for document ID:', id);
        // IDの検証をより柔軟に
        if (!id || id.length === 0) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Document ID is required'
            }, { status: 400 });
        }
        // ObjectIDの検証
        let isValidObjectId = false;
        try {
            // ObjectIDとして解析を試みる
            if (mongodb_1.ObjectId.isValid(id) && String(new mongodb_1.ObjectId(id)) === id) {
                isValidObjectId = true;
            }
        }
        catch (e) {
            logger_1.logger.debug('Not a valid ObjectId:', id);
        }
        if (!isValidObjectId) {
            return server_1.NextResponse.json({
                success: false,
                error: `Invalid document ID format: ${id}`
            }, { status: 400 });
        }
        // まずドキュメントを取得してGridFS IDを確認
        const document = await mongodb_client_1.db.findOne('documents', { _id: new mongodb_1.ObjectId(id) });
        if (!document) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Document not found'
            }, { status: 404 });
        }
        // GridFSファイルも削除（存在する場合）
        if (document.gridfs_file_id) {
            try {
                const bucket = new mongodb_1.GridFSBucket(mongodb_client_1.db.getDb(), { bucketName: 'uploads' });
                await bucket.delete(new mongodb_1.ObjectId(document.gridfs_file_id));
            }
            catch (error) {
                logger_1.logger.error('GridFS deletion error:', error);
                // GridFS削除エラーは無視して続行
            }
        }
        // 関連する仕訳も削除（存在する場合）
        if (document.journalId) {
            try {
                await mongodb_client_1.db.delete('journals', document.journalId.toString());
            }
            catch (error) {
                logger_1.logger.error('Journal deletion error:', error);
                // 仕訳削除エラーも無視して続行
            }
        }
        // ドキュメントを削除
        const result = await mongodb_client_1.db.delete('documents', id);
        return server_1.NextResponse.json({
            success: true,
            message: 'Document deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Document deletion error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete document'
        }, { status: 500 });
    }
}
async function PATCH(request, { params }) {
    try {
        const { id } = params;
        const body = await request.json();
        logger_1.logger.debug('Updating document with ID:', id);
        logger_1.logger.debug('Update data:', body);
        if (!mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid document ID'
            }, { status: 400 });
        }
        // まずドキュメントが存在するか確認
        const existingDoc = await mongodb_client_1.db.findById('documents', id);
        if (!existingDoc) {
            logger_1.logger.debug('Document not found for update:', id);
            return server_1.NextResponse.json({
                success: false,
                error: 'Document not found'
            }, { status: 404 });
        }
        // ドキュメントを更新
        const result = await mongodb_client_1.db.update('documents', id, {
            ...body,
            updatedAt: new Date()
        });
        logger_1.logger.debug('Update result:', result);
        if (!result) {
            // updateが失敗した場合でも、ドキュメントが存在することは確認済みなので
            // 更新後のドキュメントを取得して返す
            const updatedDoc = await mongodb_client_1.db.findById('documents', id);
            if (updatedDoc) {
                return server_1.NextResponse.json({
                    success: true,
                    document: updatedDoc
                });
            }
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to update document'
            }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            document: result
        });
    }
    catch (error) {
        logger_1.logger.error('Document update error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update document'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
