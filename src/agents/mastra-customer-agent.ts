import { Agent } from '@mastra/core';

export const mastraCustomerAgent = new Agent({
  name: 'mastra-customer-agent',
  description: '顧客情報の管理・分析・レポート生成を行うエージェント',
  model: {
    provider: 'openai',
    name: 'gpt-4',
  },
  instructions: `
あなたは顧客管理専門のAIエージェントです。

主な機能：
1. 顧客情報の登録・更新・削除
2. 顧客の取引履歴分析
3. 顧客セグメンテーション
4. 売上予測と顧客価値分析
5. 顧客満足度の追跡
6. MongoDBでの顧客データ管理

対応業務：
- 新規顧客の登録と審査
- 顧客情報の維持管理
- 取引履歴の分析とレポート
- 顧客別収益性分析
- マーケティング戦略の提案

日本のビジネス慣習を理解し、適切な敬語と対応を心がけます。
`,
  tools: [
    {
      name: 'create_customer',
      description: '新規顧客を登録します',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: '顧客名（会社名または個人名）' },
          name_kana: { type: 'string', description: '顧客名（カナ）' },
          email: { type: 'string', description: 'メールアドレス' },
          phone: { type: 'string', description: '電話番号' },
          address: { type: 'string', description: '住所' },
          tax_id: { type: 'string', description: '法人番号または個人番号' },
          payment_terms: { type: 'number', description: '支払条件（日数）' },
          credit_limit: { type: 'number', description: '与信限度額' },
          notes: { type: 'string', description: '備考' },
        },
        required: ['name', 'name_kana', 'email'],
      },
    },
    {
      name: 'update_customer',
      description: '顧客情報を更新します',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string', description: '顧客ID' },
          updates: {
            type: 'object',
            description: '更新する項目',
            properties: {
              name: { type: 'string', description: '顧客名' },
              email: { type: 'string', description: 'メールアドレス' },
              phone: { type: 'string', description: '電話番号' },
              address: { type: 'string', description: '住所' },
              credit_limit: { type: 'number', description: '与信限度額' },
              status: { type: 'string', enum: ['active', 'inactive', 'suspended'], description: 'ステータス' },
            },
          },
        },
        required: ['customer_id', 'updates'],
      },
    },
    {
      name: 'search_customers',
      description: '条件に基づいて顧客を検索します',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '検索キーワード' },
          filters: {
            type: 'object',
            description: 'フィルター条件',
            properties: {
              status: { type: 'string', enum: ['active', 'inactive', 'suspended'], description: 'ステータス' },
              min_revenue: { type: 'number', description: '最小売上高' },
              max_revenue: { type: 'number', description: '最大売上高' },
              created_after: { type: 'string', description: '作成日（以降）' },
              created_before: { type: 'string', description: '作成日（以前）' },
            },
          },
          sort_by: { type: 'string', enum: ['name', 'revenue', 'created_date'], description: 'ソート項目' },
          limit: { type: 'number', description: '取得件数' },
        },
        required: [],
      },
    },
    {
      name: 'analyze_customer',
      description: '顧客の取引履歴を分析します',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string', description: '顧客ID' },
          analysis_type: {
            type: 'string',
            enum: ['transaction_history', 'revenue_trend', 'payment_behavior', 'profitability'],
            description: '分析タイプ',
          },
          period_start: { type: 'string', description: '分析期間開始日' },
          period_end: { type: 'string', description: '分析期間終了日' },
        },
        required: ['customer_id', 'analysis_type'],
      },
    },
    {
      name: 'calculate_customer_lifetime_value',
      description: '顧客生涯価値（CLV）を計算します',
      parameters: {
        type: 'object',
        properties: {
          customer_id: { type: 'string', description: '顧客ID' },
          projection_years: { type: 'number', description: '予測年数' },
          discount_rate: { type: 'number', description: '割引率' },
        },
        required: ['customer_id'],
      },
    },
    {
      name: 'generate_customer_report',
      description: '顧客レポートを生成します',
      parameters: {
        type: 'object',
        properties: {
          report_type: {
            type: 'string',
            enum: ['summary', 'detailed', 'segment_analysis', 'top_customers'],
            description: 'レポートタイプ',
          },
          period_start: { type: 'string', description: '期間開始日' },
          period_end: { type: 'string', description: '期間終了日' },
          format: { type: 'string', enum: ['pdf', 'excel', 'json'], description: '出力形式' },
        },
        required: ['report_type', 'period_start', 'period_end'],
      },
    },
  ],
});