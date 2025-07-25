"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_1 = require("@mastra/mcp");
const dotenv = __importStar(require("dotenv"));
const logger_1 = require("./lib/logger");
// Load environment variables
dotenv.config();
// Import all agents
const accounting_agent_1 = require("./src/agents/accounting-agent");
const customer_agent_1 = require("./src/agents/customer-agent");
const database_agent_1 = require("./src/agents/database-agent");
const japan_tax_agent_1 = require("./src/agents/japan-tax-agent");
const ocr_agent_1 = require("./src/agents/ocr-agent");
const product_agent_1 = require("./src/agents/product-agent");
const ui_agent_1 = require("./src/agents/ui-agent");
// Import workflows
const accounting_workflow_1 = __importDefault(require("./src/workflows/accounting-workflow"));
const compliance_workflow_1 = __importDefault(require("./src/workflows/compliance-workflow"));
const invoice_processing_workflow_1 = __importDefault(require("./src/workflows/invoice-processing-workflow"));
// Create MCP Server instance
const server = new mcp_1.MCPServer({
    name: "AAM Accounting Automation MCP",
    description: "MCP server for Japanese accounting automation system with AI agents",
    version: "1.0.0",
    // Register agents (they will be exposed as ask_<agentName>)
    agents: {
        accounting: accounting_agent_1.accountingAgent,
        customer: customer_agent_1.customerAgent,
        database: database_agent_1.databaseAgent,
        japanTax: japan_tax_agent_1.japanTaxAgent,
        ocr: ocr_agent_1.ocrAgent,
        product: product_agent_1.productAgent,
        ui: ui_agent_1.uiAgent,
    },
    // Register workflows (they will be exposed as run_<workflowName>)
    workflows: {
        accountingProcess: accounting_workflow_1.default,
        compliance: compliance_workflow_1.default,
        invoiceProcessing: invoice_processing_workflow_1.default,
    },
    // Custom tools
    tools: {
        // Health check tool
        healthCheck: {
            description: "Check system health and agent status",
            inputSchema: {
                type: "object",
                properties: {},
            },
            handler: async () => {
                const agentStatus = {
                    accounting: "active",
                    customer: "active",
                    database: "active",
                    japanTax: "active",
                    ocr: "active",
                    product: "active",
                    ui: "active",
                };
                return {
                    status: "healthy",
                    agents: agentStatus,
                    timestamp: new Date().toISOString(),
                    version: "1.0.0",
                };
            },
        },
        // List available agents
        listAgents: {
            description: "List all available agents and their descriptions",
            inputSchema: {
                type: "object",
                properties: {},
            },
            handler: async () => {
                return {
                    agents: [
                        { name: "accounting", description: "会計処理・仕訳作成エージェント" },
                        { name: "customer", description: "顧客管理エージェント" },
                        { name: "database", description: "データベース操作エージェント" },
                        { name: "japanTax", description: "日本税制対応エージェント" },
                        { name: "ocr", description: "OCR処理エージェント" },
                        { name: "product", description: "商品管理エージェント" },
                        { name: "ui", description: "UI操作エージェント" },
                    ],
                };
            },
        },
        // System info
        systemInfo: {
            description: "Get system information and configuration",
            inputSchema: {
                type: "object",
                properties: {},
            },
            handler: async () => {
                return {
                    system: "AAM Accounting Automation",
                    environment: process.env.NODE_ENV || "development",
                    mongodbConnected: !!process.env.MONGODB_URI,
                    azureOCRConfigured: !!process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
                    apiPort: process.env.MASTRA_API_PORT || 3001,
                };
            },
        },
    },
    // Transport configuration (stdio for Claude Desktop)
    transport: {
        type: 'stdio',
    },
    // Error handling
    onError: (error) => {
        logger_1.logger.error('[MCP Server] Error:', error);
    },
});
// Start the server
async function start() {
    try {
        logger_1.logger.info('[MCP Server] Starting AAM Accounting MCP Server...');
        // Start stdio transport for Claude Desktop
        await server.startStdio();
        logger_1.logger.info('[MCP Server] Server started successfully');
        logger_1.logger.info('[MCP Server] Available agents:');
        logger_1.logger.info('  - ask_accounting: 会計処理・仕訳作成');
        logger_1.logger.info('  - ask_customer: 顧客管理');
        logger_1.logger.info('  - ask_database: データベース操作');
        logger_1.logger.info('  - ask_japanTax: 日本税制対応');
        logger_1.logger.info('  - ask_ocr: OCR処理');
        logger_1.logger.info('  - ask_product: 商品管理');
        logger_1.logger.info('  - ask_ui: UI操作');
        logger_1.logger.info('[MCP Server] Available workflows:');
        logger_1.logger.info('  - run_accountingProcess: 会計処理ワークフロー');
        logger_1.logger.info('  - run_compliance: コンプライアンスチェック');
        logger_1.logger.info('  - run_invoiceProcessing: 請求書処理');
    }
    catch (error) {
        logger_1.logger.error('[MCP Server] Failed to start:', error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on('SIGINT', async () => {
    logger_1.logger.info('[MCP Server] Shutting down gracefully...');
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger_1.logger.info('[MCP Server] Shutting down gracefully...');
    process.exit(0);
});
// Start the server
start();
