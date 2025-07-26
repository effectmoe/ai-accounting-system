import { Agent } from '@mastra/core';

export const mastraProductAgent = new Agent({
  name: 'mastra-product-agent',
  description: '商品・サービス管理と在庫管理を行うエージェント',
  model: {
    provider: 'deepseek',
    name: 'deepseek-chat',
  },
  instructions: `
あなたは商品・サービス管理専門のAIエージェントです。

主な機能：
1. 商品マスタデータの管理
2. 在庫管理と在庫最適化
3. 価格設定と価格戦略
4. 商品カタログの作成
5. 売上分析と需要予測
6. サプライチェーン管理

対応業務：
- 新商品の登録と分類
- 在庫レベルの監視とアラート
- 自動発注点の計算
- 商品別収益性分析
- シーズナリティ分析
- 廃番商品の管理

日本の商習慣に対応し、JAN/EANコード、品番管理をサポートします。
`,
  tools: [
    {
      name: 'create_product',
      description: '新商品を登録します',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '商品名' },
          name_kana: { type: 'string', description: '商品名（カナ）' },
          code: { type: 'string', description: '商品コード' },
          jan_code: { type: 'string', description: 'JANコード' },
          category: { type: 'string', description: 'カテゴリ' },
          unit_price: { type: 'number', description: '単価' },
          cost_price: { type: 'number', description: '原価' },
          tax_type: { type: 'string', enum: ['standard', 'reduced', 'exempt'], description: '税区分' },
          stock_management: { type: 'boolean', description: '在庫管理対象か' },
          description: { type: 'string', description: '商品説明' },
        },
        required: ['name', 'code', 'unit_price', 'tax_type'],
      },
    },
    {
      name: 'update_inventory',
      description: '在庫数量を更新します',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: '商品ID' },
          operation: {
            type: 'string',
            enum: ['add', 'subtract', 'set', 'adjust'],
            description: '操作タイプ',
          },
          quantity: { type: 'number', description: '数量' },
          warehouse_id: { type: 'string', description: '倉庫ID' },
          reason: { type: 'string', description: '理由' },
          reference_number: { type: 'string', description: '参照番号（受注番号など）' },
        },
        required: ['product_id', 'operation', 'quantity'],
      },
    },
    {
      name: 'analyze_inventory',
      description: '在庫分析を実行します',
      parameters: {
        type: 'object',
        properties: {
          analysis_type: {
            type: 'string',
            enum: ['abc_analysis', 'turnover_rate', 'dead_stock', 'reorder_point', 'seasonal_trend'],
            description: '分析タイプ',
          },
          period_days: { type: 'number', description: '分析期間（日数）' },
          category_filter: { type: 'string', description: 'カテゴリフィルター' },
          warehouse_id: { type: 'string', description: '倉庫ID' },
        },
        required: ['analysis_type'],
      },
    },
    {
      name: 'calculate_reorder_point',
      description: '発注点を計算します',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: '商品ID' },
          lead_time_days: { type: 'number', description: 'リードタイム（日数）' },
          average_daily_usage: { type: 'number', description: '平均日次使用量' },
          safety_stock_days: { type: 'number', description: '安全在庫日数' },
          service_level: { type: 'number', description: 'サービスレベル（0.9 = 90%）' },
        },
        required: ['product_id', 'lead_time_days'],
      },
    },
    {
      name: 'generate_product_report',
      description: '商品レポートを生成します',
      parameters: {
        type: 'object',
        properties: {
          report_type: {
            type: 'string',
            enum: ['sales_ranking', 'profitability', 'inventory_status', 'price_list', 'catalog'],
            description: 'レポートタイプ',
          },
          period_start: { type: 'string', description: '期間開始日' },
          period_end: { type: 'string', description: '期間終了日' },
          category_filter: { type: 'string', description: 'カテゴリフィルター' },
          format: { type: 'string', enum: ['pdf', 'excel', 'csv'], description: '出力形式' },
        },
        required: ['report_type'],
      },
    },
    {
      name: 'optimize_pricing',
      description: '価格最適化を提案します',
      parameters: {
        type: 'object',
        properties: {
          product_id: { type: 'string', description: '商品ID' },
          optimization_goal: {
            type: 'string',
            enum: ['maximize_profit', 'maximize_volume', 'match_competition', 'clear_inventory'],
            description: '最適化目標',
          },
          competitor_prices: { type: 'array', items: { type: 'number' }, description: '競合価格' },
          price_elasticity: { type: 'number', description: '価格弾力性' },
          constraints: {
            type: 'object',
            properties: {
              min_margin: { type: 'number', description: '最低利益率' },
              max_price: { type: 'number', description: '最高価格' },
              min_price: { type: 'number', description: '最低価格' },
            },
          },
        },
        required: ['product_id', 'optimization_goal'],
      },
    },
  ],
});