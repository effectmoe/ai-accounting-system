import { Mastra, createWorkflow } from '@mastra/core';
import { z } from 'zod';

// エージェントのインポート
import { ocrAgent } from './ocr-agent';
import { accountingAgent } from './accounting-agent';
import { databaseAgent } from './database-agent';
import { customerAgent } from './customer-agent';
import { productAgent } from './product-agent';
import { japanTaxAgent } from './japan-tax-agent';

// MCP統合設定のインポート
import { 
  McpClientFactory, 
  AGENT_MCP_CONFIGS,
  validateMcpConfiguration 
} from './mcp-integration';

// オーケストレーターのインポート
import { orchestrator } from './mastra-orchestrator';

// ワークフロー定義
const receiptProcessingWorkflow = createWorkflow({
  id: 'receipt-processing',
  name: 'Receipt Processing Workflow',
  description: 'Process receipts from upload to journal entry',
  
  inputSchema: z.object({
    fileId: z.string(),
    fileName: z.string(),
    fileType: z.enum(['pdf', 'image']),
    customerId: z.string().optional(),
  }),
  
  steps: [
    {
      id: 'ocr-process',
      agent: 'ocr-agent',
      input: (ctx) => ({
        fileId: ctx.input.fileId,
        fileType: ctx.input.fileType,
        language: 'ja',
        extractType: 'receipt',
      }),
    },
    {
      id: 'create-journal',
      agent: 'accounting-agent',
      input: (ctx) => ({
        operation: 'journal_entry',
        structuredInput: {
          vendor: ctx.steps['ocr-process'].output.vendor,
          amount: ctx.steps['ocr-process'].output.amount,
          date: ctx.steps['ocr-process'].output.date,
          description: ctx.steps['ocr-process'].output.text,
          ocrResultId: ctx.steps['ocr-process'].output.id,
        },
        processType: 'journal_entry',
      }),
    },
    {
      id: 'save-to-database',
      agent: 'database-agent',
      input: (ctx) => ({
        operation: {
          operation: 'create',
          table: 'processed_receipts',
          data: {
            file_id: ctx.input.fileId,
            ocr_result_id: ctx.steps['ocr-process'].output.id,
            journal_entry_id: ctx.steps['create-journal'].output.journalEntry.id,
            customer_id: ctx.input.customerId,
            processed_at: new Date().toISOString(),
          },
        },
      }),
    },
  ],
});

// 月次税務レポートワークフロー
const monthlyTaxReportWorkflow = createWorkflow({
  id: 'monthly-tax-report',
  name: 'Monthly Tax Report Workflow',
  description: 'Generate monthly tax reports and compliance checks',
  
  inputSchema: z.object({
    year: z.number(),
    month: z.number(),
    companyInfo: z.object({
      name: z.string(),
      registrationNumber: z.string(),
      address: z.string(),
      representativeName: z.string(),
    }),
  }),
  
  steps: [
    {
      id: 'get-period-data',
      agent: 'database-agent',
      input: (ctx) => {
        const startDate = `${ctx.input.year}-${String(ctx.input.month).padStart(2, '0')}-01`;
        const endDate = new Date(ctx.input.year, ctx.input.month, 0).toISOString().split('T')[0];
        
        return {
          operation: {
            operation: 'query',
            table: 'journal_entries',
            filters: {
              date: { gte: startDate, lte: endDate },
            },
          },
        };
      },
    },
    {
      id: 'calculate-consumption-tax',
      agent: 'japan-tax-agent',
      input: (ctx) => {
        const entries = ctx.steps['get-period-data'].output.result.data;
        
        // 売上・仕入データの集計
        const salesData = {
          standardRateSales: 0,
          reducedRateSales: 0,
          exportSales: 0,
          exemptSales: 0,
        };
        
        const purchaseData = {
          standardRatePurchases: 0,
          reducedRatePurchases: 0,
          nonDeductiblePurchases: 0,
        };
        
        // エントリーから集計（簡易版）
        entries.forEach((entry: any) => {
          if (entry.credit.account.includes('売上')) {
            if (entry.taxRate === 0.08) {
              salesData.reducedRateSales += entry.credit.amount;
            } else {
              salesData.standardRateSales += entry.credit.amount;
            }
          } else if (entry.debit.account.includes('仕入') || entry.debit.account.includes('経費')) {
            if (entry.taxRate === 0.08) {
              purchaseData.reducedRatePurchases += entry.debit.amount;
            } else {
              purchaseData.standardRatePurchases += entry.debit.amount;
            }
          }
        });
        
        return {
          operation: 'calculate_consumption_tax',
          consumptionTax: {
            period: {
              startDate: `${ctx.input.year}-${String(ctx.input.month).padStart(2, '0')}-01`,
              endDate: new Date(ctx.input.year, ctx.input.month, 0).toISOString().split('T')[0],
            },
            salesData,
            purchaseData,
            calculationMethod: 'invoice',
            isSimplifiedTaxpayer: false,
          },
        };
      },
    },
    {
      id: 'compliance-check',
      agent: 'japan-tax-agent',
      input: (ctx) => ({
        operation: 'check_compliance',
        complianceCheckOptions: {
          checkType: 'general',
          targetPeriod: `${ctx.input.year}-${String(ctx.input.month).padStart(2, '0')}`,
        },
      }),
    },
    {
      id: 'generate-report',
      agent: 'accounting-agent',
      input: (ctx) => ({
        operation: 'report_generation',
        processType: 'report_generation',
        reportOptions: {
          type: 'trial_balance',
          period: {
            startDate: `${ctx.input.year}-${String(ctx.input.month).padStart(2, '0')}-01`,
            endDate: new Date(ctx.input.year, ctx.input.month, 0).toISOString().split('T')[0],
          },
          format: 'google_sheets',
        },
      }),
    },
  ],
});

// Mastraアプリケーションクラス
export class MastraAccountingApp {
  private mastra: Mastra;
  private mcpFactory: McpClientFactory;
  private initialized: boolean = false;
  
  constructor() {
    this.mcpFactory = McpClientFactory.getInstance();
  }
  
  // アプリケーション初期化
  async initialize(): Promise<void> {
    console.log('Initializing Mastra Accounting Application...');
    
    // MCP設定の検証
    const validation = validateMcpConfiguration();
    if (!validation.valid) {
      throw new Error(`MCP configuration errors: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('MCP configuration warnings:', validation.warnings);
    }
    
    // MCPサーバーのヘルスチェック
    console.log('Checking MCP servers health...');
    const healthStatus = await this.mcpFactory.checkAllServersHealth();
    const unhealthyServers = Object.entries(healthStatus)
      .filter(([_, healthy]) => !healthy)
      .map(([server, _]) => server);
    
    if (unhealthyServers.length > 0) {
      console.warn(`Unhealthy MCP servers: ${unhealthyServers.join(', ')}`);
    }
    
    // Mastraインスタンスの作成
    this.mastra = new Mastra({
      agents: {
        'ocr-agent': ocrAgent,
        'accounting-agent': accountingAgent,
        'database-agent': databaseAgent,
        'customer-agent': customerAgent,
        'product-agent': productAgent,
        'japan-tax-agent': japanTaxAgent,
      },
      
      workflows: {
        'receipt-processing': receiptProcessingWorkflow,
        'monthly-tax-report': monthlyTaxReportWorkflow,
      },
      
      // DeepSeek LLM設定
      llm: {
        provider: 'deepseek',
        name: 'deepseek-v3',
        apiKey: process.env.DEEPSEEK_API_KEY!,
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        maxTokens: 4096,
        temperature: 0.7,
      },
      
      // メタデータストア（オプション）
      metadataStore: {
        type: 'supabase',
        config: {
          url: process.env.SUPABASE_URL!,
          serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        },
      },
    });
    
    // エージェントごとのMCPクライアント初期化
    for (const [agentId, config] of Object.entries(AGENT_MCP_CONFIGS)) {
      const mcpClient = await this.mcpFactory.createClient(config);
      this.mastra.agents[agentId].setMcpClient(mcpClient);
    }
    
    this.initialized = true;
    console.log('Mastra Accounting Application initialized successfully');
  }
  
  // レシート処理の実行
  async processReceipt(params: {
    fileId: string;
    fileName: string;
    fileType: 'pdf' | 'image';
    customerId?: string;
  }): Promise<any> {
    if (!this.initialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    
    return this.mastra.runWorkflow('receipt-processing', params);
  }
  
  // 月次税務レポートの生成
  async generateMonthlyTaxReport(params: {
    year: number;
    month: number;
    companyInfo: {
      name: string;
      registrationNumber: string;
      address: string;
      representativeName: string;
    };
  }): Promise<any> {
    if (!this.initialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    
    return this.mastra.runWorkflow('monthly-tax-report', params);
  }
  
  // エージェントの直接実行
  async runAgent(agentId: string, input: any): Promise<any> {
    if (!this.initialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    
    const agent = this.mastra.agents[agentId];
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }
    
    return agent.execute({ input });
  }
  
  // オーケストレーターの実行
  async runOrchestrator(query: string): Promise<any> {
    if (!this.initialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    
    return orchestrator.run({
      messages: [{ role: 'user', content: query }],
      context: {
        agents: Object.keys(this.mastra.agents),
        workflows: Object.keys(this.mastra.workflows),
      },
    });
  }
  
  // バッチ処理
  async processBatch(operations: Array<{
    type: 'agent' | 'workflow';
    id: string;
    input: any;
  }>): Promise<any[]> {
    if (!this.initialized) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    
    return Promise.all(
      operations.map(op => {
        if (op.type === 'agent') {
          return this.runAgent(op.id, op.input);
        } else {
          return this.mastra.runWorkflow(op.id, op.input);
        }
      })
    );
  }
  
  // アプリケーション統計の取得
  async getStatistics(): Promise<{
    agents: Record<string, { executions: number; errors: number }>;
    workflows: Record<string, { executions: number; errors: number }>;
    mcpServers: Record<string, boolean>;
  }> {
    const mcpHealth = await this.mcpFactory.checkAllServersHealth();
    
    // 実際の実装では、実行回数やエラー数を追跡する
    return {
      agents: {},
      workflows: {},
      mcpServers: mcpHealth,
    };
  }
  
  // シャットダウン
  async shutdown(): Promise<void> {
    console.log('Shutting down Mastra Accounting Application...');
    // クリーンアップ処理
    this.initialized = false;
  }
}

// シングルトンインスタンス
let appInstance: MastraAccountingApp | null = null;

// アプリケーション取得関数
export async function getMastraApp(): Promise<MastraAccountingApp> {
  if (!appInstance) {
    appInstance = new MastraAccountingApp();
    await appInstance.initialize();
  }
  return appInstance;
}

// CLIコマンド実装（オプション）
export async function runCLI(args: string[]): Promise<void> {
  const app = await getMastraApp();
  
  const command = args[0];
  switch (command) {
    case 'process-receipt':
      const result = await app.processReceipt({
        fileId: args[1],
        fileName: args[2],
        fileType: args[3] as 'pdf' | 'image',
        customerId: args[4],
      });
      console.log('Receipt processed:', result);
      break;
      
    case 'monthly-report':
      const report = await app.generateMonthlyTaxReport({
        year: parseInt(args[1]),
        month: parseInt(args[2]),
        companyInfo: JSON.parse(args[3]),
      });
      console.log('Monthly report generated:', report);
      break;
      
    case 'agent':
      const agentResult = await app.runAgent(args[1], JSON.parse(args[2]));
      console.log('Agent result:', agentResult);
      break;
      
    case 'orchestrate':
      const orchestratorResult = await app.runOrchestrator(args[1]);
      console.log('Orchestrator result:', orchestratorResult);
      break;
      
    case 'health':
      const stats = await app.getStatistics();
      console.log('Application health:', stats);
      break;
      
    default:
      console.log('Unknown command:', command);
      console.log('Available commands: process-receipt, monthly-report, agent, orchestrate, health');
  }
  
  await app.shutdown();
}

// Node.js直接実行時のエントリーポイント
if (require.main === module) {
  runCLI(process.argv.slice(2)).catch(console.error);
}

// エクスポート
export default MastraAccountingApp;