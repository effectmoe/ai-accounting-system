"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.PATCH = PATCH;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
async function PATCH(request) {
    try {
        const body = await request.json();
        const { learningId, accountCategory, patterns } = body;
        if (!learningId || !accountCategory) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Learning ID and account category are required'
            }, { status: 400 });
        }
        // 更新データを準備
        const updateData = {
            accountCategory,
            updatedAt: new Date()
        };
        // パターンが提供された場合は更新
        if (patterns && Array.isArray(patterns)) {
            updateData.patterns = patterns;
        }
        // 学習データを更新
        const result = await mongodb_client_1.db.update('accountLearning', learningId, updateData);
        if (!result) {
            return server_1.NextResponse.json({
                success: false,
                error: 'Learning data not found'
            }, { status: 404 });
        }
        return server_1.NextResponse.json({
            success: true,
            message: '学習データを更新しました',
            learning: result
        });
    }
    catch (error) {
        logger_1.logger.error('Learning update error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update learning data'
        }, { status: 500 });
    }
}
exports.runtime = 'nodejs';
