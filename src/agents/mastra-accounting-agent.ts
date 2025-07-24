import { Agent } from '@mastra/core';

export const mastraAccountingAgent = new Agent({
  name: 'mastra-accounting-agent',
  description: '会計処理・仕訳作成・請求書処理・財務レポート生成を行う日本税制対応エージェント',
  model: {
    provider: 'openai',
    name: 'gpt-4',
  },
  instructions: `
あなたは日本の会計処理専門AIエージェントです。

主な機能：
1. 取引データの自動分類と勘定科目判定
2. 日本の会計基準に基づいた仕訳作成
3. 請求書の自動読み取りと処理
4. 消費税・所得税・法人税の計算
5. 財務レポートの生成
6. MongoDB連携によるデータ管理

対応業務：
- 経費精算の自動処理
- 売上・仕入れの管理
- 税務申告書類の作成支援
- 損益計算書・貸借対照表の生成
- キャッシュフロー分析

常に正確で迅速な会計処理を提供し、日本の税制に完全準拠した処理を行います。
`,
  tools: [
    {
      name: 'categorize_transaction',
      description: '取引を分類し、勘定科目を自動判定します',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: '取引内容' },
          amount: { type: 'number', description: '金額' },
          vendor_name: { type: 'string', description: '取引先名' },
          transaction_type: { 
            type: 'string', 
            enum: ['income', 'expense', 'transfer'],
            description: '取引種別' 
          },
          date: { type: 'string', description: '取引日（YYYY-MM-DD）' },
        },
        required: ['description', 'amount', 'transaction_type', 'date'],
      },
    },
    {
      name: 'create_journal_entry',
      description: '仕訳エントリを作成します',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: '摘要' },
          amount: { type: 'number', description: '金額' },
          debit_account: { type: 'string', description: '借方勘定科目' },
          credit_account: { type: 'string', description: '貸方勘定科目' },
          date: { type: 'string', description: '取引日' },
          company_id: { type: 'string', description: '会社ID' },
        },
        required: ['description', 'amount', 'debit_account', 'credit_account', 'date', 'company_id'],
      },
    },
    {
      name: 'create_invoice',
      description: '請求書を作成します',
      parameters: {
        type: 'object',
        properties: {
          customer_name: { type: 'string', description: '顧客名' },
          items: { 
            type: 'array',
            description: '商品・サービス一覧',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string', description: '商品・サービス名' },
                quantity: { type: 'number', description: '数量' },
                unit_price: { type: 'number', description: '単価' },
              },
            },
          },
          tax_rate: { type: 'number', description: '消費税率（0.1 = 10%）' },
          due_date: { type: 'string', description: '支払期限' },
          company_id: { type: 'string', description: '会社ID' },
        },
        required: ['customer_name', 'items', 'company_id'],
      },
    },
    {
      name: 'process_ocr_invoice',
      description: 'OCRで読み取った請求書データを処理します',
      parameters: {
        type: 'object',
        properties: {
          ocr_text: { type: 'string', description: 'OCRで抽出されたテキスト' },
          vendor_name: { type: 'string', description: '業者名' },
          total_amount: { type: 'number', description: '合計金額' },
          tax_amount: { type: 'number', description: '税額' },
          company_id: { type: 'string', description: '会社ID' },
        },
        required: ['ocr_text', 'company_id'],
      },
    },
    {
      name: 'generate_financial_report',
      description: '財務レポートを生成します',
      parameters: {
        type: 'object',
        properties: {
          report_type: { 
            type: 'string',
            enum: ['monthly', 'quarterly', 'annual', 'trial_balance', 'profit_loss', 'balance_sheet'],
            description: 'レポート種別' 
          },
          start_date: { type: 'string', description: '期間開始日' },
          end_date: { type: 'string', description: '期間終了日' },
          company_id: { type: 'string', description: '会社ID' },
        },
        required: ['report_type', 'start_date', 'end_date', 'company_id'],
      },
    },
    {
      name: 'calculate_tax',
      description: '日本の税金（消費税・所得税・法人税）を計算します',
      parameters: {
        type: 'object',
        properties: {
          tax_type: { 
            type: 'string',
            enum: ['consumption_tax', 'income_tax', 'corporate_tax'],
            description: '税金種別' 
          },
          taxable_amount: { type: 'number', description: '課税対象金額' },
          tax_rate: { type: 'number', description: '税率' },
          company_type: { 
            type: 'string',
            enum: ['individual', 'corporation'],
            description: '事業者種別' 
          },
        },
        required: ['tax_type', 'taxable_amount'],
      },
    },
    {
      name: 'analyze_expenses',
      description: '経費を分析し、節税提案を行います',
      parameters: {
        type: 'object',
        properties: {
          period_start: { type: 'string', description: '分析期間開始日' },
          period_end: { type: 'string', description: '分析期間終了日' },
          company_id: { type: 'string', description: '会社ID' },
          analysis_type: { 
            type: 'string',
            enum: ['category_breakdown', 'trend_analysis', 'tax_optimization'],
            description: '分析種別' 
          },
        },
        required: ['period_start', 'period_end', 'company_id', 'analysis_type'],
      },
    },
  ],
});