import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET(request: NextRequest) {
  // 🔥 緊急追加: 本番環境では無効化
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    return NextResponse.json(
      { 
        error: 'Test endpoint is disabled in production environment',
        timestamp: new Date().toISOString()
      }, 
      { status: 403 }
    );
  }

  const result = {
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
    },
    connection: {
      attempted: false,
      success: false,
      error: null as any,
      details: {} as any,
    },
  };

  if (!process.env.MONGODB_URI) {
    result.connection.error = 'MONGODB_URI not set';
    return NextResponse.json(result);
  }

  result.connection.attempted = true;

  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    // 接続試行
    await client.connect();
    result.connection.success = true;

    // データベース一覧を取得
    const admin = client.db().admin();
    const dbs = await admin.listDatabases();
    result.connection.details.databases = dbs.databases.map(db => db.name);

    // pingテスト
    await client.db().command({ ping: 1 });
    result.connection.details.ping = 'success';

    // コレクション一覧を取得
    const db = client.db(process.env.MONGODB_DB_NAME || 'accounting');
    const collections = await db.listCollections().toArray();
    result.connection.details.collections = collections.map(c => c.name);

  } catch (error: any) {
    result.connection.success = false;
    result.connection.error = {
      message: error.message,
      name: error.name,
      code: error.code,
      codeName: error.codeName,
      connectionGeneration: error.connectionGeneration,
      stack: error.stack?.split('\n').slice(0, 5),
    };
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      console.error('Error closing connection:', closeError);
    }
  }

  return NextResponse.json(result);
}