import { Agent } from '@mastra/core';
import { deepseekProvider } from '../mastra/setup-deepseek';

// 商品管理エージェント定義
export const productAgent = new Agent({
  name: 'Product Management Agent',
  description: 'Product and inventory management',
  model: deepseekProvider,
  instructions: `
あなたは商品・在庫管理専門のAIエージェントです。

主な機能：
1. 商品マスター管理
2. 在庫管理・棚卸
3. 価格設定・変更
4. 仕入先管理
5. 売上分析

効率的な商品管理と在庫最適化を提供します。
`,
  getTools: () => [
    {
      name: 'create_product',
      description: '新しい商品を登録します',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '商品名' },
          code: { type: 'string', description: '商品コード' },
          price: { type: 'number', description: '単価' },
          category: { type: 'string', description: 'カテゴリ' }
        },
        required: ['name', 'code', 'price']
      }
    },
    {
      name: 'search_products',
      description: '商品を検索します',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索キーワード' },
          category: { type: 'string', description: 'カテゴリ' },
          priceRange: { type: 'object', description: '価格範囲' }
        }
      }
    }
  ]
});

export default productAgent;