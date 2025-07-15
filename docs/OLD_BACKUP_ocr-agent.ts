import { z } from 'zod';
import { createAgent } from '@mastra/core';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

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
  fileType: z.enum(['pdf', 'image']),
  language: z.enum(['ja', 'en']).default('ja'),
  extractType: z.enum(['receipt', 'invoice', 'general', 'handwritten']).default('receipt'),
});

// OCRエージェント定義
export const ocrAgent = createAgent({
  id: 'ocr-agent',
  name: 'OCR Processing Agent',
  description: 'Process documents using OCR and extract structured data',
  
  inputSchema: ocrInputSchema,
  outputSchema: ocrResultSchema,
  
  // エージェントのツール
  tools: {
    // 手書き特化OCR (HandwritingOCR)
    handwritingOCR: {
      description: 'Perform OCR specialized for handwritten text',
      execute: async ({ fileData, language }) => {
        try {
          // HandwritingOCR APIを使用
          const formData = new FormData();
          formData.append('image', fileData);
          formData.append('language', language === 'ja' ? 'japanese' : 'english');
          
          const response = await fetch('https://api.handwritingocr.com/v1/ocr', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.HANDWRITING_OCR_API_KEY}`,
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
          console.error('HandwritingOCR failed:', error);
          throw error;
        }
      },
    },
    
    // Google Cloud Vision API を使用したOCR
    googleVisionOCR: {
      description: 'Use Google Cloud Vision API for OCR',
      execute: async ({ fileData, language }) => {
        const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
        const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
        
        const request = {
          requests: [{
            image: {
              content: fileData.toString('base64'),
            },
            features: [{
              type: 'TEXT_DETECTION',
              maxResults: 1,
            }],
            imageContext: {
              languageHints: [language],
            },
          }],
        };
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        
        const result = await response.json();
        return result.responses[0].textAnnotations[0]?.description || '';
      },
    },
    
    // Google Apps Script OCR
    gasOCR: {
      description: 'Use Google Apps Script for OCR processing',
      execute: async ({ fileData, fileName }) => {
        const gasUrl = process.env.GAS_OCR_URL;
        if (!gasUrl) throw new Error('GAS_OCR_URL not configured');
        
        const formData = new FormData();
        formData.append('file', fileData, fileName);
        
        const response = await fetch(gasUrl, {
          method: 'POST',
          body: formData,
        });
        
        return await response.json();
      },
    },
    
    // テキスト解析ツール
    extractReceiptInfo: {
      description: 'Extract receipt information from OCR text',
      execute: async ({ text }) => {
        const info = {
          vendor: '',
          date: '',
          amount: 0,
          tax: 0,
          items: [],
        };
        
        // ベンダー名の抽出
        const vendorMatch = text.match(/(?:株式会社|有限会社|合同会社)?[\u4e00-\u9fa5\u30a0-\u30ff]+(?:株式会社|店|商店|ストア)?/);
        if (vendorMatch) {
          info.vendor = vendorMatch[0];
        }
        
        // 日付の抽出
        const dateMatch = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/);
        if (dateMatch) {
          const year = dateMatch[1];
          const month = dateMatch[2].padStart(2, '0');
          const day = dateMatch[3].padStart(2, '0');
          info.date = `${year}-${month}-${day}`;
        }
        
        // 金額の抽出
        const amountMatches = text.match(/[¥￥]?\s*([0-9,]+)\s*円?/g);
        if (amountMatches && amountMatches.length > 0) {
          const amounts = amountMatches.map(m => 
            parseInt(m.replace(/[¥￥,円\s]/g, ''))
          ).filter(a => !isNaN(a));
          
          if (amounts.length > 0) {
            info.amount = Math.max(...amounts);
            // 10%の消費税を想定
            info.tax = Math.floor(info.amount * 0.1 / 1.1);
          }
        }
        
        return info;
      },
    },
    
    // MCP サーバー呼び出し
    callMCPServer: {
      description: 'Call MCP server for OCR processing',
      execute: async ({ server, method, params }) => {
        // MCP サーバーとの通信
        const response = await fetch(`http://localhost:3002/mcp/${server}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method, params }),
        });
        
        return await response.json();
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('[OCR Agent] Starting OCR processing:', input);
      
      let fileData: Buffer;
      let fileName: string;
      
      // ファイルデータの取得
      if (input.filePath) {
        fileData = fs.readFileSync(input.filePath);
        fileName = path.basename(input.filePath);
      } else if (input.fileUrl) {
        const response = await fetch(input.fileUrl);
        fileData = Buffer.from(await response.arrayBuffer());
        fileName = path.basename(input.fileUrl);
      } else {
        throw new Error('No file input provided');
      }
      
      // OCR処理の実行
      let ocrText = '';
      let ocrResult: any = null;
      
      // 手書き文書の検出
      const isHandwritten = input.extractType === 'handwritten' || 
                          (fileName && fileName.includes('手書き'));
      
      // 手書きの場合はHandwritingOCRを優先
      if (isHandwritten && process.env.HANDWRITING_OCR_API_KEY) {
        try {
          console.log('[OCR Agent] Using HandwritingOCR for handwritten document');
          ocrResult = await tools.handwritingOCR({
            fileData,
            language: input.language,
          });
          ocrText = ocrResult.text;
        } catch (handwritingError) {
          console.warn('HandwritingOCR failed, falling back to other OCR methods:', handwritingError);
        }
      }
      
      // 手書きOCRが失敗または手書きでない場合、GAS OCRを試す
      if (!ocrText && process.env.GAS_OCR_URL) {
        try {
          const gasResult = await tools.gasOCR({ fileData, fileName });
          ocrText = gasResult.extracted_text || '';
        } catch (error) {
          console.error('[OCR Agent] GAS OCR failed:', error);
        }
      }
      
      // 全て失敗した場合、Google Vision APIをフォールバック
      if (!ocrText) {
        ocrText = await tools.googleVisionOCR({ 
          fileData, 
          language: input.language 
        });
      }
      
      // 抽出タイプに応じた処理
      let extractedInfo = {};
      
      if (input.extractType === 'receipt') {
        extractedInfo = await tools.extractReceiptInfo({ text: ocrText });
      } else if (input.extractType === 'invoice') {
        // 請求書用の処理（TODO: 実装）
        extractedInfo = await tools.extractReceiptInfo({ text: ocrText });
      }
      
      // 結果の構築
      const result = {
        text: ocrText,
        confidence: 0.95, // TODO: 実際の信頼度を取得
        ...extractedInfo,
      };
      
      console.log('[OCR Agent] OCR processing completed:', {
        textLength: ocrText.length,
        vendor: result.vendor,
        amount: result.amount,
      });
      
      return result;
      
    } catch (error) {
      console.error('[OCR Agent] Error:', error);
      throw error;
    }
  },
});

// エージェントのエクスポート
export default ocrAgent;