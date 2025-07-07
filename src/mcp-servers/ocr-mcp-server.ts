#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

// OCR MCP Server for Mastra Agents
class OCRMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'ocr-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[OCR MCP Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'handwriting_ocr',
            description: 'Process handwritten text using HandwritingOCR API',
            inputSchema: {
              type: 'object',
              properties: {
                fileData: {
                  type: 'string',
                  description: 'Base64 encoded image data',
                },
                language: {
                  type: 'string',
                  enum: ['japanese', 'english'],
                  default: 'japanese',
                  description: 'Language for OCR processing',
                },
              },
              required: ['fileData'],
            },
          },
          {
            name: 'google_vision_ocr',
            description: 'Process documents using Google Cloud Vision API',
            inputSchema: {
              type: 'object',
              properties: {
                fileData: {
                  type: 'string',
                  description: 'Base64 encoded image data',
                },
                language: {
                  type: 'string',
                  enum: ['ja', 'en'],
                  default: 'ja',
                  description: 'Language hints for OCR',
                },
                features: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['TEXT_DETECTION', 'DOCUMENT_TEXT_DETECTION'],
                  },
                  default: ['TEXT_DETECTION'],
                  description: 'Vision API features to use',
                },
              },
              required: ['fileData'],
            },
          },
          {
            name: 'gas_ocr',
            description: 'Process documents using Google Apps Script OCR',
            inputSchema: {
              type: 'object',
              properties: {
                fileData: {
                  type: 'string',
                  description: 'Base64 encoded file data',
                },
                fileName: {
                  type: 'string',
                  description: 'Original file name',
                },
                mimeType: {
                  type: 'string',
                  description: 'MIME type of the file',
                },
              },
              required: ['fileData', 'fileName'],
            },
          },
          {
            name: 'extract_receipt_info',
            description: 'Extract structured information from OCR text',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description: 'OCR extracted text',
                },
                extractType: {
                  type: 'string',
                  enum: ['receipt', 'invoice', 'general'],
                  default: 'receipt',
                  description: 'Type of document to extract info from',
                },
              },
              required: ['text'],
            },
          },
          {
            name: 'validate_ocr_result',
            description: 'Validate and improve OCR results',
            inputSchema: {
              type: 'object',
              properties: {
                ocrResult: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    confidence: { type: 'number' },
                    vendor: { type: 'string' },
                    amount: { type: 'number' },
                    date: { type: 'string' },
                  },
                  required: ['text'],
                },
                validationRules: {
                  type: 'array',
                  items: { type: 'string' },
                  default: ['amount_format', 'date_format', 'vendor_name'],
                },
              },
              required: ['ocrResult'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'handwriting_ocr':
            return await this.handleHandwritingOCR(args);
          case 'google_vision_ocr':
            return await this.handleGoogleVisionOCR(args);
          case 'gas_ocr':
            return await this.handleGASRecognition(args);
          case 'extract_receipt_info':
            return await this.handleExtractReceiptInfo(args);
          case 'validate_ocr_result':
            return await this.handleValidateOCRResult(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  // HandwritingOCR API integration
  private async handleHandwritingOCR(args: any) {
    const { fileData, language = 'japanese' } = args;

    if (!process.env.HANDWRITING_OCR_API_TOKEN) {
      throw new Error('HANDWRITING_OCR_API_TOKEN not configured');
    }

    try {
      // Convert base64 to buffer
      const buffer = Buffer.from(fileData, 'base64');
      
      const formData = new FormData();
      formData.append('image', buffer, { filename: 'image.png' });
      formData.append('language', language);

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
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              text: result.text || '',
              confidence: result.confidence || 0.85,
              isHandwritten: true,
              lines: result.lines || [],
              provider: 'handwriting_ocr',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              provider: 'handwriting_ocr',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Google Vision API integration
  private async handleGoogleVisionOCR(args: any) {
    const { fileData, language = 'ja', features = ['TEXT_DETECTION'] } = args;

    if (!process.env.GOOGLE_CLOUD_API_KEY) {
      throw new Error('GOOGLE_CLOUD_API_KEY not configured');
    }

    try {
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_API_KEY}`;

      const requestBody = {
        requests: [
          {
            image: {
              content: fileData,
            },
            features: features.map((feature) => ({
              type: feature,
              maxResults: 1,
            })),
            imageContext: {
              languageHints: [language],
            },
          },
        ],
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Google Vision API error: ${response.statusText}`);
      }

      const result = await response.json();
      const textAnnotation = result.responses[0]?.textAnnotations?.[0];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              text: textAnnotation?.description || '',
              confidence: 0.95, // Google Vision doesn't provide confidence scores
              boundingBox: textAnnotation?.boundingPoly,
              provider: 'google_vision',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              provider: 'google_vision',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Google Apps Script OCR integration
  private async handleGASRecognition(args: any) {
    const { fileData, fileName, mimeType } = args;

    if (!process.env.GAS_OCR_URL) {
      throw new Error('GAS_OCR_URL not configured');
    }

    try {
      const buffer = Buffer.from(fileData, 'base64');
      const formData = new FormData();
      formData.append('file', buffer, { 
        filename: fileName,
        contentType: mimeType || 'application/octet-stream'
      });

      const response = await fetch(process.env.GAS_OCR_URL, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`GAS OCR error: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              text: result.extracted_text || '',
              confidence: result.confidence || 0.9,
              provider: 'google_apps_script',
              metadata: result.metadata || {},
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              provider: 'google_apps_script',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Extract structured receipt information
  private async handleExtractReceiptInfo(args: any) {
    const { text, extractType = 'receipt' } = args;

    try {
      const extractedInfo = {
        vendor: '',
        date: '',
        amount: 0,
        tax: 0,
        items: [],
        confidence: 0,
      };

      // ベンダー名の抽出
      const vendorPatterns = [
        /(?:株式会社|有限会社|合同会社)?\s*([ぁ-んァ-ヶ一-龯\w]+)(?:株式会社|店|商店|ストア|コーポレーション)?/g,
        /([A-Za-z\s]+(?:Store|Shop|Market|Corp|Company|Inc))/gi,
      ];

      for (const pattern of vendorPatterns) {
        const match = text.match(pattern);
        if (match) {
          extractedInfo.vendor = match[0].trim();
          break;
        }
      }

      // 日付の抽出
      const datePatterns = [
        /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/,
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
        /(\d{4})\/(\d{1,2})\/(\d{1,2})/,
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          if (pattern.source.includes('年')) {
            const [, year, month, day] = match;
            extractedInfo.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          } else {
            // Handle different date formats
            const [, part1, part2, part3] = match;
            if (part3.length === 4) {
              extractedInfo.date = `${part3}-${part1.padStart(2, '0')}-${part2.padStart(2, '0')}`;
            } else {
              extractedInfo.date = `${part1}-${part2.padStart(2, '0')}-${part3.padStart(2, '0')}`;
            }
          }
          break;
        }
      }

      // 金額の抽出
      const amountPatterns = [
        /[¥￥]?\s*([0-9,]+)\s*円?/g,
        /合計[：:\s]*[¥￥]?\s*([0-9,]+)\s*円?/i,
        /小計[：:\s]*[¥￥]?\s*([0-9,]+)\s*円?/i,
      ];

      const amounts = [];
      for (const pattern of amountPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const amount = parseInt(match[1].replace(/,/g, ''));
          if (!isNaN(amount)) {
            amounts.push(amount);
          }
        }
      }

      if (amounts.length > 0) {
        extractedInfo.amount = Math.max(...amounts);
        // 消費税の推定 (10%税率を仮定)
        extractedInfo.tax = Math.floor(extractedInfo.amount * 0.1 / 1.1);
      }

      // 信頼度の計算
      let confidenceScore = 0;
      if (extractedInfo.vendor) confidenceScore += 0.3;
      if (extractedInfo.date) confidenceScore += 0.3;
      if (extractedInfo.amount > 0) confidenceScore += 0.4;
      extractedInfo.confidence = confidenceScore;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              extractedInfo,
              extractType,
              provider: 'structure_extractor',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              provider: 'structure_extractor',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Validate OCR results
  private async handleValidateOCRResult(args: any) {
    const { ocrResult, validationRules = ['amount_format', 'date_format', 'vendor_name'] } = args;

    try {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };

      // Amount format validation
      if (validationRules.includes('amount_format') && ocrResult.amount) {
        if (ocrResult.amount < 0) {
          validation.errors.push('金額は負の値にできません');
          validation.isValid = false;
        }
        if (ocrResult.amount > 10000000) {
          validation.warnings.push('非常に高額な取引です。確認してください');
        }
      }

      // Date format validation
      if (validationRules.includes('date_format') && ocrResult.date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(ocrResult.date)) {
          validation.errors.push('日付フォーマットが正しくありません (YYYY-MM-DD)');
          validation.isValid = false;
        } else {
          const date = new Date(ocrResult.date);
          const now = new Date();
          if (date > now) {
            validation.warnings.push('未来の日付が設定されています');
          }
          if (now.getTime() - date.getTime() > 365 * 24 * 60 * 60 * 1000) {
            validation.warnings.push('1年以上前の領収書です');
          }
        }
      }

      // Vendor name validation
      if (validationRules.includes('vendor_name') && ocrResult.vendor) {
        if (ocrResult.vendor.length < 2) {
          validation.errors.push('ベンダー名が短すぎます');
          validation.isValid = false;
        }
        if (/^\d+$/.test(ocrResult.vendor)) {
          validation.warnings.push('ベンダー名が数字のみです。確認してください');
        }
      }

      // Confidence check
      if (ocrResult.confidence < 0.7) {
        validation.warnings.push('OCR信頼度が低いです。手動確認を推奨します');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              validation,
              originalResult: ocrResult,
              provider: 'ocr_validator',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              provider: 'ocr_validator',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OCR MCP Server running on stdio');
  }
}

// Create and run server
const server = new OCRMCPServer();
server.run().catch((error) => {
  console.error('Fatal error in OCR MCP server:', error);
  process.exit(1);
});