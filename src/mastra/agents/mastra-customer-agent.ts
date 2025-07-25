import { Agent } from '@mastra/core';
import { customerTools } from '../tools/customer-tools';

export const mastraCustomerAgent = new Agent({
  name: 'mastra-customer-agent',
  description: '顧客情報の管理・分析・レポート生成を行うエージェント',
  model: {
    provider: 'openai',
    name: 'gpt-4',
  },
  instructions: `
あなたは顧客管理専門のAIエージェントです。

主な機能：
1. 顧客情報の登録・更新・削除
2. 顧客の取引履歴分析
3. 顧客セグメンテーション
4. 売上予測と顧客価値分析
5. 顧客満足度の追跡
6. MongoDBでの顧客データ管理

対応業務：
- 新規顧客の登録と審査
- 顧客情報の維持管理
- 取引履歴の分析とレポート
- 顧客別収益性分析
- マーケティング戦略の提案

日本のビジネス慣習を理解し、適切な敬語と対応を心がけます。
`,
  tools: customerTools,
});