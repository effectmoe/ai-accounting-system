#!/usr/bin/env node
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
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const dotenv = __importStar(require("dotenv"));
const logger_1 = require("./lib/logger");
// Load environment variables
dotenv.config();
// Import agents
const accounting_agent_1 = require("./src/agents/accounting-agent");
const customer_agent_1 = require("./src/agents/customer-agent");
const database_agent_1 = require("./src/agents/database-agent");
const japan_tax_agent_1 = require("./src/agents/japan-tax-agent");
const ocr_agent_1 = require("./src/agents/ocr-agent");
const product_agent_1 = require("./src/agents/product-agent");
const ui_agent_1 = require("./src/agents/ui-agent");
// Create MCP server
const server = new index_js_1.Server({
    name: "mastra-accounting",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
// Tool definitions
const tools = [
    {
        name: "ask_accounting",
        description: "会計処理・仕訳作成エージェント",
        inputSchema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    description: "実行する操作",
                    enum: ["create_journal", "process_transaction", "create_invoice", "generate_report"]
                },
                data: {
                    type: "object",
                    description: "操作に必要なデータ"
                }
            },
            required: ["operation", "data"]
        }
    },
    {
        name: "ask_customer",
        description: "顧客管理エージェント",
        inputSchema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    description: "実行する操作",
                    enum: ["create", "update", "delete", "search", "analyze"]
                },
                data: {
                    type: "object",
                    description: "操作に必要なデータ"
                }
            },
            required: ["operation"]
        }
    },
    {
        name: "ask_database",
        description: "データベース操作エージェント",
        inputSchema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    description: "実行する操作",
                    enum: ["query", "create", "update", "delete", "backup"]
                },
                collection: {
                    type: "string",
                    description: "対象コレクション"
                },
                data: {
                    type: "object",
                    description: "操作データ"
                }
            },
            required: ["operation", "collection"]
        }
    },
    {
        name: "ask_japanTax",
        description: "日本税制対応エージェント",
        inputSchema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    description: "実行する操作",
                    enum: ["calculate_tax", "validate_invoice", "check_compliance", "generate_tax_report"]
                },
                data: {
                    type: "object",
                    description: "税務データ"
                }
            },
            required: ["operation", "data"]
        }
    },
    {
        name: "ask_ocr",
        description: "OCR処理エージェント",
        inputSchema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    description: "実行する操作",
                    enum: ["process_image", "extract_invoice", "extract_receipt", "analyze_document"]
                },
                data: {
                    type: "object",
                    description: "画像データまたはURL"
                }
            },
            required: ["operation", "data"]
        }
    },
    {
        name: "ask_product",
        description: "商品管理エージェント",
        inputSchema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    description: "実行する操作",
                    enum: ["create", "update", "delete", "search", "analyze_inventory"]
                },
                data: {
                    type: "object",
                    description: "商品データ"
                }
            },
            required: ["operation"]
        }
    },
    {
        name: "ask_ui",
        description: "UI操作エージェント",
        inputSchema: {
            type: "object",
            properties: {
                operation: {
                    type: "string",
                    description: "実行する操作",
                    enum: ["generate_form", "create_dashboard", "export_pdf", "create_chart"]
                },
                data: {
                    type: "object",
                    description: "UI生成データ"
                }
            },
            required: ["operation", "data"]
        }
    },
    {
        name: "health_check",
        description: "システムヘルスチェック",
        inputSchema: {
            type: "object",
            properties: {}
        }
    }
];
// Handle list tools request
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
    return { tools };
});
// Handle call tool request
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "ask_accounting":
                const accountingResult = await accounting_agent_1.accountingAgent.tools[args.operation]?.handler(args.data);
                return { content: [{ type: "text", text: JSON.stringify(accountingResult, null, 2) }] };
            case "ask_customer":
                const customerResult = await customer_agent_1.customerAgent.tools[args.operation]?.handler(args.data);
                return { content: [{ type: "text", text: JSON.stringify(customerResult, null, 2) }] };
            case "ask_database":
                const databaseResult = await database_agent_1.databaseAgent.tools[args.operation]?.handler(args);
                return { content: [{ type: "text", text: JSON.stringify(databaseResult, null, 2) }] };
            case "ask_japanTax":
                const taxResult = await japan_tax_agent_1.japanTaxAgent.tools[args.operation]?.handler(args.data);
                return { content: [{ type: "text", text: JSON.stringify(taxResult, null, 2) }] };
            case "ask_ocr":
                const ocrResult = await ocr_agent_1.ocrAgent.tools[args.operation]?.handler(args.data);
                return { content: [{ type: "text", text: JSON.stringify(ocrResult, null, 2) }] };
            case "ask_product":
                const productResult = await product_agent_1.productAgent.tools[args.operation]?.handler(args.data);
                return { content: [{ type: "text", text: JSON.stringify(productResult, null, 2) }] };
            case "ask_ui":
                const uiResult = await ui_agent_1.uiAgent.tools[args.operation]?.handler(args.data);
                return { content: [{ type: "text", text: JSON.stringify(uiResult, null, 2) }] };
            case "health_check":
                return {
                    content: [{
                            type: "text",
                            text: JSON.stringify({
                                status: "healthy",
                                agents: {
                                    accounting: "active",
                                    customer: "active",
                                    database: "active",
                                    japanTax: "active",
                                    ocr: "active",
                                    product: "active",
                                    ui: "active"
                                },
                                timestamp: new Date().toISOString()
                            }, null, 2)
                        }]
                };
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        logger_1.logger.error('[MCP Server] Tool execution error:', error);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({ error: error.message }, null, 2)
                }]
        };
    }
});
// Start the server
async function start() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    logger_1.logger.info('[MCP Server] Mastra Accounting MCP Server started');
}
// Error handling
process.on('uncaughtException', (error) => {
    logger_1.logger.error('[MCP Server] Uncaught exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('[MCP Server] Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// Start server
start().catch((error) => {
    logger_1.logger.error('[MCP Server] Failed to start:', error);
    process.exit(1);
});
