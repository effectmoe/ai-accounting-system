import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";

// DeepSeek provider configuration
const deepseekModel = {
  provider: 'deepseek',
  name: 'deepseek-chat',
  apiKey: process.env.DEEPSEEK_API_KEY
};

// Create accounting agent
export const accountingAgent = new Agent({
  name: "Accounting Agent",
  instructions: `あなたは日本の会計処理専門のAIエージェントです。
  
主な機能：
1. 消費税計算
2. 仕訳作成
3. 財務レポート生成

ユーザーの要求に応じて適切に処理を行い、正確な会計情報を提供してください。`,
  model: deepseekModel,
});

// Create customer agent
export const customerAgent = new Agent({
  name: "Customer Agent",
  instructions: "顧客情報の管理、検索、分析を行うエージェントです。",
  model: deepseekModel,
});

// Create tax agent
export const japanTaxAgent = new Agent({
  name: "Japan Tax Agent",
  instructions: "日本の税制に関する計算とアドバイスを行うエージェントです。",
  model: deepseekModel,
});

// Register all agents with Mastra
export const mastra = new Mastra({
  agents: {
    accountingAgent,
    customerAgent,
    japanTaxAgent,
  },
});

export default mastra;