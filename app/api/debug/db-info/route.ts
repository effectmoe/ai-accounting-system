import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET() {
  let client;
  
  try {
    // MongoDB URI を取得
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return NextResponse.json({ error: 'MONGODB_URI not found' }, { status: 500 });
    }

    // MongoDB に直接接続
    client = new MongoClient(uri);
    await client.connect();
    
    // 利用可能なデータベース一覧を取得
    const admin = client.db().admin();
    const dbList = await admin.listDatabases();
    
    // 各データベースの詳細を取得
    const databaseInfo = [];
    
    for (const db of dbList.databases) {
      const database = client.db(db.name);
      const collections = await database.listCollections().toArray();
      
      const collectionInfo = [];
      for (const col of collections) {
        const count = await database.collection(col.name).countDocuments();
        collectionInfo.push({
          name: col.name,
          count: count
        });
      }
      
      databaseInfo.push({
        name: db.name,
        sizeOnDisk: db.sizeOnDisk,
        collections: collectionInfo
      });
    }
    
    // 環境変数情報
    const envInfo = {
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
      MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    };
    
    return NextResponse.json({
      envInfo,
      availableDatabases: databaseInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Database info API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  } finally {
    if (client) {
      await client.close();
    }
  }
}