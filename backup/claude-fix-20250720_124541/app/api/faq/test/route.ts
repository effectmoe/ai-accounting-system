import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

import { logger } from '@/lib/logger';
const MONGODB_URI = process.env.MONGODB_URI;

export async function GET() {
  let client: MongoClient | null = null;

  try {
    logger.debug('FAQ test API called');
    
    // 環境変数チェック
    const envCheck = {
      MONGODB_URI: !!process.env.MONGODB_URI,
      MONGODB_URI_fallback: !!MONGODB_URI,
      NODE_ENV: process.env.NODE_ENV,
    };
    
    logger.debug('Environment check:', envCheck);

    if (!MONGODB_URI) {
      return NextResponse.json({
        success: false,
        error: 'MONGODB_URI is not configured',
        envCheck
      }, { status: 500 });
    }

    logger.debug('Attempting MongoDB connection...');
    
    // MongoDB接続
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    logger.debug('MongoDB connected successfully');
    
    const db = client.db('accounting');
    logger.debug('Database selected: accounting-automation');
    
    const faqCollection = db.collection('faq');
    logger.debug('FAQ collection selected');

    // コレクション情報の取得
    const documentCount = await faqCollection.countDocuments();
    const sampleDocument = await faqCollection.findOne({});
    
    // コレクション統計情報の取得（optional）
    let collectionStats = null;
    try {
      collectionStats = await db.command({ collStats: 'faq' });
    } catch (error) {
      logger.debug('Stats command not available:', error);
    }

    logger.debug('Collection stats:', { documentCount, sampleDocument: !!sampleDocument });

    return NextResponse.json({
      success: true,
      message: 'MongoDB FAQ collection test successful',
      envCheck,
      database: {
        connected: true,
        databaseName: 'accounting',
        collectionName: 'faq',
        documentCount,
        hasSampleDocument: !!sampleDocument,
        collectionStats: collectionStats ? {
          size: collectionStats.size || 0,
          storageSize: collectionStats.storageSize || 0,
          avgObjSize: collectionStats.avgObjSize || 0
        } : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('FAQ test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
    
  } finally {
    if (client) {
      try {
        await client.close();
        logger.debug('MongoDB connection closed');
      } catch (closeError) {
        logger.error('Error closing MongoDB connection:', closeError);
      }
    }
  }
}

export async function POST(request: NextRequest) {
  let client: MongoClient | null = null;

  try {
    logger.debug('FAQ test POST API called');
    
    const { testData } = await request.json();
    
    if (!MONGODB_URI) {
      return NextResponse.json({
        success: false,
        error: 'MONGODB_URI is not configured'
      }, { status: 500 });
    }

    // MongoDB接続
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db('accounting');
    const faqCollection = db.collection('faq');

    // テストデータの挿入
    const testEntry = {
      question: testData?.question || 'Test question',
      answer: testData?.answer || 'Test answer',
      sessionId: 'test_session_' + Date.now(),
      createdAt: new Date(),
      savedAt: new Date(),
      category: 'test',
      status: 'test',
      tags: ['test', 'api-test']
    };

    const insertResult = await faqCollection.insertOne(testEntry);
    logger.debug('Test document inserted:', insertResult.insertedId);

    // 挿入したドキュメントを確認
    const retrievedDoc = await faqCollection.findOne({ _id: insertResult.insertedId });
    
    // テストデータを削除
    await faqCollection.deleteOne({ _id: insertResult.insertedId });
    logger.debug('Test document deleted');

    return NextResponse.json({
      success: true,
      message: 'Insert and delete test completed successfully',
      testResult: {
        inserted: !!insertResult.insertedId,
        retrieved: !!retrievedDoc,
        deleted: true,
        insertedId: insertResult.insertedId
      }
    });

  } catch (error) {
    logger.error('FAQ test POST error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    }, { status: 500 });
    
  } finally {
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        logger.error('Error closing MongoDB connection:', closeError);
      }
    }
  }
}