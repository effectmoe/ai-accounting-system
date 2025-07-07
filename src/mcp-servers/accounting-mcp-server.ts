#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// 日本の勘定科目マスタ
const ACCOUNT_CATEGORIES = {
  // 経費
  '消耗品費': { type: 'expense', deductible: true, taxRate: 0.1 },
  '旅費交通費': { type: 'expense', deductible: true, taxRate: 0.1 },
  '通信費': { type: 'expense', deductible: true, taxRate: 0.1 },
  '水道光熱費': { type: 'expense', deductible: true, taxRate: 0.1 },
  '地代家賃': { type: 'expense', deductible: true, taxRate: 0.1 },
  '支払手数料': { type: 'expense', deductible: true, taxRate: 0.1 },
  '広告宣伝費': { type: 'expense', deductible: true, taxRate: 0.1 },
  '会議費': { type: 'expense', deductible: true, taxRate: 0.1 },
  '研修費': { type: 'expense', deductible: true, taxRate: 0.1 },
  '外注費': { type: 'expense', deductible: true, taxRate: 0.1 },
  '接待交際費': { type: 'expense', deductible: false, taxRate: 0.1 }, // 制限あり
  '福利厚生費': { type: 'expense', deductible: true, taxRate: 0.1 },
  '法定福利費': { type: 'expense', deductible: true, taxRate: 0.0 },
  '租税公課': { type: 'expense', deductible: true, taxRate: 0.0 },
  '減価償却費': { type: 'expense', deductible: true, taxRate: 0.0 },
  '雑費': { type: 'expense', deductible: true, taxRate: 0.1 },
  
  // 売上
  '売上高': { type: 'revenue', deductible: false, taxRate: 0.1 },
  '雑収入': { type: 'revenue', deductible: false, taxRate: 0.1 },
  
  // 資産
  '現金': { type: 'asset', deductible: false, taxRate: 0.0 },
  '普通預金': { type: 'asset', deductible: false, taxRate: 0.0 },
  '売掛金': { type: 'asset', deductible: false, taxRate: 0.0 },
  '未収入金': { type: 'asset', deductible: false, taxRate: 0.0 },
  
  // 負債
  '買掛金': { type: 'liability', deductible: false, taxRate: 0.0 },
  '未払金': { type: 'liability', deductible: false, taxRate: 0.0 },
};

// ベンダー別デフォルト分類
const VENDOR_MAPPING = {
  // コンビニ・小売
  'セブンイレブン': '消耗品費',
  'ファミリーマート': '消耗品費', 
  'ローソン': '消耗品費',
  'ヨドバシカメラ': '消耗品費',
  'ビックカメラ': '消耗品費',
  'Amazon': '消耗品費',
  
  // 交通
  'JR東日本': '旅費交通費',
  'JR東海': '旅費交通費',
  'JR西日本': '旅費交通費',
  '東京メトロ': '旅費交通費',
  '都営地下鉄': '旅費交通費',
  'タクシー': '旅費交通費',
  
  // 通信
  'NTT': '通信費',
  'ドコモ': '通信費',
  'au': '通信費',
  'SoftBank': '通信費',
  '楽天モバイル': '通信費',
  
  // 光熱費
  '東京電力': '水道光熱費',
  '東京ガス': '水道光熱費',
  '関西電力': '水道光熱費',
  
  // 飲食・会議
  'スターバックス': '会議費',
  'ドトール': '会議費',
  'マクドナルド': '会議費',
  
  // 宿泊
  'ホテル': '旅費交通費',
  '旅館': '旅費交通費',
};

// Accounting MCP Server for Mastra Agents  
class AccountingMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'accounting-mcp-server',
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
      console.error('[Accounting MCP Server] Error:', error);
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
            name: 'classify_transaction',
            description: 'Classify transaction and assign accounting category',
            inputSchema: {
              type: 'object',
              properties: {
                vendor: {
                  type: 'string',
                  description: 'Vendor/merchant name',
                },
                amount: {
                  type: 'number',
                  description: 'Transaction amount',
                },
                date: {
                  type: 'string',
                  description: 'Transaction date (YYYY-MM-DD)',
                },
                description: {
                  type: 'string',
                  description: 'Transaction description or OCR text',
                },
                businessType: {
                  type: 'string',
                  description: 'Type of business (IT, retail, consulting, etc.)',
                },
                forceCategory: {
                  type: 'string',
                  description: 'Force specific category (optional)',
                },
              },
              required: ['vendor', 'amount'],
            },
          },
          {
            name: 'validate_category',
            description: 'Validate accounting category assignment',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Proposed accounting category',
                },
                vendor: {
                  type: 'string',
                  description: 'Vendor name',
                },
                amount: {
                  type: 'number',
                  description: 'Transaction amount',
                },
                context: {
                  type: 'string',
                  description: 'Additional context for validation',
                },
              },
              required: ['category', 'vendor', 'amount'],
            },
          },
          {
            name: 'suggest_alternatives',
            description: 'Suggest alternative accounting categories',
            inputSchema: {
              type: 'object',
              properties: {
                vendor: {
                  type: 'string',
                  description: 'Vendor name',
                },
                amount: {
                  type: 'number',
                  description: 'Transaction amount', 
                },
                currentCategory: {
                  type: 'string',
                  description: 'Currently assigned category',
                },
                reason: {
                  type: 'string',
                  description: 'Reason for seeking alternatives',
                },
              },
              required: ['vendor', 'amount'],
            },
          },
          {
            name: 'create_journal_entry',
            description: 'Create double-entry bookkeeping journal entry',
            inputSchema: {
              type: 'object',
              properties: {
                transactionData: {
                  type: 'object',
                  properties: {
                    vendor: { type: 'string' },
                    amount: { type: 'number' },
                    date: { type: 'string' },
                    category: { type: 'string' },
                    description: { type: 'string' },
                    paymentMethod: { 
                      type: 'string',
                      enum: ['cash', 'credit_card', 'bank_transfer', 'other'],
                      default: 'credit_card'
                    },
                  },
                  required: ['vendor', 'amount', 'date', 'category'],
                },
              },
              required: ['transactionData'],
            },
          },
          {
            name: 'get_account_info',
            description: 'Get information about accounting categories',
            inputSchema: {
              type: 'object',
              properties: {
                category: {
                  type: 'string',
                  description: 'Accounting category name (optional - returns all if not specified)',
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

      try {
        switch (name) {
          case 'classify_transaction':
            return await this.handleClassifyTransaction(args);
          case 'validate_category':
            return await this.handleValidateCategory(args);
          case 'suggest_alternatives':
            return await this.handleSuggestAlternatives(args);
          case 'create_journal_entry':
            return await this.handleCreateJournalEntry(args);
          case 'get_account_info':
            return await this.handleGetAccountInfo(args);
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

  // Classify transaction and assign category
  private async handleClassifyTransaction(args: any) {
    const { vendor, amount, date, description, businessType, forceCategory } = args;

    try {
      let category = forceCategory;
      let confidence = 1.0;
      let reasoning = '';

      if (!forceCategory) {
        // 1. ベンダー名による自動分類
        const vendorCategory = this.classifyByVendor(vendor);
        if (vendorCategory.category) {
          category = vendorCategory.category;
          confidence = vendorCategory.confidence;
          reasoning = `ベンダー「${vendor}」に基づく自動分類`;
        }

        // 2. 説明文による分類 (AIロジック)
        if (!category && description) {
          const descriptionCategory = this.classifyByDescription(description, businessType);
          category = descriptionCategory.category;
          confidence = descriptionCategory.confidence;
          reasoning = `説明文「${description}」に基づく分析`;
        }

        // 3. デフォルト分類
        if (!category) {
          category = '雑費';
          confidence = 0.3;
          reasoning = 'デフォルト分類（手動確認推奨）';
        }
      } else {
        reasoning = 'ユーザー指定による強制分類';
      }

      const accountInfo = ACCOUNT_CATEGORIES[category] || ACCOUNT_CATEGORIES['雑費'];

      // 接待交際費の特別処理
      if (category === '接待交際費' && amount > 5000) {
        reasoning += '（5,000円超のため損金算入制限あり）';
      }

      const result = {
        success: true,
        classification: {
          category,
          subcategory: this.getSubcategory(category, vendor, description),
          confidence,
          reasoning,
          deductible: accountInfo.deductible,
          taxRate: accountInfo.taxRate,
          accountType: accountInfo.type,
        },
        suggestions: this.getSimilarCategories(category),
        metadata: {
          vendor,
          amount,
          date,
          businessType,
          timestamp: new Date().toISOString(),
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
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

  // Validate category assignment
  private async handleValidateCategory(args: any) {
    const { category, vendor, amount, context } = args;

    try {
      const validation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: [],
      };

      // カテゴリ存在チェック
      if (!ACCOUNT_CATEGORIES[category]) {
        validation.isValid = false;
        validation.errors.push(`不明な勘定科目: ${category}`);
        validation.suggestions.push(...Object.keys(ACCOUNT_CATEGORIES).slice(0, 5));
      }

      // 金額妥当性チェック
      if (amount <= 0) {
        validation.isValid = false;
        validation.errors.push('金額は正の値である必要があります');
      }

      // ベンダーとカテゴリの整合性チェック
      const vendorCategory = this.classifyByVendor(vendor);
      if (vendorCategory.category && vendorCategory.category !== category && vendorCategory.confidence > 0.8) {
        validation.warnings.push(`ベンダー「${vendor}」は通常「${vendorCategory.category}」に分類されます`);
      }

      // 業界別妥当性チェック
      if (category === '接待交際費' && amount > 5000) {
        validation.warnings.push('5,000円超の接待交際費は損金算入に制限があります');
      }

      if (category === '消耗品費' && amount > 100000) {
        validation.warnings.push('高額な消耗品費です。固定資産として計上する必要がないか確認してください');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              validation,
              category,
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

  // Suggest alternative categories
  private async handleSuggestAlternatives(args: any) {
    const { vendor, amount, currentCategory, reason } = args;

    try {
      const alternatives = [];

      // ベンダーベースの代替案
      const vendorCategory = this.classifyByVendor(vendor);
      if (vendorCategory.category && vendorCategory.category !== currentCategory) {
        alternatives.push({
          category: vendorCategory.category,
          confidence: vendorCategory.confidence,
          reason: `ベンダー「${vendor}」の一般的な分類`,
        });
      }

      // 金額ベースの代替案
      if (amount > 100000) {
        alternatives.push({
          category: '固定資産',
          confidence: 0.6,
          reason: '高額のため固定資産として計上を検討',
        });
      }

      // 類似カテゴリ
      const similarCategories = this.getSimilarCategories(currentCategory);
      similarCategories.forEach(cat => {
        if (!alternatives.find(alt => alt.category === cat)) {
          alternatives.push({
            category: cat,
            confidence: 0.4,
            reason: `「${currentCategory}」の類似カテゴリ`,
          });
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              alternatives: alternatives.slice(0, 5), // 上位5件
              currentCategory,
              vendor,
              amount,
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

  // Create double-entry journal entry
  private async handleCreateJournalEntry(args: any) {
    const { transactionData } = args;
    const { vendor, amount, date, category, description, paymentMethod = 'credit_card' } = transactionData;

    try {
      const accountInfo = ACCOUNT_CATEGORIES[category] || ACCOUNT_CATEGORIES['雑費'];
      
      // 支払方法による相手勘定の決定
      const paymentAccountMap = {
        'cash': '現金',
        'credit_card': '未払金',
        'bank_transfer': '普通預金',
        'other': '雑費',
      };

      const paymentAccount = paymentAccountMap[paymentMethod] || '未払金';

      // 複式簿記の仕訳作成
      const journalEntry = {
        date,
        description: `${vendor} ${description || ''}`.trim(),
        entries: [
          {
            account: category,
            debit: amount,
            credit: 0,
            description: `${vendor}への支払い`,
          },
          {
            account: paymentAccount,
            debit: 0,
            credit: amount,
            description: `${paymentMethod}による支払い`,
          },
        ],
        metadata: {
          vendor,
          originalAmount: amount,
          taxRate: accountInfo.taxRate,
          deductible: accountInfo.deductible,
          paymentMethod,
        },
      };

      // 消費税処理
      if (accountInfo.taxRate > 0) {
        const taxExclusiveAmount = Math.floor(amount / (1 + accountInfo.taxRate));
        const taxAmount = amount - taxExclusiveAmount;

        // 仕訳を税抜き金額に修正
        journalEntry.entries[0].debit = taxExclusiveAmount;
        journalEntry.entries[1].credit = amount; // 支払額は変わらず

        // 消費税の仕訳を追加
        journalEntry.entries.push({
          account: '仮払消費税',
          debit: taxAmount,
          credit: 0,
          description: '消費税',
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              journalEntry,
              summary: {
                totalDebit: journalEntry.entries.reduce((sum, entry) => sum + entry.debit, 0),
                totalCredit: journalEntry.entries.reduce((sum, entry) => sum + entry.credit, 0),
                isBalanced: journalEntry.entries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0) === 0,
              },
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

  // Get account information
  private async handleGetAccountInfo(args: any) {
    const { category } = args;

    try {
      if (category) {
        const accountInfo = ACCOUNT_CATEGORIES[category];
        if (!accountInfo) {
          throw new Error(`Account category not found: ${category}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                category,
                info: accountInfo,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        };
      } else {
        // 全カテゴリ情報を返す
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                categories: ACCOUNT_CATEGORIES,
                count: Object.keys(ACCOUNT_CATEGORIES).length,
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        };
      }
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

  // Helper methods
  private classifyByVendor(vendor: string): { category: string | null; confidence: number } {
    // 完全一致チェック
    if (VENDOR_MAPPING[vendor]) {
      return { category: VENDOR_MAPPING[vendor], confidence: 0.9 };
    }

    // 部分一致チェック
    for (const [vendorPattern, category] of Object.entries(VENDOR_MAPPING)) {
      if (vendor.includes(vendorPattern) || vendorPattern.includes(vendor)) {
        return { category, confidence: 0.7 };
      }
    }

    // キーワードベース
    if (vendor.includes('タクシー') || vendor.includes('交通')) {
      return { category: '旅費交通費', confidence: 0.6 };
    }
    if (vendor.includes('ホテル') || vendor.includes('宿泊')) {
      return { category: '旅費交通費', confidence: 0.6 };
    }
    if (vendor.includes('カフェ') || vendor.includes('喫茶')) {
      return { category: '会議費', confidence: 0.5 };
    }

    return { category: null, confidence: 0 };
  }

  private classifyByDescription(description: string, businessType?: string): { category: string; confidence: number } {
    const keywords = {
      '消耗品費': ['文房具', '用紙', 'ペン', '消耗品', '備品'],
      '旅費交通費': ['交通費', '電車', 'バス', '飛行機', 'タクシー', '宿泊'],
      '通信費': ['電話', 'インターネット', '携帯', 'WiFi', '通信'],
      '会議費': ['会議', 'ミーティング', 'コーヒー', '打ち合わせ'],
      '広告宣伝費': ['広告', '宣伝', 'PR', 'マーケティング'],
      '研修費': ['研修', 'セミナー', '講座', '勉強会'],
    };

    for (const [category, keywordList] of Object.entries(keywords)) {
      for (const keyword of keywordList) {
        if (description.includes(keyword)) {
          return { category, confidence: 0.7 };
        }
      }
    }

    return { category: '雑費', confidence: 0.3 };
  }

  private getSubcategory(category: string, vendor: string, description?: string): string | undefined {
    const subcategoryMap = {
      '消耗品費': {
        'Amazon': 'オフィス用品',
        'ヨドバシ': '電子機器',
        'ビック': '電子機器',
      },
      '旅費交通費': {
        'JR': '電車',
        'タクシー': 'タクシー',
        'ホテル': '宿泊費',
      },
    };

    return subcategoryMap[category]?.[vendor];
  }

  private getSimilarCategories(category: string): string[] {
    const similarityMap = {
      '消耗品費': ['雑費', '支払手数料', '外注費'],
      '旅費交通費': ['会議費', '雑費'],
      '通信費': ['支払手数料', '雑費'],
      '会議費': ['接待交際費', '雑費'],
      '広告宣伝費': ['支払手数料', '外注費'],
      '雑費': ['消耗品費', '支払手数料'],
    };

    return similarityMap[category] || ['雑費'];
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Accounting MCP Server running on stdio');
  }
}

// Create and run server
const server = new AccountingMCPServer();
server.run().catch((error) => {
  console.error('Fatal error in Accounting MCP server:', error);
  process.exit(1);
});