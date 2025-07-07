import { MastraConfig } from './src/lib/mastra-runtime';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Import agents
import taxLibraryGenerator from './src/agents/tax-library-generator';
import accountingSchemaDesigner from './src/agents/accounting-schema-designer';
import nlwebIntegration from './src/agents/nlweb-integration';
import ocrProcessor from './src/agents/ocr-processor';
import complianceValidator from './src/agents/compliance-validator';
import gasDeployAgent from './src/agents/gas-deploy-agent';
import gasTestAgent from './src/agents/gas-test-agent';
import gasUpdateAgent from './src/agents/gas-update-agent';

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
    taxLibraryGenerator,
    accountingSchemaDesigner,
    nlwebIntegration,
    ocrProcessor,
    complianceValidator,
    gasDeployAgent,
    gasTestAgent,
    gasUpdateAgent,
  ],
  
  // Workflow configurations
  workflows: [
    accountingWorkflow,
    complianceWorkflow,
    invoiceProcessingWorkflow,
  ],
  
  // Integration configurations
  integrations: {
    supabase: {
      client: supabase,
      tables: {
        companies: 'companies',
        accounts: 'accounts',
        transactions: 'transactions',
        transaction_lines: 'transaction_lines',
        invoices: 'invoices',
        tax_calculations: 'tax_calculations',
        compliance_reports: 'compliance_reports',
        customers: 'customers',
        products: 'products',
      },
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'gpt-4-turbo-preview',
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-opus-20240229',
    },
    googleCloudVision: {
      keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    },
    googleAppsScript: {
      clientId: process.env.GAS_CLIENT_ID,
      clientSecret: process.env.GAS_CLIENT_SECRET,
      redirectUri: process.env.GAS_REDIRECT_URI || 'http://localhost:3000/auth/callback',
      tokenPath: process.env.GAS_TOKEN_PATH || './tokens.json',
      projectId: process.env.GAS_PROJECT_ID || 'AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ',
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
      // Log to Supabase audit table if needed
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