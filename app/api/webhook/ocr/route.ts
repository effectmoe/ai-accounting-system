import { NextRequest, NextResponse } from 'next/server';
import { vercelDb, checkConnection } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// Node.js Runtimeを使用
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    console.log('OCR Webhook received - start');
    const data = await request.json();
    console.log('OCR Webhook data:', JSON.stringify(data, null, 2));

    // MongoDBのみを使用（Supabaseは削除）
    {
      // MongoDB処理
      console.log('MongoDB処理を開始');
      
      // MongoDB接続確認
      let mongoConnected = false;
      try {
        console.log('Checking MongoDB connection...');
        console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
        console.log('NODE_ENV:', process.env.NODE_ENV);
        
        mongoConnected = await checkConnection();
      } catch (connectionError) {
        console.error('MongoDB接続チェックエラー:', connectionError);
        console.error('Error stack:', connectionError instanceof Error ? connectionError.stack : 'No stack trace');
        return NextResponse.json({
          success: false,
          error: 'データベース接続チェックエラー',
          details: connectionError instanceof Error ? connectionError.message : 'Unknown connection error',
          stack: connectionError instanceof Error ? connectionError.stack : undefined
        }, { status: 500 });
      }
      
      if (!mongoConnected) {
        console.error('MongoDB接続に失敗しました');
        return NextResponse.json({
          success: false,
          error: 'データベース接続エラー: MongoDBに接続できません'
        }, { status: 500 });
      }
      console.log('MongoDB接続確認完了');

      // OCR結果をMongoDBに保存
      const ocrResult = {
        companyId: '11111111-1111-1111-1111-111111111111',
        fileName: data.fileName,
        fileSize: 0, // GASからは不明
        mimeType: 'application/pdf', // デフォルト
        processedAt: new Date(),
        processingTime: 0,
        documentType: 'receipt',
        confidence: 0.8,
        status: 'completed',
        extractedData: data.documentInfo || {},
        rawResult: data.ocrText || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      let savedOcrResult;
      try {
        savedOcrResult = await vercelDb.create('ocr_results', ocrResult);
        console.log('OCR結果をMongoDBに保存しました:', savedOcrResult._id.toString());
      } catch (mongoError) {
        console.error('MongoDB OCR結果保存エラー:', mongoError);
        return NextResponse.json({
          success: false,
          error: 'OCR結果の保存に失敗しました',
          details: mongoError instanceof Error ? mongoError.message : 'Unknown MongoDB error'
        }, { status: 500 });
      }

      // documentsコレクションにも保存
      const documentData = {
        companyId: '11111111-1111-1111-1111-111111111111',
        fileName: data.fileName,
        fileType: 'application/pdf',
        fileSize: 0,
        documentType: 'receipt',
        vendorName: data.documentInfo?.vendorName || data.documentInfo?.storeName || '',
        totalAmount: data.documentInfo?.totalAmount || 0,
        taxAmount: data.documentInfo?.taxAmount || 0,
        documentDate: data.documentInfo?.receiptDate ? new Date(data.documentInfo.receiptDate) : null,
        issue_date: data.documentInfo?.receiptDate ? new Date(data.documentInfo.receiptDate) : null,
        receipt_date: data.documentInfo?.receiptDate || null,
        category: '未分類',
        subcategory: null,
        extractedText: data.ocrText || '',
        confidence: 0.8,
        ocrStatus: 'completed',
        ocrResultId: savedOcrResult._id ? new ObjectId(savedOcrResult._id) : null,
        gridfsFileId: null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      try {
        const savedDocument = await vercelDb.create('documents', documentData);
        console.log('Document saved to MongoDB:', savedDocument._id.toString());
      } catch (mongoError) {
        console.error('MongoDB documents保存エラー:', mongoError);
        return NextResponse.json({
          success: false,
          error: 'ドキュメントの保存に失敗しました',
          details: mongoError instanceof Error ? mongoError.message : 'Unknown MongoDB error'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'MongoDB処理が完了しました',
        ocrResultId: savedOcrResult._id.toString()
      });
    }

  } catch (error) {
    console.error('Webhook処理エラー:', error);
    console.error('エラーの詳細:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        error: 'Webhook処理に失敗しました',
        detail: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GETメソッドを追加（デバッグ用）
export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: 'OCR Webhook',
    method: 'POST',
    useAzureMongoDB: process.env.USE_AZURE_MONGODB === 'true',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}

// OPTIONSメソッドを追加（CORS対応）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}