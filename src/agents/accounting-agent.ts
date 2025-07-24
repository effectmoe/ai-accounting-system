import { Mastra } from '@mastra/core';

// シンプル版の会計エージェント
import { accountingAgent } from '../agents/simple-accounting-agent';

// 会計システム設定
export const mastra = new Mastra({
  agents: {
    accountingAgent,
  },
  workflows: {},
});

export default mastra;
