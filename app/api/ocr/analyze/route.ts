import { NextRequest, NextResponse } from 'next/server';
import { getFormRecognizerService } from '../../../../src/lib/azure-form-recognizer';
import { db } from '../../../../src/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { OCRDateExtractor } from '../../../../src/lib/ocr-date-extractor';

// 金額文字列から数値を抽出する関数
function extractAmount(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // "800円" → 800
    const match = value.match(/[\d,]+/);
    if (match) {
      return parseInt(match[0].replace(/,/g, ''));
    }
  }
  return 0;
}

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
    
    console.log('OCR Analyze Request:', {
      fileName: file?.name,
      fileSize: file?.size,
      companyId: companyId
    });
    
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

    // 分析結果の詳細をログ出力
    console.log('Analysis result fields:', JSON.stringify(analysisResult.fields, null, 2));
    
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
        companyId: companyId === 'default' ? '11111111-1111-1111-1111-111111111111' : companyId,
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

    // MongoDBのdocumentsコレクションに保存（書類管理画面で表示するため）
    try {
      // 金額抽出のデバッグ
      console.log('Raw fields data:', JSON.stringify(analysisResult.fields, null, 2));
      console.log('customFields:', analysisResult.fields?.customFields);
      
      const totalAmountExtracted = extractAmount(analysisResult.fields?.InvoiceTotal) || 
                                  extractAmount(analysisResult.fields?.totalAmount) || 
                                  extractAmount(analysisResult.fields?.total) || 
                                  extractAmount(analysisResult.fields?.customFields?.InvoiceTotal) || 0;
      
      const taxAmountExtracted = extractAmount(analysisResult.fields?.taxAmount) || 
                                extractAmount(analysisResult.fields?.tax) || 
                                extractAmount(analysisResult.fields?.customFields?.Tax) || 0;
      
      console.log('Extracted amounts:', { totalAmount: totalAmountExtracted, taxAmount: taxAmountExtracted });
      
      // 日付を適切に解析
      let documentDate = null; // デフォルトをnullに
      let dateFound = false;
      
      // OCRDateExtractorを使用して日付を抽出
      const extractedText = JSON.stringify(analysisResult.fields || {});
      console.log('OCR結果から日付を抽出中...');
      
      const dateExtraction = OCRDateExtractor.extractDate(extractedText);
      
      if (dateExtraction.date) {
        documentDate = dateExtraction.date;
        dateFound = true;
        console.log(`日付抽出成功: ${documentDate.toISOString().split('T')[0]}`);  
        console.log(`信頼度: ${dateExtraction.confidence}, パターン: ${dateExtraction.matchedPattern}`);
      } else {
        console.error('OCRDateExtractor: 日付を抽出できませんでした');
      }
      
      // パターンマッチで見つからない場合は、フィールドから探す
      if (!dateFound) {
        console.log('日付パターンマッチ失敗 - フィールドから探索');
        const dateFields = [
          analysisResult.fields?.invoiceDate,
          analysisResult.fields?.transactionDate,
          analysisResult.fields?.InvoiceDate,
          analysisResult.fields?.TransactionDate,
          analysisResult.fields?.Date,
          analysisResult.fields?.date,
          analysisResult.fields?.customFields?.Date,
          analysisResult.fields?.customFields?.InvoiceDate,
          analysisResult.fields?.customFields?.TransactionDate
        ];
        
        console.log('Available date fields:', dateFields.filter(d => d));
        
        // 有効な日付を見つける
        for (const dateField of dateFields) {
          if (dateField) {
            try {
              const parsedDate = new Date(dateField);
              if (!isNaN(parsedDate.getTime())) {
                documentDate = parsedDate;
                dateFound = true;
                console.log('Parsed date from field:', documentDate);
                break;
              }
            } catch (e) {
              console.log('Failed to parse date:', dateField);
            }
          }
        }
      }
      
      const vendorName = analysisResult.fields?.vendorName || analysisResult.fields?.merchantName || 
                        analysisResult.fields?.VendorName || analysisResult.fields?.MerchantName || 
                        file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, '');
      
      // 勘定科目をtryブロック外で宣言
      let category = '未分類';
      
      try {
        const { OCRProcessor } = await import('../../../../src/lib/ocr-processor');
        const ocrProcessor = new OCRProcessor();
        
        const ocrResultForJournal = {
          vendor: vendorName,
          amount: totalAmountExtracted,
          taxAmount: taxAmountExtracted,
          date: documentDate.toISOString().split('T')[0],
          items: []
        };
        
        const journalEntry = await ocrProcessor.createJournalEntry(
          ocrResultForJournal,
          companyId === 'default' ? '11111111-1111-1111-1111-111111111111' : companyId
        );
        
        category = journalEntry.debitAccount;
      } catch (error) {
        console.error('Category prediction error:', error);
        // categoryは既に初期化済み
      }
      
      // 日付が見つからない場合の処理
      if (!dateFound || !documentDate) {
        console.error('エラー: レシートから日付を抽出できませんでした');
        console.error('抽出されたテキスト:', extractedText.substring(0, 1000));
        
        // 日付が読み取れない場合はエラーを返す
        return NextResponse.json({
          success: false,
          error: 'OCRで日付を読み取れませんでした。手動で入力してください。',
          partialData: {
            vendorName: vendorName,
            totalAmount: totalAmountExtracted,
            taxAmount: taxAmountExtracted,
            category: category,
            extractedFields: analysisResult.fields
          }
        }, { status: 422 });
      }
      
      const documentData = {
        companyId: companyId === 'default' ? '11111111-1111-1111-1111-111111111111' : companyId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        documentType: analysisResult.documentType || 'receipt',
        vendorName: vendorName,
        totalAmount: totalAmountExtracted,
        taxAmount: taxAmountExtracted,
        documentDate: documentDate || null,  // 日付がない場合はnull
        issue_date: documentDate || null,  // 日付表示用
        receipt_date: documentDate ? documentDate.toISOString().split('T')[0] : null, // 領収書の日付
        category: category,
        subcategory: null,
        extractedText: JSON.stringify(analysisResult.fields, null, 2),
        confidence: analysisResult.confidence || 0.8, // デフォルト80%
        ocrStatus: 'completed',
        ocrResultId: ocrResultId ? new ObjectId(ocrResultId) : null,
        gridfsFileId: fileId ? new ObjectId(fileId) : null,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Saving document to MongoDB:', {
        companyId: documentData.companyId,
        fileName: documentData.fileName,
        vendorName: documentData.vendorName,
        totalAmount: documentData.totalAmount
      });
      
      const savedDocument = await db.create('documents', documentData);
      console.log('Document saved to MongoDB:', savedDocument._id.toString());
      
    } catch (error) {
      console.error('MongoDB document save error:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // MongoDBへの保存に失敗した場合、エラーを返す
      return NextResponse.json({
        success: false,
        error: 'ドキュメントの保存に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    
    // 日付のデフォルト値（MongoDocument保存セクションのスコープ外で使用）
    let finalDocumentDate = null; // デフォルトをnullに
    let finalVendorName = file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, '');
    
    // 勘定科目とレスポンス用データを準備
    let categoryForResponse = '未分類';
    try {
      // MongoDB保存セクションで抽出したデータを再利用
      const { OCRProcessor } = await import('../../../../src/lib/ocr-processor');
      const ocrProcessor = new OCRProcessor();
      
      finalVendorName = analysisResult.fields?.vendorName || analysisResult.fields?.merchantName || 
                       analysisResult.fields?.VendorName || analysisResult.fields?.MerchantName || 
                       file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, '');
      
      const totalAmountExtracted = extractAmount(analysisResult.fields?.InvoiceTotal) || 
                                  extractAmount(analysisResult.fields?.totalAmount) || 
                                  extractAmount(analysisResult.fields?.total) || 
                                  extractAmount(analysisResult.fields?.customFields?.InvoiceTotal) || 0;
      
      const taxAmountExtracted = extractAmount(analysisResult.fields?.taxAmount) || 
                                extractAmount(analysisResult.fields?.tax) || 
                                extractAmount(analysisResult.fields?.customFields?.Tax) || 0;
      
      // OCRDateExtractorを使用して日付を再抽出（レスポンス用）
      const extractedText = JSON.stringify(analysisResult.fields || {});
      const responseDateExtraction = OCRDateExtractor.extractDate(extractedText);
      
      if (responseDateExtraction.date) {
        finalDocumentDate = responseDateExtraction.date;
        console.log(`レスポンス用日付抽出成功: ${finalDocumentDate.toISOString().split('T')[0]}`);
      }
      
      const ocrResultForJournal = {
        vendor: finalVendorName,
        amount: totalAmountExtracted,
        taxAmount: taxAmountExtracted,
        date: finalDocumentDate ? finalDocumentDate.toISOString().split('T')[0] : null,
        items: []
      };
      
      const journalEntry = await ocrProcessor.createJournalEntry(
        ocrResultForJournal,
        companyId === 'default' ? '11111111-1111-1111-1111-111111111111' : companyId
      );
      
      categoryForResponse = journalEntry.debitAccount;
    } catch (error) {
      console.error('Category prediction error:', error);
      categoryForResponse = '未分類';
    }

    // レスポンスを返す
    return NextResponse.json({
      success: true,
      ocrResultId,
      fileId,
      documentType: analysisResult.documentType,
      confidence: analysisResult.confidence || 0.8,
      extractedData: analysisResult.fields || analysisResult.extractedData,
      processingTime: analysisResult.processingTime,
      message: 'OCR処理が完了しました',
      // チャット画面で使用するための追加情報
      category: categoryForResponse,
      receiptDate: finalDocumentDate ? finalDocumentDate.toISOString().split('T')[0] : null,
      vendorName: finalVendorName,
      dateExtracted: dateFound // 日付抽出の成否を追加
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