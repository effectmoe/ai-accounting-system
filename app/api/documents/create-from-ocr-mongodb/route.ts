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

    // OCR結果の構造をログに出力
    logger.debug('OCR Result structure:', JSON.stringify({
      id: ocrResult._id,
      hasExtractedData: !!ocrResult.extractedData,
      extractedDataKeys: ocrResult.extractedData ? Object.keys(ocrResult.extractedData) : [],
      hasOcrResult: !!ocrResult.ocrResult,
      ocrResultKeys: ocrResult.ocrResult ? Object.keys(ocrResult.ocrResult) : [],
      topLevelKeys: Object.keys(ocrResult)
    }, null, 2));

    // OCR結果からデータを取得（ocrResultフィールドとextractedDataフィールドの両方をチェック）
    const ocrData = ocrResult.ocrResult || ocrResult.extractedData || {};
    
    // 駐車場関連フィールドのログ
    logger.debug('Parking fields from OCR:', {
      receiptType: ocrData.receiptType,
      facilityName: ocrData.facilityName,
      entryTime: ocrData.entryTime,
      exitTime: ocrData.exitTime,
      parkingDuration: ocrData.parkingDuration,
      baseFee: ocrData.baseFee,
      additionalFee: ocrData.additionalFee,
      companyName: ocrData.companyName
    });

    // ドキュメントを作成
    const document = await db.create('documents', {
      companyId: ocrResult.companyId,
      documentType: documentType || ocrResult.documentType || ocrResult.type || 'receipt',
      fileName: ocrResult.fileName,
      vendorName: ocrData.vendorName || ocrData.vendor?.name || ocrResult.vendor_name || 'Unknown',
      totalAmount: ocrData.totalAmount?.amount || ocrData.totalAmount || ocrResult.total_amount || 0,
      taxAmount: ocrData.taxAmount || ocrResult.tax_amount || 0,
      documentDate: ocrData.invoiceDate || ocrData.issueDate || ocrResult.receipt_date || new Date(),
      dueDate: ocrData.dueDate,
      items: ocrData.items || [],
      category: ocrData.category || ocrResult.category || '未分類',
      subcategory: ocrData.subcategory || ocrResult.subcategory,
      tags: [],
      status: 'pending',
      approvedBy: approvedBy,
      approvedAt: approvedBy ? new Date() : null,
      notes: `OCR処理済み (${ocrResult.confidence ? `信頼度: ${(ocrResult.confidence * 100).toFixed(1)}%` : ''})`,
      sourceFileId: ocrResult.sourceFileId || ocrResult.gridfsFileId,
      ocrResultId: new ObjectId(ocrResultId),
      // 駐車場領収書専用フィールド
      receiptType: ocrData.receiptType,
      facilityName: ocrData.facilityName,
      entryTime: ocrData.entryTime,
      exitTime: ocrData.exitTime,
      parkingDuration: ocrData.parkingDuration,
      baseFee: ocrData.baseFee,
      additionalFee: ocrData.additionalFee,
      companyName: ocrData.companyName,
      metadata: {
        ocrProcessedAt: ocrResult.processedAt || ocrResult.ocrProcessedAt || new Date(),
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