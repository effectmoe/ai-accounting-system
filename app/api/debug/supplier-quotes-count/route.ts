import { NextResponse } from 'next/server';
import { db, getDatabase } from '@/lib/mongodb-client';

export async function GET() {
  try {
    // 環境変数の確認
    const envInfo = {
      USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB,
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
      MONGODB_URI_PREVIEW: process.env.MONGODB_URI?.slice(0, 50) + '...',
      MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'accounting',
      NODE_ENV: process.env.NODE_ENV
    };

    // データベースから直接カウント
    const directDb = await getDatabase();
    
    // データベース名を確認
    const actualDbName = directDb.databaseName;
    
    // 利用可能なコレクション一覧を取得
    const collections = await directDb.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const directCount = await directDb.collection('supplierQuotes').countDocuments();
    
    // db クライアントを使用したカウント
    const clientCount = await db.count('supplierQuotes', {});
    
    // 最初の3件を取得
    const sampleDocs = await directDb.collection('supplierQuotes').find({}).limit(3).toArray();
    
    return NextResponse.json({
      envInfo,
      actualDbName,
      availableCollections: collectionNames,
      directCount,
      clientCount,
      sampleDocs: sampleDocs.map(doc => ({
        _id: doc._id,
        quoteNumber: doc.quoteNumber,
        vendorName: doc.vendorName,
        createdAt: doc.createdAt
      }))
    });
  } catch (error) {
    console.error('Debug API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}