// Mastraの実装をインポート（fsというエクスポート名を使用）
import { fs } from './mastra.mjs';

// Mastraインスタンスからエージェントとワークフローを取得
const agents = fs && fs.getAgents ? fs.getAgents() : {};
const workflows = fs && fs.getWorkflows ? fs.getWorkflows() : {};

// Mastra Cloud用のエージェント情報を整形
export function handleAgentsEndpoint() {
  // とりあえず固定のエージェントリストを返す
  return {
    accountingAgent: {
      name: "mastra-accounting-agent",
      instructions: "日本の会計処理専門AIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    customerAgent: {
      name: "mastra-customer-agent",
      instructions: "顧客管理専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    databaseAgent: {
      name: "mastra-database-agent",
      instructions: "データベース操作専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    deploymentAgent: {
      name: "mastra-deployment-agent",
      instructions: "デプロイメント専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    japanTaxAgent: {
      name: "mastra-japan-tax-agent",
      instructions: "日本税制専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    ocrAgent: {
      name: "mastra-ocr-agent",
      instructions: "OCR処理専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    problemSolvingAgent: {
      name: "mastra-problem-solving-agent",
      instructions: "問題解決専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    productAgent: {
      name: "mastra-product-agent",
      instructions: "商品管理専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    refactorAgent: {
      name: "mastra-refactor-agent",
      instructions: "リファクタリング専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    uiAgent: {
      name: "mastra-ui-agent",
      instructions: "UI設計専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    constructionAgent: {
      name: "mastra-construction-agent",
      instructions: "建設業専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    },
    webScraperAgent: {
      name: "mastra-web-scraper-agent",
      instructions: "Webスクレイピング専門のAIエージェント",
      tools: {},
      workflows: {},
      provider: {
        name: "deepseek",
        models: { "deepseek-chat": { id: "deepseek-chat" } }
      }
    }
  };
}

// Mastra Cloud用のワークフロー情報を整形
export function handleWorkflowsEndpoint() {
  // とりあえず固定のワークフローリストを返す
  return {
    accountingWorkflow: {
      name: "accounting-workflow",
      description: "会計処理ワークフロー",
      triggers: [],
      steps: []
    },
    complianceWorkflow: {
      name: "compliance-workflow",
      description: "コンプライアンスワークフロー",
      triggers: [],
      steps: []
    },
    invoiceProcessingWorkflow: {
      name: "invoice-processing-workflow",
      description: "請求書処理ワークフロー",
      triggers: [],
      steps: []
    },
    deploymentWorkflow: {
      name: "deployment-workflow",
      description: "デプロイメントワークフロー",
      triggers: [],
      steps: []
    }
  };
}

// エージェントとワークフローのサマリーを返す
export function handleSummaryEndpoint() {
  return {
    agents: [
      { id: "accountingAgent", name: "mastra-accounting-agent", description: "日本の会計処理専門AIエージェント" },
      { id: "customerAgent", name: "mastra-customer-agent", description: "顧客管理専門のAIエージェント" },
      { id: "databaseAgent", name: "mastra-database-agent", description: "データベース操作専門のAIエージェント" },
      { id: "deploymentAgent", name: "mastra-deployment-agent", description: "デプロイメント専門のAIエージェント" },
      { id: "japanTaxAgent", name: "mastra-japan-tax-agent", description: "日本税制専門のAIエージェント" },
      { id: "ocrAgent", name: "mastra-ocr-agent", description: "OCR処理専門のAIエージェント" },
      { id: "problemSolvingAgent", name: "mastra-problem-solving-agent", description: "問題解決専門のAIエージェント" },
      { id: "productAgent", name: "mastra-product-agent", description: "商品管理専門のAIエージェント" },
      { id: "refactorAgent", name: "mastra-refactor-agent", description: "リファクタリング専門のAIエージェント" },
      { id: "uiAgent", name: "mastra-ui-agent", description: "UI設計専門のAIエージェント" },
      { id: "constructionAgent", name: "mastra-construction-agent", description: "建設業専門のAIエージェント" },
      { id: "webScraperAgent", name: "mastra-web-scraper-agent", description: "Webスクレイピング専門のAIエージェント" }
    ],
    workflows: [
      { id: "accountingWorkflow", name: "accounting-workflow", description: "会計処理ワークフロー" },
      { id: "complianceWorkflow", name: "compliance-workflow", description: "コンプライアンスワークフロー" },
      { id: "invoiceProcessingWorkflow", name: "invoice-processing-workflow", description: "請求書処理ワークフロー" },
      { id: "deploymentWorkflow", name: "deployment-workflow", description: "デプロイメントワークフロー" }
    ],
    totalAgents: 12,
    totalWorkflows: 4
  };
}