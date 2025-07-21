import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

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
    
    // ocr_resultsコレクションから直接データを取得
    const ocrResults = await db.collection('ocr_results').find({}).limit(10).toArray();
    const ocrCount = await db.collection('ocr_results').countDocuments();
    
    return NextResponse.json({
      dbName: dbName,
      ocrResultsCount: ocrCount,
      sampleOcrResults: ocrResults.map(doc => ({
        _id: doc._id,
        fileName: doc.fileName || doc.file_name || 'No name',
        createdAt: doc.createdAt,
        total_amount: doc.total_amount,
        vendor_name: doc.vendor_name
      })),
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