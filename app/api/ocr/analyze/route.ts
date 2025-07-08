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
    const mimeType = file.type;
    let documentType = 'document';
    
    // PDFファイルの場合は、より包括的な分析を試みる
    if (mimeType === 'application/pdf') {
      // PDFは請求書として扱うことが多いため、デフォルトでinvoiceとして処理
      documentType = 'invoice';
    } else if (fileName.includes('invoice') || fileName.includes('請求')) {
      documentType = 'invoice';
    } else if (fileName.includes('receipt') || fileName.includes('領収')) {
      documentType = 'receipt';
    }

    // Azure Form Recognizerでファイルを分析
    const formRecognizer = getFormRecognizerService();
    let analysisResult;
    
    try {
      // 最初に指定されたドキュメントタイプで分析を試みる
      try {
        if (documentType === 'invoice') {
          analysisResult = await formRecognizer.analyzeInvoice(buffer, file.name);
        } else if (documentType === 'receipt') {
          analysisResult = await formRecognizer.analyzeReceipt(buffer, file.name);
        } else {
          analysisResult = await formRecognizer.analyzeDocument(buffer, file.name);
        }
      } catch (firstError) {
        console.log(`Failed to analyze as ${documentType}, trying alternative methods...`);
        
        // PDFの場合、invoice → receipt → layout の順で試す
        if (mimeType === 'application/pdf') {
          if (documentType !== 'receipt') {
            try {
              analysisResult = await formRecognizer.analyzeReceipt(buffer, file.name);
              console.log('Successfully analyzed as receipt');
            } catch (e) {
              // レイアウト分析にフォールバック
              analysisResult = await formRecognizer.analyzeDocument(buffer, file.name);
              console.log('Fallback to layout analysis');
            }
          } else {
            // receiptで失敗した場合はlayout分析
            analysisResult = await formRecognizer.analyzeDocument(buffer, file.name);
          }
        } else {
          throw firstError;
        }
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
      console.error('Error details:', error instanceof Error ? error.stack : error);
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
      console.error('Error details:', error instanceof Error ? error.stack : error);
      // MongoDB保存に失敗してもOCR結果は返す
    }

    // Supabaseのdocumentsテーブルにも保存（書類管理画面で表示するため）
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // OCR結果からドキュメントデータを作成
        const documentData = {
          company_id: companyId === 'default' ? '11111111-1111-1111-1111-111111111111' : companyId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          vendor_name: analysisResult.fields?.vendorName || analysisResult.fields?.merchantName || file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, ''),
          total_amount: analysisResult.fields?.InvoiceTotal || analysisResult.fields?.totalAmount || analysisResult.fields?.total || 0,
          tax_amount: analysisResult.fields?.taxAmount || analysisResult.fields?.tax || 0,
          receipt_date: analysisResult.fields?.invoiceDate || analysisResult.fields?.transactionDate || new Date().toISOString().split('T')[0],
          category: '未分類',
          subcategory: null,
          extracted_text: JSON.stringify(analysisResult.fields, null, 2),
          confidence: analysisResult.confidence || 0,
          ocr_status: 'completed',
          ocr_result_id: ocrResultId,
          gridfs_file_id: fileId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
          .from('documents')
          .insert(documentData)
          .select()
          .single();
        
        if (error) {
          console.error('Supabase document save error:', error);
        } else {
          console.log('Document saved to Supabase:', data.id);
        }
      }
    } catch (error) {
      console.error('Supabase integration error:', error);
      // Supabaseへの保存に失敗しても続行
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