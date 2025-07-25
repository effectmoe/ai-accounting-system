"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    try {
        // MongoDBを使用してステータスを更新
        const filter = { status: 'sent' };
        const update = {
            $set: {
                status: 'confirmed',
                updatedAt: new Date()
            }
        };
        const result = await mongodb_client_1.vercelDb.updateMany('documents', filter, update);
        if (!result || result.modifiedCount === undefined) {
            logger_1.logger.error('Update failed: No result returned');
            return server_1.NextResponse.json({ error: 'ステータス更新に失敗しました', details: 'No result returned' }, { status: 500 });
        }
        return server_1.NextResponse.json({
            success: true,
            updated: result.modifiedCount,
            message: `${result.modifiedCount} 件の文書のステータスを更新しました`
        });
    }
    catch (error) {
        logger_1.logger.error('API error:', error);
        return server_1.NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
