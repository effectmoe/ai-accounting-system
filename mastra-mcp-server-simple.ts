#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';
import { logger } from './lib/logger';

// Load environment variables
dotenv.config();

// Import agents
import { accountingAgent } from './src/agents/accounting-agent';
import { customerAgent } from './src/agents/customer-agent';
import { databaseAgent } from './src/agents/database-agent';
import { japanTaxAgent } from './src/agents/japan-tax-agent';
import { ocrAgent } from './src/agents/ocr-agent';
import { productAgent } from './src/agents/product-agent';
import { uiAgent } from './src/agents/ui-agent';

// Create MCP server
const server = new Server({
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
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle call tool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case "ask_accounting":
        const accountingResult = await accountingAgent.tools[args.operation]?.handler(args.data);
        return { content: [{ type: "text", text: JSON.stringify(accountingResult, null, 2) }] };
        
      case "ask_customer":
        const customerResult = await customerAgent.tools[args.operation]?.handler(args.data);
        return { content: [{ type: "text", text: JSON.stringify(customerResult, null, 2) }] };
        
      case "ask_database":
        const databaseResult = await databaseAgent.tools[args.operation]?.handler(args);
        return { content: [{ type: "text", text: JSON.stringify(databaseResult, null, 2) }] };
        
      case "ask_japanTax":
        const taxResult = await japanTaxAgent.tools[args.operation]?.handler(args.data);
        return { content: [{ type: "text", text: JSON.stringify(taxResult, null, 2) }] };
        
      case "ask_ocr":
        const ocrResult = await ocrAgent.tools[args.operation]?.handler(args.data);
        return { content: [{ type: "text", text: JSON.stringify(ocrResult, null, 2) }] };
        
      case "ask_product":
        const productResult = await productAgent.tools[args.operation]?.handler(args.data);
        return { content: [{ type: "text", text: JSON.stringify(productResult, null, 2) }] };
        
      case "ask_ui":
        const uiResult = await uiAgent.tools[args.operation]?.handler(args.data);
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
  } catch (error) {
    logger.error('[MCP Server] Tool execution error:', error);
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('[MCP Server] Mastra Accounting MCP Server started');
}

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('[MCP Server] Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('[MCP Server] Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
start().catch((error) => {
  logger.error('[MCP Server] Failed to start:', error);
  process.exit(1);
});