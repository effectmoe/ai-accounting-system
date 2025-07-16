import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

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
    // categoryフィールドがない古いセッションも含めて検索
    const query: any = {};
    if (category !== 'all') {
      query.$or = [
        { category: category },
        { category: { $exists: false } } // categoryフィールドがないレコードも含める
      ];
    }
    
    const sessions = await sessionsCollection
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(50) // より多くのセッションを取得
      .toArray();
      
    console.log(`Found ${sessions.length} sessions`);

    return NextResponse.json({
      success: true,
      sessions: sessions.map(session => ({
        _id: session._id,
        title: session.title,
        category: session.category,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }))
    });

  } catch (error) {
    console.error('チャット履歴一覧取得エラー:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'チャット履歴の取得に失敗しました',
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