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
const mongodb_client_1 = require("./src/lib/mongodb-client");
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables
dotenv.config();
// Initialize MongoDB client
const db = mongodb_client_1.DatabaseService.getInstance();
// Import agents
const accounting_agent_1 = __importDefault(require("./src/agents/accounting-agent"));
const customer_agent_1 = __importDefault(require("./src/agents/customer-agent"));
const database_agent_1 = __importDefault(require("./src/agents/database-agent"));
const deployment_agent_1 = __importDefault(require("./src/agents/deployment-agent"));
const japan_tax_agent_1 = __importDefault(require("./src/agents/japan-tax-agent"));
const ocr_agent_1 = __importDefault(require("./src/agents/ocr-agent"));
const product_agent_1 = __importDefault(require("./src/agents/product-agent"));
const ui_agent_1 = __importDefault(require("./src/agents/ui-agent"));
const problem_solving_agent_1 = __importDefault(require("./src/agents/problem-solving-agent"));
const refactor_agent_1 = __importDefault(require("./src/agents/refactor-agent"));
// Import workflows
const accounting_workflow_1 = __importDefault(require("./src/workflows/accounting-workflow"));
const compliance_workflow_1 = __importDefault(require("./src/workflows/compliance-workflow"));
const invoice_processing_workflow_1 = __importDefault(require("./src/workflows/invoice-processing-workflow"));
const config = {
    name: 'Japanese Accounting Automation System',
    version: '1.0.0',
    description: 'AI-driven accounting system for Japanese tax compliance using Mastra',
    // Agent configurations
    agents: [
        accounting_agent_1.default,
        customer_agent_1.default,
        database_agent_1.default,
        deployment_agent_1.default,
        japan_tax_agent_1.default,
        ocr_agent_1.default,
        product_agent_1.default,
        ui_agent_1.default,
        problem_solving_agent_1.default,
        refactor_agent_1.default,
    ],
    // Workflow configurations
    workflows: [
        accounting_workflow_1.default,
        compliance_workflow_1.default,
        invoice_processing_workflow_1.default,
    ],
    // Integration configurations
    integrations: {
        mongodb: {
            client: db,
            collections: mongodb_client_1.Collections,
            connectionString: process.env.MONGODB_URI,
            databaseName: process.env.MONGODB_DB_NAME || 'accounting-automation',
        },
        openai: {
            apiKey: process.env.OPENAI_API_KEY,
            model: 'gpt-4-turbo-preview',
        },
        anthropic: {
            apiKey: process.env.ANTHROPIC_API_KEY,
            model: 'claude-3-opus-20240229',
        },
        azureFormRecognizer: {
            endpoint: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
            apiKey: process.env.AZURE_FORM_RECOGNIZER_KEY,
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
            destination: path_1.default.join(__dirname, 'logs'),
        },
        monitoring: {
            enabled: true,
            metrics: ['execution_time', 'error_rate', 'agent_usage'],
        },
    },
    // Hooks for lifecycle events
    hooks: {
        beforeAgentExecution: async (context) => {
            console.log(`[Mastra] Starting agent: ${context.agent.name}`);
        },
        afterAgentExecution: async (context, result) => {
            console.log(`[Mastra] Completed agent: ${context.agent.name}`);
            // Log to MongoDB audit collection
            try {
                await db.create(mongodb_client_1.Collections.AUDIT_LOGS, {
                    agentName: context.agent.name,
                    operation: context.operation,
                    result: result.success ? 'success' : 'failure',
                    executionTime: Date.now() - context.startTime,
                    timestamp: new Date(),
                });
            }
            catch (error) {
                console.warn('Failed to log audit entry:', error);
            }
        },
        onError: async (error, context) => {
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
            secret: process.env.MASTRA_API_SECRET,
        },
    },
};
exports.default = config;
