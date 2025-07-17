import { NextRequest, NextResponse } from 'next/server';
import orchestrator from '@/mastra-orchestrator';
import { getDatabase, DatabaseService } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { OCRDateExtractor } from '@/lib/ocr-date-extractor';

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
    console.log('OCR分析API - Mastraエージェントを使用します');
    
    // MongoDB接続確認（Vercel環境対応）
    try {
      console.log('MongoDB接続確認中... (Vercel環境)');
      const db = await getDatabase();
      await db.admin().ping();
      console.log('MongoDB接続確認完了 (Vercel環境)');
    } catch (error) {
      console.error('MongoDB接続に失敗しました:', error);
      return NextResponse.json({
        success: false,
        error: 'データベース接続エラー: MongoDBに接続できません',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
    // 環境変数チェック
    const useAzureMongoDB = process.env.USE_AZURE_MONGODB === 'true';
    
    if (!useAzureMongoDB) {
      // 旧システムにリダイレクト
      return NextResponse.json({
        success: false,
        error: 'Please use /api/ocr for the legacy system'
      }, { status: 400 });
    }

    // Mastraエージェントの確認
    const availableAgents = orchestrator.getAvailableAgents();
    if (!availableAgents.includes('ocr-agent')) {
      return NextResponse.json({
        success: false,
        error: 'OCRエージェントが利用できません'
      }, { status: 500 });
    }

    // フォームデータを取得
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string || 'default';
    const documentType = formData.get('documentType') as string || 'receipt';
    
    console.log('OCR Analyze Request:', {
      fileName: file?.name,
      fileSize: file?.size,
      companyId: companyId,
      documentType: documentType
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
    const fileBuffer = buffer.toString('base64');

    // Azure Form Recognizerを使用してOCR処理
    console.log(`Azure Form Recognizerで${documentType === 'invoice' ? '請求書/見積書' : '領収書'}を分析中...`);
    
    // 直接Azure Form Recognizerサービスを使用
    const { getFormRecognizerService } = await import('@/lib/azure-form-recognizer');
    const formRecognizer = getFormRecognizerService();
    
    const startTime = Date.now();
    
    // ドキュメントタイプに応じて適切な分析メソッドを選択
    let analysisResult;
    if (documentType === 'invoice' || documentType === 'supplier-quote') {
      // 請求書/見積書として分析（invoiceモデルを使用）
      analysisResult = await formRecognizer.analyzeInvoice(buffer, file.name);
    } else {
      // 領収書として分析（receiptモデルを使用）
      analysisResult = await formRecognizer.analyzeReceipt(buffer, file.name);
    }
    
    const processingTime = Date.now() - startTime;
    
    // GridFSにファイルを保存
    const sourceFileId = await formRecognizer.saveToGridFS(
      buffer,
      file.name,
      { companyId: companyId, uploadedAt: new Date().toISOString() }
    );
    
    // OCR結果をMongoDBに保存
    const ocrResult = {
      companyId: companyId === 'default' ? '11111111-1111-1111-1111-111111111111' : companyId,
      sourceFileId: sourceFileId,
      fileName: file.name,
      fileSize: buffer.length,
      mimeType: file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'),
      processedAt: new Date(),
      processingTime,
      documentType: documentType,
      confidence: analysisResult.confidence,
      status: 'completed',
      extractedData: analysisResult.fields,
      rawResult: analysisResult.rawResult,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    let savedOcrResult;
    let ocrResultId;
    try {
      console.log('OCR結果をMongoDBに保存中...', JSON.stringify(ocrResult, null, 2));
      
      // Vercel環境対応の安全な実行
      const dbService = DatabaseService.getInstance();
      savedOcrResult = await dbService.create('ocr_results', ocrResult);
      
      ocrResultId = savedOcrResult._id.toString();
      console.log('OCR結果をMongoDBに保存しました:', ocrResultId);
    } catch (mongoError) {
      console.error('MongoDB OCR結果保存エラー:', mongoError);
      console.error('エラーの詳細:', {
        name: mongoError instanceof Error ? mongoError.name : 'Unknown',
        message: mongoError instanceof Error ? mongoError.message : 'Unknown error',
        stack: mongoError instanceof Error ? mongoError.stack : undefined
      });
      return NextResponse.json({
        success: false,
        error: 'OCR結果の保存に失敗しました',
        details: mongoError instanceof Error ? mongoError.message : 'Unknown MongoDB error'
      }, { status: 500 });
    }
    const fileId = sourceFileId;

    // 結果の検証
    if (!analysisResult || !analysisResult.fields) {
      return NextResponse.json({
        success: false,
        error: 'OCR処理に失敗しました：フィールドを抽出できませんでした'
      }, { status: 500 });
    }

    // 分析結果の詳細をログ出力
    console.log('Analysis result fields:', JSON.stringify(analysisResult.fields, null, 2));
    console.log('OCR Result ID:', ocrResultId);
    console.log('File ID:', fileId);

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
      let documentDate: Date | null = null; // デフォルトをnullに
      let dateFound = false;
      
      // OCRDateExtractorを使用して日付を抽出
      const extractedTextForDate = JSON.stringify(analysisResult.fields || {});
      console.log('OCR結果から日付を抽出中...');
      
      const dateExtraction = OCRDateExtractor.extractDate(extractedTextForDate);
      
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
      
      // 完全なベンダー名を抽出（OCRテキスト全体から）
      const extractedText = JSON.stringify(analysisResult.fields || {});
      let vendorName = analysisResult.fields?.vendorName || analysisResult.fields?.merchantName || 
                      analysisResult.fields?.VendorName || analysisResult.fields?.MerchantName || 
                      file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, '');
      
      // より詳細なベンダー名をOCRテキストから抽出
      const vendorPatterns = [
        /タイムズ24株式会社/g,
        /タイムズ福岡/g,
        /タイムズ.*?(?=\n|,|"|$)/g,
        /株式会社.*?(?=\n|,|"|$)/g,
        /[^\\n"]*株式会社[^\\n"]*/g
      ];
      
      // OCRテキストから直接抽出を試行
      const cleanedText = extractedText.replace(/[\\"\{\}]/g, ' ').replace(/\s+/g, ' ');
      
      for (const pattern of vendorPatterns) {
        const matches = cleanedText.match(pattern);
        if (matches && matches[0].trim().length > vendorName.length) {
          vendorName = matches[0].trim();
          break;
        }
      }
      
      // merchantNameフィールドからも抽出を試行
      if (analysisResult.fields?.merchantName && typeof analysisResult.fields.merchantName === 'string') {
        if (analysisResult.fields.merchantName.length > vendorName.length) {
          vendorName = analysisResult.fields.merchantName;
        }
      }
      
      // 最終的にJSONのようなデータが混入していた場合はクリーンアップ
      if (vendorName.includes('merchantPhoneNumber') || vendorName.includes('transactionDate')) {
        // フォールバック：ファイル名から推測
        if (file.name.toLowerCase().includes('times') || file.name.toLowerCase().includes('タイムズ')) {
          vendorName = 'タイムズ';
        } else {
          vendorName = file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, '');
        }
      }
      
      console.log('Extracted vendor name:', vendorName);
      console.log('OCR extracted text sample:', extractedText.substring(0, 500));
      
      // 新しいAIベースの勘定科目分類システムを使用
      let category = '未分類';
      
      try {
        const { AccountCategoryAI } = await import('@/lib/account-category-ai');
        const categoryAI = new AccountCategoryAI();
        
        const ocrResultForAI = {
          text: extractedText,
          vendor: vendorName,
          amount: totalAmountExtracted,
          taxAmount: taxAmountExtracted,
          date: documentDate ? documentDate.toISOString().split('T')[0] : null,
          items: []
        };
        
        console.log('Calling AI category prediction with:', {
          vendor: vendorName,
          amount: totalAmountExtracted,
          textLength: extractedText.length
        });
        
        const prediction = await categoryAI.predictAccountCategory(
          ocrResultForAI,
          companyId === 'default' ? '11111111-1111-1111-1111-111111111111' : companyId
        );
        
        if (prediction && prediction.category) {
          category = prediction.category;
          console.log('AI prediction result:', {
            category: prediction.category,
            confidence: prediction.confidence,
            reasoning: prediction.reasoning?.substring(0, 200)
          });
        } else {
          console.warn('AI prediction returned null or invalid result');
        }
      } catch (error) {
        console.error('AI Category prediction error:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
        // フォールバック：古いシステムを使用
        try {
          const { OCRProcessor } = await import('@/lib/ocr-processor');
          const ocrProcessor = new OCRProcessor();
          
          const ocrResultForJournal = {
            vendor: vendorName,
            amount: totalAmountExtracted,
            taxAmount: taxAmountExtracted,
            date: documentDate ? documentDate.toISOString().split('T')[0] : null,
            items: []
          };
          
          const journalEntry = await ocrProcessor.createJournalEntry(
            ocrResultForJournal,
            companyId === 'default' ? '11111111-1111-1111-1111-111111111111' : companyId
          );
          
          if (journalEntry && journalEntry.debitAccount) {
            category = journalEntry.debitAccount;
          }
        } catch (fallbackError) {
          console.error('Fallback OCRProcessor also failed:', fallbackError);
        }
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
        receipt_date: documentDate && !isNaN(documentDate.getTime()) ? documentDate.toISOString().split('T')[0] : null, // 領収書の日付
        category: category,
        subcategory: null,
        extractedText: JSON.stringify(analysisResult.fields, null, 2),
        confidence: analysisResult.confidence || 0.8, // デフォルト80%
        ocrStatus: 'completed',
        ocrResultId: ocrResultId || null,
        gridfsFileId: fileId || null,
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
      
      let savedDocument;
      try {
        // Vercel環境対応の安全な実行
        const dbService = DatabaseService.getInstance();
        savedDocument = await dbService.create('documents', documentData);
        console.log('Document saved to MongoDB:', savedDocument._id.toString());
      } catch (mongoError) {
        console.error('MongoDB documents保存エラー:', mongoError);
        throw new Error(`ドキュメントの保存に失敗しました: ${mongoError instanceof Error ? mongoError.message : 'Unknown error'}`);
      }
      
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
    let finalDocumentDate: Date | null = null; // デフォルトをnullに
    let finalVendorName = file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, '');
    let finalDateFound = false; // レスポンス用のdateFound
    
    // 勘定科目とレスポンス用データを準備
    let categoryForResponse = '未分類';
    try {
      // MongoDB保存セクションで抽出したデータを再利用
      const { OCRProcessor } = await import('@/lib/ocr-processor');
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
        finalDateFound = true;
        console.log(`レスポンス用日付抽出成功: ${finalDocumentDate.toISOString().split('T')[0]}`);
      }
      
      const ocrResultForJournal = {
        vendor: finalVendorName,
        amount: totalAmountExtracted,
        taxAmount: taxAmountExtracted,
        date: finalDocumentDate && !isNaN(finalDocumentDate.getTime()) ? finalDocumentDate.toISOString().split('T')[0] : null,
        items: []
      };
      
      const journalEntry = await ocrProcessor.createJournalEntry(
        ocrResultForJournal,
        companyId === 'default' ? '11111111-1111-1111-1111-111111111111' : companyId
      );
      
      if (journalEntry && journalEntry.debitAccount) {
        categoryForResponse = journalEntry.debitAccount;
      }
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
      receiptDate: finalDocumentDate && !isNaN(finalDocumentDate.getTime()) ? finalDocumentDate.toISOString().split('T')[0] : null,
      vendorName: finalVendorName,
      dateExtracted: finalDateFound // 日付抽出の成否を追加
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