import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

export async function GET() {
  let client;
  
  try {
    const uri = process.env.MONGODB_URI;
    client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db('accounting');
    
    // ログから確認された最新のID
    const latestId = '687e778f971d9007de89890d';
    
    // documentsコレクションで検索
    const docResult = await db.collection('documents').findOne({ _id: new ObjectId(latestId) });
    
    // 最新の10件も取得（全コレクション）
    const latestDocs = await db.collection('documents').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    const latestOcr = await db.collection('ocr_results').find({}).sort({ createdAt: -1 }).limit(10).toArray();
    
    return NextResponse.json({
      searchedId: latestId,
      found: !!docResult,
      foundData: docResult ? {
        _id: docResult._id,
        fileName: docResult.fileName,
        createdAt: docResult.createdAt,
        documentType: docResult.documentType,
        status: docResult.status
      } : null,
      latestFromDocuments: latestDocs.slice(0,3).map(d => ({
        _id: d._id,
        fileName: d.fileName,
        createdAt: d.createdAt,
        documentType: d.documentType
      })),
      latestFromOcrResults: latestOcr.slice(0,3).map(d => ({
        _id: d._id,
        fileName: d.fileName || d.file_name,
        createdAt: d.createdAt,
        documentType: d.documentType
      }))
    });
    
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    if (client) await client.close();
  }
}