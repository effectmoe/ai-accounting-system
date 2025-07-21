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
    
    // ログから確認された新しいIDを直接検索
    const newIds = [
      '687e7198b96412d5517e6ef9',
      '687e778f971d9007de89890d'
    ];
    
    const results = {};
    
    for (const id of newIds) {
      try {
        // documentsコレクションで検索
        const docResult = await db.collection('documents').findOne({ _id: new ObjectId(id) });
        // ocr_resultsコレクションで検索  
        const ocrResult = await db.collection('ocr_results').findOne({ _id: new ObjectId(id) });
        
        results[id] = {
          documents: docResult ? {
            _id: docResult._id,
            fileName: docResult.fileName,
            createdAt: docResult.createdAt,
            documentType: docResult.documentType
          } : null,
          ocr_results: ocrResult ? {
            _id: ocrResult._id,
            fileName: ocrResult.fileName,
            createdAt: ocrResult.createdAt,
            documentType: ocrResult.documentType
          } : null
        };
      } catch (error) {
        results[id] = { error: error.message };
      }
    }
    
    // 最新の5件も確認
    const latestDocs = await db.collection('documents')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
      
    const latestOcr = await db.collection('ocr_results')
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    return NextResponse.json({
      targetSearchResults: results,
      latestDocuments: latestDocs.map(d => ({
        _id: d._id,
        fileName: d.fileName,
        createdAt: d.createdAt,
        documentType: d.documentType
      })),
      latestOcrResults: latestOcr.map(d => ({
        _id: d._id,
        fileName: d.fileName,
        createdAt: d.createdAt,
        documentType: d.documentType
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