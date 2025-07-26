import { Mastra } from "mastra";
import { Agent } from "mastra";

// DeepSeek provider configuration for stable version
const deepseekProvider = {
  type: 'DEEPSEEK' as const,
  name: 'deepseek',
  apiKey: process.env.DEEPSEEK_API_KEY || ''
};

// Create accounting agent
export const accountingAgent = new Agent({
  id: "accounting-agent",
  name: "Accounting Agent",
  description: "日本の会計処理専門のAIエージェント",
  instructions: `あなたは日本の会計処理専門のAIエージェントです。
  
主な機能：
1. 消費税計算
2. 仕訳作成
3. 財務レポート生成

ユーザーの要求に応じて適切に処理を行い、正確な会計情報を提供してください。`,
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

// Create customer agent
export const customerAgent = new Agent({
  id: "customer-agent",
  name: "Customer Agent",
  description: "顧客情報管理エージェント",
  instructions: "顧客情報の管理、検索、分析を行うエージェントです。",
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

// Create tax agent
export const japanTaxAgent = new Agent({
  id: "japan-tax-agent",
  name: "Japan Tax Agent",
  description: "日本税制専門エージェント",
  instructions: "日本の税制に関する計算とアドバイスを行うエージェントです。",
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
    toolChoice: 'auto'
  },
});

// Initialize Mastra with configuration
export const mastra = new Mastra({
  // System configuration
  systemPrompt: "会計自動化システム - Mastra Framework",
  
  // Provider configuration
  providers: [deepseekProvider],
  
  // Register all agents
  agents: [accountingAgent, customerAgent, japanTaxAgent],
  
  // Enable syncing to Mastra Cloud
  sync: {
    enabled: true,
    url: process.env.MASTRA_CLOUD_URL || 'https://mastra.ai'
  }
});

// Initialize Mastra instance
mastra.init().catch(console.error);

export default mastra;