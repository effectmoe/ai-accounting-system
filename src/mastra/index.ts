import { Mastra } from '@mastra/core';

// まずは確実に動く accounting-agent だけでテスト
import { accountingAgent } from '../agents/accounting-agent';

// 会計システム設定（段階的に追加）
const mastra = new Mastra({
  agents: {
    // 会計エージェントのみ（確実に動作）
    accountingAgent,
  },
  workflows: {},
});

// 両方の形式でエクスポート
export { mastra };
export default mastra;

// 両方の形式でエクスポート
export { mastra };
export default mastra;
