import { Agent } from '@mastra/core';
import { deepseekProvider } from '../mastra/setup-deepseek';

// 日本税制エージェント定義
export const japanTaxAgent = new Agent({
  name: 'Japan Tax Agent',
  description: 'Japanese tax compliance and calculation specialist',
  model: deepseekProvider,
  instructions: `
あなたは日本の税制専門AIエージェントです。

主な機能：
1. 消費税計算（10%、8%、軽減税率）
2. 所得税・法人税計算
3. インボイス制度対応
4. 税務申告書作成支援
5. 税法コンプライアンス確認

最新の日本税法に準拠した正確な税務処理を提供します。
`,
  getTools: () => [
    {
      name: 'calculate_consumption_tax',
      description: '消費税を計算します',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: '税抜金額' },
          taxRate: { type: 'number', enum: [8, 10], description: '税率（%）' },
          includeTax: { type: 'boolean', description: '税込価格かどうか' }
        },
        required: ['amount', 'taxRate']
      }
    },
    {
      name: 'validate_invoice_number',
      description: 'インボイス登録番号を検証します',
      parameters: {
        type: 'object',
        properties: {
          registrationNumber: { type: 'string', description: 'インボイス登録番号' }
        },
        required: ['registrationNumber']
      }
    }
  ]
});

export default japanTaxAgent;