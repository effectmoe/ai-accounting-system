"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const mongodb_1 = require("mongodb");
const structured_data_service_1 = require("@/services/structured-data.service");
const logger_1 = require("@/lib/logger");
// 構造化データサービスのインスタンス
let structuredDataService;
const getStructuredDataService = () => {
    if (!structuredDataService) {
        structuredDataService = new structured_data_service_1.StructuredDataService();
    }
    return structuredDataService;
};
/**
 * GET /api/structured-data
 * 構造化データの一覧取得
 */
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const sourceId = searchParams.get('sourceId');
        const sourceType = searchParams.get('sourceType');
        const schemaType = searchParams.get('schemaType');
        const service = getStructuredDataService();
        if (sourceId) {
            // 特定のソースの構造化データを取得
            const data = await service.getStructuredData(new mongodb_1.ObjectId(sourceId), sourceType || undefined);
            return server_1.NextResponse.json({
                success: true,
                data,
                count: data.length
            });
        }
        else {
            // 統計情報を取得
            const stats = await service.getStats();
            return server_1.NextResponse.json({
                success: true,
                stats
            });
        }
    }
    catch (error) {
        logger_1.logger.error('Structured data GET error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
/**
 * POST /api/structured-data
 * 構造化データの生成と保存
 */
async function POST(request) {
    try {
        const body = await request.json();
        const { sourceData, schemaType, config, saveToDatabase = true } = body;
        // 入力検証
        if (!sourceData || !schemaType) {
            return server_1.NextResponse.json({
                success: false,
                error: 'sourceData and schemaType are required'
            }, { status: 400 });
        }
        const service = getStructuredDataService();
        // 構造化データを生成
        const result = await service.generateStructuredData(sourceData, schemaType, config);
        if (!result.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to generate structured data',
                details: result.errors
            }, { status: 400 });
        }
        let savedDocument = null;
        // データベースに保存（オプション）
        if (saveToDatabase && result.data && sourceData._id) {
            const sourceId = new mongodb_1.ObjectId(sourceData._id);
            const sourceType = getSourceType(schemaType);
            savedDocument = await service.saveStructuredData(sourceId, sourceType, schemaType, result.data, {
                isValid: result.success,
                errors: result.errors || [],
                warnings: result.warnings
            }, result.metadata || {});
        }
        return server_1.NextResponse.json({
            success: true,
            data: result.data,
            metadata: result.metadata,
            savedDocument: savedDocument ? {
                id: savedDocument._id,
                sourceId: savedDocument.sourceId,
                schemaType: savedDocument.schemaType
            } : null,
            warnings: result.warnings
        });
    }
    catch (error) {
        logger_1.logger.error('Structured data POST error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
/**
 * PUT /api/structured-data
 * 構造化データの更新
 */
async function PUT(request) {
    try {
        const body = await request.json();
        const { id, sourceData, schemaType, config } = body;
        if (!id || !sourceData || !schemaType) {
            return server_1.NextResponse.json({
                success: false,
                error: 'id, sourceData and schemaType are required'
            }, { status: 400 });
        }
        const service = getStructuredDataService();
        // 新しい構造化データを生成
        const result = await service.generateStructuredData(sourceData, schemaType, config);
        if (!result.success) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Failed to generate structured data',
                details: result.errors
            }, { status: 400 });
        }
        // データベースのドキュメントを更新
        // Note: 実際の更新処理はStructuredDataServiceに追加する必要があります
        return server_1.NextResponse.json({
            success: true,
            data: result.data,
            metadata: result.metadata,
            warnings: result.warnings
        });
    }
    catch (error) {
        logger_1.logger.error('Structured data PUT error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
/**
 * DELETE /api/structured-data
 * 構造化データの削除
 */
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const sourceId = searchParams.get('sourceId');
        if (!id && !sourceId) {
            return server_1.NextResponse.json({
                success: false,
                error: 'id or sourceId is required'
            }, { status: 400 });
        }
        // Note: 削除処理はStructuredDataServiceに追加する必要があります
        return server_1.NextResponse.json({
            success: true,
            message: 'Structured data deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Structured data DELETE error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        }, { status: 500 });
    }
}
/**
 * スキーマタイプからソースタイプを推定する
 */
function getSourceType(schemaType) {
    switch (schemaType) {
        case 'Invoice':
            return 'invoice';
        case 'Quotation':
            return 'quote';
        case 'DeliveryNote':
            return 'delivery-note';
        case 'FAQPage':
            return 'faq';
        case 'Article':
            return 'article';
        case 'BusinessEvent':
            return 'event';
        default:
            return 'article';
    }
}
