"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DELETE = DELETE;
const server_1 = require("next/server");
const mongodb_client_1 = __importDefault(require("@/lib/mongodb-client"));
const logger_1 = require("@/lib/logger");
async function DELETE() {
    try {
        const client = await mongodb_client_1.default;
        const db = client.db('accounting');
        // 不完全なデータを検索（undefinedやNaNを含むデータ）
        const invalidDocs = await db.collection('documents').find({
            $or: [
                { document_number: { $regex: 'undefined' } },
                { partner_name: null },
                { total_amount: null }
            ]
        }).toArray();
        if (invalidDocs && invalidDocs.length > 0) {
            // 関連する明細を削除
            const docIds = invalidDocs.map(doc => doc._id);
            await db.collection('document_items').deleteMany({
                document_id: { $in: docIds }
            });
            // 文書本体を削除
            await db.collection('documents').deleteMany({
                _id: { $in: docIds }
            });
            return server_1.NextResponse.json({
                message: `${invalidDocs.length}件の不完全なデータを削除しました`,
                deleted: invalidDocs
            });
        }
        return server_1.NextResponse.json({
            message: '削除対象のデータがありません'
        });
    }
    catch (error) {
        logger_1.logger.error('Cleanup error:', error);
        return server_1.NextResponse.json({ error: 'クリーンアップに失敗しました' }, { status: 500 });
    }
}
