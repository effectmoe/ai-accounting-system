import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

export async function GET() {
  let client;
  
  try {
    // 環境変数確認
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'accounting';
    
    if (!uri) {
      return NextResponse.json({ error: 'MONGODB_URI not found' }, { status: 500 });
    }

    // 直接MongoDB接続
    client = new MongoClient(uri);
    await client.connect();
    
    // データベース名をクリーンアップ
    const cleanDbName = dbName.trim();
    
    console.log(`[DirectDBTest] Connecting to database: "${cleanDbName}"`);
    const db = client.db(cleanDbName);
    
    // supplierQuotesコレクションを直接テスト
    const supplierQuotesCount = await db.collection('supplierQuotes').countDocuments();
    const supplierQuotes = await db.collection('supplierQuotes').find({}).limit(3).toArray();
    
    // ocrResultsコレクションを直接テスト
    const ocrResultsCount = await db.collection('ocrResults').countDocuments();
    const ocrResults = await db.collection('ocrResults').find({}).limit(3).toArray();
    
    // ocr_resultsコレクション（アンダースコア付き）も確認
    const ocr_resultsCount = await db.collection('ocr_results').countDocuments();
    const ocr_results = await db.collection('ocr_results').find({}).limit(3).toArray();
    
    // documentsコレクションも確認
    const documentsCount = await db.collection('documents').countDocuments();
    const documents = await db.collection('documents').find({}).limit(3).toArray();
    
    // 利用可能なコレクション一覧
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    return NextResponse.json({
      environment: {
        MONGODB_URI_EXISTS: !!uri,
        MONGODB_DB_NAME_RAW: process.env.MONGODB_DB_NAME,
        MONGODB_DB_NAME_CLEAN: cleanDbName,
        NODE_ENV: process.env.NODE_ENV
      },
      databaseName: db.databaseName,
      collectionsAvailable: collectionNames,
      testResults: {
        supplierQuotes: {
          count: supplierQuotesCount,
          samples: supplierQuotes.map(sq => ({
            _id: sq._id,
            quoteNumber: sq.quoteNumber,
            vendorName: sq.vendorName || sq.supplier?.companyName,
            totalAmount: sq.totalAmount,
            createdAt: sq.createdAt
          }))
        },
        ocrResults: {
          count: ocrResultsCount,
          samples: ocrResults.map(or => ({
            _id: or._id,
            fileName: or.fileName,
            createdAt: or.createdAt
          }))
        },
        ocr_results: {
          count: ocr_resultsCount,
          samples: ocr_results.map(or => ({
            _id: or._id,
            fileName: or.fileName,
            createdAt: or.createdAt
          }))
        },
        documents: {
          count: documentsCount,
          samples: documents.map(doc => ({
            _id: doc._id,
            fileName: doc.fileName,
            documentType: doc.documentType,
            createdAt: doc.createdAt
          }))
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Direct DB test error:', error);
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