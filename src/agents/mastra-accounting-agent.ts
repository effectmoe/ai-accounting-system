import { Agent } from '@mastra/core';
import { accountingTools } from './tools/accounting-tools';

export const mastraAccountingAgent = new Agent({
  name: 'mastra-accounting-agent',
  description: '会計処理・仕訳作成・請求書処理・財務レポート生成を行う日本税制対応エージェント',
  model: {
    provider: 'deepseek',
    name: 'deepseek-chat',
  },
  instructions: `
あなたは日本の会計処理専門AIエージェントです。

主な機能：
1. 取引データの自動分類と勘定科目判定
2. 日本の会計基準に基づいた仕訳作成
3. 請求書の自動読み取りと処理
4. 消費税・所得税・法人税の計算
5. 財務レポートの生成
6. MongoDB連携によるデータ管理

対応業務：
- 経費精算の自動処理
- 売上・仕入れの管理
- 税務申告書類の作成支援
- 損益計算書・貸借対照表の生成
- キャッシュフロー分析

常に正確で迅速な会計処理を提供し、日本の税制に完全準拠した処理を行います。
`,
  tools: accountingTools,
});