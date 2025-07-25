"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MastraAccountingApp = void 0;
exports.getMastraApp = getMastraApp;
exports.runCLI = runCLI;
const core_1 = require("@mastra/core");
const zod_1 = require("zod");
// エージェントのインポート
const ocr_agent_1 = require("./ocr-agent");
const accounting_agent_1 = require("./accounting-agent");
const database_agent_1 = require("./database-agent");
const customer_agent_1 = require("./customer-agent");
const product_agent_1 = require("./product-agent");
const japan_tax_agent_1 = require("./japan-tax-agent");
// MCP統合設定のインポート
const mcp_integration_1 = require("./mcp-integration");
// オーケストレーターのインポート
const mastra_orchestrator_1 = require("./mastra-orchestrator");
// ワークフロー定義
const receiptProcessingWorkflow = (0, core_1.createWorkflow)({
    id: 'receipt-processing',
    name: 'Receipt Processing Workflow',
    description: 'Process receipts from upload to journal entry',
    inputSchema: zod_1.z.object({
        fileId: zod_1.z.string(),
        fileName: zod_1.z.string(),
        fileType: zod_1.z.enum(['pdf', 'image']),
        customerId: zod_1.z.string().optional(),
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
const monthlyTaxReportWorkflow = (0, core_1.createWorkflow)({
    id: 'monthly-tax-report',
    name: 'Monthly Tax Report Workflow',
    description: 'Generate monthly tax reports and compliance checks',
    inputSchema: zod_1.z.object({
        year: zod_1.z.number(),
        month: zod_1.z.number(),
        companyInfo: zod_1.z.object({
            name: zod_1.z.string(),
            registrationNumber: zod_1.z.string(),
            address: zod_1.z.string(),
            representativeName: zod_1.z.string(),
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
                entries.forEach((entry) => {
                    if (entry.credit.account.includes('売上')) {
                        if (entry.taxRate === 0.08) {
                            salesData.reducedRateSales += entry.credit.amount;
                        }
                        else {
                            salesData.standardRateSales += entry.credit.amount;
                        }
                    }
                    else if (entry.debit.account.includes('仕入') || entry.debit.account.includes('経費')) {
                        if (entry.taxRate === 0.08) {
                            purchaseData.reducedRatePurchases += entry.debit.amount;
                        }
                        else {
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
class MastraAccountingApp {
    mastra;
    mcpFactory;
    initialized = false;
    constructor() {
        this.mcpFactory = mcp_integration_1.McpClientFactory.getInstance();
    }
    // アプリケーション初期化
    async initialize() {
        console.log('Initializing Mastra Accounting Application...');
        // MCP設定の検証
        const validation = (0, mcp_integration_1.validateMcpConfiguration)();
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
        this.mastra = new core_1.Mastra({
            agents: {
                'ocr-agent': ocr_agent_1.ocrAgent,
                'accounting-agent': accounting_agent_1.accountingAgent,
                'database-agent': database_agent_1.databaseAgent,
                'customer-agent': customer_agent_1.customerAgent,
                'product-agent': product_agent_1.productAgent,
                'japan-tax-agent': japan_tax_agent_1.japanTaxAgent,
            },
            workflows: {
                'receipt-processing': receiptProcessingWorkflow,
                'monthly-tax-report': monthlyTaxReportWorkflow,
            },
            // DeepSeek LLM設定
            llm: {
                provider: 'deepseek',
                name: 'deepseek-v3',
                apiKey: process.env.DEEPSEEK_API_KEY,
                baseUrl: 'https://api.deepseek.com/v1',
                model: 'deepseek-chat',
                maxTokens: 4096,
                temperature: 0.7,
            },
            // メタデータストア（オプション）
            metadataStore: {
                type: 'supabase',
                config: {
                    url: process.env.SUPABASE_URL,
                    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
                },
            },
        });
        // エージェントごとのMCPクライアント初期化
        for (const [agentId, config] of Object.entries(mcp_integration_1.AGENT_MCP_CONFIGS)) {
            const mcpClient = await this.mcpFactory.createClient(config);
            this.mastra.agents[agentId].setMcpClient(mcpClient);
        }
        this.initialized = true;
        console.log('Mastra Accounting Application initialized successfully');
    }
    // レシート処理の実行
    async processReceipt(params) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.mastra.runWorkflow('receipt-processing', params);
    }
    // 月次税務レポートの生成
    async generateMonthlyTaxReport(params) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return this.mastra.runWorkflow('monthly-tax-report', params);
    }
    // エージェントの直接実行
    async runAgent(agentId, input) {
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
    async runOrchestrator(query) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return mastra_orchestrator_1.orchestrator.run({
            messages: [{ role: 'user', content: query }],
            context: {
                agents: Object.keys(this.mastra.agents),
                workflows: Object.keys(this.mastra.workflows),
            },
        });
    }
    // バッチ処理
    async processBatch(operations) {
        if (!this.initialized) {
            throw new Error('Application not initialized. Call initialize() first.');
        }
        return Promise.all(operations.map(op => {
            if (op.type === 'agent') {
                return this.runAgent(op.id, op.input);
            }
            else {
                return this.mastra.runWorkflow(op.id, op.input);
            }
        }));
    }
    // アプリケーション統計の取得
    async getStatistics() {
        const mcpHealth = await this.mcpFactory.checkAllServersHealth();
        // 実際の実装では、実行回数やエラー数を追跡する
        return {
            agents: {},
            workflows: {},
            mcpServers: mcpHealth,
        };
    }
    // シャットダウン
    async shutdown() {
        console.log('Shutting down Mastra Accounting Application...');
        // クリーンアップ処理
        this.initialized = false;
    }
}
exports.MastraAccountingApp = MastraAccountingApp;
// シングルトンインスタンス
let appInstance = null;
// アプリケーション取得関数
async function getMastraApp() {
    if (!appInstance) {
        appInstance = new MastraAccountingApp();
        await appInstance.initialize();
    }
    return appInstance;
}
// CLIコマンド実装（オプション）
async function runCLI(args) {
    const app = await getMastraApp();
    const command = args[0];
    switch (command) {
        case 'process-receipt':
            const result = await app.processReceipt({
                fileId: args[1],
                fileName: args[2],
                fileType: args[3],
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
exports.default = MastraAccountingApp;
