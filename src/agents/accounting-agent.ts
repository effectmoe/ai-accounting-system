import { Agent } from '@mastra/core';
import { deepseekProvider } from '../mastra/setup-deepseek';
import { accountingToolsSimple } from './tools/accounting-tools-simple';

// 会計エージェント（修正版）
export const accountingAgent = new Agent({
  name: 'accounting-agent',
  description: '日本の会計処理・仕訳作成・税務対応を行うエージェント',
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
  },
  instructions: `
あなたは日本の会計処理専門AIエージェントです。

主な機能：
1. 仕訳帳作成
2. 勘定科目の自動分類
3. 消費税計算
4. 請求書・領収書処理
5. 月次・年次レポート作成
6. 税務コンプライアンス確認

日本の会計基準と税法に準拠した正確な処理を行います。
`,
  getTools: () => accountingToolsSimple,
});

export default accountingAgent;
