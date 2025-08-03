import { Agent } from '@mastra/core';
import { deepseekProvider } from '../mastra/setup-deepseek';

// データベースエージェント定義  
export const databaseAgent = new Agent({
  name: 'Database Management Agent',
  description: 'MongoDB database operations and management',
  model: deepseekProvider,
  instructions: `
あなたはデータベース管理専門のAIエージェントです。

主な機能：
1. MongoDB CRUD操作
2. データ検索・集計
3. データベース最適化
4. インデックス管理
5. データ整合性確認

日本の会計システムに特化したデータベース操作を提供します。
`,
  getTools: () => [
    {
      name: 'query_database',
      description: 'データベースクエリを実行します',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'コレクション名' },
          query: { type: 'object', description: 'クエリ条件' },
          options: { type: 'object', description: 'オプション' }
        },
        required: ['collection', 'query']
      }
    },
    {
      name: 'create_document',
      description: '新しいドキュメントを作成します',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'コレクション名' },
          data: { type: 'object', description: 'ドキュメントデータ' }
        },
        required: ['collection', 'data']
      }
    },
    {
      name: 'update_document',
      description: 'ドキュメントを更新します',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'コレクション名' },
          id: { type: 'string', description: 'ドキュメントID' },
          updateData: { type: 'object', description: '更新データ' }
        },
        required: ['collection', 'id', 'updateData']
      }
    }
  ]
});

export default databaseAgent;