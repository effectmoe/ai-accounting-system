"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const mongodb_1 = require("mongodb");
const MONGODB_URI = process.env.MONGODB_URI;
async function POST(request) {
    let client = null;
    try {
        console.log('[FAQ API] FAQ save API called');
        // 環境変数チェック
        if (!MONGODB_URI) {
            console.error('[FAQ API] MONGODB_URI環境変数が設定されていません');
            return server_1.NextResponse.json({ success: false, error: 'Database configuration error' }, { status: 500 });
        }
        console.log('[FAQ API] MongoDB URIが設定されています');
        const body = await request.json();
        console.log('[FAQ API] リクエストボディ:', JSON.stringify(body));
        const { question, answer, sessionId, timestamp } = body;
        if (!question || !answer) {
            console.log('[FAQ API] バリデーションエラー: questionまたはanswerが不足');
            return server_1.NextResponse.json({ success: false, error: 'Question and answer are required' }, { status: 400 });
        }
        console.log('[FAQ API] MongoDB接続を開始...');
        // MongoDB接続
        client = new mongodb_1.MongoClient(MONGODB_URI);
        await client.connect();
        console.log('[FAQ API] MongoDB接続成功');
        const db = client.db('accounting');
        console.log('[FAQ API] データベース選択: accounting');
        const faqCollection = db.collection('faq');
        console.log('[FAQ API] FAQコレクション選択完了');
        // FAQ保存
        const faqEntry = {
            question: question.trim(),
            answer: answer.trim(),
            sessionId,
            createdAt: new Date(timestamp),
            savedAt: new Date(),
            category: 'tax-accounting',
            status: 'active',
            tags: ['ai-generated', 'chat']
        };
        console.log('[FAQ API] FAQエントリを挿入:', JSON.stringify(faqEntry));
        const result = await faqCollection.insertOne(faqEntry);
        console.log('[FAQ API] FAQ保存成功 ID:', result.insertedId);
        return server_1.NextResponse.json({
            success: true,
            message: 'FAQに保存されました',
            id: result.insertedId
        });
    }
    catch (error) {
        console.error('[FAQ API] FAQ保存エラー:', error);
        console.error('[FAQ API] エラー詳細:', error instanceof Error ? error.stack : 'Unknown error');
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'FAQ保存に失敗しました',
            details: error instanceof Error ? error.message : undefined
        }, { status: 500 });
    }
    finally {
        if (client) {
            try {
                await client.close();
                console.log('[FAQ API] MongoDB接続をクローズ');
            }
            catch (closeError) {
                console.error('[FAQ API] MongoDB接続クローズエラー:', closeError);
            }
        }
    }
}
