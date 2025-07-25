"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orchestrator = exports.MastraOrchestrator = void 0;
const core_1 = require("@mastra/core");
const core_2 = require("@mastra/core");
const zod_1 = require("zod");
// DeepSeek LLM Configuration
const deepSeekConfig = {
    provider: 'deepseek',
    name: 'deepseek-v3',
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    maxTokens: 4096,
    temperature: 0.7,
};
// Mastra Orchestrator Class
class MastraOrchestrator {
    mastra;
    agents = new Map();
    constructor() {
        this.mastra = new core_1.Mastra({
            llm: deepSeekConfig,
            tools: this.createTools(),
        });
        this.initializeAgents();
    }
    // Create tools for the orchestrator
    createTools() {
        return {
            // OCR処理ツール
            processOCR: (0, core_2.createTool)({
                id: 'process-ocr',
                description: 'Process OCR for uploaded documents',
                inputSchema: zod_1.z.object({
                    fileId: zod_1.z.string(),
                    fileName: zod_1.z.string(),
                    fileType: zod_1.z.string(),
                }),
                execute: async ({ fileId, fileName, fileType }) => {
                    const ocrAgent = this.agents.get('ocr-agent');
                    return await ocrAgent.process({ fileId, fileName, fileType });
                },
            }),
            // 会計分析ツール
            analyzeAccounting: (0, core_2.createTool)({
                id: 'analyze-accounting',
                description: 'Analyze accounting data from OCR results',
                inputSchema: zod_1.z.object({
                    ocrText: zod_1.z.string(),
                    vendor: zod_1.z.string().optional(),
                    amount: zod_1.z.number().optional(),
                    date: zod_1.z.string().optional(),
                }),
                execute: async ({ ocrText, vendor, amount, date }) => {
                    const accountingAgent = this.agents.get('accounting-agent');
                    return await accountingAgent.analyze({ ocrText, vendor, amount, date });
                },
            }),
            // データベース保存ツール
            saveToDatabase: (0, core_2.createTool)({
                id: 'save-to-database',
                description: 'Save processed data to database',
                inputSchema: zod_1.z.object({
                    data: zod_1.z.object({
                        file_name: zod_1.z.string(),
                        vendor_name: zod_1.z.string(),
                        total_amount: zod_1.z.number(),
                        tax_amount: zod_1.z.number(),
                        receipt_date: zod_1.z.string(),
                        category: zod_1.z.string().optional(),
                        extracted_text: zod_1.z.string(),
                    }),
                }),
                execute: async ({ data }) => {
                    const databaseAgent = this.agents.get('database-agent');
                    return await databaseAgent.save(data);
                },
            }),
            // MCP サーバー呼び出しツール
            callMCPServer: (0, core_2.createTool)({
                id: 'call-mcp-server',
                description: 'Call MCP server for specific operations',
                inputSchema: zod_1.z.object({
                    server: zod_1.z.string(),
                    method: zod_1.z.string(),
                    params: zod_1.z.any(),
                }),
                execute: async ({ server, method, params }) => {
                    // MCP サーバーとの通信実装
                    return await this.callMCPServer(server, method, params);
                },
            }),
        };
    }
    // Initialize agents
    initializeAgents() {
        // OCR Agent
        this.agents.set('ocr-agent', {
            process: async (input) => {
                console.log('OCR Agent processing:', input);
                // OCR処理のロジック
                return {
                    success: true,
                    text: 'Extracted text from document',
                    confidence: 0.95,
                };
            },
        });
        // Accounting Agent
        this.agents.set('accounting-agent', {
            analyze: async (input) => {
                console.log('Accounting Agent analyzing:', input);
                // 会計分析のロジック
                return {
                    success: true,
                    category: '消耗品費',
                    taxRate: 0.1,
                    deductible: true,
                };
            },
        });
        // Database Agent
        this.agents.set('database-agent', {
            save: async (data) => {
                console.log('Database Agent saving:', data);
                // データベース保存のロジック
                return {
                    success: true,
                    id: 'generated-uuid',
                    timestamp: new Date().toISOString(),
                };
            },
        });
    }
    // Process workflow
    async processWorkflow(input) {
        try {
            console.log('Starting workflow for:', input.fileName);
            // Step 1: OCR処理
            const ocrResult = await this.mastra.run({
                toolId: 'process-ocr',
                input,
            });
            if (!ocrResult.success) {
                throw new Error('OCR processing failed');
            }
            // Step 2: 会計分析
            const analysisResult = await this.mastra.run({
                toolId: 'analyze-accounting',
                input: {
                    ocrText: ocrResult.text,
                    vendor: ocrResult.vendor,
                    amount: ocrResult.amount,
                    date: ocrResult.date,
                },
            });
            // Step 3: データベース保存
            const saveResult = await this.mastra.run({
                toolId: 'save-to-database',
                input: {
                    data: {
                        file_name: input.fileName,
                        vendor_name: ocrResult.vendor || 'Unknown',
                        total_amount: ocrResult.amount || 0,
                        tax_amount: Math.floor((ocrResult.amount || 0) * 0.1),
                        receipt_date: ocrResult.date || new Date().toISOString().split('T')[0],
                        category: analysisResult.category,
                        extracted_text: ocrResult.text,
                    },
                },
            });
            return {
                success: true,
                results: {
                    ocr: ocrResult,
                    analysis: analysisResult,
                    database: saveResult,
                },
            };
        }
        catch (error) {
            console.error('Workflow error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    // Call MCP server
    async callMCPServer(server, method, params) {
        // MCP サーバーとの通信実装
        console.log(`Calling MCP server: ${server}.${method}`, params);
        return {
            success: true,
            result: 'MCP server response',
        };
    }
    // Get Mastra instance
    getMastra() {
        return this.mastra;
    }
}
exports.MastraOrchestrator = MastraOrchestrator;
// Export singleton instance
exports.orchestrator = new MastraOrchestrator();
