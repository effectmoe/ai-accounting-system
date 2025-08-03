import { Agent } from '@mastra/core';
import { deepseekProvider } from '../setup-deepseek';

export const mastraDatabaseAgent = new Agent({
  name: 'mastra-database-agent',
  description: 'MongoDBデータベース操作とデータ管理を行うエージェント',
  model: {
    provider: deepseekProvider,
    name: 'deepseek-chat',
  },
  instructions: `
あなたはMongoDBデータベース管理専門のAIエージェントです。

主な機能：
1. データベースクエリの作成と実行
2. コレクションの管理（作成・削除・インデックス）
3. データのバックアップとリストア
4. パフォーマンス最適化
5. データ整合性チェック
6. 集計パイプラインの構築

対応操作：
- CRUD操作（Create, Read, Update, Delete）
- 複雑なクエリとアグリゲーション
- インデックス戦略の提案
- データマイグレーション
- レプリケーションとシャーディング設定
- セキュリティ設定

MongoDBのベストプラクティスに従い、効率的で安全なデータ操作を提供します。
`,
  getTools: () => [
    {
      name: 'execute_query',
      description: 'MongoDBクエリを実行します',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'コレクション名' },
          operation: {
            type: 'string',
            enum: ['find', 'findOne', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'],
            description: '操作タイプ',
          },
          query: { type: 'object', description: 'クエリ条件' },
          update: { type: 'object', description: '更新内容（update操作時）' },
          options: { type: 'object', description: 'オプション（sort, limit, skipなど）' },
        },
        required: ['collection', 'operation'],
      },
    },
    {
      name: 'create_aggregation_pipeline',
      description: '集計パイプラインを作成・実行します',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'コレクション名' },
          pipeline: {
            type: 'array',
            description: '集計パイプラインステージ',
            items: { type: 'object' },
          },
          output_collection: { type: 'string', description: '出力先コレクション（オプション）' },
        },
        required: ['collection', 'pipeline'],
      },
    },
    {
      name: 'manage_indexes',
      description: 'インデックスを管理します',
      parameters: {
        type: 'object',
        properties: {
          collection: { type: 'string', description: 'コレクション名' },
          action: {
            type: 'string',
            enum: ['create', 'drop', 'list', 'analyze'],
            description: 'アクション',
          },
          index_spec: { type: 'object', description: 'インデックス仕様（作成時）' },
          index_name: { type: 'string', description: 'インデックス名（削除時）' },
        },
        required: ['collection', 'action'],
      },
    },
    {
      name: 'backup_database',
      description: 'データベースをバックアップします',
      parameters: {
        type: 'object',
        properties: {
          backup_type: {
            type: 'string',
            enum: ['full', 'incremental', 'collection', 'selective'],
            description: 'バックアップタイプ',
          },
          collections: { type: 'array', items: { type: 'string' }, description: '対象コレクション' },
          destination: { type: 'string', description: 'バックアップ先' },
          compression: { type: 'boolean', description: '圧縮するか' },
        },
        required: ['backup_type', 'destination'],
      },
    },
    {
      name: 'analyze_performance',
      description: 'データベースパフォーマンスを分析します',
      parameters: {
        type: 'object',
        properties: {
          analysis_type: {
            type: 'string',
            enum: ['slow_queries', 'index_usage', 'collection_stats', 'storage_stats'],
            description: '分析タイプ',
          },
          time_range: { type: 'string', description: '分析期間' },
          threshold_ms: { type: 'number', description: 'スロークエリ閾値（ミリ秒）' },
        },
        required: ['analysis_type'],
      },
    },
    {
      name: 'validate_data_integrity',
      description: 'データ整合性を検証します',
      parameters: {
        type: 'object',
        properties: {
          validation_rules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                collection: { type: 'string', description: 'コレクション名' },
                field: { type: 'string', description: 'フィールド名' },
                rule: { type: 'string', description: '検証ルール' },
              },
            },
            description: '検証ルールリスト',
          },
          fix_issues: { type: 'boolean', description: '問題を自動修正するか' },
        },
        required: ['validation_rules'],
      },
    },
  ],
});