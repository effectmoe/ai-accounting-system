import { Mastra } from "@mastra/core";

// Import all agents
import { mastraAccountingAgent } from './agents/mastra-accounting-agent';
import { mastraCustomerAgent } from './agents/mastra-customer-agent';
import { mastraDatabaseAgent } from './agents/mastra-database-agent';
import { mastraDeploymentAgent } from './agents/mastra-deployment-agent';
import { mastraJapanTaxAgent } from './agents/mastra-japan-tax-agent';
import { mastraOcrAgent } from './agents/mastra-ocr-agent';
import { mastraProblemSolvingAgent } from './agents/mastra-problem-solving-agent';
import { mastraProductAgent } from './agents/mastra-product-agent';
import { mastraRefactorAgent } from './agents/mastra-refactor-agent';
import { mastraUiAgent } from './agents/mastra-ui-agent';
import { mastraConstructionAgent } from './agents/mastra-construction-agent';

// Import workflows
import { accountingWorkflow } from './workflows/accounting-workflow';
import { complianceWorkflow } from './workflows/compliance-workflow';
import { invoiceProcessingWorkflow } from './workflows/invoice-processing-workflow';
import { deploymentWorkflow } from './workflows/deployment-workflow';

// Create Mastra instance with all agents and workflows
export const mastra = new Mastra({
  name: "AI Accounting Automation System",
  server: {
    port: 4111,
    timeout: 30000
  },
  agents: {
    accountingAgent: mastraAccountingAgent,
    customerAgent: mastraCustomerAgent,
    databaseAgent: mastraDatabaseAgent,
    deploymentAgent: mastraDeploymentAgent,
    japanTaxAgent: mastraJapanTaxAgent,
    ocrAgent: mastraOcrAgent,
    problemSolvingAgent: mastraProblemSolvingAgent,
    productAgent: mastraProductAgent,
    refactorAgent: mastraRefactorAgent,
    uiAgent: mastraUiAgent,
    constructionAgent: mastraConstructionAgent
  },
  workflows: {
    accountingWorkflow,
    complianceWorkflow,
    invoiceProcessingWorkflow,
    deploymentWorkflow
  }
});

// Export individual agents for direct access
export {
  mastraAccountingAgent,
  mastraCustomerAgent,
  mastraDatabaseAgent,
  mastraDeploymentAgent,
  mastraJapanTaxAgent,
  mastraOcrAgent,
  mastraProblemSolvingAgent,
  mastraProductAgent,
  mastraRefactorAgent,
  mastraUiAgent,
  mastraConstructionAgent
};

// Export workflows
export {
  accountingWorkflow,
  complianceWorkflow,
  invoiceProcessingWorkflow,
  deploymentWorkflow
};

export default mastra;