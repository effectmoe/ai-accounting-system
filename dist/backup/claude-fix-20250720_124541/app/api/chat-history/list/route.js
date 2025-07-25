"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
const MONGODB_URI = process.env.MONGODB_URI;
// Force dynamic rendering for this route
exports.dynamic = 'force-dynamic';
async function GET(request) {
    let client = null;
    try {
        // 環境変数チェック
        logger_1.logger.debug('MONGODB_URI check:', MONGODB_URI ? 'Set' : 'Not set');
        logger_1.logger.debug('MONGODB_URI value:', MONGODB_URI);
        if (!MONGODB_URI) {
            logger_1.logger.error('MONGODB_URI is not set');
            return server_1.NextResponse.json({ success: false, error: 'Database configuration error', sessions: [] }, { status: 500 });
        }
        const { searchParams } = request.nextUrl;
        const category = searchParams.get('category') || 'tax';
        logger_1.logger.debug('Fetching chat history for category:', category);
        // MongoDB接続
        client = new mongodb_1.MongoClient(MONGODB_URI);
        await client.connect();
        logger_1.logger.debug('MongoDB connected successfully');
        const db = client.db('accounting-automation');
        const sessionsCollection = db.collection('chat_sessions');
        // セッション一覧を取得（最新順）
        // categoryフィールドはオプショナル - 存在しないセッションも取得
        let query = {};
        // categoryでのフィルタリングをオプショナルに（taxカテゴリー優先）
        if (category === 'tax') {
            // $andを使って複数の条件を組み合わせる
            query = {
                $and: [
                    // statusの条件: deletedでないセッション
                    {
                        $or: [
                            { status: { $ne: 'deleted' } },
                            { status: { $exists: false } }
                        ]
                    },
                    // categoryの条件: tax関連のセッション
                    {
                        $or: [
                            { category: 'tax' },
                            { category: { $exists: false } },
                            { 'specialization.primaryDomain': '税務' }
                        ]
                    }
                ]
            };
        }
        else {
            // tax以外の場合は、statusのみでフィルタリング
            query = {
                $or: [
                    { status: { $ne: 'deleted' } },
                    { status: { $exists: false } }
                ]
            };
        }
        logger_1.logger.debug('Query:', JSON.stringify(query));
        const sessions = await sessionsCollection
            .find(query)
            .sort({ updatedAt: -1, createdAt: -1 })
            .limit(100) // より多くのセッションを取得
            .toArray();
        logger_1.logger.debug(`Found ${sessions.length} sessions`);
        // デバッグ用：最初の3件のセッション情報を出力
        if (sessions.length > 0) {
            logger_1.logger.debug('Sample sessions:', sessions.slice(0, 3).map(s => ({
                _id: s._id,
                sessionId: s.sessionId,
                title: s.title,
                category: s.category,
                hasMessages: !!s.messages,
                messageCount: s.messages?.length || s.messageCount || 0
            })));
        }
        return server_1.NextResponse.json({
            success: true,
            sessions: sessions.map(session => ({
                _id: session._id,
                sessionId: session.sessionId, // sessionIdも含める
                title: session.title || `チャット ${new Date(session.createdAt).toLocaleDateString()}`,
                category: session.category || 'general',
                messageCount: session.messages?.length || session.messageCount || session.stats?.messageCount || 0,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt
            }))
        });
    }
    catch (error) {
        logger_1.logger.error('チャット履歴一覧取得エラー:', error);
        logger_1.logger.error('エラー詳細:', error instanceof Error ? error.stack : 'Unknown error');
        return server_1.NextResponse.json({
            success: false,
            error: 'チャット履歴の取得に失敗しました',
            details: error instanceof Error ? error.message : 'Unknown error',
            sessions: []
        }, { status: 500 });
    }
    finally {
        if (client) {
            await client.close();
        }
    }
}
