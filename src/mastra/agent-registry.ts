import { accountingAgent, customerAgent, japanTaxAgent } from './config';
import { mcpManager } from './mcp/mcp-manager';
import { logger } from '@/lib/logger';

// Agent registry for Mastra Cloud
export const agentRegistry = {
  'accounting-agent': {
    agent: accountingAgent,
    tools: [
      {
        name: 'calculateTax',
        description: '消費税を計算します',
        inputSchema: {
          type: 'object',
          properties: {
            amount: { type: 'number', description: '金額' },
            taxRate: { type: 'number', description: '税率（デフォルト: 10）' }
          },
          required: ['amount']
        },
        execute: async ({ amount, taxRate = 10 }: { amount: number; taxRate?: number }) => {
          const tax = Math.floor(amount * (taxRate / 100));
          const total = amount + tax;
          return { amount, tax, total, taxRate };
        }
      },
      {
        name: 'createJournalEntry',
        description: '仕訳を作成します',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: '日付' },
            description: { type: 'string', description: '摘要' },
            debit: {
              type: 'object',
              properties: {
                account: { type: 'string', description: '借方勘定科目' },
                amount: { type: 'number', description: '借方金額' }
              },
              required: ['account', 'amount']
            },
            credit: {
              type: 'object',
              properties: {
                account: { type: 'string', description: '貸方勘定科目' },
                amount: { type: 'number', description: '貸方金額' }
              },
              required: ['account', 'amount']
            }
          },
          required: ['date', 'description', 'debit', 'credit']
        },
        execute: async (params: any) => {
          return {
            id: `JE-${Date.now()}`,
            ...params,
            createdAt: new Date().toISOString()
          };
        }
      }
    ]
  },
  'customer-agent': {
    agent: customerAgent,
    tools: [
      {
        name: 'searchCustomer',
        description: '顧客を検索します',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: '検索クエリ' }
          },
          required: ['query']
        },
        execute: async ({ query }: { query: string }) => {
          // Mock implementation
          return {
            results: [],
            query,
            timestamp: new Date().toISOString()
          };
        }
      }
    ]
  },
  'japan-tax-agent': {
    agent: japanTaxAgent,
    tools: [
      {
        name: 'calculateIncomeTax',
        description: '所得税を計算します',
        inputSchema: {
          type: 'object',
          properties: {
            income: { type: 'number', description: '年収' }
          },
          required: ['income']
        },
        execute: async ({ income }: { income: number }) => {
          // Simplified calculation
          let tax = 0;
          if (income > 1950000) {
            tax = income * 0.05;
          }
          if (income > 3300000) {
            tax = income * 0.1 - 97500;
          }
          if (income > 6950000) {
            tax = income * 0.2 - 427500;
          }
          return {
            income,
            tax: Math.floor(tax),
            afterTax: income - Math.floor(tax)
          };
        }
      }
    ]
  }
};

// Register tools to agents
export async function registerAgentTools() {
  logger.info('[Agent Registry] Registering tools to agents...');
  
  // MCPマネージャーを初期化
  try {
    await mcpManager.initialize();
  } catch (error) {
    logger.error('[Agent Registry] Failed to initialize MCP manager:', error);
  }
  
  // 各エージェントにツールを登録
  Object.entries(agentRegistry).forEach(([agentId, config]) => {
    // 既存のツールを登録
    config.tools.forEach(tool => {
      config.agent.registerTool(tool);
    });
    
    // MCPツールを追加
    const mcpTools = mcpManager.getToolsForAgent(agentId);
    logger.info(`[Agent Registry] Adding ${mcpTools.length} MCP tools to ${agentId}`);
    
    mcpTools.forEach(tool => {
      config.agent.registerTool(tool);
    });
  });
  
  logger.info('[Agent Registry] Tool registration complete');
}