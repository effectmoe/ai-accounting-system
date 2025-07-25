"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
async function PATCH(request, { params }) {
    try {
        const { id } = params;
        const { status } = await request.json();
        if (!mongodb_1.ObjectId.isValid(id)) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Invalid document ID'
            }, { status: 400 });
        }
        if (!status) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Status is required'
            }, { status: 400 });
        }
        // ドキュメントのステータスを更新
        const result = await mongodb_client_1.db.update('documents', id, {
            status,
            updatedAt: new Date()
        });
        if (!result) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Document not found'
            }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: 'Status updated successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Status update error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update status'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
