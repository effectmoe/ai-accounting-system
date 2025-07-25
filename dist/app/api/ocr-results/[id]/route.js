"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
async function GET(request, { params }) {
    try {
        const { id } = params;
        if (!mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({ error: 'Invalid OCR result ID' }, { status: 400 });
        }
        // MongoDBからOCR結果を取得（documentsコレクションから）
        const ocrResult = await mongodb_client_1.db.findById('documents', id);
        if (!ocrResult) {
            return server_1.NextResponse.json({ error: 'OCR結果が見つかりません' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            data: ocrResult
        });
    }
    catch (error) {
        logger_1.logger.error('Server error:', error);
        return server_1.NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}
async function DELETE(request, { params }) {
    try {
        const { id } = params;
        if (!mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({ error: 'Invalid OCR result ID' }, { status: 400 });
        }
        // MongoDBからOCR結果（ドキュメント）を削除
        const result = await mongodb_client_1.db.delete('documents', id);
        if (!result) {
            return server_1.NextResponse.json({ error: 'OCR結果が見つかりません' }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'OCR結果を削除しました'
        });
    }
    catch (error) {
        logger_1.logger.error('Server error:', error);
        return server_1.NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
    }
}
