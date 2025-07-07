#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// 日本の税金関連の型定義
interface TaxRate {
  standard: number;
  reduced: number;
  effective_date: string;
  end_date?: string;
}

interface TaxCategory {
  name: string;
  name_ja: string;
  rate_type: 'standard' | 'reduced' | 'exempt';
  description: string;
  examples: string[];
}

interface TaxCalculation {
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  calculation_method: 'floor' | 'round' | 'ceil';
  is_tax_included: boolean;
}

interface DeductibleExpense {
  category: string;
  category_ja: string;
  is_deductible: boolean;
  deduction_rate: number;
  requirements?: string[];
  documentation_needed?: string[];
}

interface TaxReturn {
  year: number;
  type: 'blue' | 'white'; // 青色申告・白色申告
  income: {
    sales: number;
    other: number;
  };
  expenses: {
    [category: string]: number;
  };
  deductions: {
    blue_return_deduction?: number; // 青色申告特別控除
    basic_deduction: number; // 基礎控除
    social_insurance: number; // 社会保険料控除
    other: number;
  };
  taxable_income: number;
  tax_amount: number;
}

// Japan Tax MCP Server
class JapanTaxMCPServer {
  private server: Server;
  private currentTaxRates: TaxRate;
  private taxCategories: Map<string, TaxCategory>;
  private deductibleExpenses: Map<string, DeductibleExpense>;

  constructor() {
    this.server = new Server(
      {
        name: 'japan-tax-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // 現在の税率（2024年）
    this.currentTaxRates = {
      standard: 0.1,
      reduced: 0.08,
      effective_date: '2019-10-01',
    };

    this.initializeTaxData();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private initializeTaxData(): void {
    // 税率カテゴリの初期化
    this.taxCategories = new Map([
      ['food', {
        name: 'food',
        name_ja: '飲食料品',
        rate_type: 'reduced',
        description: '人の飲用又は食用に供される飲食料品（酒類・外食を除く）',
        examples: ['食品', '飲料', 'テイクアウト'],
      }],
      ['newspaper', {
        name: 'newspaper',
        name_ja: '新聞',
        rate_type: 'reduced',
        description: '週2回以上発行される定期購読の新聞',
        examples: ['日刊新聞', '業界紙（定期購読）'],
      }],
      ['restaurant', {
        name: 'restaurant',
        name_ja: '外食',
        rate_type: 'standard',
        description: '飲食店での食事、ケータリング等',
        examples: ['レストラン', 'カフェ', 'イートイン'],
      }],
      ['alcohol', {
        name: 'alcohol',
        name_ja: '酒類',
        rate_type: 'standard',
        description: 'アルコール度数1度以上の飲料',
        examples: ['ビール', '日本酒', 'ワイン'],
      }],
      ['general', {
        name: 'general',
        name_ja: '一般商品',
        rate_type: 'standard',
        description: 'その他の商品・サービス',
        examples: ['事務用品', '日用品', 'サービス'],
      }],
    ]);

    // 経費控除カテゴリの初期化
    this.deductibleExpenses = new Map([
      ['office_supplies', {
        category: 'office_supplies',
        category_ja: '消耗品費',
        is_deductible: true,
        deduction_rate: 1.0,
        requirements: ['事業用であること', '10万円未満'],
        documentation_needed: ['領収書', '使用目的の記録'],
      }],
      ['entertainment', {
        category: 'entertainment',
        category_ja: '接待交際費',
        is_deductible: true,
        deduction_rate: 1.0, // 個人事業主の場合
        requirements: ['事業関連の接待であること', '相手先の記録'],
        documentation_needed: ['領収書', '接待相手・目的の記録'],
      }],
      ['travel', {
        category: 'travel',
        category_ja: '旅費交通費',
        is_deductible: true,
        deduction_rate: 1.0,
        requirements: ['事業目的の移動であること'],
        documentation_needed: ['領収書', '出張記録', '交通費精算書'],
      }],
      ['utilities', {
        category: 'utilities',
        category_ja: '水道光熱費',
        is_deductible: true,
        deduction_rate: 0.3, // 家事按分の例（30%）
        requirements: ['事業用スペースの使用'],
        documentation_needed: ['領収書', '按分計算書'],
      }],
      ['rent', {
        category: 'rent',
        category_ja: '地代家賃',
        is_deductible: true,
        deduction_rate: 0.3, // 家事按分の例（30%）
        requirements: ['事業用スペースの賃貸'],
        documentation_needed: ['賃貸契約書', '領収書', '按分計算書'],
      }],
    ]);
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[Japan Tax MCP Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'calculate_consumption_tax',
            description: 'Calculate Japanese consumption tax (消費税)',
            inputSchema: {
              type: 'object',
              properties: {
                amount: { type: 'number' },
                category: { type: 'string' },
                is_tax_included: { type: 'boolean', default: false },
                calculation_date: { type: 'string' },
              },
              required: ['amount', 'category'],
            },
          },
          {
            name: 'determine_tax_rate',
            description: 'Determine applicable tax rate for a product/service',
            inputSchema: {
              type: 'object',
              properties: {
                item_description: { type: 'string' },
                category: { type: 'string' },
                is_takeout: { type: 'boolean' },
                is_subscription: { type: 'boolean' },
              },
              required: ['item_description'],
            },
          },
          {
            name: 'check_deductibility',
            description: 'Check if an expense is tax deductible',
            inputSchema: {
              type: 'object',
              properties: {
                expense_category: { type: 'string' },
                amount: { type: 'number' },
                description: { type: 'string' },
                is_business_use: { type: 'boolean' },
                business_use_percentage: { type: 'number' },
              },
              required: ['expense_category', 'amount'],
            },
          },
          {
            name: 'calculate_invoice_tax',
            description: 'Calculate tax for qualified invoice (適格請求書)',
            inputSchema: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      description: { type: 'string' },
                      amount: { type: 'number' },
                      quantity: { type: 'number' },
                      tax_rate: { type: 'number' },
                    },
                  },
                },
                invoice_date: { type: 'string' },
                is_qualified_invoice: { type: 'boolean' },
              },
              required: ['items'],
            },
          },
          {
            name: 'estimate_tax_return',
            description: 'Estimate tax return calculation (確定申告)',
            inputSchema: {
              type: 'object',
              properties: {
                year: { type: 'number' },
                return_type: {
                  type: 'string',
                  enum: ['blue', 'white'],
                },
                income: {
                  type: 'object',
                  properties: {
                    sales: { type: 'number' },
                    other: { type: 'number' },
                  },
                },
                expenses: { type: 'object' },
                deductions: {
                  type: 'object',
                  properties: {
                    social_insurance: { type: 'number' },
                    life_insurance: { type: 'number' },
                    medical_expenses: { type: 'number' },
                  },
                },
              },
              required: ['year', 'return_type', 'income'],
            },
          },
          {
            name: 'check_invoice_requirements',
            description: 'Check qualified invoice system requirements (インボイス制度)',
            inputSchema: {
              type: 'object',
              properties: {
                business_info: {
                  type: 'object',
                  properties: {
                    is_registered: { type: 'boolean' },
                    registration_number: { type: 'string' },
                    annual_sales: { type: 'number' },
                  },
                },
                transaction_type: { type: 'string' },
              },
              required: ['business_info'],
            },
          },
          {
            name: 'calculate_withholding_tax',
            description: 'Calculate withholding tax (源泉徴収税)',
            inputSchema: {
              type: 'object',
              properties: {
                payment_type: {
                  type: 'string',
                  enum: ['salary', 'bonus', 'freelance', 'dividend'],
                },
                gross_amount: { type: 'number' },
                recipient_type: {
                  type: 'string',
                  enum: ['individual', 'corporation'],
                },
              },
              required: ['payment_type', 'gross_amount'],
            },
          },
          {
            name: 'get_tax_calendar',
            description: 'Get important tax dates and deadlines',
            inputSchema: {
              type: 'object',
              properties: {
                year: { type: 'number' },
                business_type: {
                  type: 'string',
                  enum: ['individual', 'corporation'],
                },
              },
              required: ['year'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'calculate_consumption_tax':
            return await this.handleCalculateConsumptionTax(args);
          case 'determine_tax_rate':
            return await this.handleDetermineTaxRate(args);
          case 'check_deductibility':
            return await this.handleCheckDeductibility(args);
          case 'calculate_invoice_tax':
            return await this.handleCalculateInvoiceTax(args);
          case 'estimate_tax_return':
            return await this.handleEstimateTaxReturn(args);
          case 'check_invoice_requirements':
            return await this.handleCheckInvoiceRequirements(args);
          case 'calculate_withholding_tax':
            return await this.handleCalculateWithholdingTax(args);
          case 'get_tax_calendar':
            return await this.handleGetTaxCalendar(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  // Calculate consumption tax
  private async handleCalculateConsumptionTax(args: any) {
    const { amount, category, is_tax_included = false, calculation_date } = args;

    try {
      // Determine tax rate based on category
      const taxCategory = this.taxCategories.get(category) || this.taxCategories.get('general')!;
      const taxRate = taxCategory.rate_type === 'reduced' 
        ? this.currentTaxRates.reduced 
        : this.currentTaxRates.standard;

      let calculation: TaxCalculation;

      if (is_tax_included) {
        // 内税の場合
        const taxAmount = Math.floor(amount * taxRate / (1 + taxRate));
        const subtotal = amount - taxAmount;
        calculation = {
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total: amount,
          calculation_method: 'floor',
          is_tax_included: true,
        };
      } else {
        // 外税の場合
        const taxAmount = Math.floor(amount * taxRate);
        const total = amount + taxAmount;
        calculation = {
          subtotal: amount,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          total,
          calculation_method: 'floor',
          is_tax_included: false,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              calculation,
              tax_category: {
                name: taxCategory.name,
                name_ja: taxCategory.name_ja,
                rate_type: taxCategory.rate_type,
              },
              message: `消費税計算完了（${taxRate * 100}%${taxCategory.rate_type === 'reduced' ? '軽減税率' : '標準税率'}）`,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Determine tax rate
  private async handleDetermineTaxRate(args: any) {
    const { item_description, category, is_takeout, is_subscription } = args;

    try {
      let determinedRate = this.currentTaxRates.standard;
      let rateType = 'standard';
      let reasoning = [];

      // カテゴリベースの判定
      if (category) {
        const taxCategory = this.taxCategories.get(category);
        if (taxCategory) {
          if (taxCategory.rate_type === 'reduced') {
            determinedRate = this.currentTaxRates.reduced;
            rateType = 'reduced';
            reasoning.push(`カテゴリ「${taxCategory.name_ja}」は軽減税率対象`);
          }
        }
      }

      // 商品説明からの判定
      const lowerDesc = item_description.toLowerCase();
      const foodKeywords = ['食品', '飲料', '弁当', '惣菜', 'パン', '菓子'];
      const alcoholKeywords = ['酒', 'ビール', 'ワイン', 'アルコール'];
      const restaurantKeywords = ['外食', 'レストラン', 'イートイン'];

      if (alcoholKeywords.some(keyword => lowerDesc.includes(keyword))) {
        determinedRate = this.currentTaxRates.standard;
        rateType = 'standard';
        reasoning.push('酒類は標準税率適用');
      } else if (foodKeywords.some(keyword => lowerDesc.includes(keyword))) {
        if (is_takeout) {
          determinedRate = this.currentTaxRates.reduced;
          rateType = 'reduced';
          reasoning.push('テイクアウト食品は軽減税率適用');
        } else if (restaurantKeywords.some(keyword => lowerDesc.includes(keyword))) {
          determinedRate = this.currentTaxRates.standard;
          rateType = 'standard';
          reasoning.push('外食は標準税率適用');
        } else {
          determinedRate = this.currentTaxRates.reduced;
          rateType = 'reduced';
          reasoning.push('飲食料品は軽減税率適用');
        }
      }

      // 新聞の判定
      if (lowerDesc.includes('新聞') && is_subscription) {
        determinedRate = this.currentTaxRates.reduced;
        rateType = 'reduced';
        reasoning.push('定期購読の新聞は軽減税率適用');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              tax_rate: determinedRate,
              rate_type: rateType,
              rate_percentage: determinedRate * 100,
              reasoning: reasoning.length > 0 ? reasoning : ['一般商品・サービスは標準税率適用'],
              applicable_from: this.currentTaxRates.effective_date,
              message: `適用税率: ${determinedRate * 100}%（${rateType === 'reduced' ? '軽減' : '標準'}税率）`,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Check deductibility
  private async handleCheckDeductibility(args: any) {
    const { expense_category, amount, description, is_business_use = true, business_use_percentage = 100 } = args;

    try {
      const expenseInfo = this.deductibleExpenses.get(expense_category);
      
      if (!expenseInfo) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                is_deductible: false,
                reason: 'カテゴリが認識されません',
                suggestion: '適切な勘定科目を選択してください',
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        };
      }

      let deductibleAmount = 0;
      let deductionRate = expenseInfo.deduction_rate;
      let reasons = [];
      let requirements_met = [];
      let requirements_not_met = [];

      // 事業使用の確認
      if (!is_business_use) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                is_deductible: false,
                category_ja: expenseInfo.category_ja,
                amount: amount,
                deductible_amount: 0,
                reason: '事業用でない支出は経費として認められません',
                timestamp: new Date().toISOString(),
              }),
            },
          ],
        };
      }

      // 家事按分の適用
      if (business_use_percentage < 100) {
        deductionRate = deductionRate * (business_use_percentage / 100);
        reasons.push(`家事按分${business_use_percentage}%を適用`);
      }

      deductibleAmount = Math.floor(amount * deductionRate);

      // 要件のチェック
      if (expenseInfo.requirements) {
        requirements_met = expenseInfo.requirements;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              is_deductible: expenseInfo.is_deductible,
              category_ja: expenseInfo.category_ja,
              amount: amount,
              deductible_amount: deductibleAmount,
              deduction_rate: deductionRate,
              business_use_percentage,
              requirements: expenseInfo.requirements,
              documentation_needed: expenseInfo.documentation_needed,
              reasons,
              message: `${expenseInfo.category_ja}として${deductibleAmount}円が経費計上可能です`,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Calculate invoice tax
  private async handleCalculateInvoiceTax(args: any) {
    const { items, invoice_date, is_qualified_invoice = true } = args;

    try {
      const taxGroups: { [key: string]: { subtotal: number; tax: number; items: any[] } } = {};
      let totalSubtotal = 0;
      let totalTax = 0;

      // 税率ごとにグループ化
      for (const item of items) {
        const taxRate = item.tax_rate || 0.1;
        const lineTotal = item.amount * item.quantity;
        const taxAmount = Math.floor(lineTotal * taxRate);

        const rateKey = `${taxRate * 100}%`;
        if (!taxGroups[rateKey]) {
          taxGroups[rateKey] = { subtotal: 0, tax: 0, items: [] };
        }

        taxGroups[rateKey].subtotal += lineTotal;
        taxGroups[rateKey].tax += taxAmount;
        taxGroups[rateKey].items.push({
          ...item,
          line_total: lineTotal,
          tax_amount: taxAmount,
        });

        totalSubtotal += lineTotal;
        totalTax += taxAmount;
      }

      // 適格請求書の要件チェック
      const requirements = {
        has_issuer_info: true,
        has_registration_number: is_qualified_invoice,
        has_transaction_date: true,
        has_transaction_details: true,
        has_tax_rate_groups: true,
        has_tax_amounts: true,
      };

      const is_valid_qualified_invoice = Object.values(requirements).every(req => req === true);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              invoice_summary: {
                subtotal: totalSubtotal,
                total_tax: totalTax,
                grand_total: totalSubtotal + totalTax,
                invoice_date,
                is_qualified_invoice,
                is_valid_qualified_invoice,
              },
              tax_groups: taxGroups,
              requirements,
              message: is_valid_qualified_invoice 
                ? '適格請求書の要件を満たしています' 
                : '適格請求書の要件を満たしていません',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Estimate tax return
  private async handleEstimateTaxReturn(args: any) {
    const { year, return_type, income, expenses = {}, deductions = {} } = args;

    try {
      const totalIncome = (income.sales || 0) + (income.other || 0);
      const totalExpenses = Object.values(expenses).reduce((sum: number, val: any) => sum + val, 0);
      const businessIncome = totalIncome - totalExpenses;

      // 所得控除の計算
      let totalDeductions = 480000; // 基礎控除（2024年）
      
      // 青色申告特別控除
      if (return_type === 'blue') {
        totalDeductions += 650000; // 電子申告の場合
      }

      // 社会保険料控除
      totalDeductions += deductions.social_insurance || 0;
      
      // その他の控除
      totalDeductions += deductions.life_insurance || 0;
      totalDeductions += deductions.medical_expenses || 0;

      // 課税所得の計算
      const taxableIncome = Math.max(0, businessIncome - totalDeductions);

      // 所得税の計算（2024年の税率）
      let incomeTax = 0;
      if (taxableIncome <= 1950000) {
        incomeTax = taxableIncome * 0.05;
      } else if (taxableIncome <= 3300000) {
        incomeTax = taxableIncome * 0.1 - 97500;
      } else if (taxableIncome <= 6950000) {
        incomeTax = taxableIncome * 0.2 - 427500;
      } else if (taxableIncome <= 9000000) {
        incomeTax = taxableIncome * 0.23 - 636000;
      } else if (taxableIncome <= 18000000) {
        incomeTax = taxableIncome * 0.33 - 1536000;
      } else if (taxableIncome <= 40000000) {
        incomeTax = taxableIncome * 0.4 - 2796000;
      } else {
        incomeTax = taxableIncome * 0.45 - 4796000;
      }

      // 復興特別所得税（2.1%）
      const reconstructionTax = Math.floor(incomeTax * 0.021);
      const totalTax = Math.floor(incomeTax) + reconstructionTax;

      const taxReturn: TaxReturn = {
        year,
        type: return_type as 'blue' | 'white',
        income: {
          sales: income.sales || 0,
          other: income.other || 0,
        },
        expenses,
        deductions: {
          blue_return_deduction: return_type === 'blue' ? 650000 : 0,
          basic_deduction: 480000,
          social_insurance: deductions.social_insurance || 0,
          other: (deductions.life_insurance || 0) + (deductions.medical_expenses || 0),
        },
        taxable_income: taxableIncome,
        tax_amount: totalTax,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              tax_return: taxReturn,
              calculation_details: {
                total_income: totalIncome,
                total_expenses: totalExpenses,
                business_income: businessIncome,
                total_deductions: totalDeductions,
                income_tax: Math.floor(incomeTax),
                reconstruction_tax: reconstructionTax,
              },
              effective_tax_rate: totalIncome > 0 ? ((totalTax / totalIncome) * 100).toFixed(2) + '%' : '0%',
              message: `${year}年度の推定所得税額: ${totalTax.toLocaleString()}円`,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Check invoice requirements
  private async handleCheckInvoiceRequirements(args: any) {
    const { business_info, transaction_type } = args;

    try {
      const requirements = [];
      const recommendations = [];
      let is_required = false;
      let is_eligible = false;

      // 登録事業者かどうか
      if (business_info.is_registered) {
        is_eligible = true;
        requirements.push('適格請求書発行事業者として登録済み');
      } else {
        // 売上高による判定
        if (business_info.annual_sales > 10000000) {
          is_required = true;
          recommendations.push('年間売上1,000万円超のため、消費税課税事業者です');
          recommendations.push('適格請求書発行事業者の登録を推奨します');
        } else {
          recommendations.push('年間売上1,000万円以下の免税事業者です');
          recommendations.push('インボイス制度への対応は任意ですが、取引先との関係を考慮してください');
        }
      }

      // 適格請求書の記載要件
      const invoice_requirements = [
        '発行事業者の氏名又は名称',
        '登録番号（T + 13桁の番号）',
        '取引年月日',
        '取引内容（軽減税率対象の場合はその旨）',
        '税率ごとに区分した合計額',
        '税率ごとの消費税額',
        '書類の交付を受ける事業者の氏名又は名称',
      ];

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              business_status: {
                is_registered: business_info.is_registered,
                registration_number: business_info.registration_number,
                is_taxable_business: business_info.annual_sales > 10000000,
                is_eligible_for_invoice: is_eligible,
                is_invoice_required: is_required,
              },
              invoice_requirements,
              requirements,
              recommendations,
              message: is_eligible 
                ? '適格請求書の発行が可能です' 
                : '適格請求書を発行するには事業者登録が必要です',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Calculate withholding tax
  private async handleCalculateWithholdingTax(args: any) {
    const { payment_type, gross_amount, recipient_type = 'individual' } = args;

    try {
      let withholdingRate = 0;
      let withholdingAmount = 0;
      let netAmount = gross_amount;
      let explanation = '';

      switch (payment_type) {
        case 'salary':
          // 給与所得の源泉徴収（簡易計算）
          if (gross_amount <= 88000) {
            withholdingRate = 0;
          } else {
            // 実際は源泉徴収税額表による
            withholdingRate = 0.05; // 簡易的な例
            explanation = '給与所得の源泉徴収税（簡易計算）';
          }
          break;

        case 'bonus':
          // 賞与の源泉徴収
          withholdingRate = 0.04126; // 前月給与なしの場合の例
          explanation = '賞与の源泉徴収税';
          break;

        case 'freelance':
          // 報酬・料金等の源泉徴収
          if (recipient_type === 'individual') {
            if (gross_amount <= 1000000) {
              withholdingRate = 0.1021; // 復興特別所得税込み
              explanation = '報酬・料金等の源泉徴収税（10.21%）';
            } else {
              // 100万円超の部分は20.42%
              withholdingAmount = 102100 + (gross_amount - 1000000) * 0.2042;
              withholdingRate = withholdingAmount / gross_amount;
              explanation = '報酬・料金等の源泉徴収税（100万円超）';
            }
          }
          break;

        case 'dividend':
          // 配当の源泉徴収
          withholdingRate = 0.20315; // 所得税15.315% + 住民税5%
          explanation = '配当所得の源泉徴収税（20.315%）';
          break;
      }

      if (withholdingAmount === 0) {
        withholdingAmount = Math.floor(gross_amount * withholdingRate);
      }
      netAmount = gross_amount - withholdingAmount;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              calculation: {
                payment_type,
                gross_amount,
                withholding_rate: withholdingRate,
                withholding_amount: withholdingAmount,
                net_amount: netAmount,
                recipient_type,
              },
              explanation,
              requirements: [
                '源泉徴収票の交付が必要',
                '翌月10日までに税務署へ納付（納期の特例適用の場合を除く）',
              ],
              message: `源泉徴収税額: ${withholdingAmount.toLocaleString()}円`,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Get tax calendar
  private async handleGetTaxCalendar(args: any) {
    const { year, business_type = 'individual' } = args;

    try {
      const calendar = [];

      if (business_type === 'individual') {
        calendar.push(
          {
            date: `${year}-01-31`,
            event: '法定調書提出期限',
            description: '給与支払報告書、源泉徴収票等',
          },
          {
            date: `${year}-03-15`,
            event: '所得税確定申告期限',
            description: '前年分の所得税及び復興特別所得税',
          },
          {
            date: `${year}-03-15`,
            event: '個人事業税納付期限（第1期）',
            description: '個人事業税がある場合',
          },
          {
            date: `${year}-06-30`,
            event: '住民税納付期限（第1期）',
            description: '普通徴収の場合',
          },
          {
            date: `${year}-08-31`,
            event: '個人事業税納付期限（第2期）',
            description: '個人事業税がある場合',
          },
          {
            date: `${year}-11-30`,
            event: '所得税予定納税（第2期）',
            description: '予定納税がある場合',
          },
        );
      }

      // 毎月の定期的な期限
      for (let month = 1; month <= 12; month++) {
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        
        calendar.push({
          date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-10`,
          event: '源泉所得税納付期限',
          description: `${year}年${month}月分の源泉所得税`,
          recurring: true,
        });
      }

      // 消費税の中間申告（年間納税額による）
      calendar.push(
        {
          date: `${year}-08-31`,
          event: '消費税中間申告期限',
          description: '前年の年税額が48万円超400万円以下の場合（年1回）',
          conditional: true,
        },
        {
          date: `${year}-03-31`,
          event: '消費税確定申告期限',
          description: '個人事業者の場合',
        }
      );

      // ソート
      calendar.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              year,
              business_type,
              calendar,
              important_notes: [
                '期限が土日祝日の場合は翌平日が期限',
                '電子申告（e-Tax）の利用を推奨',
                '源泉所得税は納期の特例適用で年2回納付も可能',
              ],
              message: `${year}年の税務カレンダーを表示しました`,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Japan Tax MCP Server running on stdio');
  }
}

// Create and run server
const server = new JapanTaxMCPServer();
server.run().catch((error) => {
  console.error('Fatal error in Japan Tax MCP server:', error);
  process.exit(1);
});