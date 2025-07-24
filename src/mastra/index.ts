import { Mastra } from '@mastra/core';

// 簡単な基本設定でまず動かす
const mastra = new Mastra({
  // とりあえず空の設定で開始
  agents: {},
  workflows: {},
});

// 両方の形式でエクスポート（Mastra Cloudが期待する形式）
export { mastra };
export default mastra;
