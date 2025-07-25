import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

import { logger } from '@/lib/logger';
// OCR結果のスキーマ定義
const ocrResultSchema = z.object({
  text: z.string(),
  confidence: z.number(),
  vendor: z.string().optional(),
  date: z.string().optional(),
  amount: z.number().optional(),
  tax: z.number().optional(),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    price: z.number(),
  })).optional(),
});

// OCRエージェントの入力スキーマ
const ocrInputSchema = z.object({
  fileId: z.string().optional(),
  filePath: z.string().optional(),
  fileUrl: z.string().optional(),
  fileData: z.string().optional(), // base64 encoded
  fileType: z.enum(['pdf', 'image']),
  language: z.enum(['ja', 'en']).default('ja'),
  extractType: z.enum(['receipt', 'invoice', 'general', 'handwritten']).default('receipt'),
  companyId: z.string(),
});

// OCRエージェント定義
export const ocrAgent = createAgent({
  id: 'ocr-agent',
  name: 'OCR Processing Agent',
  description: 'Process documents using Azure Form Recognizer OCR and extract structured data with MongoDB integration',
  
  inputSchema: ocrInputSchema,
  outputSchema: ocrResultSchema,
  
  // エージェントのツール
  tools: {
    // Azure Form Recognizer OCR
    azureFormRecognizerOCR: {
      description: 'Use Azure Form Recognizer for OCR processing',
      execute: async ({ fileData, extractType }) => {
        try {
          const { DocumentAnalysisClient, AzureKeyCredential } = await import('@azure/ai-form-recognizer');
          
          const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
          const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
          
          if (!endpoint || !apiKey) {
            throw new Error('Azure Form Recognizer credentials not configured');
          }
          
          const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));
          
          // Base64データをBufferに変換
          const buffer = Buffer.from(fileData, 'base64');
          
          let modelId = 'prebuilt-document';
          
          // 抽出タイプに応じてモデルを選択
          switch (extractType) {
            case 'receipt':
              modelId = 'prebuilt-receipt';
              break;
            case 'invoice':
              modelId = 'prebuilt-invoice';
              break;
            case 'general':
              modelId = 'prebuilt-document';
              break;
            default:
              modelId = 'prebuilt-document';
          }
          
          const poller = await client.beginAnalyzeDocument(modelId, buffer);
          const result = await poller.pollUntilDone();
          
          // テキスト抽出
          let extractedText = '';
          if (result.content) {
            extractedText = result.content;
          }
          
          // 構造化データの抽出
          let structuredData = {};
          
          if (result.documents && result.documents.length > 0) {
            const document = result.documents[0];
            const fields = document.fields;
            
            if (fields) {
              // レシート/請求書の構造化データを抽出
              structuredData = {
                merchantName: fields.MerchantName?.content || fields.VendorName?.content || '',
                transactionDate: fields.TransactionDate?.content || fields.InvoiceDate?.content || '',
                total: parseFloat(fields.Total?.content || fields.InvoiceTotal?.content || '0'),
                tax: parseFloat(fields.TotalTax?.content || fields.TaxAmount?.content || '0'),
                items: fields.Items?.values?.map((item: any) => ({
                  name: item.properties?.Name?.content || item.properties?.Description?.content || '',
                  quantity: parseFloat(item.properties?.Quantity?.content || '1'),
                  price: parseFloat(item.properties?.Price?.content || item.properties?.Amount?.content || '0'),
                })) || []
              };
            }
          }
          
          return {
            text: extractedText,
            confidence: result.documents?.[0]?.confidence || 0.85,
            structuredData,
            isAzure: true,
          };
          
        } catch (error) {
          logger.error('Azure Form Recognizer OCR failed:', error);
          throw error;
        }
      },
    },
    
    // 手書き特化OCR (HandwritingOCR) - フォールバック
    handwritingOCR: {
      description: 'Perform OCR specialized for handwritten text',
      execute: async ({ fileData, language }) => {
        try {
          const fetch = (await import('node-fetch')).default;
          const FormData = (await import('form-data')).default;
          
          if (!process.env.HANDWRITING_OCR_API_TOKEN) {
            throw new Error('HandwritingOCR API token not configured');
          }
          
          // HandwritingOCR APIを使用
          const formData = new FormData();
          formData.append('image', Buffer.from(fileData, 'base64'));
          formData.append('language', language === 'ja' ? 'japanese' : 'english');
          
          const response = await fetch('https://api.handwritingocr.com/v1/ocr', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.HANDWRITING_OCR_API_TOKEN}`,
            },
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error(`HandwritingOCR API error: ${response.statusText}`);
          }
          
          const result = await response.json();
          
          return {
            text: result.text,
            confidence: result.confidence || 0.85,
            isHandwritten: true,
            lines: result.lines || [],
          };
        } catch (error) {
          logger.error('HandwritingOCR failed:', error);
          throw error;
        }
      },
    },
    
    // テキスト解析ツール
    extractReceiptInfo: {
      description: 'Extract receipt information from OCR text',
      execute: async ({ text, structuredData }) => {
        const info = {
          vendor: '',
          date: '',
          amount: 0,
          tax: 0,
          items: [],
        };
        
        // 構造化データが利用可能な場合はそれを優先
        if (structuredData) {
          info.vendor = structuredData.merchantName || '';
          info.date = structuredData.transactionDate || '';
          info.amount = structuredData.total || 0;
          info.tax = structuredData.tax || 0;
          info.items = structuredData.items || [];
          
          // 日付フォーマットの正規化
          if (info.date) {
            const dateMatch = info.date.match(/(\d{4})[年\/\-]?(\d{1,2})[月\/\-]?(\d{1,2})/);
            if (dateMatch) {
              const year = dateMatch[1];
              const month = dateMatch[2].padStart(2, '0');
              const day = dateMatch[3].padStart(2, '0');
              info.date = `${year}-${month}-${day}`;
            }
          }
        }
        
        // 構造化データが不完全な場合はテキストから補完
        if (!info.vendor) {
          const vendorMatch = text.match(/(?:株式会社|有限会社|合同会社)?[\u4e00-\u9fa5\u30a0-\u30ff]+(?:株式会社|店|商店|ストア)?/);
          if (vendorMatch) {
            info.vendor = vendorMatch[0];
          }
        }
        
        // 日付の抽出
        if (!info.date) {
          const dateMatch = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/);
          if (dateMatch) {
            const year = dateMatch[1];
            const month = dateMatch[2].padStart(2, '0');
            const day = dateMatch[3].padStart(2, '0');
            info.date = `${year}-${month}-${day}`;
          }
        }
        
        // 金額の抽出
        if (!info.amount) {
          const amountMatches = text.match(/[¥￥]?\s*([0-9,]+)\s*円?/g);
          if (amountMatches && amountMatches.length > 0) {
            const amounts = amountMatches.map(m => 
              parseInt(m.replace(/[¥￥,円\s]/g, ''))
            ).filter(a => !isNaN(a));
            
            if (amounts.length > 0) {
              info.amount = Math.max(...amounts);
              // 10%の消費税を想定
              if (!info.tax) {
                info.tax = Math.floor(info.amount * 0.1 / 1.1);
              }
            }
          }
        }
        
        return info;
      },
    },
    
    // OCR結果をMongoDBに保存
    saveOCRResult: {
      description: 'Save OCR result to MongoDB',
      execute: async ({ fileId, ocrResult, extractedInfo, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          const ocrRecord = {
            fileId,
            companyId,
            extractedText: ocrResult.text,
            confidence: ocrResult.confidence,
            ocrProvider: ocrResult.isAzure ? 'azure' : (ocrResult.isHandwritten ? 'handwriting' : 'unknown'),
            extractedData: {
              vendor: extractedInfo.vendor,
              date: extractedInfo.date,
              amount: extractedInfo.amount,
              tax: extractedInfo.tax,
              items: extractedInfo.items,
            },
            processingMetadata: {
              modelUsed: ocrResult.isAzure ? 'azure-form-recognizer' : 'handwriting-ocr',
              language: 'ja',
              fileType: 'unknown',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const result = await db.create(Collections.OCR_RESULTS, ocrRecord);
          
          return {
            success: true,
            ocrResultId: result._id.toString(),
            message: 'OCR結果が保存されました'
          };
          
        } catch (error) {
          logger.error('OCR result save error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // ファイルメタデータの更新
    updateFileMetadata: {
      description: 'Update file metadata with OCR results',
      execute: async ({ fileId, ocrResultId, extractedInfo, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // ファイルドキュメントを更新
          const updateData = {
            ocrResultId,
            ocrStatus: 'completed',
            extractedData: extractedInfo,
            ocrCompletedAt: new Date(),
            updatedAt: new Date(),
          };
          
          const result = await db.update(Collections.DOCUMENTS, fileId, updateData);
          
          if (!result) {
            logger.warn(`File document not found for ID: ${fileId}`);
          }
          
          return {
            success: true,
            message: 'ファイルメタデータが更新されました'
          };
          
        } catch (error) {
          logger.error('File metadata update error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      logger.debug('[OCR Agent] Starting OCR processing:', {
        fileId: input.fileId,
        extractType: input.extractType,
        hasFileData: !!input.fileData
      });
      
      let fileData = input.fileData;
      
      // ファイルデータの取得
      if (!fileData && input.fileUrl) {
        try {
          const fetch = (await import('node-fetch')).default;
          const response = await fetch(input.fileUrl);
          const buffer = await response.buffer();
          fileData = buffer.toString('base64');
        } catch (error) {
          throw new Error(`Failed to fetch file from URL: ${error.message}`);
        }
      } else if (!fileData && input.filePath) {
        try {
          const fs = await import('fs');
          const buffer = fs.readFileSync(input.filePath);
          fileData = buffer.toString('base64');
        } catch (error) {
          throw new Error(`Failed to read file from path: ${error.message}`);
        }
      }
      
      if (!fileData) {
        throw new Error('No file data provided');
      }
      
      // OCR処理の実行
      let ocrResult: any = null;
      let ocrText = '';
      
      // 手書き文書の検出
      const isHandwritten = input.extractType === 'handwritten';
      
      // Azure Form Recognizerを最初に試す
      try {
        logger.debug('[OCR Agent] Using Azure Form Recognizer');
        ocrResult = await tools.azureFormRecognizerOCR({
          fileData,
          extractType: input.extractType,
        });
        ocrText = ocrResult.text;
      } catch (azureError) {
        logger.warn('Azure Form Recognizer failed:', azureError);
        
        // 手書きの場合はHandwritingOCRにフォールバック
        if (isHandwritten && process.env.HANDWRITING_OCR_API_TOKEN) {
          try {
            logger.debug('[OCR Agent] Falling back to HandwritingOCR');
            ocrResult = await tools.handwritingOCR({
              fileData,
              language: input.language,
            });
            ocrText = ocrResult.text;
          } catch (handwritingError) {
            logger.error('HandwritingOCR also failed:', handwritingError);
            throw new Error(`All OCR services failed. Azure: ${azureError.message}, Handwriting: ${handwritingError.message}`);
          }
        } else {
          throw azureError;
        }
      }
      
      if (!ocrText) {
        throw new Error('No text extracted from the document');
      }
      
      // 抽出タイプに応じた情報抽出
      let extractedInfo = {};
      
      if (input.extractType === 'receipt' || input.extractType === 'invoice') {
        extractedInfo = await tools.extractReceiptInfo({ 
          text: ocrText,
          structuredData: ocrResult.structuredData 
        });
      }
      
      // 結果をMongoDBに保存
      if (input.fileId) {
        const saveResult = await tools.saveOCRResult({
          fileId: input.fileId,
          ocrResult,
          extractedInfo,
          companyId: input.companyId
        });
        
        if (saveResult.success) {
          // ファイルメタデータの更新
          await tools.updateFileMetadata({
            fileId: input.fileId,
            ocrResultId: saveResult.ocrResultId,
            extractedInfo,
            companyId: input.companyId
          });
        }
      }
      
      // 結果の構築
      const result = {
        success: true,
        text: ocrText,
        confidence: ocrResult.confidence || 0.85,
        ...extractedInfo,
        ocrProvider: ocrResult.isAzure ? 'Azure Form Recognizer' : 'HandwritingOCR',
        extractType: input.extractType,
        message: 'OCR処理が完了しました'
      };
      
      logger.debug('[OCR Agent] OCR processing completed:', {
        textLength: ocrText.length,
        vendor: result.vendor,
        amount: result.amount,
        confidence: result.confidence
      });
      
      return result;
      
    } catch (error) {
      logger.error('[OCR Agent] Error:', error);
      return {
        success: false,
        error: error.message,
        text: '',
        confidence: 0
      };
    }
  },
});

// エージェントのエクスポート
export default ocrAgent;