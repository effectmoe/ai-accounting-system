import { NextRequest, NextResponse } from 'next/server';
import { getFormRecognizerService } from '../../../../src/lib/azure-form-recognizer';
import { db } from '../../../../src/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    // 環境変数チェック
    const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
    
    if (!useAzureMongoDB) {
      // 旧システムにリダイレクト
      return NextResponse.json({
        success: false,
        error: 'Please use /api/ocr for the legacy system'
      }, { status: 400 });
    }

    // Azure Form Recognizer設定チェック
    if (!process.env.AZURE_FORM_RECOGNIZER_ENDPOINT || !process.env.AZURE_FORM_RECOGNIZER_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Azure Form Recognizer configuration is missing'
      }, { status: 500 });
    }

    // フォームデータを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string || 'default';
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'ファイルがアップロードされていません'
      }, { status: 400 });
    }

    // ファイルをBufferに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ファイルタイプを判定
    const fileName = file.name.toLowerCase();
    let documentType = 'document';
    
    if (fileName.includes('invoice') || fileName.includes('請求')) {
      documentType = 'invoice';
    } else if (fileName.includes('receipt') || fileName.includes('領収')) {
      documentType = 'receipt';
    }

    // Azure Form Recognizerでファイルを分析
    const formRecognizer = getFormRecognizerService();
    let analysisResult;
    
    try {
      if (documentType === 'invoice') {
        analysisResult = await formRecognizer.analyzeInvoice(buffer, file.name);
      } else if (documentType === 'receipt') {
        analysisResult = await formRecognizer.analyzeReceipt(buffer, file.name);
      } else {
        analysisResult = await formRecognizer.analyzeDocument(buffer, file.name);
      }
    } catch (error) {
      console.error('Azure Form Recognizer エラー:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'OCR処理中にエラーが発生しました',
        details: error instanceof Error ? error.stack : undefined
      }, { status: 500 });
    }

    // GridFSにファイルを保存
    let fileId: string | null = null;
    try {
      fileId = await formRecognizer.saveToGridFS(buffer, file.name, {
        companyId,
        documentType,
        uploadedAt: new Date(),
        mimeType: file.type
      });
    } catch (error) {
      console.error('GridFS保存エラー:', error);
      // GridFS保存に失敗してもOCR結果は返す
    }

    // OCR結果をMongoDBに保存
    let ocrResultId: string | null = null;
    try {
      const ocrResult = await db.create('ocrResults', {
        companyId: new ObjectId(companyId === 'default' ? new ObjectId() : companyId),
        sourceFileId: fileId ? new ObjectId(fileId) : null,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        documentType: analysisResult.documentType,
        status: 'completed',
        confidence: analysisResult.confidence,
        extractedData: analysisResult.fields || analysisResult.extractedData,
        processedAt: new Date(),
        processingDurationMs: analysisResult.processingTime,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      ocrResultId = ocrResult._id.toString();
    } catch (error) {
      console.error('MongoDB保存エラー:', error);
      // MongoDB保存に失敗してもOCR結果は返す
    }

    // レスポンスを返す
    return NextResponse.json({
      success: true,
      ocrResultId,
      fileId,
      documentType: analysisResult.documentType,
      confidence: analysisResult.confidence,
      extractedData: analysisResult.fields || analysisResult.extractedData,
      processingTime: analysisResult.processingTime,
      message: 'OCR処理が完了しました'
    });

  } catch (error) {
    console.error('API エラー:', error);
    
    // エラーメッセージの詳細を取得
    let errorMessage = '予期しないエラーが発生しました';
    let errorDetails = undefined;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
      
      // MongoDBエラーの特定
      if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
        errorMessage = 'MongoDB接続エラー: データベースに接続できません';
      }
      // Azure Form Recognizerエラーの特定
      else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Azure Form Recognizer認証エラー: APIキーを確認してください';
      }
      else if (error.message.includes('404') || error.message.includes('Not Found')) {
        errorMessage = 'Azure Form Recognizerエンドポイントエラー: エンドポイントURLを確認してください';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // 環境変数の状態を確認（デバッグ用）
  const config = {
    useAzureMongoDB: process.env.USE_AZURE_MONGODB === 'true',
    azureEndpoint: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT ? 'Configured' : 'Missing',
    azureKey: process.env.AZURE_FORM_RECOGNIZER_KEY ? 'Configured' : 'Missing',
    mongoUri: process.env.MONGODB_URI ? 'Configured' : 'Missing',
  };

  return NextResponse.json({
    message: 'OCR Analyze API (Azure Form Recognizer)',
    method: 'POST',
    accepts: 'multipart/form-data',
    fields: {
      file: 'required, PDF or image file',
      companyId: 'optional, company identifier'
    },
    configuration: config
  });
}

// Node.js Runtimeを使用（Edge Runtimeではファイル処理に制限があるため）
export const runtime = 'nodejs';