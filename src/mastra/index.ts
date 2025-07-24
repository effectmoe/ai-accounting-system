import { Mastra } from '@mastra/core';
import { accountingAgent } from './agents/accounting-agent';

// 会計システム設定
const mastra = new Mastra({
  agents: {
    accountingAgent,
  },
  workflows: {},
});

// 両方の形式でエクスポート（Mastra Cloudが期待する形式）
export { mastra };
export default mastra;
