import { NextRequest, NextResponse } from 'next/server';
import { vercelDb, checkConnection } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

import { logger } from '@/lib/logger';
// Node.js Runtimeを使用
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    logger.debug('OCR Webhook received - start');
    const data = await request.json();
    logger.debug('OCR Webhook data:', JSON.stringify(data, null, 2));
    logger.debug('Document type from GAS:', data.documentType || 'not specified');

    // MongoDBのみを使用（Supabaseは削除）
    {
      // MongoDB処理
      logger.debug('MongoDB処理を開始');
      
      // MongoDB接続確認
      let mongoConnected = false;
      try {
        logger.debug('Checking MongoDB connection...');
        logger.debug('MONGODB_URI exists:', !!process.env.MONGODB_URI);
        logger.debug('NODE_ENV:', process.env.NODE_ENV);
        
        mongoConnected = await checkConnection();
      } catch (connectionError) {
        logger.error('MongoDB接続チェックエラー:', connectionError);
        logger.error('Error stack:', connectionError instanceof Error ? connectionError.stack : 'No stack trace');
        return NextResponse.json({
          success: false,
          error: 'データベース接続チェックエラー',
          details: connectionError instanceof Error ? connectionError.message : 'Unknown connection error',
          stack: connectionError instanceof Error ? connectionError.stack : undefined
        }, { status: 500 });
      }
      
      if (!mongoConnected) {
        logger.error('MongoDB接続に失敗しました');
        return NextResponse.json({
          success: false,
          error: 'データベース接続エラー: MongoDBに接続できません'
        }, { status: 500 });
      }
      logger.debug('MongoDB接続確認完了');

      // 文書タイプを判定（GASから送信されるか、内容から推測）
      let detectedDocumentType = data.documentType || 'receipt';
      
      // OCRテキストから文書タイプを推測
      if (!data.documentType && data.ocrText) {
        const text = data.ocrText.toLowerCase();
        if (text.includes('見積書') || text.includes('お見積') || text.includes('quotation') || text.includes('estimate')) {
          detectedDocumentType = 'quotation';
        } else if (text.includes('請求書') || text.includes('invoice') || text.includes('bill')) {
          detectedDocumentType = 'invoice';
        } else if (text.includes('発注書') || text.includes('注文書') || text.includes('purchase order')) {
          detectedDocumentType = 'purchase_order';
        } else if (text.includes('領収書') || text.includes('レシート') || text.includes('receipt')) {
          detectedDocumentType = 'receipt';
        }
      }
      
      logger.debug('Detected document type:', detectedDocumentType);
      
      // OCR結果をMongoDBに保存
      const ocrResult = {
        companyId: '11111111-1111-1111-1111-111111111111',
        fileName: data.fileName,
        fileSize: 0, // GASからは不明
        mimeType: 'application/pdf', // デフォルト
        processedAt: new Date(),
        processingTime: 0,
        documentType: detectedDocumentType,
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
        logger.debug('OCR結果をMongoDBに保存しました:', savedOcrResult._id.toString());
      } catch (mongoError) {
        logger.error('MongoDB OCR結果保存エラー:', mongoError);
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
        documentType: detectedDocumentType,
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
        logger.debug('Document saved to MongoDB:', savedDocument._id.toString());
      } catch (mongoError) {
        logger.error('MongoDB documents保存エラー:', mongoError);
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
    logger.error('Webhook処理エラー:', error);
    logger.error('エラーの詳細:', {
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