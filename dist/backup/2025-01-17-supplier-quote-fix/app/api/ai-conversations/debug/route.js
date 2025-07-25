"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
const mongodb_client_1 = require("@/lib/mongodb-client");
exports.dynamic = 'force-dynamic';
// デバッグ用: AI会話履歴の詳細を確認
async function GET(request) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const limit = parseInt(searchParams.get('limit') || '10', 10);
        const conversationId = searchParams.get('conversationId');
        const invoiceId = searchParams.get('invoiceId');
        const db = await (0, mongodb_client_1.getDatabase)();
        const conversationsCollection = db.collection('aiConversations');
        console.log('[AI Conversations Debug] Parameters:', { limit, conversationId, invoiceId });
        // 特定の会話を検索
        if (conversationId || invoiceId) {
            const queries = [];
            if (conversationId) {
                // さまざまな形式で検索
                queries.push({ conversationId: conversationId }, { conversationId: String(conversationId) }, { conversationId: `conv_${conversationId}` }, { conversationId: parseInt(conversationId) });
            }
            if (invoiceId) {
                queries.push({ invoiceId: invoiceId });
            }
            console.log('[AI Conversations Debug] Trying queries:', queries);
            for (const query of queries) {
                const result = await conversationsCollection.findOne(query);
                if (result) {
                    console.log('[AI Conversations Debug] Found with query:', query);
                    return server_1.NextResponse.json({
                        success: true,
                        foundWithQuery: query,
                        conversation: result,
                        conversationIdType: typeof result.conversationId,
                        conversationIdValue: result.conversationId,
                    });
                }
            }
            // 見つからない場合、invoiceIdで部分一致検索も試す
            if (invoiceId) {
                const regexResult = await conversationsCollection.findOne({
                    invoiceId: { $regex: invoiceId, $options: 'i' }
                });
                if (regexResult) {
                    console.log('[AI Conversations Debug] Found with regex search');
                    return server_1.NextResponse.json({
                        success: true,
                        foundWithQuery: { invoiceId: { $regex: invoiceId } },
                        conversation: regexResult,
                    });
                }
            }
        }
        // すべての会話を取得して詳細を表示
        const conversations = await conversationsCollection.find({}).limit(limit).toArray();
        const debugInfo = conversations.map((conv, index) => ({
            index,
            _id: conv._id,
            conversationId: conv.conversationId,
            conversationIdType: typeof conv.conversationId,
            invoiceId: conv.invoiceId,
            companyId: conv.companyId,
            messagesCount: conv.messages?.length || 0,
            createdAt: conv.createdAt,
            metadata: conv.metadata,
        }));
        // conversationIdの形式を分析
        const conversationIdFormats = {
            total: conversations.length,
            withConvPrefix: conversations.filter(c => typeof c.conversationId === 'string' && c.conversationId.startsWith('conv_')).length,
            numericString: conversations.filter(c => typeof c.conversationId === 'string' && /^\d+$/.test(c.conversationId)).length,
            numeric: conversations.filter(c => typeof c.conversationId === 'number').length,
            other: conversations.filter(c => c.conversationId &&
                !(typeof c.conversationId === 'string' && c.conversationId.startsWith('conv_')) &&
                !(typeof c.conversationId === 'string' && /^\d+$/.test(c.conversationId)) &&
                !(typeof c.conversationId === 'number')).length,
        };
        return server_1.NextResponse.json({
            success: true,
            total: conversations.length,
            conversationIdFormats,
            conversations: debugInfo,
            searchedFor: { conversationId, invoiceId },
        });
    }
    catch (error) {
        console.error('デバッグエンドポイントエラー:', error);
        return server_1.NextResponse.json({ success: false, error: 'デバッグ情報の取得に失敗しました', errorDetails: error }, { status: 500 });
    }
}
