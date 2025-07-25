#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingMCPServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const logger_1 = require("@/lib/logger");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const ACCOUNTING_TOOLS = [
    {
        name: 'accounting_categorize',
        description: '取引を自動的にカテゴリ分類',
        inputSchema: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: '取引の説明',
                },
                amount: {
                    type: 'number',
                    description: '金額',
                },
                transactionType: {
                    type: 'string',
                    enum: ['income', 'expense', 'transfer'],
                    description: '取引タイプ',
                },
                companyId: {
                    type: 'string',
                    description: '会社ID',
                },
            },
            required: ['description', 'amount', 'transactionType', 'companyId'],
        },
    },
    {
        name: 'accounting_create_journal_entry',
        description: '仕訳エントリを作成',
        inputSchema: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: '仕訳の説明',
                },
                amount: {
                    type: 'number',
                    description: '金額',
                },
                transactionType: {
                    type: 'string',
                    enum: ['income', 'expense', 'transfer'],
                    description: '取引タイプ',
                },
                date: {
                    type: 'string',
                    description: '日付（YYYY-MM-DD形式）',
                },
                category: {
                    type: 'string',
                    optional: true,
                    description: 'カテゴリ',
                },
                companyId: {
                    type: 'string',
                    description: '会社ID',
                },
            },
            required: ['description', 'amount', 'transactionType', 'date', 'companyId'],
        },
    },
    {
        name: 'accounting_generate_report',
        description: '会計レポートを生成',
        inputSchema: {
            type: 'object',
            properties: {
                reportType: {
                    type: 'string',
                    enum: ['monthly', 'quarterly', 'annual', 'trial_balance', 'profit_loss', 'balance_sheet', 'compliance'],
                    description: 'レポートタイプ',
                },
                startDate: {
                    type: 'string',
                    description: '開始日（YYYY-MM-DD形式）',
                },
                endDate: {
                    type: 'string',
                    description: '終了日（YYYY-MM-DD形式）',
                },
                companyId: {
                    type: 'string',
                    description: '会社ID',
                },
            },
            required: ['reportType', 'startDate', 'endDate', 'companyId'],
        },
    },
];
const mockData = {
    journalEntries: [],
    invoices: [],
};
class AccountingMCPServer {
    server;
    constructor() {
        this.server = new index_js_1.Server({
            name: 'accounting-mcp-server-mock',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
    }
    setupToolHandlers() {
        this.server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
            return {
                tools: ACCOUNTING_TOOLS,
            };
        });
        this.server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            try {
                let result;
                switch (name) {
                    case 'accounting_categorize':
                        result = await this.categorizeTransaction(args);
                        break;
                    case 'accounting_create_journal_entry':
                        result = await this.createJournalEntry(args);
                        break;
                    case 'accounting_generate_report':
                        result = await this.generateReport(args);
                        break;
                    default:
                        throw new Error(`Unknown tool: ${name}`);
                }
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async categorizeTransaction(data) {
        let category = 'その他';
        const description = data.description.toLowerCase();
        if (description.includes('食') || description.includes('レストラン')) {
            category = '飲食費';
        }
        else if (description.includes('交通') || description.includes('電車')) {
            category = '交通費';
        }
        else if (description.includes('給料') || description.includes('売上')) {
            category = '収入';
        }
        else if (description.includes('家賃') || description.includes('賃料')) {
            category = '家賃・地代';
        }
        else if (description.includes('電気') || description.includes('ガス') || description.includes('水道')) {
            category = '光熱費';
        }
        return {
            success: true,
            category,
            confidence: 0.85,
            originalData: data,
            timestamp: new Date().toISOString(),
        };
    }
    async createJournalEntry(data) {
        const entry = {
            id: `JE-${Date.now()}`,
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'posted',
        };
        mockData.journalEntries.push(entry);
        return {
            success: true,
            journalEntryId: entry.id,
            entry,
            message: '仕訳エントリを作成しました',
        };
    }
    async generateReport(data) {
        const entries = mockData.journalEntries.filter(entry => {
            if (entry.companyId !== data.companyId)
                return false;
            const entryDate = new Date(entry.date || entry.createdAt);
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);
            return entryDate >= startDate && entryDate <= endDate;
        });
        const income = entries
            .filter(e => e.transactionType === 'income')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        const expense = entries
            .filter(e => e.transactionType === 'expense')
            .reduce((sum, e) => sum + (e.amount || 0), 0);
        return {
            success: true,
            reportType: data.reportType,
            period: {
                startDate: data.startDate,
                endDate: data.endDate
            },
            summary: {
                totalIncome: income,
                totalExpense: expense,
                netProfit: income - expense,
                transactionCount: entries.length,
                profitMargin: income > 0 ? ((income - expense) / income * 100).toFixed(2) + '%' : '0%',
            },
            generatedAt: new Date().toISOString(),
        };
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        logger_1.logger.error('Accounting MCP Server (Mock) running on stdio');
    }
}
exports.AccountingMCPServer = AccountingMCPServer;
if (require.main === module) {
    const server = new AccountingMCPServer();
    server.run().catch((error) => {
        logger_1.logger.error('Failed to run Accounting MCP Server:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=accounting-mcp-server-mock.js.map