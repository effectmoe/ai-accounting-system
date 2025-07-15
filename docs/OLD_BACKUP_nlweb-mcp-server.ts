import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';
import { searchTaxInfoByQuery, runTaxCrawler } from './nlweb-tax-crawler';

// Supabase設定
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// NLWeb MCP サーバー
const server = new Server(
  {
    name: 'nlweb-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ツールの定義
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_tax_info',
        description: 'Search for Japanese tax information using natural language',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language query about tax (e.g., "消費税の軽減税率について")',
            },
            category: {
              type: 'string',
              enum: ['consumption_tax', 'income_tax', 'corporate_tax', 'invoice', 'general'],
              description: 'Tax category to search',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_tax_rate',
        description: 'Get the current tax rate for a specific item or service',
        inputSchema: {
          type: 'object',
          properties: {
            item: {
              type: 'string',
              description: 'Item or service name',
            },
            context: {
              type: 'object',
              properties: {
                date: { type: 'string', description: 'Date (YYYY-MM-DD)' },
                location: { type: 'string', description: 'Location or business type' },
                isEatIn: { type: 'boolean', description: 'For food items, whether eat-in' },
              },
            },
          },
          required: ['item'],
        },
      },
      {
        name: 'determine_account_category',
        description: 'Determine the accounting category for an expense',
        inputSchema: {
          type: 'object',
          properties: {
            description: {
              type: 'string',
              description: 'Description of the expense',
            },
            amount: {
              type: 'number',
              description: 'Amount of the expense',
            },
            vendor: {
              type: 'string',
              description: 'Vendor name',
            },
            businessContext: {
              type: 'object',
              properties: {
                industry: { type: 'string' },
                purpose: { type: 'string' },
              },
            },
          },
          required: ['description'],
        },
      },
      {
        name: 'check_tax_compliance',
        description: 'Check if a document meets tax compliance requirements',
        inputSchema: {
          type: 'object',
          properties: {
            documentType: {
              type: 'string',
              enum: ['invoice', 'receipt', 'contract'],
              description: 'Type of document',
            },
            documentData: {
              type: 'object',
              description: 'Document data to check',
            },
            requirements: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific requirements to check',
            },
          },
          required: ['documentType', 'documentData'],
        },
      },
      {
        name: 'get_tax_updates',
        description: 'Get recent tax law updates and changes',
        inputSchema: {
          type: 'object',
          properties: {
            since: {
              type: 'string',
              description: 'Date to get updates from (YYYY-MM-DD)',
            },
            category: {
              type: 'string',
              description: 'Specific tax category',
            },
          },
        },
      },
      {
        name: 'crawl_tax_info',
        description: 'Manually trigger tax information crawling',
        inputSchema: {
          type: 'object',
          properties: {
            source: {
              type: 'string',
              enum: ['nta', 'e-tax', 'mof', 'all'],
              description: 'Source to crawl',
            },
          },
        },
      },
    ],
  };
});

// ツールの実行
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'search_tax_info': {
      try {
        // まずデータベースから検索
        const { data: dbResults, error } = await supabase
          .from('tax_information')
          .select('*')
          .textSearch('content', args.query)
          .limit(5);

        if (error) throw error;

        // データベースに結果がない場合は、リアルタイムでクロール
        if (!dbResults || dbResults.length === 0) {
          const crawlResults = await searchTaxInfoByQuery(args.query);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  source: 'realtime_crawl',
                  results: crawlResults,
                }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                source: 'database',
                results: dbResults,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching tax info: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'get_tax_rate': {
      try {
        // AIを使って税率を判定
        const context = args.context || {};
        const query = `${args.item}の消費税率を教えてください。${context.isEatIn ? 'イートイン' : 'テイクアウト'}`;
        
        // データベースから関連情報を検索
        const { data: taxRules } = await supabase
          .from('tax_entities')
          .select('*')
          .eq('entity_type', 'tax_rate')
          .textSearch('name', args.item);

        // ルールベースの判定ロジック
        let taxRate = 0.10; // デフォルト10%
        let reasoning = '標準税率を適用';

        if (taxRules && taxRules.length > 0) {
          // 税制エンティティから判定
          const rule = taxRules[0];
          taxRate = rule.properties.rate;
          reasoning = rule.description;
        } else {
          // 簡易判定ロジック
          const reducedItems = ['食品', '飲料', '新聞'];
          if (reducedItems.some(item => args.item.includes(item))) {
            if (!context.isEatIn) {
              taxRate = 0.08;
              reasoning = '軽減税率（8%）を適用：飲食料品の譲渡';
            }
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                item: args.item,
                taxRate: taxRate,
                percentage: `${taxRate * 100}%`,
                reasoning: reasoning,
                context: context,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error determining tax rate: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'determine_account_category': {
      try {
        // キーワードベースの勘定科目判定
        const description = args.description.toLowerCase();
        const vendorInfo = args.vendor || '';
        const context = args.businessContext || {};

        // 判定ルール（実際はAIで動的に判定）
        const rules = [
          { keywords: ['タクシー', '電車', '新幹線', 'バス', '交通'], category: '旅費交通費' },
          { keywords: ['会議', 'ミーティング', '打ち合わせ'], category: '会議費' },
          { keywords: ['接待', '懇親', '歓送迎'], category: '接待交際費' },
          { keywords: ['書籍', '本', '雑誌', 'セミナー', '研修'], category: '研修費' },
          { keywords: ['文具', '事務用品', 'コピー'], category: '消耗品費' },
          { keywords: ['電気', 'ガス', '水道', '電話', 'インターネット'], category: '水道光熱費' },
          { keywords: ['家賃', '賃料', 'オフィス'], category: '地代家賃' },
        ];

        let category = '雑費'; // デフォルト
        let confidence = 0.5;
        let reasoning = 'デフォルトカテゴリを適用';

        for (const rule of rules) {
          if (rule.keywords.some(keyword => description.includes(keyword))) {
            category = rule.category;
            confidence = 0.8;
            reasoning = `キーワード「${rule.keywords.find(k => description.includes(k))}」を検出`;
            break;
          }
        }

        // 金額による調整
        if (args.amount && args.amount > 50000 && category === '会議費') {
          category = '接待交際費';
          reasoning += '。高額のため接待交際費に変更';
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                description: args.description,
                suggestedCategory: category,
                confidence: confidence,
                reasoning: reasoning,
                alternativeCategories: ['雑費', '消耗品費'],
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error determining account category: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'check_tax_compliance': {
      try {
        const { documentType, documentData } = args;
        const issues = [];
        const recommendations = [];

        // インボイス制度の要件チェック
        if (documentType === 'invoice') {
          // 必須項目のチェック
          const requiredFields = [
            { field: 'registrationNumber', name: '登録番号', format: /^T\d{13}$/ },
            { field: 'issuerName', name: '発行者名' },
            { field: 'issueDate', name: '発行日' },
            { field: 'recipientName', name: '受領者名' },
            { field: 'taxRate', name: '税率' },
            { field: 'taxAmount', name: '消費税額' },
          ];

          for (const req of requiredFields) {
            if (!documentData[req.field]) {
              issues.push(`${req.name}が記載されていません`);
              recommendations.push(`${req.name}を追加してください`);
            } else if (req.format && !req.format.test(documentData[req.field])) {
              issues.push(`${req.name}の形式が正しくありません`);
              recommendations.push(`${req.name}は正しい形式で記載してください`);
            }
          }

          // 税率別の記載チェック
          if (documentData.items) {
            const taxRates = new Set(documentData.items.map(item => item.taxRate));
            if (taxRates.size > 1 && !documentData.taxRateSummary) {
              issues.push('複数税率の場合、税率ごとの合計額の記載が必要です');
              recommendations.push('8%対象と10%対象の合計額を分けて記載してください');
            }
          }
        }

        const isCompliant = issues.length === 0;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                documentType: documentType,
                isCompliant: isCompliant,
                issues: issues,
                recommendations: recommendations,
                checkedRequirements: args.requirements || ['invoice_system', 'digital_preservation'],
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error checking compliance: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'get_tax_updates': {
      try {
        const since = args.since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const { data: updates, error } = await supabase
          .from('tax_information')
          .select('*')
          .gte('crawled_at', since)
          .order('crawled_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                since: since,
                count: updates.length,
                updates: updates.map(u => ({
                  title: u.title,
                  source: u.source,
                  url: u.url,
                  date: u.crawled_at,
                  summary: u.content.substring(0, 200) + '...',
                })),
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting tax updates: ${error.message}`,
            },
          ],
        };
      }
    }

    case 'crawl_tax_info': {
      try {
        // バックグラウンドでクロール開始
        runTaxCrawler().catch(console.error);

        return {
          content: [
            {
              type: 'text',
              text: 'Tax information crawling started in background. This may take several minutes.',
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error starting crawler: ${error.message}`,
            },
          ],
        };
      }
    }

    default:
      return {
        content: [
          {
            type: 'text',
            text: `Unknown tool: ${name}`,
          },
        ],
      };
  }
});

// サーバーの起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('NLWeb MCP Server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});