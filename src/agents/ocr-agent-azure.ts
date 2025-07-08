import { Agent, createTool } from '@mastra/core';
import { z } from 'zod';
import { getFormRecognizerService } from '../lib/azure-form-recognizer';
import { db, Collections } from '../lib/mongodb-client';
import { OcrResult, DocumentType } from '../models/mongodb-schemas';
import { ObjectId } from 'mongodb';

// Azure Form Recognizer OCRエージェント
export const ocrAgent = new Agent({
  id: 'ocr-agent',
  name: 'OCR Agent',
  description: 'Azure Form Recognizerを使用した帳票のOCR処理と構造化データの抽出',
  model: {
    provider: 'OPENAI',
    name: 'gpt-4',
    toolChoice: 'auto',
  },
  tools: {
    // 請求書の分析
    analyzeInvoice: createTool({
      id: 'analyze-invoice',
      description: '請求書をOCR処理して構造化データを抽出',
      inputSchema: z.object({
        fileBuffer: z.string().describe('Base64エンコードされたファイルデータ'),
        fileName: z.string(),
        companyId: z.string(),
        metadata: z.any().optional(),
      }),
      execute: async (input) => {
        const formRecognizer = getFormRecognizerService();
        const buffer = Buffer.from(input.fileBuffer, 'base64');
        
        try {
          // Azure Form Recognizerで分析
          const analysisResult = await formRecognizer.analyzeInvoice(buffer, input.fileName);
          
          // GridFSにファイルを保存
          const sourceFileId = await formRecognizer.saveToGridFS(
            buffer,
            input.fileName,
            { companyId: input.companyId, ...input.metadata }
          );
          
          // OCR結果をMongoDBに保存
          const ocrResult: Omit<OcrResult, '_id' | 'createdAt' | 'updatedAt'> = {
            companyId: new ObjectId(input.companyId),
            sourceFileId: new ObjectId(sourceFileId),
            fileName: input.fileName,
            fileSize: buffer.length,
            mimeType: input.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            processedAt: new Date(),
            processingTime: 0, // 後で計算
            documentType: DocumentType.INVOICE,
            confidence: analysisResult.confidence,
            status: 'completed',
            extractedData: analysisResult.fields,
            rawResult: analysisResult.rawResult,
          };
          
          const savedResult = await db.create<OcrResult>(Collections.OCR_RESULTS, ocrResult);
          
          return {
            success: true,
            ocrResultId: savedResult._id.toString(),
            documentType: 'invoice',
            confidence: analysisResult.confidence,
            extractedData: analysisResult.fields,
            sourceFileId: sourceFileId,
          };
        } catch (error) {
          console.error('Invoice analysis error:', error);
          
          // エラー情報を保存
          const errorResult = await db.create<OcrResult>(Collections.OCR_RESULTS, {
            companyId: new ObjectId(input.companyId),
            sourceFileId: new ObjectId('000000000000000000000000'), // ダミー
            fileName: input.fileName,
            fileSize: buffer.length,
            mimeType: 'unknown',
            processedAt: new Date(),
            processingTime: 0,
            documentType: DocumentType.INVOICE,
            confidence: 0,
            status: 'failed',
            error: error.message,
            extractedData: {},
          });
          
          throw error;
        }
      },
    }),

    // 領収書の分析
    analyzeReceipt: createTool({
      id: 'analyze-receipt',
      description: '領収書をOCR処理して構造化データを抽出',
      inputSchema: z.object({
        fileBuffer: z.string().describe('Base64エンコードされたファイルデータ'),
        fileName: z.string(),
        companyId: z.string(),
        metadata: z.any().optional(),
      }),
      execute: async (input) => {
        const formRecognizer = getFormRecognizerService();
        const buffer = Buffer.from(input.fileBuffer, 'base64');
        
        try {
          const startTime = Date.now();
          
          // Azure Form Recognizerで分析
          const analysisResult = await formRecognizer.analyzeReceipt(buffer, input.fileName);
          
          const processingTime = Date.now() - startTime;
          
          // GridFSにファイルを保存
          const sourceFileId = await formRecognizer.saveToGridFS(
            buffer,
            input.fileName,
            { companyId: input.companyId, ...input.metadata }
          );
          
          // OCR結果をMongoDBに保存
          const ocrResult: Omit<OcrResult, '_id' | 'createdAt' | 'updatedAt'> = {
            companyId: new ObjectId(input.companyId),
            sourceFileId: new ObjectId(sourceFileId),
            fileName: input.fileName,
            fileSize: buffer.length,
            mimeType: input.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            processedAt: new Date(),
            processingTime,
            documentType: DocumentType.RECEIPT,
            confidence: analysisResult.confidence,
            status: 'completed',
            extractedData: analysisResult.fields,
            rawResult: analysisResult.rawResult,
          };
          
          const savedResult = await db.create<OcrResult>(Collections.OCR_RESULTS, ocrResult);
          
          return {
            success: true,
            ocrResultId: savedResult._id.toString(),
            documentType: 'receipt',
            confidence: analysisResult.confidence,
            extractedData: analysisResult.fields,
            sourceFileId: sourceFileId,
          };
        } catch (error) {
          console.error('Receipt analysis error:', error);
          throw error;
        }
      },
    }),

    // 汎用ドキュメントの分析
    analyzeDocument: createTool({
      id: 'analyze-document',
      description: '汎用ドキュメントをOCR処理してレイアウトとテキストを抽出',
      inputSchema: z.object({
        fileBuffer: z.string().describe('Base64エンコードされたファイルデータ'),
        fileName: z.string(),
        companyId: z.string(),
        documentType: z.enum(['purchaseOrder', 'estimate', 'deliveryNote', 'other']).optional(),
        metadata: z.any().optional(),
      }),
      execute: async (input) => {
        const formRecognizer = getFormRecognizerService();
        const buffer = Buffer.from(input.fileBuffer, 'base64');
        
        try {
          const analysisResult = await formRecognizer.analyzeDocument(buffer, input.fileName);
          
          // GridFSにファイルを保存
          const sourceFileId = await formRecognizer.saveToGridFS(
            buffer,
            input.fileName,
            { companyId: input.companyId, ...input.metadata }
          );
          
          // ドキュメントタイプの決定
          const docType = input.documentType ? 
            DocumentType[input.documentType.toUpperCase() as keyof typeof DocumentType] : 
            DocumentType.OTHER;
          
          // OCR結果をMongoDBに保存
          const ocrResult: Omit<OcrResult, '_id' | 'createdAt' | 'updatedAt'> = {
            companyId: new ObjectId(input.companyId),
            sourceFileId: new ObjectId(sourceFileId),
            fileName: input.fileName,
            fileSize: buffer.length,
            mimeType: input.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
            processedAt: new Date(),
            processingTime: 0,
            documentType: docType,
            confidence: analysisResult.confidence,
            status: 'completed',
            extractedData: analysisResult.fields,
            rawResult: analysisResult.rawResult,
          };
          
          const savedResult = await db.create<OcrResult>(Collections.OCR_RESULTS, ocrResult);
          
          return {
            success: true,
            ocrResultId: savedResult._id.toString(),
            documentType: docType,
            confidence: analysisResult.confidence,
            extractedData: analysisResult.fields,
            sourceFileId: sourceFileId,
          };
        } catch (error) {
          console.error('Document analysis error:', error);
          throw error;
        }
      },
    }),

    // 手書き文書のOCR（HandwritingOcr互換）
    analyzeHandwriting: createTool({
      id: 'analyze-handwriting',
      description: '手書き文書をOCR処理（HandwritingOcr互換）',
      inputSchema: z.object({
        fileBuffer: z.string().describe('Base64エンコードされたファイルデータ'),
        fileName: z.string(),
        companyId: z.string(),
        language: z.enum(['ja', 'en']).default('ja'),
      }),
      execute: async (input) => {
        const formRecognizer = getFormRecognizerService();
        const buffer = Buffer.from(input.fileBuffer, 'base64');
        
        try {
          // レイアウト分析を使用して手書きテキストを抽出
          const analysisResult = await formRecognizer.analyzeDocument(buffer, input.fileName);
          
          // テキストの抽出
          let extractedText = '';
          if (analysisResult.fields.paragraphs) {
            extractedText = analysisResult.fields.paragraphs
              .map((p: any) => p.content)
              .join('\n');
          }
          
          // GridFSにファイルを保存
          const sourceFileId = await formRecognizer.saveToGridFS(
            buffer,
            input.fileName,
            { companyId: input.companyId, handwriting: true }
          );
          
          // OCR結果をMongoDBに保存
          const ocrResult: Omit<OcrResult, '_id' | 'createdAt' | 'updatedAt'> = {
            companyId: new ObjectId(input.companyId),
            sourceFileId: new ObjectId(sourceFileId),
            fileName: input.fileName,
            fileSize: buffer.length,
            mimeType: 'image/jpeg',
            processedAt: new Date(),
            processingTime: 0,
            documentType: DocumentType.OTHER,
            confidence: 0.8, // 手書きの場合は固定値
            status: 'completed',
            extractedData: {
              text: extractedText,
              language: input.language,
            },
            handwritingOcrResult: {
              text: extractedText,
              confidence: 0.8,
              provider: 'azure-form-recognizer',
            },
          };
          
          const savedResult = await db.create<OcrResult>(Collections.OCR_RESULTS, ocrResult);
          
          return {
            success: true,
            ocrResultId: savedResult._id.toString(),
            text: extractedText,
            confidence: 0.8,
            provider: 'azure-form-recognizer',
          };
        } catch (error) {
          console.error('Handwriting analysis error:', error);
          throw error;
        }
      },
    }),

    // バッチ処理
    batchProcess: createTool({
      id: 'batch-process',
      description: '複数ファイルの一括OCR処理',
      inputSchema: z.object({
        files: z.array(z.object({
          fileBuffer: z.string(),
          fileName: z.string(),
          type: z.enum(['invoice', 'receipt', 'document']).optional(),
        })),
        companyId: z.string(),
        maxConcurrent: z.number().min(1).max(10).default(5),
      }),
      execute: async (input) => {
        const formRecognizer = getFormRecognizerService();
        
        const fileBuffers = input.files.map(f => ({
          buffer: Buffer.from(f.fileBuffer, 'base64'),
          fileName: f.fileName,
          type: f.type,
        }));
        
        const results = await formRecognizer.batchProcess(fileBuffers, input.maxConcurrent);
        
        // 結果をMongoDBに保存
        const savedResults = [];
        for (const result of results) {
          if (result.result) {
            const ocrResult: Omit<OcrResult, '_id' | 'createdAt' | 'updatedAt'> = {
              companyId: new ObjectId(input.companyId),
              sourceFileId: new ObjectId('000000000000000000000000'), // バッチ処理では個別保存しない
              fileName: result.fileName,
              fileSize: 0,
              mimeType: 'unknown',
              processedAt: new Date(),
              processingTime: 0,
              documentType: result.result.documentType as DocumentType,
              confidence: result.result.confidence,
              status: 'completed',
              extractedData: result.result.fields,
            };
            
            const saved = await db.create<OcrResult>(Collections.OCR_RESULTS, ocrResult);
            savedResults.push({
              fileName: result.fileName,
              ocrResultId: saved._id.toString(),
              success: true,
            });
          } else {
            savedResults.push({
              fileName: result.fileName,
              error: result.error,
              success: false,
            });
          }
        }
        
        return {
          totalFiles: input.files.length,
          successCount: savedResults.filter(r => r.success).length,
          failureCount: savedResults.filter(r => !r.success).length,
          results: savedResults,
        };
      },
    }),

    // OCR結果の検証
    validateOcrResult: createTool({
      id: 'validate-ocr-result',
      description: 'OCR結果の精度と完全性を検証',
      inputSchema: z.object({
        ocrResultId: z.string(),
        minConfidence: z.number().min(0).max(1).default(0.8),
      }),
      execute: async (input) => {
        const ocrResult = await db.findById<OcrResult>(
          Collections.OCR_RESULTS,
          input.ocrResultId
        );
        
        if (!ocrResult) {
          throw new Error('OCR result not found');
        }
        
        const validation = {
          isValid: true,
          errors: [] as string[],
          warnings: [] as string[],
        };
        
        // 信頼度チェック
        if (ocrResult.confidence < input.minConfidence) {
          validation.warnings.push(
            `Confidence score (${ocrResult.confidence}) is below threshold (${input.minConfidence})`
          );
        }
        
        // 必須フィールドチェック
        const extractedData = ocrResult.extractedData;
        if (ocrResult.documentType === DocumentType.INVOICE) {
          if (!extractedData.vendorName) {
            validation.errors.push('Vendor name is missing');
            validation.isValid = false;
          }
          if (!extractedData.totalAmount) {
            validation.errors.push('Total amount is missing');
            validation.isValid = false;
          }
          if (!extractedData.invoiceDate) {
            validation.warnings.push('Invoice date is missing');
          }
        } else if (ocrResult.documentType === DocumentType.RECEIPT) {
          if (!extractedData.merchantName) {
            validation.errors.push('Merchant name is missing');
            validation.isValid = false;
          }
          if (!extractedData.total) {
            validation.errors.push('Total amount is missing');
            validation.isValid = false;
          }
        }
        
        return validation;
      },
    }),

    // OCR履歴の取得
    getOcrHistory: createTool({
      id: 'get-ocr-history',
      description: '会社のOCR処理履歴を取得',
      inputSchema: z.object({
        companyId: z.string(),
        limit: z.number().min(1).max(100).default(20),
        skip: z.number().min(0).default(0),
        documentType: z.nativeEnum(DocumentType).optional(),
        status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
      }),
      execute: async (input) => {
        const filter: any = { companyId: new ObjectId(input.companyId) };
        
        if (input.documentType) {
          filter.documentType = input.documentType;
        }
        if (input.status) {
          filter.status = input.status;
        }
        
        const results = await db.find<OcrResult>(
          Collections.OCR_RESULTS,
          filter,
          {
            sort: { processedAt: -1 },
            limit: input.limit,
            skip: input.skip,
          }
        );
        
        const total = await db.count(Collections.OCR_RESULTS, filter);
        
        return {
          results: results.map(r => ({
            id: r._id.toString(),
            fileName: r.fileName,
            documentType: r.documentType,
            confidence: r.confidence,
            status: r.status,
            processedAt: r.processedAt,
            extractedData: r.extractedData,
          })),
          total,
          hasMore: input.skip + results.length < total,
        };
      },
    }),
  },
});