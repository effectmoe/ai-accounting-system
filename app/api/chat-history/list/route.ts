import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;

export async function GET(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    // 環境変数チェック
    if (!MONGODB_URI) {
      console.error('MONGODB_URI is not set');
      return NextResponse.json(
        { success: false, error: 'Database configuration error', sessions: [] },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'tax';
    
    console.log('Fetching chat history for category:', category);
    
    // MongoDB接続
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('MongoDB connected successfully');
    const db = client.db('accounting-automation');
    const sessionsCollection = db.collection('chat_sessions');

    // セッション一覧を取得（最新順）
    // categoryフィールドはオプショナル - 存在しないセッションも取得
    const query: any = {
      // statusが'deleted'でないセッションのみ取得
      $or: [
        { status: { $ne: 'deleted' } },
        { status: { $exists: false } }
      ]
    };
    
    // categoryでのフィルタリングをオプショナルに（taxカテゴリー優先）
    if (category === 'tax') {
      query.$and = [
        query.$or,
        {
          $or: [
            { category: 'tax' },
            { category: { $exists: false } },
            { 'specialization.primaryDomain': '税務' }
          ]
        }
      ];
      delete query.$or;
    }
    
    console.log('Query:', JSON.stringify(query));
    
    const sessions = await sessionsCollection
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(100) // より多くのセッションを取得
      .toArray();
      
    console.log(`Found ${sessions.length} sessions`);
    
    // デバッグ用：最初の3件のセッション情報を出力
    if (sessions.length > 0) {
      console.log('Sample sessions:', sessions.slice(0, 3).map(s => ({
        _id: s._id,
        sessionId: s.sessionId,
        title: s.title,
        category: s.category,
        hasMessages: !!s.messages,
        messageCount: s.messages?.length || s.messageCount || 0
      })));
    }

    return NextResponse.json({
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

  } catch (error) {
    console.error('チャット履歴一覧取得エラー:', error);
    console.error('エラー詳細:', error instanceof Error ? error.stack : 'Unknown error');
    return NextResponse.json(
      { 
        success: false, 
        error: 'チャット履歴の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error',
        sessions: []
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
    }
  }
}