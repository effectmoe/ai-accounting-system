import { MCPServer } from '@mastra/mcp';
import { createAgent } from '@mastra/core';
import * as dotenv from 'dotenv';
import { logger } from './lib/logger';

// Load environment variables
dotenv.config();

// Import all agents
import { accountingAgent } from './src/agents/accounting-agent';
import { customerAgent } from './src/agents/customer-agent';
import { databaseAgent } from './src/agents/database-agent';
import { japanTaxAgent } from './src/agents/japan-tax-agent';
import { ocrAgent } from './src/agents/ocr-agent';
import { productAgent } from './src/agents/product-agent';
import { uiAgent } from './src/agents/ui-agent';

// Import workflows
import accountingWorkflow from './src/workflows/accounting-workflow';
import complianceWorkflow from './src/workflows/compliance-workflow';
import invoiceProcessingWorkflow from './src/workflows/invoice-processing-workflow';

// Create MCP Server instance
const server = new MCPServer({
  name: "AAM Accounting Automation MCP",
  description: "MCP server for Japanese accounting automation system with AI agents",
  version: "1.0.0",
  
  // Register agents (they will be exposed as ask_<agentName>)
  agents: {
    accounting: accountingAgent,
    customer: customerAgent,
    database: databaseAgent,
    japanTax: japanTaxAgent,
    ocr: ocrAgent,
    product: productAgent,
    ui: uiAgent,
  },
  
  // Register workflows (they will be exposed as run_<workflowName>)
  workflows: {
    accountingProcess: accountingWorkflow,
    compliance: complianceWorkflow,
    invoiceProcessing: invoiceProcessingWorkflow,
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
  onError: (error: Error) => {
    logger.error('[MCP Server] Error:', error);
  },
});

// Start the server
async function start() {
  try {
    logger.info('[MCP Server] Starting AAM Accounting MCP Server...');
    
    // Start stdio transport for Claude Desktop
    await server.startStdio();
    
    logger.info('[MCP Server] Server started successfully');
    logger.info('[MCP Server] Available agents:');
    logger.info('  - ask_accounting: 会計処理・仕訳作成');
    logger.info('  - ask_customer: 顧客管理');
    logger.info('  - ask_database: データベース操作');
    logger.info('  - ask_japanTax: 日本税制対応');
    logger.info('  - ask_ocr: OCR処理');
    logger.info('  - ask_product: 商品管理');
    logger.info('  - ask_ui: UI操作');
    logger.info('[MCP Server] Available workflows:');
    logger.info('  - run_accountingProcess: 会計処理ワークフロー');
    logger.info('  - run_compliance: コンプライアンスチェック');
    logger.info('  - run_invoiceProcessing: 請求書処理');
    
  } catch (error) {
    logger.error('[MCP Server] Failed to start:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('[MCP Server] Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('[MCP Server] Shutting down gracefully...');
  process.exit(0);
});

// Start the server
start();