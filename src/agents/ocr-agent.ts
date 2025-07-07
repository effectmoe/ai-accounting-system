import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// OCR結果のスキーマ定義
const ocrResultSchema = z.object({
  success: z.boolean(),
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
  provider: z.string(),
  timestamp: z.string(),
  error: z.string().optional(),
});

// OCRエージェントの入力スキーマ
const ocrInputSchema = z.object({
  fileId: z.string().optional(),
  filePath: z.string().optional(),
  fileUrl: z.string().optional(),
  fileType: z.enum(['pdf', 'image']),
  language: z.enum(['ja', 'en']).default('ja'),
  extractType: z.enum(['receipt', 'invoice', 'general', 'handwritten']).default('receipt'),
  preferredProviders: z.array(z.enum(['handwriting_ocr', 'google_vision', 'gas_ocr'])).optional(),
  validationEnabled: z.boolean().default(true),
});

// MCP Client for communicating with OCR MCP Server
class OCRMCPClient {
  private mcpProcess: any = null;

  constructor() {
    this.initializeMCPServer();
  }

  private async initializeMCPServer() {
    try {
      const mcpServerPath = path.join(__dirname, '../mcp-servers/ocr-mcp-server.ts');
      
      // Check if the MCP server file exists
      if (!fs.existsSync(mcpServerPath)) {
        throw new Error(`OCR MCP Server not found at: ${mcpServerPath}`);
      }

      console.log('✅ OCR MCP Server path verified');
    } catch (error) {
      console.error('❌ OCR MCP Server initialization failed:', error);
    }
  }

  async callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const mcpServerPath = path.join(__dirname, '../mcp-servers/ocr-mcp-server.ts');
        
        // Start MCP server process
        const mcpProcess = spawn('npx', ['tsx', mcpServerPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let responseData = '';
        let errorData = '';

        // Prepare MCP request
        const request = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        };

        // Send request to MCP server
        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        mcpProcess.stdin.end();

        // Handle response
        mcpProcess.stdout.on('data', (data) => {
          responseData += data.toString();
        });

        mcpProcess.stderr.on('data', (data) => {
          errorData += data.toString();
        });

        mcpProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`MCP Server exited with code ${code}: ${errorData}`));
            return;
          }

          try {
            // Parse response (might contain multiple JSON lines)
            const lines = responseData.trim().split('\n');
            let result = null;

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.result) {
                  result = parsed.result;
                  break;
                }
              } catch (e) {
                // Skip non-JSON lines
                continue;
              }
            }

            if (result && result.content && result.content[0]) {
              const content = JSON.parse(result.content[0].text);
              resolve(content);
            } else {
              reject(new Error('Invalid MCP response format'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse MCP response: ${error.message}`));
          }
        });

        // Handle process errors
        mcpProcess.on('error', (error) => {
          reject(new Error(`MCP Server process error: ${error.message}`));
        });

        // Timeout handling
        setTimeout(() => {
          mcpProcess.kill();
          reject(new Error('MCP Server request timeout'));
        }, 30000); // 30秒タイムアウト

      } catch (error) {
        reject(new Error(`MCP Client error: ${error.message}`));
      }
    });
  }
}

// OCRエージェント定義
export const ocrAgent = createAgent({
  id: 'ocr-agent',
  name: 'OCR Processing Agent with MCP Integration',
  description: 'Process documents using OCR via external MCP servers and extract structured data',
  
  inputSchema: ocrInputSchema,
  outputSchema: ocrResultSchema,
  
  // エージェントのツール
  tools: {
    // ファイルデータの準備
    prepareFileData: {
      description: 'Prepare file data for OCR processing',
      execute: async ({ filePath, fileUrl }) => {
        try {
          let fileData: Buffer;
          let fileName: string;

          if (filePath) {
            if (!fs.existsSync(filePath)) {
              throw new Error(`File not found: ${filePath}`);
            }
            fileData = fs.readFileSync(filePath);
            fileName = path.basename(filePath);
          } else if (fileUrl) {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(fileUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch file: ${response.statusText}`);
            }
            fileData = Buffer.from(await response.arrayBuffer());
            fileName = path.basename(fileUrl);
          } else {
            throw new Error('No file input provided');
          }

          return {
            fileData: fileData.toString('base64'),
            fileName,
            mimeType: this.getMimeType(fileName),
          };
        } catch (error) {
          throw new Error(`File preparation failed: ${error.message}`);
        }
      },
    },

    // MCP経由でのOCR実行
    performOCR: {
      description: 'Perform OCR using MCP servers',
      execute: async ({ fileData, fileName, mimeType, language, extractType, preferredProviders }) => {
        const mcpClient = new OCRMCPClient();
        const results = [];
        const providers = preferredProviders || ['gas_ocr', 'google_vision', 'handwriting_ocr'];

        // 手書き文書の場合はHandwritingOCRを優先
        if (extractType === 'handwritten' && !preferredProviders) {
          providers.unshift('handwriting_ocr');
        }

        for (const provider of providers) {
          try {
            console.log(`🔍 Trying OCR with provider: ${provider}`);
            
            let result;
            switch (provider) {
              case 'handwriting_ocr':
                result = await mcpClient.callTool('handwriting_ocr', {
                  fileData,
                  language: language === 'ja' ? 'japanese' : 'english',
                });
                break;
              
              case 'google_vision':
                result = await mcpClient.callTool('google_vision_ocr', {
                  fileData,
                  language,
                  features: ['TEXT_DETECTION'],
                });
                break;
              
              case 'gas_ocr':
                result = await mcpClient.callTool('gas_ocr', {
                  fileData,
                  fileName,
                  mimeType,
                });
                break;
              
              default:
                continue;
            }

            if (result.success && result.text) {
              console.log(`✅ OCR successful with ${provider}`);
              return result;
            } else {
              console.warn(`⚠️ OCR failed with ${provider}:`, result.error);
              results.push({ provider, error: result.error });
            }
          } catch (error) {
            console.warn(`⚠️ OCR provider ${provider} failed:`, error.message);
            results.push({ provider, error: error.message });
          }
        }

        throw new Error(`All OCR providers failed: ${JSON.stringify(results)}`);
      },
    },

    // 構造化情報の抽出
    extractStructuredInfo: {
      description: 'Extract structured information from OCR text',
      execute: async ({ text, extractType }) => {
        const mcpClient = new OCRMCPClient();
        
        try {
          const result = await mcpClient.callTool('extract_receipt_info', {
            text,
            extractType,
          });

          if (result.success) {
            return result.extractedInfo;
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          console.warn('Structured extraction failed, using fallback');
          // フォールバック: 基本的な抽出
          return {
            vendor: '',
            date: '',
            amount: 0,
            tax: 0,
            items: [],
            confidence: 0.1,
          };
        }
      },
    },

    // OCR結果の検証
    validateResult: {
      description: 'Validate OCR results',
      execute: async ({ ocrResult, validationEnabled }) => {
        if (!validationEnabled) {
          return { isValid: true, errors: [], warnings: [] };
        }

        const mcpClient = new OCRMCPClient();
        
        try {
          const result = await mcpClient.callTool('validate_ocr_result', {
            ocrResult,
            validationRules: ['amount_format', 'date_format', 'vendor_name'],
          });

          if (result.success) {
            return result.validation;
          } else {
            throw new Error(result.error);
          }
        } catch (error) {
          console.warn('Validation failed:', error.message);
          return { isValid: true, errors: [], warnings: ['Validation service unavailable'] };
        }
      },
    },

    // MIME タイプの判定
    getMimeType: {
      description: 'Get MIME type from file name',
      execute: ({ fileName }) => {
        const ext = path.extname(fileName).toLowerCase();
        const mimeTypes = {
          '.pdf': 'application/pdf',
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.tiff': 'image/tiff',
          '.bmp': 'image/bmp',
        };
        return mimeTypes[ext] || 'application/octet-stream';
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('🚀 [OCR Agent] Starting OCR processing:', input);

      // Step 1: ファイルデータの準備
      const filePrep = await tools.prepareFileData({
        filePath: input.filePath,
        fileUrl: input.fileUrl,
      });

      // Step 2: OCR実行
      const ocrResult = await tools.performOCR({
        fileData: filePrep.fileData,
        fileName: filePrep.fileName,
        mimeType: filePrep.mimeType,
        language: input.language,
        extractType: input.extractType,
        preferredProviders: input.preferredProviders,
      });

      // Step 3: 構造化情報の抽出
      const structuredInfo = await tools.extractStructuredInfo({
        text: ocrResult.text,
        extractType: input.extractType,
      });

      // Step 4: 結果の統合
      const finalResult = {
        ...ocrResult,
        ...structuredInfo,
        fileName: filePrep.fileName,
      };

      // Step 5: 結果の検証
      const validation = await tools.validateResult({
        ocrResult: finalResult,
        validationEnabled: input.validationEnabled,
      });

      // Step 6: 最終結果の構築
      const result = {
        success: true,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        vendor: structuredInfo.vendor,
        date: structuredInfo.date,
        amount: structuredInfo.amount,
        tax: structuredInfo.tax,
        items: structuredInfo.items || [],
        provider: ocrResult.provider,
        timestamp: ocrResult.timestamp,
        validation,
        metadata: {
          fileName: filePrep.fileName,
          extractType: input.extractType,
          language: input.language,
          fileSize: Buffer.from(filePrep.fileData, 'base64').length,
        },
      };

      console.log('✅ [OCR Agent] Processing completed successfully');
      console.log(`📊 Results: vendor=${result.vendor}, amount=${result.amount}, confidence=${result.confidence}`);

      return result;
      
    } catch (error) {
      console.error('❌ [OCR Agent] Processing failed:', error);
      return {
        success: false,
        text: '',
        confidence: 0,
        provider: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
});

// エージェントのエクスポート
export default ocrAgent;