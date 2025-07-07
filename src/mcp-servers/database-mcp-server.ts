#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';

// Supabase types
interface ReceiptRecord {
  id?: string;
  file_name: string;
  vendor_name: string;
  total_amount: number;
  tax_amount: number;
  receipt_date: string;
  category: string;
  subcategory?: string;
  extracted_text: string;
  confidence: number;
  metadata?: any;
  embedding?: number[];
  created_at?: string;
  updated_at?: string;
}

interface JournalEntry {
  id?: string;
  transaction_date: string;
  description: string;
  entries: any[];
  total_debit: number;
  total_credit: number;
  is_balanced: boolean;
  receipt_id?: string;
  created_at?: string;
}

// Database MCP Server for Mastra Agents
class DatabaseMCPServer {
  private server: Server;
  private supabase: any;
  private openai: OpenAI | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'database-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initializeDatabase();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private initializeDatabase(): void {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Warning: Supabase credentials not configured');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize OpenAI for embeddings if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[Database MCP Server] Error:', error);
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
            name: 'save_receipt',
            description: 'Save OCR processed receipt to database',
            inputSchema: {
              type: 'object',
              properties: {
                data: {
                  type: 'object',
                  properties: {
                    file_name: { type: 'string' },
                    vendor_name: { type: 'string' },
                    total_amount: { type: 'number' },
                    tax_amount: { type: 'number' },
                    receipt_date: { type: 'string' },
                    category: { type: 'string' },
                    subcategory: { type: 'string' },
                    extracted_text: { type: 'string' },
                    confidence: { type: 'number' },
                    metadata: { type: 'object' },
                  },
                  required: ['file_name', 'vendor_name', 'total_amount', 'receipt_date', 'category', 'extracted_text'],
                },
                generateEmbedding: {
                  type: 'boolean',
                  default: true,
                  description: 'Generate vector embedding for similarity search',
                },
              },
              required: ['data'],
            },
          },
          {
            name: 'save_journal_entry',
            description: 'Save accounting journal entry',
            inputSchema: {
              type: 'object',
              properties: {
                journalEntry: {
                  type: 'object',
                  properties: {
                    transaction_date: { type: 'string' },
                    description: { type: 'string' },
                    entries: { type: 'array' },
                    receipt_id: { type: 'string' },
                  },
                  required: ['transaction_date', 'description', 'entries'],
                },
              },
              required: ['journalEntry'],
            },
          },
          {
            name: 'search_receipts',
            description: 'Search receipts with various filters',
            inputSchema: {
              type: 'object',
              properties: {
                filters: {
                  type: 'object',
                  properties: {
                    vendor: { type: 'string' },
                    category: { type: 'string' },
                    dateFrom: { type: 'string' },
                    dateTo: { type: 'string' },
                    amountMin: { type: 'number' },
                    amountMax: { type: 'number' },
                  },
                },
                searchText: {
                  type: 'string',
                  description: 'Full text search in extracted text',
                },
                limit: {
                  type: 'number',
                  default: 50,
                },
                offset: {
                  type: 'number',
                  default: 0,
                },
              },
            },
          },
          {
            name: 'semantic_search',
            description: 'Search receipts using natural language (vector similarity)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Natural language search query',
                },
                limit: {
                  type: 'number',
                  default: 10,
                },
                threshold: {
                  type: 'number',
                  default: 0.7,
                  description: 'Similarity threshold (0-1)',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_statistics',
            description: 'Get accounting statistics and summaries',
            inputSchema: {
              type: 'object',
              properties: {
                period: {
                  type: 'string',
                  enum: ['day', 'week', 'month', 'quarter', 'year'],
                  default: 'month',
                },
                groupBy: {
                  type: 'string',
                  enum: ['category', 'vendor', 'date'],
                  default: 'category',
                },
                dateFrom: { type: 'string' },
                dateTo: { type: 'string' },
              },
            },
          },
          {
            name: 'update_receipt',
            description: 'Update receipt information',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Receipt ID to update',
                },
                updates: {
                  type: 'object',
                  properties: {
                    vendor_name: { type: 'string' },
                    category: { type: 'string' },
                    subcategory: { type: 'string' },
                    metadata: { type: 'object' },
                  },
                },
              },
              required: ['id', 'updates'],
            },
          },
          {
            name: 'delete_receipt',
            description: 'Delete receipt and related data',
            inputSchema: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Receipt ID to delete',
                },
                cascade: {
                  type: 'boolean',
                  default: true,
                  description: 'Delete related journal entries',
                },
              },
              required: ['id'],
            },
          },
          {
            name: 'backup_data',
            description: 'Create backup of database data',
            inputSchema: {
              type: 'object',
              properties: {
                tables: {
                  type: 'array',
                  items: { type: 'string' },
                  default: ['receipts', 'journal_entries'],
                },
                format: {
                  type: 'string',
                  enum: ['json', 'csv'],
                  default: 'json',
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!this.supabase) {
        throw new McpError(
          ErrorCode.InternalError,
          'Database not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
        );
      }

      try {
        switch (name) {
          case 'save_receipt':
            return await this.handleSaveReceipt(args);
          case 'save_journal_entry':
            return await this.handleSaveJournalEntry(args);
          case 'search_receipts':
            return await this.handleSearchReceipts(args);
          case 'semantic_search':
            return await this.handleSemanticSearch(args);
          case 'get_statistics':
            return await this.handleGetStatistics(args);
          case 'update_receipt':
            return await this.handleUpdateReceipt(args);
          case 'delete_receipt':
            return await this.handleDeleteReceipt(args);
          case 'backup_data':
            return await this.handleBackupData(args);
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

  // Save receipt to database
  private async handleSaveReceipt(args: any) {
    const { data, generateEmbedding = true } = args;

    try {
      const receiptData: ReceiptRecord = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Generate embedding if requested and OpenAI is configured
      if (generateEmbedding && this.openai) {
        try {
          const embeddingText = `${data.vendor_name} ${data.category} ${data.extracted_text}`.substring(0, 8000);
          const embeddingResponse = await this.openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: embeddingText,
          });
          receiptData.embedding = embeddingResponse.data[0].embedding;
        } catch (error) {
          console.warn('Failed to generate embedding:', error);
        }
      }

      // Insert receipt
      const { data: receipt, error } = await this.supabase
        .from('receipts')
        .insert([receiptData])
        .select()
        .single();

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              receipt: {
                id: receipt.id,
                file_name: receipt.file_name,
                vendor_name: receipt.vendor_name,
                total_amount: receipt.total_amount,
                category: receipt.category,
                created_at: receipt.created_at,
              },
              message: 'Receipt saved successfully',
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
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Save journal entry
  private async handleSaveJournalEntry(args: any) {
    const { journalEntry } = args;

    try {
      // Calculate totals
      const totalDebit = journalEntry.entries.reduce((sum: number, entry: any) => sum + (entry.debit || 0), 0);
      const totalCredit = journalEntry.entries.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0);
      const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

      const entryData: JournalEntry = {
        transaction_date: journalEntry.transaction_date,
        description: journalEntry.description,
        entries: journalEntry.entries,
        total_debit: totalDebit,
        total_credit: totalCredit,
        is_balanced: isBalanced,
        receipt_id: journalEntry.receipt_id,
        created_at: new Date().toISOString(),
      };

      // Insert journal entry
      const { data: entry, error } = await this.supabase
        .from('journal_entries')
        .insert([entryData])
        .select()
        .single();

      if (error) {
        throw new Error(`Journal entry insert failed: ${error.message}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              journalEntry: {
                id: entry.id,
                transaction_date: entry.transaction_date,
                total_debit: entry.total_debit,
                total_credit: entry.total_credit,
                is_balanced: entry.is_balanced,
              },
              message: 'Journal entry saved successfully',
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
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Search receipts with filters
  private async handleSearchReceipts(args: any) {
    const { filters = {}, searchText, limit = 50, offset = 0 } = args;

    try {
      let query = this.supabase
        .from('receipts')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.vendor) {
        query = query.ilike('vendor_name', `%${filters.vendor}%`);
      }
      if (filters.category) {
        query = query.eq('category', filters.category);
      }
      if (filters.dateFrom) {
        query = query.gte('receipt_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('receipt_date', filters.dateTo);
      }
      if (filters.amountMin !== undefined) {
        query = query.gte('total_amount', filters.amountMin);
      }
      if (filters.amountMax !== undefined) {
        query = query.lte('total_amount', filters.amountMax);
      }
      if (searchText) {
        query = query.ilike('extracted_text', `%${searchText}%`);
      }

      // Apply pagination
      query = query
        .order('receipt_date', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: receipts, error, count } = await query;

      if (error) {
        throw new Error(`Search failed: ${error.message}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              receipts: receipts || [],
              totalCount: count || 0,
              limit,
              offset,
              filters,
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
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Semantic search using vector similarity
  private async handleSemanticSearch(args: any) {
    const { query, limit = 10, threshold = 0.7 } = args;

    try {
      if (!this.openai) {
        throw new Error('Semantic search requires OpenAI API key');
      }

      // Generate query embedding
      const embeddingResponse = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: query,
      });
      const queryEmbedding = embeddingResponse.data[0].embedding;

      // Perform vector similarity search using pgvector
      const { data: receipts, error } = await this.supabase.rpc('search_receipts_by_embedding', {
        query_embedding: queryEmbedding,
        similarity_threshold: threshold,
        match_count: limit,
      });

      if (error) {
        throw new Error(`Semantic search failed: ${error.message}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              query,
              receipts: receipts || [],
              count: receipts?.length || 0,
              threshold,
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
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Get statistics
  private async handleGetStatistics(args: any) {
    const { period = 'month', groupBy = 'category', dateFrom, dateTo } = args;

    try {
      // Determine date range
      const endDate = dateTo || new Date().toISOString().split('T')[0];
      let startDate = dateFrom;

      if (!startDate) {
        const date = new Date();
        switch (period) {
          case 'day':
            date.setDate(date.getDate() - 1);
            break;
          case 'week':
            date.setDate(date.getDate() - 7);
            break;
          case 'month':
            date.setMonth(date.getMonth() - 1);
            break;
          case 'quarter':
            date.setMonth(date.getMonth() - 3);
            break;
          case 'year':
            date.setFullYear(date.getFullYear() - 1);
            break;
        }
        startDate = date.toISOString().split('T')[0];
      }

      // Get aggregated statistics
      let query = this.supabase.from('receipts').select('*');
      query = query.gte('receipt_date', startDate).lte('receipt_date', endDate);

      const { data: receipts, error } = await query;

      if (error) {
        throw new Error(`Statistics query failed: ${error.message}`);
      }

      // Aggregate data
      const stats: any = {
        totalAmount: 0,
        totalTax: 0,
        count: receipts?.length || 0,
        byGroup: {},
      };

      if (receipts) {
        receipts.forEach((receipt: ReceiptRecord) => {
          stats.totalAmount += receipt.total_amount;
          stats.totalTax += receipt.tax_amount;

          const groupKey = receipt[groupBy as keyof ReceiptRecord] || 'Unknown';
          if (!stats.byGroup[groupKey]) {
            stats.byGroup[groupKey] = {
              count: 0,
              totalAmount: 0,
              totalTax: 0,
            };
          }
          stats.byGroup[groupKey].count++;
          stats.byGroup[groupKey].totalAmount += receipt.total_amount;
          stats.byGroup[groupKey].totalTax += receipt.tax_amount;
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              period,
              dateRange: { from: startDate, to: endDate },
              statistics: stats,
              groupBy,
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
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Update receipt
  private async handleUpdateReceipt(args: any) {
    const { id, updates } = args;

    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data: receipt, error } = await this.supabase
        .from('receipts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Update failed: ${error.message}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              receipt,
              message: 'Receipt updated successfully',
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
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Delete receipt
  private async handleDeleteReceipt(args: any) {
    const { id, cascade = true } = args;

    try {
      // Delete related journal entries if cascade is true
      if (cascade) {
        await this.supabase
          .from('journal_entries')
          .delete()
          .eq('receipt_id', id);
      }

      // Delete receipt
      const { error } = await this.supabase
        .from('receipts')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Receipt deleted successfully',
              cascade,
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
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Backup data
  private async handleBackupData(args: any) {
    const { tables = ['receipts', 'journal_entries'], format = 'json' } = args;

    try {
      const backupData: any = {
        timestamp: new Date().toISOString(),
        tables: {},
      };

      // Backup each table
      for (const table of tables) {
        const { data, error } = await this.supabase
          .from(table)
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.warn(`Failed to backup table ${table}:`, error.message);
          continue;
        }

        backupData.tables[table] = {
          count: data?.length || 0,
          data: data || [],
        };
      }

      // Format output
      let output: string;
      if (format === 'csv') {
        // Simple CSV format for receipts table
        const receipts = backupData.tables.receipts?.data || [];
        const headers = ['id', 'file_name', 'vendor_name', 'total_amount', 'category', 'receipt_date'];
        const rows = receipts.map((r: any) => 
          headers.map(h => r[h] || '').join(',')
        );
        output = [headers.join(','), ...rows].join('\n');
      } else {
        output = JSON.stringify(backupData, null, 2);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              format,
              tables,
              totalRecords: Object.values(backupData.tables).reduce((sum: number, t: any) => sum + t.count, 0),
              backupData: output,
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
    console.error('Database MCP Server running on stdio');
  }
}

// Create and run server
const server = new DatabaseMCPServer();
server.run().catch((error) => {
  console.error('Fatal error in Database MCP server:', error);
  process.exit(1);
});