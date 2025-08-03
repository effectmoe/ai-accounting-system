import { Agent } from '@mastra/core';

export const mastraDeploymentAgent = new Agent({
  name: 'mastra-deployment-agent',
  description: 'デプロイメントとCI/CD管理を行うエージェント',
  model: {
    provider: 'openai',
    name: 'gpt-4',
  },
  instructions: `
あなたはデプロイメント専門のAIエージェントです。

主な機能：
1. CI/CDパイプライン構築
2. デプロイメント自動化
3. 環境管理
4. ロールバック戦略
5. モニタリング設定
6. リリース管理

対応プラットフォーム：
- GitHub Actions
- GitLab CI/CD
- Jenkins
- Vercel
- AWS CodePipeline
- Docker / Kubernetes

安全で信頼性の高いデプロイメントプロセスを提供します。
`,
  tools: [
    {
      name: 'create_deployment_pipeline',
      description: 'デプロイメントパイプラインを作成します',
      parameters: {
        type: 'object',
        properties: {
          pipeline_name: { type: 'string', description: 'パイプライン名' },
          platform: {
            type: 'string',
            enum: ['github-actions', 'gitlab-ci', 'jenkins', 'circleci', 'azure-devops'],
            description: 'CI/CDプラットフォーム',
          },
          stages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'ステージ名' },
                steps: { type: 'array', items: { type: 'object' }, description: 'ステップ' },
                conditions: { type: 'object', description: '実行条件' },
              },
            },
            description: 'パイプラインステージ',
          },
          triggers: { type: 'array', items: { type: 'string' }, description: 'トリガー条件' },
        },
        required: ['pipeline_name', 'platform', 'stages'],
      },
    },
    {
      name: 'deploy_application',
      description: 'アプリケーションをデプロイします',
      parameters: {
        type: 'object',
        properties: {
          application_name: { type: 'string', description: 'アプリケーション名' },
          environment: {
            type: 'string',
            enum: ['development', 'staging', 'production'],
            description: 'デプロイ環境',
          },
          deployment_type: {
            type: 'string',
            enum: ['rolling', 'blue-green', 'canary', 'recreate'],
            description: 'デプロイ方式',
          },
          version: { type: 'string', description: 'バージョン' },
          rollback_enabled: { type: 'boolean', description: 'ロールバック機能を有効にするか' },
        },
        required: ['application_name', 'environment', 'deployment_type', 'version'],
      },
    },
    {
      name: 'manage_environment',
      description: 'デプロイ環境を管理します',
      parameters: {
        type: 'object',
        properties: {
          environment_name: { type: 'string', description: '環境名' },
          action: {
            type: 'string',
            enum: ['create', 'update', 'delete', 'clone', 'backup'],
            description: 'アクション',
          },
          configuration: {
            type: 'object',
            properties: {
              infrastructure: { type: 'object', description: 'インフラ設定' },
              environment_variables: { type: 'object', description: '環境変数' },
              secrets: { type: 'array', items: { type: 'string' }, description: 'シークレット' },
            },
          },
        },
        required: ['environment_name', 'action'],
      },
    },
    {
      name: 'configure_monitoring',
      description: 'モニタリングを設定します',
      parameters: {
        type: 'object',
        properties: {
          monitoring_type: {
            type: 'string',
            enum: ['application', 'infrastructure', 'logs', 'metrics', 'alerts'],
            description: 'モニタリングタイプ',
          },
          platform: {
            type: 'string',
            enum: ['datadog', 'newrelic', 'cloudwatch', 'prometheus', 'grafana'],
            description: 'モニタリングプラットフォーム',
          },
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'メトリクス名' },
                threshold: { type: 'number', description: '闾値' },
                alert_action: { type: 'string', description: 'アラートアクション' },
              },
            },
            description: '監視メトリクス',
          },
        },
        required: ['monitoring_type', 'platform'],
      },
    },
    {
      name: 'rollback_deployment',
      description: 'デプロイメントをロールバックします',
      parameters: {
        type: 'object',
        properties: {
          deployment_id: { type: 'string', description: 'デプロイメントID' },
          target_version: { type: 'string', description: 'ロールバック先バージョン' },
          strategy: {
            type: 'string',
            enum: ['immediate', 'gradual', 'manual'],
            description: 'ロールバック戦略',
          },
          reason: { type: 'string', description: 'ロールバック理由' },
        },
        required: ['deployment_id', 'target_version', 'strategy', 'reason'],
      },
    },
    {
      name: 'manage_release',
      description: 'リリースを管理します',
      parameters: {
        type: 'object',
        properties: {
          release_name: { type: 'string', description: 'リリース名' },
          version: { type: 'string', description: 'バージョン' },
          action: {
            type: 'string',
            enum: ['create', 'publish', 'draft', 'tag', 'delete'],
            description: 'アクション',
          },
          release_notes: { type: 'string', description: 'リリースノート' },
          artifacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: '成果物名' },
                path: { type: 'string', description: 'ファイルパス' },
              },
            },
            description: 'リリース成果物',
          },
        },
        required: ['release_name', 'version', 'action'],
      },
    },
  ],
});