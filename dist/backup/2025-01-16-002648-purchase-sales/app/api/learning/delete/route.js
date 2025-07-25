"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
async function DELETE(request) {
    try {
        const body = await request.json();
        const { learningId } = body;
        if (!learningId) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Learning ID is required'
            }, { status: 400 });
        }
        // 学習データを削除
        const result = await mongodb_client_1.db.delete('accountLearning', learningId);
        if (!result) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Learning data not found'
            }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: '学習データを削除しました'
        });
    }
    catch (error) {
        console.error('Learning deletion error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete learning data'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
