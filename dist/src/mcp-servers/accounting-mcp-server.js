#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingMCPServer = void 0;
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const logger_1 = require("@/lib/logger");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const mongodb_client_1 = require("../../lib/mongodb-client");
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
                debitAccount: {
                    type: 'string',
                    optional: true,
                    description: '借方勘定',
                },
                creditAccount: {
                    type: 'string',
                    optional: true,
                    description: '貸方勘定',
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
    {
        name: 'accounting_create_invoice',
        description: '請求書を作成',
        inputSchema: {
            type: 'object',
            properties: {
                customerId: {
                    type: 'string',
                    description: '顧客ID',
                },
                items: {
                    type: 'array',
                    description: '請求項目',
                    items: {
                        type: 'object',
                        properties: {
                            description: { type: 'string' },
                            quantity: { type: 'number' },
                            unitPrice: { type: 'number' },
                            taxRate: { type: 'number', optional: true },
                        },
                        required: ['description', 'quantity', 'unitPrice'],
                    },
                },
                dueDate: {
                    type: 'string',
                    optional: true,
                    description: '支払期限（YYYY-MM-DD形式）',
                },
                notes: {
                    type: 'string',
                    optional: true,
                    description: '備考',
                },
                companyId: {
                    type: 'string',
                    description: '会社ID',
                },
            },
            required: ['customerId', 'items', 'companyId'],
        },
    },
    {
        name: 'accounting_get_analytics',
        description: '会計分析データを取得',
        inputSchema: {
            type: 'object',
            properties: {
                companyId: {
                    type: 'string',
                    description: '会社ID',
                },
                period: {
                    type: 'string',
                    enum: ['current_month', 'last_month', 'current_quarter', 'last_quarter', 'current_year'],
                    description: '期間',
                },
            },
            required: ['companyId', 'period'],
        },
    },
    {
        name: 'accounting_tax_calculation',
        description: '税金計算',
        inputSchema: {
            type: 'object',
            properties: {
                companyId: {
                    type: 'string',
                    description: '会社ID',
                },
                year: {
                    type: 'number',
                    description: '年度',
                },
                quarter: {
                    type: 'number',
                    optional: true,
                    description: '四半期（1-4）',
                },
            },
            required: ['companyId', 'year'],
        },
    },
];
class AccountingMCPServer {
    server;
    constructor() {
        this.server = new index_js_1.Server({
            name: 'accounting-mcp-server',
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
                    case 'accounting_create_invoice':
                        result = await this.createInvoice(args);
                        break;
                    case 'accounting_get_analytics':
                        result = await this.getAnalytics(args);
                        break;
                    case 'accounting_tax_calculation':
                        result = await this.calculateTax(args);
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
        const db = await mongodb_client_1.DatabaseService.getInstance();
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
        return {
            success: true,
            category,
            originalData: data,
        };
    }
    async createJournalEntry(data) {
        const db = await mongodb_client_1.DatabaseService.getInstance();
        const collection = db.collection(mongodb_client_1.Collections.JOURNAL_ENTRIES);
        const entry = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await collection.insertOne(entry);
        return {
            success: true,
            journalEntryId: result.insertedId.toString(),
            entry,
        };
    }
    async generateReport(data) {
        const db = await mongodb_client_1.DatabaseService.getInstance();
        const collection = db.collection(mongodb_client_1.Collections.JOURNAL_ENTRIES);
        const entries = await collection.find({
            companyId: data.companyId,
            date: {
                $gte: data.startDate,
                $lte: data.endDate,
            },
        }).toArray();
        const income = entries
            .filter(e => e.transactionType === 'income')
            .reduce((sum, e) => sum + e.amount, 0);
        const expense = entries
            .filter(e => e.transactionType === 'expense')
            .reduce((sum, e) => sum + e.amount, 0);
        return {
            success: true,
            reportType: data.reportType,
            period: { startDate: data.startDate, endDate: data.endDate },
            summary: {
                totalIncome: income,
                totalExpense: expense,
                netProfit: income - expense,
                transactionCount: entries.length,
            },
        };
    }
    async createInvoice(data) {
        const db = await mongodb_client_1.DatabaseService.getInstance();
        const collection = db.collection(mongodb_client_1.Collections.INVOICES);
        const totalAmount = data.items.reduce((sum, item) => {
            const itemTotal = item.quantity * item.unitPrice;
            const tax = item.taxRate ? itemTotal * (item.taxRate / 100) : 0;
            return sum + itemTotal + tax;
        }, 0);
        const invoice = {
            ...data,
            totalAmount,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        const result = await collection.insertOne(invoice);
        return {
            success: true,
            invoiceId: result.insertedId.toString(),
            totalAmount,
            invoice,
        };
    }
    async getAnalytics(data) {
        const db = await mongodb_client_1.DatabaseService.getInstance();
        const collection = db.collection(mongodb_client_1.Collections.JOURNAL_ENTRIES);
        const now = new Date();
        let startDate, endDate;
        switch (data.period) {
            case 'current_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }
        const entries = await collection.find({
            companyId: data.companyId,
            date: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString(),
            },
        }).toArray();
        const analytics = {
            period: data.period,
            totalTransactions: entries.length,
            totalIncome: entries.filter(e => e.transactionType === 'income').reduce((sum, e) => sum + e.amount, 0),
            totalExpense: entries.filter(e => e.transactionType === 'expense').reduce((sum, e) => sum + e.amount, 0),
            categoryBreakdown: this.getCategoryBreakdown(entries),
        };
        return {
            success: true,
            analytics,
        };
    }
    getCategoryBreakdown(entries) {
        const breakdown = {};
        entries.forEach(entry => {
            const category = entry.category || 'その他';
            breakdown[category] = (breakdown[category] || 0) + entry.amount;
        });
        return breakdown;
    }
    async calculateTax(data) {
        const db = await mongodb_client_1.DatabaseService.getInstance();
        const collection = db.collection(mongodb_client_1.Collections.JOURNAL_ENTRIES);
        const startDate = new Date(data.year, 0, 1);
        const endDate = new Date(data.year, 11, 31);
        const entries = await collection.find({
            companyId: data.companyId,
            date: {
                $gte: startDate.toISOString(),
                $lte: endDate.toISOString(),
            },
        }).toArray();
        const income = entries
            .filter(e => e.transactionType === 'income')
            .reduce((sum, e) => sum + e.amount, 0);
        const expense = entries
            .filter(e => e.transactionType === 'expense')
            .reduce((sum, e) => sum + e.amount, 0);
        const taxableIncome = income - expense;
        const estimatedTax = taxableIncome * 0.2;
        return {
            success: true,
            year: data.year,
            taxCalculation: {
                grossIncome: income,
                deductibleExpenses: expense,
                taxableIncome,
                estimatedTax,
                effectiveTaxRate: '20%',
            },
        };
    }
    async run() {
        const transport = new stdio_js_1.StdioServerTransport();
        await this.server.connect(transport);
        logger_1.logger.error('Accounting MCP Server running on stdio');
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
//# sourceMappingURL=accounting-mcp-server.js.map