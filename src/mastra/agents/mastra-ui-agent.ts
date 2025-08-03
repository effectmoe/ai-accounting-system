import { Agent } from '@mastra/core';

export const mastraUiAgent = new Agent({
  name: 'mastra-ui-agent',
  description: 'UIコンポーネント生成とユーザーインターフェース管理エージェント',
  model: {
    provider: 'deepseek',
    name: 'deepseek-chat',
  },
  instructions: `
あなたはUIコンポーネント生成専門のAIエージェントです。

主な機能：
1. React/Next.jsコンポーネントの生成
2. レスポンシブデザインの実装
3. アクセシビリティ対応
4. フォームバリデーション
5. データビジュアライゼーション
6. UIステート管理

対応技術：
- React 18+ / Next.js 14+
- TypeScript
- Tailwind CSS / CSS Modules
- Radix UI / shadcn/ui
- Chart.js / Recharts
- React Hook Form / Zod

日本語UIに完全対応し、使いやすさとアクセシビリティを重視した実装を提供します。
`,
  tools: [
    {
      name: 'create_component',
      description: 'Reactコンポーネントを生成します',
      parameters: {
        type: 'object',
        properties: {
          component_name: { type: 'string', description: 'コンポーネント名' },
          component_type: {
            type: 'string',
            enum: ['page', 'layout', 'feature', 'ui', 'form', 'chart'],
            description: 'コンポーネントタイプ',
          },
          props: { type: 'array', items: { type: 'object' }, description: 'プロパティ定義' },
          styling: { type: 'string', enum: ['tailwind', 'css-modules', 'styled-components'], description: 'スタイリング方法' },
          features: {
            type: 'array',
            items: { type: 'string' },
            description: '必要な機能（validation, animation, responsive等）',
          },
        },
        required: ['component_name', 'component_type'],
      },
    },
    {
      name: 'create_form',
      description: 'フォームコンポーネントを生成します',
      parameters: {
        type: 'object',
        properties: {
          form_name: { type: 'string', description: 'フォーム名' },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'フィールド名' },
                type: { type: 'string', description: 'フィールドタイプ' },
                label: { type: 'string', description: 'ラベル' },
                validation: { type: 'object', description: 'バリデーションルール' },
                required: { type: 'boolean', description: '必須フィールドか' },
              },
            },
            description: 'フォームフィールド定義',
          },
          submit_action: { type: 'string', description: '送信時のアクション' },
          use_server_action: { type: 'boolean', description: 'Server Actionを使用するか' },
        },
        required: ['form_name', 'fields'],
      },
    },
    {
      name: 'create_data_table',
      description: 'データテーブルコンポーネントを生成します',
      parameters: {
        type: 'object',
        properties: {
          table_name: { type: 'string', description: 'テーブル名' },
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', description: 'カラムキー' },
                header: { type: 'string', description: 'ヘッダー表示名' },
                type: { type: 'string', description: 'データ型' },
                sortable: { type: 'boolean', description: 'ソート可能か' },
                filterable: { type: 'boolean', description: 'フィルター可能か' },
              },
            },
            description: 'カラム定義',
          },
          features: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['pagination', 'search', 'export', 'row-selection', 'inline-edit'],
            },
            description: 'テーブル機能',
          },
        },
        required: ['table_name', 'columns'],
      },
    },
    {
      name: 'create_chart',
      description: 'チャートコンポーネントを生成します',
      parameters: {
        type: 'object',
        properties: {
          chart_name: { type: 'string', description: 'チャート名' },
          chart_type: {
            type: 'string',
            enum: ['line', 'bar', 'pie', 'donut', 'area', 'scatter', 'radar'],
            description: 'チャートタイプ',
          },
          data_structure: { type: 'object', description: 'データ構造定義' },
          interactive: { type: 'boolean', description: 'インタラクティブ機能を有効にするか' },
          responsive: { type: 'boolean', description: 'レスポンシブ対応するか' },
        },
        required: ['chart_name', 'chart_type', 'data_structure'],
      },
    },
    {
      name: 'optimize_accessibility',
      description: 'アクセシビリティを最適化します',
      parameters: {
        type: 'object',
        properties: {
          component_code: { type: 'string', description: 'コンポーネントコード' },
          wcag_level: { type: 'string', enum: ['A', 'AA', 'AAA'], description: 'WCAG準拠レベル' },
          features: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['aria-labels', 'keyboard-navigation', 'screen-reader', 'color-contrast'],
            },
            description: '最適化機能',
          },
        },
        required: ['component_code'],
      },
    },
    {
      name: 'create_dashboard',
      description: 'ダッシュボードレイアウトを生成します',
      parameters: {
        type: 'object',
        properties: {
          dashboard_name: { type: 'string', description: 'ダッシュボード名' },
          layout: {
            type: 'string',
            enum: ['grid', 'flex', 'masonry', 'custom'],
            description: 'レイアウトタイプ',
          },
          widgets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', description: 'ウィジェットタイプ' },
                position: { type: 'object', description: '配置情報' },
                size: { type: 'object', description: 'サイズ情報' },
              },
            },
            description: 'ウィジェット配置',
          },
          responsive_breakpoints: { type: 'object', description: 'レスポンシブブレークポイント' },
        },
        required: ['dashboard_name', 'layout', 'widgets'],
      },
    },
  ],
});