import { Mastra } from '@mastra/core';

// まずは確実に動く accounting-agent だけでテスト
import { accountingAgent } from '../agents/accounting-agent';

// 会計システム設定（段階的に追加）
export const mastra = new Mastra({
  agents: {
    // 会計エージェントのみ（確実に動作）
    accountingAgent,
  },
  workflows: {},
});

// デフォルトエクスポートのみ
export default mastra;
