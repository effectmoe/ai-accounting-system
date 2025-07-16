import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://effectmoe:Dhfgmtekd77@cluster0.h1e6k.mongodb.net/accounting-automation?retryWrites=true&w=majority&appName=Cluster0';

export async function GET(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'tax';
    
    // MongoDB接続
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db('accounting-automation');
    const sessionsCollection = db.collection('chat_sessions');

    // セッション一覧を取得（最新順）
    const sessions = await sessionsCollection
      .find({ 
        category: category,
        messageCount: { $gt: 0 } // メッセージがあるセッションのみ
      })
      .sort({ updatedAt: -1 })
      .limit(20)
      .toArray();

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