import { Agent } from '@mastra/core';
import { deepseekProvider } from '../mastra/setup-deepseek';

// 顧客管理エージェント定義
export const customerAgent = new Agent({
  name: 'Customer Management Agent',
  description: 'Manage customer information, analyze customer data, and handle customer-related operations with MongoDB integration',
  model: deepseekProvider,
  instructions: `
あなたは顧客管理専門のAIエージェントです。

主な機能：
1. 顧客情報の作成・更新・検索
2. 顧客分析とリスク評価
3. インボイス番号の検証
4. データのエクスポート

日本の商慣行と法的要件に準拠した顧客管理を行います。
`,
  getTools: () => [
    {
      name: 'create_customer',
      description: '新しい顧客を作成します',
      parameters: {
        type: 'object',
        properties: {
          companyName: { type: 'string', description: '会社名' },
          industry: { type: 'string', description: '業種' },
          contactEmail: { type: 'string', description: '連絡先メール' }
        },
        required: ['companyName', 'industry', 'contactEmail']
      }
    },
    {
      name: 'search_customers',
      description: '顧客を検索します',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索クエリ' },
          status: { type: 'string', enum: ['active', 'inactive'], description: 'ステータス' }
        }
      }
    }
  ]
});

export default customerAgent;