import { Agent } from '@mastra/core';

export const mastraConstructionAgent = new Agent({
  name: 'mastra-construction-agent',
  description: 'システム構築とアーキテクチャ設計を行うエージェント',
  model: {
    provider: 'deepseek',
    name: 'deepseek-chat',
  },
  instructions: `
あなたはシステム構築専門のAIエージェントです。

主な機能：
1. アーキテクチャ設計
2. データベーススキーマ設計
3. APIエンドポイント設計
4. マイクロサービス設計
5. インフラ構成設計
6. セキュリティ設計

対応技術：
- Node.js / TypeScript
- MongoDB / PostgreSQL
- Docker / Kubernetes
- AWS / Azure / GCP
- GraphQL / REST API
- イベント駆動アーキテクチャ

ベストプラクティスに従った、スケーラブルで保守しやすいシステムを設計します。
`,
  tools: [
    {
      name: 'design_architecture',
      description: 'システムアーキテクチャを設計します',
      parameters: {
        type: 'object',
        properties: {
          project_name: { type: 'string', description: 'プロジェクト名' },
          architecture_type: {
            type: 'string',
            enum: ['monolithic', 'microservices', 'serverless', 'event-driven', 'hybrid'],
            description: 'アーキテクチャタイプ',
          },
          requirements: {
            type: 'object',
            properties: {
              scalability: { type: 'string', description: 'スケーラビリティ要件' },
              performance: { type: 'string', description: 'パフォーマンス要件' },
              availability: { type: 'string', description: '可用性要件' },
              security: { type: 'string', description: 'セキュリティ要件' },
            },
          },
          tech_stack: { type: 'array', items: { type: 'string' }, description: '使用技術' },
        },
        required: ['project_name', 'architecture_type', 'requirements'],
      },
    },
    {
      name: 'design_database_schema',
      description: 'データベーススキーマを設計します',
      parameters: {
        type: 'object',
        properties: {
          database_type: {
            type: 'string',
            enum: ['mongodb', 'postgresql', 'mysql', 'dynamodb', 'redis'],
            description: 'データベースタイプ',
          },
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'エンティティ名' },
                fields: { type: 'array', items: { type: 'object' }, description: 'フィールド定義' },
                relations: { type: 'array', items: { type: 'object' }, description: 'リレーション' },
                indexes: { type: 'array', items: { type: 'object' }, description: 'インデックス' },
              },
            },
            description: 'エンティティ定義',
          },
          use_cases: { type: 'array', items: { type: 'string' }, description: 'ユースケース' },
        },
        required: ['database_type', 'entities'],
      },
    },
    {
      name: 'design_api',
      description: 'APIエンドポイントを設計します',
      parameters: {
        type: 'object',
        properties: {
          api_type: { type: 'string', enum: ['rest', 'graphql', 'grpc'], description: 'APIタイプ' },
          endpoints: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'エンドポイントパス' },
                method: { type: 'string', description: 'HTTPメソッド' },
                description: { type: 'string', description: '説明' },
                request_schema: { type: 'object', description: 'リクエストスキーマ' },
                response_schema: { type: 'object', description: 'レスポンススキーマ' },
                auth_required: { type: 'boolean', description: '認証必要か' },
              },
            },
            description: 'エンドポイント定義',
          },
          authentication: { type: 'string', description: '認証方式' },
          rate_limiting: { type: 'object', description: 'レート制限設定' },
        },
        required: ['api_type', 'endpoints'],
      },
    },
    {
      name: 'create_infrastructure_config',
      description: 'インフラ構成を作成します',
      parameters: {
        type: 'object',
        properties: {
          platform: {
            type: 'string',
            enum: ['aws', 'azure', 'gcp', 'docker', 'kubernetes'],
            description: 'プラットフォーム',
          },
          environment: {
            type: 'string',
            enum: ['development', 'staging', 'production'],
            description: '環境',
          },
          resources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', description: 'リソースタイプ' },
                name: { type: 'string', description: 'リソース名' },
                config: { type: 'object', description: '設定' },
              },
            },
            description: 'リソース定義',
          },
          scaling_policy: { type: 'object', description: 'スケーリングポリシー' },
        },
        required: ['platform', 'environment', 'resources'],
      },
    },
    {
      name: 'generate_project_structure',
      description: 'プロジェクト構造を生成します',
      parameters: {
        type: 'object',
        properties: {
          project_type: {
            type: 'string',
            enum: ['web-app', 'api', 'cli', 'library', 'monorepo'],
            description: 'プロジェクトタイプ',
          },
          language: { type: 'string', description: 'プログラミング言語' },
          framework: { type: 'string', description: 'フレームワーク' },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: '必要な機能（testing, ci/cd, docker等）',
          },
        },
        required: ['project_type', 'language'],
      },
    },
    {
      name: 'design_security_architecture',
      description: 'セキュリティアーキテクチャを設計します',
      parameters: {
        type: 'object',
        properties: {
          security_requirements: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['authentication', 'authorization', 'encryption', 'audit', 'compliance'],
            },
            description: 'セキュリティ要件',
          },
          threat_model: { type: 'object', description: '脅威モデル' },
          security_controls: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                control_type: { type: 'string', description: 'コントロールタイプ' },
                implementation: { type: 'string', description: '実装方法' },
              },
            },
            description: 'セキュリティコントロール',
          },
        },
        required: ['security_requirements'],
      },
    },
  ],
});