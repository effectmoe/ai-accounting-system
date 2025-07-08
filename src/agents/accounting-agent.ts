import { z } from 'zod';
import { Agent } from '@mastra/core';
import { spawn } from 'child_process';
import path from 'path';

// 会計分析結果のスキーマ
const accountingResultSchema = z.object({
  success: z.boolean(),
  classification: z.object({
    category: z.string(),
    subcategory: z.string().optional(),
    confidence: z.number(),
    reasoning: z.string(),
    deductible: z.boolean(),
    taxRate: z.number(),
    accountType: z.string(),
  }).optional(),
  journalEntry: z.object({
    date: z.string(),
    description: z.string(),
    entries: z.array(z.object({
      account: z.string(),
      debit: z.number(),
      credit: z.number(),
      description: z.string(),
    })),
    metadata: z.record(z.any()),
  }).optional(),
  validation: z.object({
    isValid: z.boolean(),
    errors: z.array(z.string()),
    warnings: z.array(z.string()),
    suggestions: z.array(z.string()),
  }).optional(),
  alternatives: z.array(z.object({
    category: z.string(),
    confidence: z.number(),
    reason: z.string(),
  })).optional(),
  timestamp: z.string(),
  error: z.string().optional(),
});

// 会計エージェントの入力スキーマ
const accountingInputSchema = z.object({
  operation: z.enum([
    'classify_transaction',
    'validate_category', 
    'suggest_alternatives',
    'create_journal_entry',
    'get_account_info',
    'analyze_ocr_result'
  ]),
  
  // OCR結果からの分析
  ocrResult: z.object({
    text: z.string(),
    vendor: z.string().optional(),
    date: z.string().optional(),
    amount: z.number().optional(),
    tax: z.number().optional(),
    confidence: z.number().optional(),
  }).optional(),
  
  // 直接的な取引分析
  transactionData: z.object({
    vendor: z.string(),
    amount: z.number(),
    date: z.string(),
    description: z.string().optional(),
    category: z.string().optional(),
    paymentMethod: z.enum(['cash', 'credit_card', 'bank_transfer', 'other']).optional(),
  }).optional(),
  
  // 設定・コンテキスト
  businessType: z.string().optional(),
  forceCategory: z.string().optional(),
  validationOnly: z.boolean().default(false),
  createJournal: z.boolean().default(true),
  taxContext: z.any().optional(), // NLWebからの税制情報
});

// MCP Client for Accounting MCP Server
class AccountingMCPClient {
  async callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const mcpServerPath = path.join(__dirname, '../mcp-servers/accounting-mcp-server.ts');
        
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
            reject(new Error(`Accounting MCP Server exited with code ${code}: ${errorData}`));
            return;
          }

          try {
            // Parse response
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

        mcpProcess.on('error', (error) => {
          reject(new Error(`Accounting MCP Server process error: ${error.message}`));
        });

        // Timeout
        setTimeout(() => {
          mcpProcess.kill();
          reject(new Error('Accounting MCP Server request timeout'));
        }, 30000);

      } catch (error) {
        reject(new Error(`Accounting MCP Client error: ${error.message}`));
      }
    });
  }
}

// 会計エージェント定義
export const accountingAgent = new Agent({
  id: 'accounting-agent',
  name: 'Accounting Analysis Agent with MCP Integration',
  description: 'Analyze transactions, classify accounts, and create journal entries using accounting MCP server',
  model: {
    provider: 'OPENAI',
    name: 'gpt-4',
    toolChoice: 'auto',
  },
  inputSchema: accountingInputSchema,
  outputSchema: accountingResultSchema,
  
  tools: {
    // 取引分類
    classifyTransaction: {
      description: 'Classify transaction and assign accounting category',
      execute: async ({ vendor, amount, date, description, businessType, forceCategory }) => {
        const mcpClient = new AccountingMCPClient();
        
        try {
          const result = await mcpClient.callTool('classify_transaction', {
            vendor,
            amount,
            date,
            description,
            businessType,
            forceCategory,
          });

          return result;
        } catch (error) {
          throw new Error(`Classification failed: ${error.message}`);
        }
      },
    },

    // カテゴリ検証
    validateCategory: {
      description: 'Validate accounting category assignment',
      execute: async ({ category, vendor, amount, context }) => {
        const mcpClient = new AccountingMCPClient();
        
        try {
          const result = await mcpClient.callTool('validate_category', {
            category,
            vendor,
            amount,
            context,
          });

          return result;
        } catch (error) {
          throw new Error(`Validation failed: ${error.message}`);
        }
      },
    },

    // 代替案提案
    suggestAlternatives: {
      description: 'Suggest alternative accounting categories',
      execute: async ({ vendor, amount, currentCategory, reason }) => {
        const mcpClient = new AccountingMCPClient();
        
        try {
          const result = await mcpClient.callTool('suggest_alternatives', {
            vendor,
            amount,
            currentCategory,
            reason,
          });

          return result;
        } catch (error) {
          throw new Error(`Alternative suggestion failed: ${error.message}`);
        }
      },
    },

    // 仕訳作成
    createJournalEntry: {
      description: 'Create double-entry bookkeeping journal entry',
      execute: async ({ transactionData }) => {
        const mcpClient = new AccountingMCPClient();
        
        try {
          const result = await mcpClient.callTool('create_journal_entry', {
            transactionData,
          });

          return result;
        } catch (error) {
          throw new Error(`Journal entry creation failed: ${error.message}`);
        }
      },
    },

    // 勘定科目情報取得
    getAccountInfo: {
      description: 'Get accounting category information',
      execute: async ({ category }) => {
        const mcpClient = new AccountingMCPClient();
        
        try {
          const result = await mcpClient.callTool('get_account_info', {
            category,
          });

          return result;
        } catch (error) {
          throw new Error(`Account info retrieval failed: ${error.message}`);
        }
      },
    },

    // OCR結果の構造化
    structureOCRResult: {
      description: 'Structure OCR result for accounting analysis',
      execute: ({ ocrResult, businessType }) => {
        return {
          vendor: ocrResult.vendor || '不明',
          amount: ocrResult.amount || 0,
          date: ocrResult.date || new Date().toISOString().split('T')[0],
          description: ocrResult.text?.substring(0, 200) || '',
          confidence: ocrResult.confidence || 0,
          businessType,
        };
      },
    },

    // 税制コンテキストの適用
    applyTaxContext: {
      description: 'Apply tax context from NLWeb to classification',
      execute: ({ classification, taxContext }) => {
        if (!taxContext) return classification;

        // NLWebから取得した税制情報を分類結果に適用
        const updatedClassification = { ...classification };

        // 例: 軽減税率の適用
        if (taxContext.reducedTaxItems && taxContext.reducedTaxItems.includes(classification.category)) {
          updatedClassification.taxRate = 0.08;
          updatedClassification.reasoning += '（軽減税率8%適用）';
        }

        // 例: 業種特有のルール適用
        if (taxContext.industryRules) {
          for (const rule of taxContext.industryRules) {
            if (rule.category === classification.category) {
              updatedClassification.deductible = rule.deductible;
              updatedClassification.reasoning += `（${rule.reason}）`;
            }
          }
        }

        return updatedClassification;
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('💰 [Accounting Agent] Starting accounting analysis:', input.operation);

      switch (input.operation) {
        case 'analyze_ocr_result': {
          if (!input.ocrResult) {
            throw new Error('OCR result is required for analysis');
          }

          // Step 1: OCR結果の構造化
          const structuredData = await tools.structureOCRResult({
            ocrResult: input.ocrResult,
            businessType: input.businessType,
          });

          // Step 2: 取引分類
          const classificationResult = await tools.classifyTransaction({
            vendor: structuredData.vendor,
            amount: structuredData.amount,
            date: structuredData.date,
            description: structuredData.description,
            businessType: input.businessType,
            forceCategory: input.forceCategory,
          });

          if (!classificationResult.success) {
            throw new Error(classificationResult.error);
          }

          // Step 3: 税制コンテキストの適用
          const finalClassification = await tools.applyTaxContext({
            classification: classificationResult.classification,
            taxContext: input.taxContext,
          });

          // Step 4: カテゴリ検証
          let validation = null;
          if (!input.validationOnly) {
            const validationResult = await tools.validateCategory({
              category: finalClassification.category,
              vendor: structuredData.vendor,
              amount: structuredData.amount,
              context: structuredData.description,
            });
            validation = validationResult.validation;
          }

          // Step 5: 仕訳作成
          let journalEntry = null;
          if (input.createJournal && !input.validationOnly) {
            const journalResult = await tools.createJournalEntry({
              transactionData: {
                vendor: structuredData.vendor,
                amount: structuredData.amount,
                date: structuredData.date,
                category: finalClassification.category,
                description: structuredData.description,
                paymentMethod: input.transactionData?.paymentMethod || 'credit_card',
              },
            });
            
            if (journalResult.success) {
              journalEntry = journalResult.journalEntry;
            }
          }

          return {
            success: true,
            classification: finalClassification,
            validation,
            journalEntry,
            timestamp: new Date().toISOString(),
            metadata: {
              operation: 'analyze_ocr_result',
              originalOCR: input.ocrResult,
              structuredData,
            },
          };
        }

        case 'classify_transaction': {
          if (!input.transactionData) {
            throw new Error('Transaction data is required for classification');
          }

          const result = await tools.classifyTransaction({
            vendor: input.transactionData.vendor,
            amount: input.transactionData.amount,
            date: input.transactionData.date,
            description: input.transactionData.description,
            businessType: input.businessType,
            forceCategory: input.forceCategory,
          });

          return {
            success: result.success,
            classification: result.classification,
            alternatives: result.suggestions?.map(cat => ({
              category: cat,
              confidence: 0.5,
              reason: '類似カテゴリ',
            })),
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        case 'validate_category': {
          if (!input.transactionData || !input.transactionData.category) {
            throw new Error('Transaction data with category is required for validation');
          }

          const result = await tools.validateCategory({
            category: input.transactionData.category,
            vendor: input.transactionData.vendor,
            amount: input.transactionData.amount,
            context: input.transactionData.description,
          });

          return {
            success: result.success,
            validation: result.validation,
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        case 'suggest_alternatives': {
          if (!input.transactionData) {
            throw new Error('Transaction data is required for alternatives');
          }

          const result = await tools.suggestAlternatives({
            vendor: input.transactionData.vendor,
            amount: input.transactionData.amount,
            currentCategory: input.transactionData.category || '雑費',
            reason: 'ユーザー要求による代替案',
          });

          return {
            success: result.success,
            alternatives: result.alternatives,
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        case 'create_journal_entry': {
          if (!input.transactionData) {
            throw new Error('Transaction data is required for journal entry');
          }

          const result = await tools.createJournalEntry({
            transactionData: input.transactionData,
          });

          return {
            success: result.success,
            journalEntry: result.journalEntry,
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        case 'get_account_info': {
          const result = await tools.getAccountInfo({
            category: input.transactionData?.category,
          });

          return {
            success: result.success,
            accountInfo: result.categories || result.info,
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }

    } catch (error) {
      console.error('❌ [Accounting Agent] Analysis failed:', error);
      return {
        success: false,
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
});

export default accountingAgent;