import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

import { logger } from '@/lib/logger';
export async function POST(request: NextRequest) {
  try {
    // 環境変数チェック
    const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
    
    if (!useAzureMongoDB) {
      // 旧システムの場合は既存のエンドポイントを使用
      return NextResponse.json({
        success: false,
        error: 'Please use /api/documents/create-from-ocr for the legacy system'
      }, { status: 400 });
    }

    const data = await request.json();
    const { ocrResultId, documentType, approvedBy } = data;

    if (!ocrResultId) {
      return NextResponse.json({
        success: false,
        error: 'OCR Result ID is required'
      }, { status: 400 });
    }

    // OCR結果を取得
    const ocrResult = await db.findById('ocrResults', ocrResultId);
    
    if (!ocrResult) {
      return NextResponse.json({
        success: false,
        error: 'OCR result not found'
      }, { status: 404 });
    }

    // ドキュメントを作成
    const document = await db.create('documents', {
      companyId: ocrResult.companyId,
      documentType: documentType || ocrResult.documentType || 'receipt',
      fileName: ocrResult.fileName,
      vendorName: ocrResult.extractedData?.vendorName || 'Unknown',
      totalAmount: ocrResult.extractedData?.totalAmount || 0,
      taxAmount: ocrResult.extractedData?.taxAmount || 0,
      documentDate: ocrResult.extractedData?.invoiceDate || new Date(),
      dueDate: ocrResult.extractedData?.dueDate,
      items: ocrResult.extractedData?.items || [],
      category: ocrResult.extractedData?.category || '未分類',
      subcategory: ocrResult.extractedData?.subcategory,
      tags: [],
      status: 'pending',
      approvedBy: approvedBy,
      approvedAt: approvedBy ? new Date() : null,
      notes: `OCR処理済み (${ocrResult.confidence ? `信頼度: ${(ocrResult.confidence * 100).toFixed(1)}%` : ''})`,
      sourceFileId: ocrResult.sourceFileId,
      ocrResultId: new ObjectId(ocrResultId),
      // 駐車場領収書専用フィールド
      receiptType: ocrResult.extractedData?.receiptType,
      facilityName: ocrResult.extractedData?.facilityName,
      entryTime: ocrResult.extractedData?.entryTime,
      exitTime: ocrResult.extractedData?.exitTime,
      parkingDuration: ocrResult.extractedData?.parkingDuration,
      baseFee: ocrResult.extractedData?.baseFee,
      additionalFee: ocrResult.extractedData?.additionalFee,
      metadata: {
        ocrProcessedAt: ocrResult.processedAt,
        ocrConfidence: ocrResult.confidence,
        ...ocrResult.metadata
      },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // OCR結果のステータスを更新
    await db.update('ocrResults', ocrResultId, {
      status: 'processed',
      documentId: document._id,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      documentId: document._id.toString(),
      message: 'ドキュメントが作成されました'
    });

  } catch (error) {
    logger.error('Document creation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '予期しないエラーが発生しました'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Create Document from OCR API (MongoDB)',
    method: 'POST',
    accepts: 'application/json',
    fields: {
      ocrResultId: 'required, OCR result ID',
      documentType: 'optional, document type (invoice, receipt, etc.)',
      approvedBy: 'optional, approver user ID'
    }
  });
}