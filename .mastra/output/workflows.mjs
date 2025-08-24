// Mastra Cloud Compatible Workflow Definitions
import { Workflow } from '@mastra/core';

// Define all 4 workflows in Mastra Cloud format
export const workflows = {
  accountingWorkflow: new Workflow({
    name: 'accounting-workflow',
    description: '会計処理の自動化ワークフロー。請求書処理から仕訳作成まで実行します。',
    steps: [
      {
        id: 'step-1',
        name: 'Document Analysis',
        agent: 'ocrAgent',
        action: 'Extract text from documents'
      },
      {
        id: 'step-2',
        name: 'Data Validation',
        agent: 'accountingAgent',
        action: 'Validate accounting data'
      },
      {
        id: 'step-3',
        name: 'Tax Calculation',
        agent: 'japanTaxAgent',
        action: 'Calculate taxes'
      },
      {
        id: 'step-4',
        name: 'Database Update',
        agent: 'databaseAgent',
        action: 'Save to database'
      }
    ]
  }),

  complianceWorkflow: new Workflow({
    name: 'compliance-workflow',
    description: '日本の税法コンプライアンス確認ワークフロー。法令遵守を自動チェックします。',
    steps: [
      {
        id: 'step-1',
        name: 'Document Collection',
        agent: 'databaseAgent',
        action: 'Collect compliance documents'
      },
      {
        id: 'step-2',
        name: 'Compliance Check',
        agent: 'japanTaxAgent',
        action: 'Check tax compliance'
      },
      {
        id: 'step-3',
        name: 'Report Generation',
        agent: 'accountingAgent',
        action: 'Generate compliance report'
      }
    ]
  }),

  invoiceProcessingWorkflow: new Workflow({
    name: 'invoice-processing-workflow',
    description: '請求書処理ワークフロー。OCRから支払処理まで自動化します。',
    steps: [
      {
        id: 'step-1',
        name: 'OCR Processing',
        agent: 'ocrAgent',
        action: 'Extract invoice data'
      },
      {
        id: 'step-2',
        name: 'Customer Matching',
        agent: 'customerAgent',
        action: 'Match with customer records'
      },
      {
        id: 'step-3',
        name: 'Invoice Validation',
        agent: 'accountingAgent',
        action: 'Validate invoice details'
      },
      {
        id: 'step-4',
        name: 'Save Invoice',
        agent: 'databaseAgent',
        action: 'Store invoice in database'
      }
    ]
  }),

  deploymentWorkflow: new Workflow({
    name: 'deployment-workflow',
    description: 'システムデプロイメントワークフロー。コードからVercelデプロイまで実行します。',
    steps: [
      {
        id: 'step-1',
        name: 'Code Refactoring',
        agent: 'refactorAgent',
        action: 'Optimize code for deployment'
      },
      {
        id: 'step-2',
        name: 'UI Building',
        agent: 'uiAgent',
        action: 'Build UI components'
      },
      {
        id: 'step-3',
        name: 'System Construction',
        agent: 'constructionAgent',
        action: 'Construct deployment package'
      },
      {
        id: 'step-4',
        name: 'Deploy to Vercel',
        agent: 'deploymentAgent',
        action: 'Execute deployment'
      }
    ]
  })
};

// Export workflow metadata for Mastra Cloud discovery
export const workflowMetadata = Object.entries(workflows).map(([key, workflow]) => ({
  id: key,
  name: workflow.name,
  description: workflow.description,
  steps: workflow.steps.length,
  agents: [...new Set(workflow.steps.map(s => s.agent))],
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

export default workflows;