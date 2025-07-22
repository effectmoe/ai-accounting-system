import { NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

export async function GET() {
  try {
    // 環境変数の確認
    const envCheck = {
      USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB,
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
      MONGODB_URI_LENGTH: process.env.MONGODB_URI?.length || 0,
    };

    // データベース接続テスト
    let dbTest = {
      connected: false,
      collectionsAvailable: false,
      journalCount: 0,
      error: null as string | null
    };

    try {
      // journalsコレクションの件数を取得
      const count = await db.count('journals', {});
      dbTest.connected = true;
      dbTest.collectionsAvailable = true;
      dbTest.journalCount = count;
    } catch (dbError) {
      dbTest.error = dbError instanceof Error ? dbError.message : 'Unknown database error';
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: dbTest
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';