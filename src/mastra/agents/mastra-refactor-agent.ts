import { Agent } from '@mastra/core';

export const mastraRefactorAgent = new Agent({
  name: 'mastra-refactor-agent',
  description: 'コードリファクタリングと最適化を行うエージェント',
  model: {
    provider: 'openai',
    name: 'gpt-4',
  },
  instructions: `
あなたはコードリファクタリング専門のAIエージェントです。

主な機能：
1. コード品質分析
2. リファクタリング提案
3. パフォーマンス最適化
4. コードスメル検出
5. テストカバレッジ向上
6. 依存関係最適化

専門技術：
- SOLID原則
- デザインパターン
- クリーンアーキテクチャ
- DRY/KISS原則
- テスト駆動開発

コードの保守性、可読性、パフォーマンスを向上させる提案を行います。
`,
  tools: [
    {
      name: 'analyze_code_quality',
      description: 'コード品質を分析します',
      parameters: {
        type: 'object',
        properties: {
          code_path: { type: 'string', description: 'コードパス' },
          language: { type: 'string', description: 'プログラミング言語' },
          analysis_type: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['complexity', 'duplication', 'style', 'security', 'performance', 'test_coverage'],
            },
            description: '分析タイプ',
          },
          metrics: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['cyclomatic_complexity', 'lines_of_code', 'technical_debt', 'maintainability_index'],
            },
            description: '計測メトリクス',
          },
        },
        required: ['code_path', 'language', 'analysis_type'],
      },
    },
    {
      name: 'suggest_refactoring',
      description: 'リファクタリングを提案します',
      parameters: {
        type: 'object',
        properties: {
          code_snippet: { type: 'string', description: 'コードスニペット' },
          refactoring_goals: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['improve_readability', 'reduce_complexity', 'remove_duplication', 'improve_performance', 'add_type_safety'],
            },
            description: 'リファクタリング目標',
          },
          preserve_behavior: { type: 'boolean', description: '動作を保持するか' },
          target_patterns: {
            type: 'array',
            items: { type: 'string' },
            description: '適用するデザインパターン',
          },
        },
        required: ['code_snippet', 'refactoring_goals'],
      },
    },
    {
      name: 'detect_code_smells',
      description: 'コードスメルを検出します',
      parameters: {
        type: 'object',
        properties: {
          project_path: { type: 'string', description: 'プロジェクトパス' },
          smell_types: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['long_method', 'large_class', 'duplicate_code', 'dead_code', 'feature_envy', 'god_class'],
            },
            description: '検出するコードスメル',
          },
          severity_threshold: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: '深刻度闾値',
          },
        },
        required: ['project_path'],
      },
    },
    {
      name: 'optimize_performance',
      description: 'パフォーマンスを最適化します',
      parameters: {
        type: 'object',
        properties: {
          code_snippet: { type: 'string', description: 'コードスニペット' },
          performance_profile: {
            type: 'object',
            properties: {
              bottlenecks: { type: 'array', items: { type: 'string' }, description: 'ボトルネック' },
              metrics: { type: 'object', description: 'パフォーマンスメトリクス' },
            },
          },
          optimization_strategies: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['memoization', 'lazy_loading', 'caching', 'parallel_processing', 'algorithm_optimization'],
            },
            description: '最適化戦略',
          },
        },
        required: ['code_snippet'],
      },
    },
    {
      name: 'improve_test_coverage',
      description: 'テストカバレッジを改善します',
      parameters: {
        type: 'object',
        properties: {
          code_path: { type: 'string', description: 'コードパス' },
          current_coverage: { type: 'number', description: '現在のカバレッジ率' },
          target_coverage: { type: 'number', description: '目標カバレッジ率' },
          test_types: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['unit', 'integration', 'e2e', 'performance', 'security'],
            },
            description: '作成するテストタイプ',
          },
        },
        required: ['code_path', 'current_coverage', 'target_coverage'],
      },
    },
    {
      name: 'modernize_code',
      description: 'コードをモダナイズします',
      parameters: {
        type: 'object',
        properties: {
          legacy_code: { type: 'string', description: 'レガシーコード' },
          target_version: { type: 'string', description: 'ターゲットバージョン' },
          modernization_goals: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['use_modern_syntax', 'add_type_annotations', 'async_await', 'functional_programming', 'remove_deprecated'],
            },
            description: 'モダナイゼーション目標',
          },
          compatibility_requirements: {
            type: 'object',
            properties: {
              min_version: { type: 'string', description: '最小互換バージョン' },
              breaking_changes_allowed: { type: 'boolean', description: '破壊的変更を許可するか' },
            },
          },
        },
        required: ['legacy_code', 'target_version', 'modernization_goals'],
      },
    },
  ],
});