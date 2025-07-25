"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
// 既存のAI会話データのconversationIdを正規化するマイグレーション
async function POST(request) {
    try {
        // セキュリティ: 環境変数でマイグレーションを有効にしている場合のみ実行
        if (process.env.ENABLE_MIGRATION !== 'true') {
            return server_1.NextResponse.json({ success: false, error: 'Migration is not enabled' }, { status: 403 });
        }
        const db = await (0, mongodb_client_1.getDatabase)();
        const conversationsCollection = db.collection('aiConversations');
        // 数値形式のconversationIdを持つドキュメントを検索
        const numericConversations = await conversationsCollection.find({
            conversationId: { $type: 'number' }
        }).toArray();
        console.log('[Migration] Found numeric conversationIds:', numericConversations.length);
        let migratedCount = 0;
        const errors = [];
        for (const conversation of numericConversations) {
            try {
                // conversationIdを文字列に変換
                const normalizedId = String(conversation.conversationId);
                await conversationsCollection.updateOne({ _id: conversation._id }, {
                    $set: {
                        conversationId: normalizedId,
                        migratedAt: new Date(),
                        originalConversationId: conversation.conversationId
                    }
                });
                migratedCount++;
                console.log(`[Migration] Migrated: ${conversation.conversationId} -> ${normalizedId}`);
            }
            catch (error) {
                errors.push({
                    _id: conversation._id,
                    conversationId: conversation.conversationId,
                    error: error.message
                });
            }
        }
        return server_1.NextResponse.json({
            success: true,
            totalFound: numericConversations.length,
            migratedCount,
            errors,
            message: `Successfully migrated ${migratedCount} out of ${numericConversations.length} conversations`
        });
    }
    catch (error) {
        console.error('Migration error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Migration failed', details: error.message }, { status: 500 });
    }
}
// マイグレーションの状態を確認
async function GET(request) {
    try {
        const db = await (0, mongodb_client_1.getDatabase)();
        const conversationsCollection = db.collection('aiConversations');
        // 型別の統計を取得
        const stats = {
            total: await conversationsCollection.countDocuments(),
            numericIds: await conversationsCollection.countDocuments({
                conversationId: { $type: 'number' }
            }),
            stringIds: await conversationsCollection.countDocuments({
                conversationId: { $type: 'string' }
            }),
            withConvPrefix: await conversationsCollection.countDocuments({
                conversationId: { $regex: '^conv_' }
            }),
            migrated: await conversationsCollection.countDocuments({
                migratedAt: { $exists: true }
            })
        };
        // サンプルデータも取得
        const samples = {
            numeric: await conversationsCollection.find({
                conversationId: { $type: 'number' }
            }).limit(3).toArray(),
            string: await conversationsCollection.find({
                conversationId: { $type: 'string' }
            }).limit(3).toArray()
        };
        return server_1.NextResponse.json({
            success: true,
            stats,
            samples: {
                numeric: samples.numeric.map(s => ({
                    conversationId: s.conversationId,
                    type: typeof s.conversationId,
                    invoiceId: s.invoiceId,
                    createdAt: s.createdAt
                })),
                string: samples.string.map(s => ({
                    conversationId: s.conversationId,
                    type: typeof s.conversationId,
                    invoiceId: s.invoiceId,
                    createdAt: s.createdAt
                }))
            }
        });
    }
    catch (error) {
        console.error('Migration status error:', error);
        return server_1.NextResponse.json({ success: false, error: 'Failed to get migration status', details: error.message }, { status: 500 });
    }
}
