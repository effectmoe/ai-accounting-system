"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    try {
        // 環境変数チェック
        const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
        if (!useAzureMongoDB) {
            // 旧システムの場合は既存のエンドポイントを使用
            return server_1.NextResponse.json({
                success: false,
                error: 'Please use /api/documents/create-from-ocr for the legacy system'
            }, { status: 400 });
        }
        const data = await request.json();
        const { ocrResultId, documentType, approvedBy } = data;
        if (!ocrResultId) {
            return server_1.NextResponse.json({
                success: false,
                error: 'OCR Result ID is required'
            }, { status: 400 });
        }
        // OCR結果を取得
        const ocrResult = await mongodb_client_1.db.findById('ocrResults', ocrResultId);
        if (!ocrResult) {
            return server_1.NextResponse.json({
                success: false,
                error: 'OCR result not found'
            }, { status: 404 });
        }
        // ドキュメントを作成
        const document = await mongodb_client_1.db.create('documents', {
            companyId: ocrResult.companyId,
            documentType: documentType || ocrResult.documentType || 'receipt',
            fileName: ocrResult.fileName,
            vendorName: ocrResult.extractedData?.vendorName || 'Unknown',
            totalAmount: ocrResult.extractedData?.totalAmount || 0,
            taxAmount: ocrResult.extractedData?.taxAmount || 0,
            documentDate: ocrResult.extractedData?.invoiceDate || new Date(),
            dueDate: ocrResult.extractedData?.dueDate,
            items: ocrResult.extractedData?.items || [],
            category: ocrResult.extractedData?.category || '未分類',
            subcategory: ocrResult.extractedData?.subcategory,
            tags: [],
            status: 'pending',
            approvedBy: approvedBy,
            approvedAt: approvedBy ? new Date() : null,
            notes: `OCR処理済み (${ocrResult.confidence ? `信頼度: ${(ocrResult.confidence * 100).toFixed(1)}%` : ''})`,
            sourceFileId: ocrResult.sourceFileId,
            ocrResultId: new mongodb_1.ObjectId(ocrResultId),
            metadata: {
                ocrProcessedAt: ocrResult.processedAt,
                ocrConfidence: ocrResult.confidence,
                ...ocrResult.metadata
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });
        // OCR結果のステータスを更新
        await mongodb_client_1.db.update('ocrResults', ocrResultId, {
            status: 'processed',
            documentId: document._id,
            updatedAt: new Date()
        });
        return server_1.NextResponse.json({
            success: true,
            documentId: document._id.toString(),
            message: 'ドキュメントが作成されました'
        });
    }
    catch (error) {
        logger_1.logger.error('Document creation error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : '予期しないエラーが発生しました'
        }, { status: 500 });
    }
}
async function GET() {
    return server_1.NextResponse.json({
        message: 'Create Document from OCR API (MongoDB)',
        method: 'POST',
        accepts: 'application/json',
        fields: {
            ocrResultId: 'required, OCR result ID',
            documentType: 'optional, document type (invoice, receipt, etc.)',
            approvedBy: 'optional, approver user ID'
        }
    });
}
