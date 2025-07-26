import { Agent } from '@mastra/core';

export const mastraJapanTaxAgent = new Agent({
  name: 'mastra-japan-tax-agent',
  description: '日本の税制に完全対応した税務計算・申告支援エージェント',
  model: {
    provider: 'deepseek',
    name: 'deepseek-chat',
  },
  instructions: `
あなたは日本の税制に精通した税務専門AIエージェントです。

専門知識：
1. 消費税（8%軽減税率・10%標準税率）
2. 法人税・所得税計算
3. 源泉徴収税
4. インボイス制度（適格請求書）
5. 電子帳簿保存法
6. 税務申告書作成支援

対応業務：
- 消費税の適正計算と申告
- 源泉徴収票の作成
- 年末調整計算
- 確定申告書類の準備
- 税務調査対応支援
- 節税対策の提案

最新の税制改正に対応し、正確な税務処理を提供します。
令和6年（2024年）の税制に完全準拠しています。
`,
  tools: [
    {
      name: 'calculate_consumption_tax',
      description: '消費税を計算します（軽減税率対応）',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: '税抜金額' },
          tax_rate: { type: 'number', enum: [0.08, 0.1], description: '税率（0.08=8%、0.1=10%）' },
          item_type: {
            type: 'string',
            enum: ['food', 'newspaper', 'standard', 'mixed'],
            description: '品目タイプ',
          },
          calculation_method: {
            type: 'string',
            enum: ['item_by_item', 'invoice', 'total'],
            description: '計算方式',
          },
          is_tax_included: { type: 'boolean', description: '税込価格から計算するか' },
        },
        required: ['amount', 'tax_rate'],
      },
    },
    {
      name: 'validate_invoice_number',
      description: '適格請求書発行事業者番号を検証します',
      parameters: {
        type: 'object',
        properties: {
          invoice_number: { type: 'string', description: 'T+13桁の登録番号' },
          company_name: { type: 'string', description: '事業者名' },
          check_online: { type: 'boolean', description: '国税庁DBで確認するか' },
        },
        required: ['invoice_number'],
      },
    },
    {
      name: 'calculate_withholding_tax',
      description: '源泉徴収税を計算します',
      parameters: {
        type: 'object',
        properties: {
          payment_type: {
            type: 'string',
            enum: ['salary', 'bonus', 'retirement', 'dividend', 'interest', 'royalty', 'professional_fee'],
            description: '支払種別',
          },
          gross_amount: { type: 'number', description: '総支払額' },
          employee_info: {
            type: 'object',
            properties: {
              dependents: { type: 'number', description: '扶養人数' },
              insurance_deduction: { type: 'number', description: '社会保険料控除額' },
              is_resident: { type: 'boolean', description: '居住者か' },
            },
          },
          payment_date: { type: 'string', description: '支払日' },
        },
        required: ['payment_type', 'gross_amount'],
      },
    },
    {
      name: 'calculate_corporate_tax',
      description: '法人税を計算します',
      parameters: {
        type: 'object',
        properties: {
          taxable_income: { type: 'number', description: '課税所得' },
          company_type: {
            type: 'string',
            enum: ['large', 'small', 'micro'],
            description: '企業規模（資本金基準）',
          },
          fiscal_year: { type: 'string', description: '事業年度' },
          special_deductions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', description: '特別控除種別' },
                amount: { type: 'number', description: '控除額' },
              },
            },
          },
        },
        required: ['taxable_income', 'company_type', 'fiscal_year'],
      },
    },
    {
      name: 'generate_tax_report',
      description: '税務レポートを生成します',
      parameters: {
        type: 'object',
        properties: {
          report_type: {
            type: 'string',
            enum: ['consumption_tax_return', 'withholding_summary', 'corporate_tax_return', 'year_end_adjustment'],
            description: 'レポート種別',
          },
          period_start: { type: 'string', description: '対象期間開始' },
          period_end: { type: 'string', description: '対象期間終了' },
          company_id: { type: 'string', description: '会社ID' },
          include_worksheets: { type: 'boolean', description: '計算明細を含めるか' },
        },
        required: ['report_type', 'period_start', 'period_end', 'company_id'],
      },
    },
    {
      name: 'check_tax_compliance',
      description: '税務コンプライアンスをチェックします',
      parameters: {
        type: 'object',
        properties: {
          check_items: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['invoice_requirements', 'record_keeping', 'filing_deadlines', 'payment_status'],
            },
            description: 'チェック項目',
          },
          company_id: { type: 'string', description: '会社ID' },
          as_of_date: { type: 'string', description: '基準日' },
        },
        required: ['check_items', 'company_id'],
      },
    },
    {
      name: 'optimize_tax_strategy',
      description: '節税戦略を提案します',
      parameters: {
        type: 'object',
        properties: {
          company_profile: {
            type: 'object',
            properties: {
              industry: { type: 'string', description: '業種' },
              annual_revenue: { type: 'number', description: '年間売上高' },
              employee_count: { type: 'number', description: '従業員数' },
              capital: { type: 'number', description: '資本金' },
            },
          },
          target_areas: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['depreciation', 'tax_credits', 'deductions', 'timing', 'structure'],
            },
            description: '最適化対象分野',
          },
        },
        required: ['company_profile'],
      },
    },
  ],
});