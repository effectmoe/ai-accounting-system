import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export async function GET() {
  let client;
  
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      return NextResponse.json({ error: 'MONGODB_URI not found' }, { status: 500 });
    }

    client = new MongoClient(uri);
    await client.connect();
    
    const dbName = (process.env.MONGODB_DB_NAME || 'accounting').trim();
    const db = client.db(dbName);
    
    // 新しく追加されたOCRデータを検索
    const targetId = '687e7198b96412d5517e6ef9';
    
    // 各コレクションで検索
    const collections = ['ocr_results', 'ocrResults', 'documents'];
    const results = {};
    
    for (const colName of collections) {
      try {
        const doc = await db.collection(colName).findOne({ _id: new ObjectId(targetId) });
        results[colName] = doc ? {
          found: true,
          _id: doc._id,
          fileName: doc.fileName || doc.file_name || 'No name',
          createdAt: doc.createdAt,
          vendor_name: doc.vendor_name,
          total_amount: doc.total_amount
        } : { found: false };
      } catch (error) {
        results[colName] = { error: error.message };
      }
    }
    
    // 最新のOCRデータ（過去1時間以内）を各コレクションから取得
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const latestData = {};
    
    for (const colName of collections) {
      try {
        const latest = await db.collection(colName)
          .find({ createdAt: { $gte: oneHourAgo } })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();
        
        latestData[colName] = latest.map(doc => ({
          _id: doc._id,
          fileName: doc.fileName || doc.file_name || 'No name',
          createdAt: doc.createdAt,
          vendor_name: doc.vendor_name,
          total_amount: doc.total_amount
        }));
      } catch (error) {
        latestData[colName] = { error: error.message };
      }
    }
    
    return NextResponse.json({
      targetId,
      searchResults: results,
      latestDataLastHour: latestData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.close();
    }
  }
}