// Mastra Cloud Compatible Agent Definitions
import { Agent } from '@mastra/core';

// Define all 12 agents in Mastra Cloud format
export const agents = {
  accountingAgent: new Agent({
    name: 'mastra-accounting-agent',
    instructions: '日本の会計処理専門AIエージェント。請求書、領収書、見積書の処理と分析を行います。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  customerAgent: new Agent({
    name: 'mastra-customer-agent',
    instructions: '顧客情報管理とCRM機能を提供するエージェント。顧客データの管理と分析を行います。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  databaseAgent: new Agent({
    name: 'mastra-database-agent',
    instructions: 'MongoDB/Supabaseデータベース操作専門エージェント。データの読み書きと管理を行います。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  deploymentAgent: new Agent({
    name: 'mastra-deployment-agent',
    instructions: 'システムデプロイメントと環境管理エージェント。Vercelデプロイと設定を行います。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  japanTaxAgent: new Agent({
    name: 'mastra-japan-tax-agent',
    instructions: '日本の税法に特化したエージェント。消費税、源泉徴収税、法人税の計算を行います。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  ocrAgent: new Agent({
    name: 'mastra-ocr-agent',
    instructions: 'OCR処理専門エージェント。画像からテキストを抽出し、構造化データに変換します。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  problemSolvingAgent: new Agent({
    name: 'mastra-problem-solving-agent',
    instructions: '複雑な問題解決をサポートするエージェント。エラー分析と解決策の提案を行います。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  productAgent: new Agent({
    name: 'mastra-product-agent',
    instructions: '製品・商品管理エージェント。在庫管理と商品情報の更新を行います。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  refactorAgent: new Agent({
    name: 'mastra-refactor-agent',
    instructions: 'コードリファクタリングエージェント。コード品質改善と最適化を行います。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  uiAgent: new Agent({
    name: 'mastra-ui-agent',
    instructions: 'UIデザインとフロントエンド開発エージェント。React/Next.jsコンポーネントを生成します。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  constructionAgent: new Agent({
    name: 'mastra-construction-agent',
    instructions: 'システム構築エージェント。アーキテクチャ設計と実装を行います。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  }),

  webScraperAgent: new Agent({
    name: 'mastra-web-scraper-agent',
    instructions: 'Webスクレイピングエージェント。Webサイトからデータを抽出します。',
    model: {
      provider: 'DEEPSEEK',
      name: 'deepseek-chat',
      toolChoice: 'auto'
    }
  })
};

// Export agent metadata for Mastra Cloud discovery
export const agentMetadata = Object.entries(agents).map(([key, agent]) => ({
  id: key,
  name: agent.name,
  description: agent.instructions,
  provider: 'DEEPSEEK',
  model: 'deepseek-chat',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}));

export default agents;