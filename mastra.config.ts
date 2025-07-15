import { MastraConfig } from './src/lib/mastra-runtime';
import { DatabaseService, Collections } from './src/lib/mongodb-client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize MongoDB client
const db = DatabaseService.getInstance();

// Import agents
import accountingAgent from './src/agents/accounting-agent';
import customerAgent from './src/agents/customer-agent';
import databaseAgent from './src/agents/database-agent';
import deploymentAgent from './src/agents/deployment-agent';
import japanTaxAgent from './src/agents/japan-tax-agent';
import ocrAgent from './src/agents/ocr-agent';
import productAgent from './src/agents/product-agent';
import uiAgent from './src/agents/ui-agent';
import problemSolvingAgent from './src/agents/problem-solving-agent';

// Import workflows
import accountingWorkflow from './src/workflows/accounting-workflow';
import complianceWorkflow from './src/workflows/compliance-workflow';
import invoiceProcessingWorkflow from './src/workflows/invoice-processing-workflow';

const config: MastraConfig = {
  name: 'Japanese Accounting Automation System',
  version: '1.0.0',
  description: 'AI-driven accounting system for Japanese tax compliance using Mastra',
  
  // Agent configurations
  agents: [
    accountingAgent,
    customerAgent,
    databaseAgent,
    deploymentAgent,
    japanTaxAgent,
    ocrAgent,
    productAgent,
    uiAgent,
    problemSolvingAgent,
  ],
  
  // Workflow configurations
  workflows: [
    accountingWorkflow,
    complianceWorkflow,
    invoiceProcessingWorkflow,
  ],
  
  // Integration configurations
  integrations: {
    mongodb: {
      client: db,
      collections: Collections,
      connectionString: process.env.MONGODB_URI!,
      databaseName: process.env.MONGODB_DB_NAME || 'accounting-automation',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4-turbo-preview',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-opus-20240229',
    },
    azureFormRecognizer: {
      endpoint: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT!,
      apiKey: process.env.AZURE_FORM_RECOGNIZER_KEY!,
    },
    handwritingOCR: {
      apiToken: process.env.HANDWRITING_OCR_API_TOKEN,
    },
    nlweb: {
      enabled: true,
      apiEndpoint: process.env.NLWEB_API_ENDPOINT || 'https://nlweb.jp/api',
    },
  },
  
  // Global settings
  settings: {
    defaultTimeout: 300000, // 5 minutes
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      initialDelay: 1000,
    },
    logging: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      format: 'json',
      destination: path.join(__dirname, 'logs'),
    },
    monitoring: {
      enabled: true,
      metrics: ['execution_time', 'error_rate', 'agent_usage'],
    },
  },
  
  // Hooks for lifecycle events
  hooks: {
    beforeAgentExecution: async (context: any) => {
      console.log(`[Mastra] Starting agent: ${context.agent.name}`);
    },
    afterAgentExecution: async (context: any, result: any) => {
      console.log(`[Mastra] Completed agent: ${context.agent.name}`);
      // Log to MongoDB audit collection
      try {
        await db.create(Collections.AUDIT_LOGS, {
          agentName: context.agent.name,
          operation: context.operation,
          result: result.success ? 'success' : 'failure',
          executionTime: Date.now() - context.startTime,
          timestamp: new Date(),
        });
      } catch (error) {
        console.warn('Failed to log audit entry:', error);
      }
    },
    onError: async (error: any, context: any) => {
      console.error(`[Mastra] Error in ${context.type}: ${error.message}`);
      // Send error notification if critical
    },
  },
  
  // API configurations for external access
  api: {
    enabled: true,
    port: process.env.MASTRA_API_PORT || 3001,
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
    authentication: {
      type: 'bearer',
      secret: process.env.MASTRA_API_SECRET!,
    },
  },
};

export default config;