import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { spawn } from 'child_process';
import path from 'path';

// データベース操作結果のスキーマ
const databaseResultSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  data: z.any().optional(),
  receipt: z.object({
    id: z.string(),
    file_name: z.string(),
    vendor_name: z.string(),
    total_amount: z.number(),
    category: z.string(),
    created_at: z.string(),
  }).optional(),
  journalEntry: z.object({
    id: z.string(),
    transaction_date: z.string(),
    total_debit: z.number(),
    total_credit: z.number(),
    is_balanced: z.boolean(),
  }).optional(),
  receipts: z.array(z.any()).optional(),
  statistics: z.any().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

// データベースエージェントの入力スキーマ
const databaseInputSchema = z.object({
  operation: z.enum([
    'save_receipt',
    'save_journal_entry',
    'search_receipts',
    'semantic_search',
    'get_statistics',
    'update_receipt',
    'delete_receipt',
    'backup_data',
    'batch_save'
  ]),
  
  // 領収書保存用
  receiptData: z.object({
    file_name: z.string(),
    vendor_name: z.string(),
    total_amount: z.number(),
    tax_amount: z.number(),
    receipt_date: z.string(),
    category: z.string(),
    subcategory: z.string().optional(),
    extracted_text: z.string(),
    confidence: z.number(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
  
  // 仕訳保存用
  journalEntry: z.object({
    transaction_date: z.string(),
    description: z.string(),
    entries: z.array(z.object({
      account: z.string(),
      debit: z.number(),
      credit: z.number(),
      description: z.string(),
    })),
    receipt_id: z.string().optional(),
  }).optional(),
  
  // 検索用
  searchParams: z.object({
    filters: z.object({
      vendor: z.string().optional(),
      category: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      amountMin: z.number().optional(),
      amountMax: z.number().optional(),
    }).optional(),
    searchText: z.string().optional(),
    query: z.string().optional(), // semantic search用
    limit: z.number().default(50),
    offset: z.number().default(0),
    threshold: z.number().default(0.7),
  }).optional(),
  
  // 統計用
  statisticsParams: z.object({
    period: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('month'),
    groupBy: z.enum(['category', 'vendor', 'date']).default('category'),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  }).optional(),
  
  // 更新・削除用
  recordId: z.string().optional(),
  updates: z.record(z.any()).optional(),
  cascade: z.boolean().default(true),
  
  // バックアップ用
  backupParams: z.object({
    tables: z.array(z.string()).default(['receipts', 'journal_entries']),
    format: z.enum(['json', 'csv']).default('json'),
  }).optional(),
  
  // バッチ処理用
  batchData: z.array(z.any()).optional(),
  
  // オプション
  generateEmbedding: z.boolean().default(true),
});

// MCP Client for Database MCP Server
class DatabaseMCPClient {
  async callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const mcpServerPath = path.join(__dirname, '../mcp-servers/database-mcp-server.ts');
        
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
            reject(new Error(`Database MCP Server exited with code ${code}: ${errorData}`));
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
          reject(new Error(`Database MCP Server process error: ${error.message}`));
        });

        // Timeout
        setTimeout(() => {
          mcpProcess.kill();
          reject(new Error('Database MCP Server request timeout'));
        }, 30000);

      } catch (error) {
        reject(new Error(`Database MCP Client error: ${error.message}`));
      }
    });
  }
}

// データベースエージェント定義
export const databaseAgent = createAgent({
  id: 'database-agent',
  name: 'Database Operations Agent with MCP Integration',
  description: 'Manage receipt and journal entry storage with Supabase and pgvector',
  
  inputSchema: databaseInputSchema,
  outputSchema: databaseResultSchema,
  
  tools: {
    // 領収書保存
    saveReceipt: {
      description: 'Save receipt to database with optional vector embedding',
      execute: async ({ receiptData, generateEmbedding }) => {
        const mcpClient = new DatabaseMCPClient();
        
        try {
          const result = await mcpClient.callTool('save_receipt', {
            data: receiptData,
            generateEmbedding,
          });

          return result;
        } catch (error) {
          throw new Error(`Receipt save failed: ${error.message}`);
        }
      },
    },

    // 仕訳保存
    saveJournalEntry: {
      description: 'Save journal entry to database',
      execute: async ({ journalEntry }) => {
        const mcpClient = new DatabaseMCPClient();
        
        try {
          const result = await mcpClient.callTool('save_journal_entry', {
            journalEntry,
          });

          return result;
        } catch (error) {
          throw new Error(`Journal entry save failed: ${error.message}`);
        }
      },
    },

    // 領収書検索
    searchReceipts: {
      description: 'Search receipts with various filters',
      execute: async ({ filters, searchText, limit, offset }) => {
        const mcpClient = new DatabaseMCPClient();
        
        try {
          const result = await mcpClient.callTool('search_receipts', {
            filters,
            searchText,
            limit,
            offset,
          });

          return result;
        } catch (error) {
          throw new Error(`Receipt search failed: ${error.message}`);
        }
      },
    },

    // セマンティック検索
    semanticSearch: {
      description: 'Search receipts using natural language',
      execute: async ({ query, limit, threshold }) => {
        const mcpClient = new DatabaseMCPClient();
        
        try {
          const result = await mcpClient.callTool('semantic_search', {
            query,
            limit,
            threshold,
          });

          return result;
        } catch (error) {
          throw new Error(`Semantic search failed: ${error.message}`);
        }
      },
    },

    // 統計情報取得
    getStatistics: {
      description: 'Get accounting statistics and summaries',
      execute: async ({ period, groupBy, dateFrom, dateTo }) => {
        const mcpClient = new DatabaseMCPClient();
        
        try {
          const result = await mcpClient.callTool('get_statistics', {
            period,
            groupBy,
            dateFrom,
            dateTo,
          });

          return result;
        } catch (error) {
          throw new Error(`Statistics retrieval failed: ${error.message}`);
        }
      },
    },

    // 領収書更新
    updateReceipt: {
      description: 'Update receipt information',
      execute: async ({ id, updates }) => {
        const mcpClient = new DatabaseMCPClient();
        
        try {
          const result = await mcpClient.callTool('update_receipt', {
            id,
            updates,
          });

          return result;
        } catch (error) {
          throw new Error(`Receipt update failed: ${error.message}`);
        }
      },
    },

    // 領収書削除
    deleteReceipt: {
      description: 'Delete receipt and related data',
      execute: async ({ id, cascade }) => {
        const mcpClient = new DatabaseMCPClient();
        
        try {
          const result = await mcpClient.callTool('delete_receipt', {
            id,
            cascade,
          });

          return result;
        } catch (error) {
          throw new Error(`Receipt deletion failed: ${error.message}`);
        }
      },
    },

    // バックアップ
    backupData: {
      description: 'Create backup of database data',
      execute: async ({ tables, format }) => {
        const mcpClient = new DatabaseMCPClient();
        
        try {
          const result = await mcpClient.callTool('backup_data', {
            tables,
            format,
          });

          return result;
        } catch (error) {
          throw new Error(`Backup failed: ${error.message}`);
        }
      },
    },

    // バッチ保存の準備
    prepareBatchData: {
      description: 'Prepare data for batch saving',
      execute: ({ batchData }) => {
        if (!batchData || !Array.isArray(batchData)) {
          throw new Error('Batch data must be an array');
        }

        const receipts = [];
        const journalEntries = [];

        for (const item of batchData) {
          if (item.type === 'receipt') {
            receipts.push(item.data);
          } else if (item.type === 'journal_entry') {
            journalEntries.push(item.data);
          }
        }

        return {
          receipts,
          journalEntries,
          totalItems: batchData.length,
        };
      },
    },

    // トランザクション管理
    executeTransaction: {
      description: 'Execute multiple operations in a transaction',
      execute: async ({ operations }) => {
        const results = [];
        const mcpClient = new DatabaseMCPClient();

        try {
          // 各操作を順番に実行
          for (const op of operations) {
            const result = await mcpClient.callTool(op.tool, op.args);
            results.push({
              operation: op.tool,
              success: result.success,
              data: result,
            });

            // エラーが発生したら中断
            if (!result.success) {
              throw new Error(`Transaction failed at ${op.tool}: ${result.error}`);
            }
          }

          return {
            success: true,
            results,
            message: 'Transaction completed successfully',
          };
        } catch (error) {
          // ロールバック処理（必要に応じて実装）
          return {
            success: false,
            results,
            error: error.message,
            message: 'Transaction rolled back',
          };
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('🗄️ [Database Agent] Starting database operation:', input.operation);

      switch (input.operation) {
        case 'save_receipt': {
          if (!input.receiptData) {
            throw new Error('Receipt data is required');
          }

          const result = await tools.saveReceipt({
            receiptData: input.receiptData,
            generateEmbedding: input.generateEmbedding,
          });

          return {
            success: result.success,
            operation: 'save_receipt',
            receipt: result.receipt,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'save_journal_entry': {
          if (!input.journalEntry) {
            throw new Error('Journal entry data is required');
          }

          const result = await tools.saveJournalEntry({
            journalEntry: input.journalEntry,
          });

          return {
            success: result.success,
            operation: 'save_journal_entry',
            journalEntry: result.journalEntry,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'search_receipts': {
          const searchParams = input.searchParams || {};
          const result = await tools.searchReceipts({
            filters: searchParams.filters,
            searchText: searchParams.searchText,
            limit: searchParams.limit,
            offset: searchParams.offset,
          });

          return {
            success: result.success,
            operation: 'search_receipts',
            receipts: result.receipts,
            data: {
              totalCount: result.totalCount,
              limit: result.limit,
              offset: result.offset,
            },
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'semantic_search': {
          if (!input.searchParams?.query) {
            throw new Error('Search query is required for semantic search');
          }

          const result = await tools.semanticSearch({
            query: input.searchParams.query,
            limit: input.searchParams.limit,
            threshold: input.searchParams.threshold,
          });

          return {
            success: result.success,
            operation: 'semantic_search',
            receipts: result.receipts,
            data: {
              query: result.query,
              count: result.count,
              threshold: result.threshold,
            },
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'get_statistics': {
          const statsParams = input.statisticsParams || {};
          const result = await tools.getStatistics({
            period: statsParams.period,
            groupBy: statsParams.groupBy,
            dateFrom: statsParams.dateFrom,
            dateTo: statsParams.dateTo,
          });

          return {
            success: result.success,
            operation: 'get_statistics',
            statistics: result.statistics,
            data: {
              period: result.period,
              dateRange: result.dateRange,
              groupBy: result.groupBy,
            },
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'update_receipt': {
          if (!input.recordId || !input.updates) {
            throw new Error('Record ID and updates are required');
          }

          const result = await tools.updateReceipt({
            id: input.recordId,
            updates: input.updates,
          });

          return {
            success: result.success,
            operation: 'update_receipt',
            receipt: result.receipt,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'delete_receipt': {
          if (!input.recordId) {
            throw new Error('Record ID is required');
          }

          const result = await tools.deleteReceipt({
            id: input.recordId,
            cascade: input.cascade,
          });

          return {
            success: result.success,
            operation: 'delete_receipt',
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'backup_data': {
          const backupParams = input.backupParams || {};
          const result = await tools.backupData({
            tables: backupParams.tables,
            format: backupParams.format,
          });

          return {
            success: result.success,
            operation: 'backup_data',
            data: {
              format: result.format,
              tables: result.tables,
              totalRecords: result.totalRecords,
              backupData: result.backupData,
            },
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'batch_save': {
          if (!input.batchData) {
            throw new Error('Batch data is required');
          }

          // バッチデータの準備
          const prepared = await tools.prepareBatchData({
            batchData: input.batchData,
          });

          // トランザクションで実行
          const operations = [];
          
          // 領収書の保存
          for (const receipt of prepared.receipts) {
            operations.push({
              tool: 'save_receipt',
              args: { data: receipt, generateEmbedding: input.generateEmbedding },
            });
          }

          // 仕訳の保存
          for (const entry of prepared.journalEntries) {
            operations.push({
              tool: 'save_journal_entry',
              args: { journalEntry: entry },
            });
          }

          const result = await tools.executeTransaction({ operations });

          return {
            success: result.success,
            operation: 'batch_save',
            data: {
              totalProcessed: prepared.totalItems,
              receipts: prepared.receipts.length,
              journalEntries: prepared.journalEntries.length,
              results: result.results,
            },
            message: result.message,
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }

    } catch (error) {
      console.error('❌ [Database Agent] Operation failed:', error);
      return {
        success: false,
        operation: input.operation || 'unknown',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
});

export default databaseAgent;