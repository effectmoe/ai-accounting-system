import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

// 確定申告処理用のMCPサーバー
class TaxReturnMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'tax-return-mcp-server',
        version: '1.0.0',
        description: 'MCP server for Japanese tax return processing and automation',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[Tax Return MCP Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // ツール一覧の設定
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'collect_annual_tax_data',
            description: 'Collect and aggregate annual financial data for tax return preparation',
            inputSchema: {
              type: 'object',
              properties: {
                taxYear: {
                  type: 'number',
                  description: 'Tax year (e.g., 2024)',
                  minimum: 2020,
                  maximum: 2030,
                },
                companyId: {
                  type: 'string',
                  description: 'Company/taxpayer ID',
                },
                includeEstimates: {
                  type: 'boolean',
                  description: 'Include estimated/projected data',
                  default: false,
                },
              },
              required: ['taxYear', 'companyId'],
            },
          },
          {
            name: 'calculate_tax_liability',
            description: 'Calculate income tax, resident tax, and business tax liability',
            inputSchema: {
              type: 'object',
              properties: {
                annualIncome: {
                  type: 'object',
                  properties: {
                    businessIncome: { type: 'number' },
                    salaryIncome: { type: 'number' },
                    pensionIncome: { type: 'number' },
                    dividendIncome: { type: 'number' },
                    realEstateIncome: { type: 'number' },
                    capitalGains: { type: 'number' },
                    otherIncome: { type: 'number' },
                  },
                },
                deductions: {
                  type: 'object',
                  properties: {
                    basicDeduction: { type: 'number' },
                    spouseDeduction: { type: 'number' },
                    dependentDeduction: { type: 'number' },
                    socialInsuranceDeduction: { type: 'number' },
                    lifeInsuranceDeduction: { type: 'number' },
                    earthquakeInsuranceDeduction: { type: 'number' },
                    medicalExpenseDeduction: { type: 'number' },
                    donationDeduction: { type: 'number' },
                    blueTaxDeduction: { type: 'number' },
                  },
                },
                taxpayerInfo: {
                  type: 'object',
                  properties: {
                    age: { type: 'number' },
                    isElderly: { type: 'boolean' },
                    hasDisability: { type: 'boolean' },
                    prefecture: { type: 'string' },
                  },
                },
              },
              required: ['annualIncome'],
            },
          },
          {
            name: 'identify_tax_deductions',
            description: 'Automatically identify applicable tax deductions and credits',
            inputSchema: {
              type: 'object',
              properties: {
                expenseCategories: {
                  type: 'object',
                  description: 'Categorized business and personal expenses',
                },
                personalInfo: {
                  type: 'object',
                  properties: {
                    hasSpouse: { type: 'boolean' },
                    dependentCount: { type: 'number' },
                    age: { type: 'number' },
                    hasDisability: { type: 'boolean' },
                    medicalExpenses: { type: 'number' },
                    insurancePremiums: {
                      type: 'object',
                      properties: {
                        life: { type: 'number' },
                        earthquake: { type: 'number' },
                        pension: { type: 'number' },
                      },
                    },
                  },
                },
                donations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      recipient: { type: 'string' },
                      amount: { type: 'number' },
                      type: { type: 'string' },
                      date: { type: 'string' },
                    },
                  },
                },
              },
              required: ['personalInfo'],
            },
          },
          {
            name: 'generate_tax_forms',
            description: 'Generate Japanese tax return forms (Kakutei Shinkoku)',
            inputSchema: {
              type: 'object',
              properties: {
                taxYear: { type: 'number' },
                formType: {
                  type: 'string',
                  enum: ['blue', 'white', 'simple'],
                  description: 'Type of tax return form',
                },
                taxpayerInfo: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    address: { type: 'string' },
                    phoneNumber: { type: 'string' },
                    myNumber: { type: 'string' },
                    occupation: { type: 'string' },
                  },
                  required: ['name'],
                },
                incomeData: { type: 'object' },
                deductionData: { type: 'object' },
                taxCalculation: { type: 'object' },
                electronicFiling: {
                  type: 'boolean',
                  description: 'Generate e-Tax compatible format',
                  default: true,
                },
              },
              required: ['taxYear', 'formType', 'taxpayerInfo', 'incomeData', 'taxCalculation'],
            },
          },
          {
            name: 'optimize_tax_strategy',
            description: 'Analyze and suggest tax optimization strategies',
            inputSchema: {
              type: 'object',
              properties: {
                currentTaxSituation: {
                  type: 'object',
                  properties: {
                    annualIncome: { type: 'number' },
                    currentDeductions: { type: 'object' },
                    taxLiability: { type: 'number' },
                    effectiveTaxRate: { type: 'number' },
                  },
                },
                businessInfo: {
                  type: 'object',
                  properties: {
                    businessType: { type: 'string' },
                    employees: { type: 'number' },
                    assets: { type: 'number' },
                    growthStage: { type: 'string' },
                  },
                },
                goals: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Tax planning goals',
                },
                timeHorizon: {
                  type: 'string',
                  enum: ['current_year', 'next_year', 'long_term'],
                  description: 'Planning time horizon',
                },
              },
              required: ['currentTaxSituation'],
            },
          },
          {
            name: 'validate_tax_return',
            description: 'Validate tax return forms for errors and compliance',
            inputSchema: {
              type: 'object',
              properties: {
                taxReturnData: {
                  type: 'object',
                  description: 'Complete tax return data',
                },
                checkLevel: {
                  type: 'string',
                  enum: ['basic', 'comprehensive', 'audit_ready'],
                  description: 'Level of validation to perform',
                  default: 'comprehensive',
                },
                includeOptimization: {
                  type: 'boolean',
                  description: 'Include optimization suggestions',
                  default: true,
                },
              },
              required: ['taxReturnData'],
            },
          },
          {
            name: 'export_etax_data',
            description: 'Export tax return data in e-Tax compatible format',
            inputSchema: {
              type: 'object',
              properties: {
                taxReturnData: { type: 'object' },
                outputFormat: {
                  type: 'string',
                  enum: ['xml', 'csv', 'pdf'],
                  description: 'Export format',
                  default: 'xml',
                },
                includeAttachments: {
                  type: 'boolean',
                  description: 'Include supporting documents',
                  default: true,
                },
              },
              required: ['taxReturnData'],
            },
          },
          {
            name: 'track_tax_deadlines',
            description: 'Track important tax deadlines and generate reminders',
            inputSchema: {
              type: 'object',
              properties: {
                taxpayerType: {
                  type: 'string',
                  enum: ['individual', 'sole_proprietor', 'corporation'],
                },
                businessActivities: {
                  type: 'array',
                  items: { type: 'string' },
                },
                currentYear: { type: 'number' },
                includeQuarterly: {
                  type: 'boolean',
                  description: 'Include quarterly payment reminders',
                  default: true,
                },
              },
              required: ['taxpayerType', 'currentYear'],
            },
          },
          {
            name: 'estimate_quarterly_payments',
            description: 'Calculate estimated quarterly tax payments',
            inputSchema: {
              type: 'object',
              properties: {
                projectedAnnualIncome: { type: 'number' },
                lastYearTaxLiability: { type: 'number' },
                businessType: { type: 'string' },
                paymentMethod: {
                  type: 'string',
                  enum: ['bank_transfer', 'credit_card', 'convenience_store'],
                  default: 'bank_transfer',
                },
                safeHarborRule: {
                  type: 'boolean',
                  description: 'Use safe harbor rule (100% of last year)',
                  default: false,
                },
              },
              required: ['projectedAnnualIncome'],
            },
          },
        ] as Tool[],
      };
    });

    // ツール実行ハンドラー
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'collect_annual_tax_data':
            return await this.handleCollectAnnualTaxData(args);

          case 'calculate_tax_liability':
            return await this.handleCalculateTaxLiability(args);

          case 'identify_tax_deductions':
            return await this.handleIdentifyTaxDeductions(args);

          case 'generate_tax_forms':
            return await this.handleGenerateTaxForms(args);

          case 'optimize_tax_strategy':
            return await this.handleOptimizeTaxStrategy(args);

          case 'validate_tax_return':
            return await this.handleValidateTaxReturn(args);

          case 'export_etax_data':
            return await this.handleExportETaxData(args);

          case 'track_tax_deadlines':
            return await this.handleTrackTaxDeadlines(args);

          case 'estimate_quarterly_payments':
            return await this.handleEstimateQuarterlyPayments(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // 年間税務データ収集
  private async handleCollectAnnualTaxData(args: any) {
    const { taxYear, companyId, includeEstimates = false } = args;

    try {
      console.log(`[Tax Return MCP] Collecting data for ${taxYear}...`);

      // 取引データの収集
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)
        .gte('transaction_date', `${taxYear}-01-01`)
        .lt('transaction_date', `${taxYear + 1}-01-01`)
        .order('transaction_date', { ascending: true });

      if (error) throw error;

      // 収入の集計
      const incomeTransactions = transactions?.filter(t => 
        t.type === 'income' || t.category === 'revenue'
      ) || [];
      
      const totalRevenue = incomeTransactions.reduce(
        (sum, t) => sum + (t.amount || 0), 0
      );

      // 経費の集計（カテゴリ別）
      const expenseTransactions = transactions?.filter(t => 
        t.type === 'expense' && t.category !== 'revenue'
      ) || [];

      const expensesByCategory = expenseTransactions.reduce((acc, t) => {
        const category = t.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push({
          amount: t.amount || 0,
          date: t.transaction_date,
          description: t.description || '',
          vendor: t.vendor_name || '',
        });
        return acc;
      }, {} as Record<string, any[]>);

      const totalExpenses = expenseTransactions.reduce(
        (sum, t) => sum + (t.amount || 0), 0
      );

      // 控除対象経費の識別
      const deductibleExpenses = await this.identifyDeductibleBusinessExpenses(
        expensesByCategory
      );

      // 四半期別の集計
      const quarterlyBreakdown = this.calculateQuarterlyBreakdown(
        transactions || [],
        taxYear
      );

      // 前年度比較データ
      const previousYearData = await this.getPreviousYearComparison(
        companyId,
        taxYear - 1
      );

      const result = {
        taxYear,
        companyId,
        collectionDate: new Date().toISOString(),
        summary: {
          totalRevenue,
          totalExpenses,
          netIncome: totalRevenue - totalExpenses,
          transactionCount: transactions?.length || 0,
          expenseCategories: Object.keys(expensesByCategory).length,
        },
        income: {
          businessIncome: totalRevenue,
          breakdown: incomeTransactions.map(t => ({
            amount: t.amount,
            date: t.transaction_date,
            source: t.vendor_name || 'Unknown',
            description: t.description,
          })),
        },
        expenses: {
          total: totalExpenses,
          byCategory: Object.entries(expensesByCategory).map(([category, items]) => ({
            category,
            total: items.reduce((sum, item) => sum + item.amount, 0),
            count: items.length,
            items: items.slice(0, 10), // 最大10件
          })),
          deductible: deductibleExpenses,
        },
        quarterlyBreakdown,
        previousYearComparison: previousYearData,
        recommendations: await this.generateDataCollectionRecommendations(
          expensesByCategory,
          totalRevenue,
          totalExpenses
        ),
      };

      return {
        content: [
          {
            type: 'text',
            text: `✅ ${taxYear}年度の税務データ収集完了\n\n` +
                  `📊 集計結果:\n` +
                  `・総収入: ¥${totalRevenue.toLocaleString()}\n` +
                  `・総経費: ¥${totalExpenses.toLocaleString()}\n` +
                  `・所得: ¥${(totalRevenue - totalExpenses).toLocaleString()}\n` +
                  `・取引件数: ${transactions?.length || 0}件\n\n` +
                  `💡 控除可能経費: ¥${Object.values(deductibleExpenses).reduce((sum: number, val: any) => sum + (val.total || 0), 0).toLocaleString()}\n\n` +
                  `📅 四半期別推移も収集済み`,
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`年間データ収集に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 税額計算
  private async handleCalculateTaxLiability(args: any) {
    const { annualIncome, deductions = {}, taxpayerInfo = {} } = args;

    try {
      console.log('[Tax Return MCP] Calculating tax liability...');

      // 総所得の計算
      const totalIncome = Object.values(annualIncome).reduce(
        (sum: number, amount) => sum + (amount as number || 0), 0
      );

      // 総控除額の計算
      const totalDeductions = Object.values(deductions).reduce(
        (sum: number, amount) => sum + (amount as number || 0), 0
      );

      // 課税所得
      const taxableIncome = Math.max(0, totalIncome - totalDeductions);

      // 所得税の計算（累進課税）
      const incomeTax = this.calculateProgressiveIncomeTax(taxableIncome);

      // 復興特別所得税（2.1%）
      const reconstructionTax = Math.floor(incomeTax * 0.021);

      // 住民税の計算
      const residentTax = this.calculateResidentTax(
        taxableIncome,
        taxpayerInfo.prefecture || 'tokyo'
      );

      // 事業税の計算（該当する場合）
      const businessTax = annualIncome.businessIncome > 0 
        ? this.calculateBusinessTax(annualIncome.businessIncome || 0)
        : 0;

      // 実効税率の計算
      const totalTax = incomeTax + reconstructionTax + residentTax + businessTax;
      const effectiveTaxRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;

      const result = {
        calculation: {
          totalIncome,
          totalDeductions,
          taxableIncome,
          taxes: {
            incomeTax,
            reconstructionTax,
            residentTax,
            businessTax,
            total: totalTax,
          },
          effectiveTaxRate,
        },
        breakdown: {
          incomeBreakdown: annualIncome,
          deductionBreakdown: deductions,
          taxBreakdown: {
            national: incomeTax + reconstructionTax,
            local: residentTax + businessTax,
          },
        },
        recommendations: this.generateTaxLiabilityRecommendations(
          taxableIncome,
          totalTax,
          deductions
        ),
      };

      return {
        content: [
          {
            type: 'text',
            text: `💰 ${new Date().getFullYear()}年度 税額計算結果\n\n` +
                  `📊 所得・控除:\n` +
                  `・総所得: ¥${totalIncome.toLocaleString()}\n` +
                  `・総控除: ¥${totalDeductions.toLocaleString()}\n` +
                  `・課税所得: ¥${taxableIncome.toLocaleString()}\n\n` +
                  `🏛️ 税額内訳:\n` +
                  `・所得税: ¥${incomeTax.toLocaleString()}\n` +
                  `・復興特別所得税: ¥${reconstructionTax.toLocaleString()}\n` +
                  `・住民税: ¥${residentTax.toLocaleString()}\n` +
                  `・事業税: ¥${businessTax.toLocaleString()}\n\n` +
                  `💯 合計納税額: ¥${totalTax.toLocaleString()}\n` +
                  `📈 実効税率: ${effectiveTaxRate.toFixed(2)}%`,
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`税額計算に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 控除項目識別
  private async handleIdentifyTaxDeductions(args: any) {
    const { expenseCategories = {}, personalInfo, donations = [] } = args;

    try {
      console.log('[Tax Return MCP] Identifying tax deductions...');

      const identifiedDeductions = {
        standard: {},
        business: {},
        personal: {},
        special: {},
      };

      // 基本控除
      identifiedDeductions.standard = {
        basicDeduction: 480000, // 基礎控除
        ...(personalInfo.hasSpouse && { spouseDeduction: 380000 }),
        ...(personalInfo.dependentCount > 0 && { 
          dependentDeduction: personalInfo.dependentCount * 380000 
        }),
        ...(personalInfo.age >= 70 && { elderlyDeduction: 100000 }),
        ...(personalInfo.hasDisability && { disabilityDeduction: 270000 }),
      };

      // 事業関連控除
      identifiedDeductions.business = await this.identifyBusinessDeductions(
        expenseCategories
      );

      // 個人的控除
      if (personalInfo.medicalExpenses > 100000) {
        identifiedDeductions.personal.medicalExpenseDeduction = 
          Math.min(personalInfo.medicalExpenses - 100000, 2000000);
      }

      // 保険料控除
      if (personalInfo.insurancePremiums) {
        const insurance = personalInfo.insurancePremiums;
        identifiedDeductions.personal.lifeInsuranceDeduction = 
          Math.min(insurance.life || 0, 120000);
        identifiedDeductions.personal.earthquakeInsuranceDeduction = 
          Math.min(insurance.earthquake || 0, 50000);
        identifiedDeductions.personal.pensionDeduction = 
          insurance.pension || 0; // 小規模企業共済等（全額控除）
      }

      // 寄附金控除（ふるさと納税等）
      if (donations.length > 0) {
        const totalDonations = donations.reduce(
          (sum, d) => sum + (d.amount || 0), 0
        );
        identifiedDeductions.special.donationDeduction = 
          Math.max(0, totalDonations - 2000); // 2,000円を超える部分
      }

      // 青色申告特別控除の可能性
      if (expenseCategories.business_income > 0) {
        identifiedDeductions.special.blueTaxDeductionEligible = {
          available: true,
          amount65: 650000, // 電子申告等
          amount10: 100000, // 簡易帳簿
          requirements: [
            '青色申告承認申請書の提出',
            '正規の簿記による記帳',
            '電子申告または電子帳簿保存'
          ]
        };
      }

      const totalPotentialDeductions = this.calculateTotalDeductions(
        identifiedDeductions
      );

      const recommendations = this.generateDeductionRecommendations(
        identifiedDeductions,
        personalInfo
      );

      const result = {
        identifiedDeductions,
        totalPotentialDeductions,
        recommendations,
        missedOpportunities: await this.identifyMissedDeductions(
          personalInfo,
          expenseCategories
        ),
        optimizationTips: this.generateDeductionOptimizationTips(
          identifiedDeductions
        ),
      };

      return {
        content: [
          {
            type: 'text',
            text: `🔍 控除項目識別結果\n\n` +
                  `💰 利用可能控除合計: ¥${totalPotentialDeductions.toLocaleString()}\n\n` +
                  `📋 主要控除項目:\n` +
                  `・基礎控除: ¥${identifiedDeductions.standard.basicDeduction?.toLocaleString() || '0'}\n` +
                  `・配偶者控除: ¥${identifiedDeductions.standard.spouseDeduction?.toLocaleString() || '0'}\n` +
                  `・扶養控除: ¥${identifiedDeductions.standard.dependentDeduction?.toLocaleString() || '0'}\n` +
                  `・医療費控除: ¥${identifiedDeductions.personal.medicalExpenseDeduction?.toLocaleString() || '0'}\n\n` +
                  `💡 最適化提案: ${recommendations.length}件`,
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`控除識別に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 確定申告書生成
  private async handleGenerateTaxForms(args: any) {
    const { 
      taxYear, 
      formType, 
      taxpayerInfo, 
      incomeData, 
      deductionData, 
      taxCalculation,
      electronicFiling = true 
    } = args;

    try {
      console.log(`[Tax Return MCP] Generating ${formType} tax forms for ${taxYear}...`);

      const forms = [];

      // 確定申告書B（第一表・第二表）
      const mainForms = await this.generateMainTaxReturnForms(
        taxYear,
        taxpayerInfo,
        incomeData,
        deductionData,
        taxCalculation
      );
      forms.push(...mainForms);

      // 青色申告決算書または収支内訳書
      if (formType === 'blue') {
        const blueForm = await this.generateBlueReturnForm(
          taxYear,
          taxpayerInfo,
          incomeData,
          deductionData
        );
        forms.push(blueForm);
      } else if (formType === 'white') {
        const whiteForm = await this.generateIncomeStatementForm(
          taxYear,
          taxpayerInfo,
          incomeData
        );
        forms.push(whiteForm);
      }

      // 各種明細書
      const schedules = await this.generateSchedules(
        taxYear,
        taxpayerInfo,
        incomeData,
        deductionData
      );
      forms.push(...schedules);

      // e-Tax用データ
      if (electronicFiling) {
        const etaxData = await this.generateETaxData(
          taxYear,
          taxpayerInfo,
          incomeData,
          deductionData,
          taxCalculation
        );
        forms.push(etaxData);
      }

      // チェックリスト
      const checklist = this.generateSubmissionChecklist(
        formType,
        electronicFiling,
        deductionData
      );
      forms.push(checklist);

      const result = {
        taxYear,
        formType,
        electronicFiling,
        generatedForms: forms,
        summary: {
          totalForms: forms.length,
          mainForms: mainForms.length,
          schedules: schedules.length,
          submissionReady: true,
        },
        submissionInfo: {
          deadline: `${taxYear + 1}-03-15`,
          method: electronicFiling ? 'e-Tax' : '税務署窓口',
          requiredDocuments: this.getRequiredDocuments(formType, deductionData),
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: `📄 ${taxYear}年度確定申告書類生成完了\n\n` +
                  `📋 生成書類:\n` +
                  `・${formType === 'blue' ? '青色申告決算書' : '収支内訳書'}\n` +
                  `・確定申告書B（第一表・第二表）\n` +
                  `・各種明細書 ${schedules.length}件\n` +
                  `${electronicFiling ? '・e-Tax用XMLデータ\n' : ''}` +
                  `・提出チェックリスト\n\n` +
                  `📅 提出期限: ${taxYear + 1}年3月15日\n` +
                  `💻 提出方法: ${electronicFiling ? 'e-Tax（電子申告）' : '税務署窓口'}`,
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`申告書生成に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 税務最適化戦略
  private async handleOptimizeTaxStrategy(args: any) {
    const { 
      currentTaxSituation, 
      businessInfo = {}, 
      goals = [], 
      timeHorizon = 'current_year' 
    } = args;

    try {
      console.log('[Tax Return MCP] Analyzing tax optimization strategies...');

      const strategies = {
        immediate: [], // 今すぐ実行可能
        shortTerm: [], // 1年以内
        longTerm: [], // 1年以上
      };

      // 現在年度の最適化
      if (timeHorizon === 'current_year' || timeHorizon === 'next_year') {
        strategies.immediate.push(...await this.generateImmediateStrategies(
          currentTaxSituation
        ));
      }

      // 青色申告への移行提案
      if (!currentTaxSituation.currentDeductions?.blueTaxDeduction) {
        const blueReturnBenefit = this.calculateBlueReturnBenefit(
          currentTaxSituation.annualIncome
        );
        strategies.shortTerm.push({
          strategy: 'blue_tax_return_conversion',
          title: '青色申告への移行',
          description: '青色申告特別控除により大幅な節税効果',
          impact: {
            annualSavings: blueReturnBenefit,
            implementationCost: 50000, // 会計ソフト等
            roi: (blueReturnBenefit / 50000) * 100,
          },
          requirements: [
            '青色申告承認申請書の提出（3月15日まで）',
            '正規の簿記による記帳',
            '会計ソフトの導入',
          ],
          timeline: '次年度から適用可能',
        });
      }

      // 小規模企業共済の提案
      if (businessInfo.businessType === 'sole_proprietor') {
        const pensionContribution = Math.min(
          currentTaxSituation.annualIncome * 0.1,
          840000 // 年間上限
        );
        const pensionSavings = pensionContribution * 
          (currentTaxSituation.effectiveTaxRate / 100);
        
        strategies.immediate.push({
          strategy: 'small_business_pension',
          title: '小規模企業共済への加入',
          description: '掛金全額が所得控除、退職金の準備も可能',
          impact: {
            annualSavings: pensionSavings,
            recommendedContribution: pensionContribution,
            retirementBenefit: pensionContribution * 20, // 20年概算
          },
          requirements: ['申込手続き（即日加入可能）'],
          timeline: '今年度から適用可能',
        });
      }

      // 設備投資による即時償却
      if (businessInfo.assets && businessInfo.growthStage === 'expanding') {
        strategies.shortTerm.push({
          strategy: 'equipment_immediate_depreciation',
          title: '中小企業経営強化税制の活用',
          description: '設備投資により即時償却または税額控除',
          impact: {
            maxInvestment: 5000000, // 500万円まで即時償却
            taxSavings: 1000000, // 概算
            businessBenefit: '生産性向上',
          },
          requirements: [
            '経営力向上計画の認定',
            '対象設備の購入',
          ],
          timeline: '年度末までに導入',
        });
      }

      // 所得分散戦略
      if (currentTaxSituation.annualIncome > 10000000) {
        strategies.longTerm.push({
          strategy: 'income_splitting',
          title: '家族間での所得分散',
          description: '累進課税率を下げる長期戦略',
          impact: {
            potentialSavings: 500000, // 概算
            riskLevel: 'medium',
          },
          requirements: [
            '家族への業務委託契約',
            '適正な対価の設定',
            '実際の業務遂行',
          ],
          timeline: '1-2年で段階的実施',
        });
      }

      // 戦略の優先順位付け
      const prioritizedStrategies = this.prioritizeStrategies(
        strategies,
        currentTaxSituation,
        goals
      );

      const result = {
        currentSituation: {
          annualIncome: currentTaxSituation.annualIncome,
          currentTaxLiability: currentTaxSituation.taxLiability,
          effectiveTaxRate: currentTaxSituation.effectiveTaxRate,
        },
        optimizationStrategies: strategies,
        prioritizedRecommendations: prioritizedStrategies,
        projectedSavings: {
          immediate: strategies.immediate.reduce(
            (sum, s) => sum + (s.impact?.annualSavings || 0), 0
          ),
          annual: [...strategies.immediate, ...strategies.shortTerm].reduce(
            (sum, s) => sum + (s.impact?.annualSavings || 0), 0
          ),
        },
        implementationPlan: this.createImplementationPlan(prioritizedStrategies),
      };

      return {
        content: [
          {
            type: 'text',
            text: `🎯 税務最適化戦略分析\n\n` +
                  `💰 現在の状況:\n` +
                  `・年収: ¥${currentTaxSituation.annualIncome.toLocaleString()}\n` +
                  `・税負担: ¥${currentTaxSituation.taxLiability.toLocaleString()}\n` +
                  `・実効税率: ${currentTaxSituation.effectiveTaxRate.toFixed(2)}%\n\n` +
                  `🚀 最適化機会:\n` +
                  `・即時実行可能: ${strategies.immediate.length}戦略\n` +
                  `・短期戦略: ${strategies.shortTerm.length}戦略\n` +
                  `・長期戦略: ${strategies.longTerm.length}戦略\n\n` +
                  `💡 年間節税見込み: ¥${result.projectedSavings.annual.toLocaleString()}`,
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`税務最適化分析に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 確定申告書検証
  private async handleValidateTaxReturn(args: any) {
    const { 
      taxReturnData, 
      checkLevel = 'comprehensive', 
      includeOptimization = true 
    } = args;

    try {
      console.log(`[Tax Return MCP] Validating tax return (${checkLevel} level)...`);

      const validationResults = {
        errors: [],
        warnings: [],
        suggestions: [],
        compliance: {},
        score: 0,
      };

      // 基本検証
      const basicChecks = await this.performBasicValidation(taxReturnData);
      validationResults.errors.push(...basicChecks.errors);
      validationResults.warnings.push(...basicChecks.warnings);

      // 計算検証
      const calculationChecks = await this.validateCalculations(taxReturnData);
      validationResults.errors.push(...calculationChecks.errors);
      validationResults.warnings.push(...calculationChecks.warnings);

      // 法令遵守チェック
      if (checkLevel === 'comprehensive' || checkLevel === 'audit_ready') {
        const complianceChecks = await this.validateCompliance(taxReturnData);
        validationResults.compliance = complianceChecks;
        validationResults.errors.push(...complianceChecks.errors);
        validationResults.warnings.push(...complianceChecks.warnings);
      }

      // 最適化提案
      if (includeOptimization) {
        const optimizationSuggestions = await this.generateOptimizationSuggestions(
          taxReturnData
        );
        validationResults.suggestions.push(...optimizationSuggestions);
      }

      // 監査対応チェック
      if (checkLevel === 'audit_ready') {
        const auditReadiness = await this.checkAuditReadiness(taxReturnData);
        validationResults.auditReadiness = auditReadiness;
      }

      // 総合スコア計算
      validationResults.score = this.calculateValidationScore(validationResults);

      const result = {
        validationLevel: checkLevel,
        overallStatus: validationResults.errors.length === 0 ? 'PASS' : 'FAIL',
        validationResults,
        recommendedActions: this.prioritizeValidationActions(validationResults),
        submissionReadiness: {
          ready: validationResults.errors.length === 0,
          blockers: validationResults.errors.length,
          warnings: validationResults.warnings.length,
          score: validationResults.score,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: `🔍 確定申告書検証結果\n\n` +
                  `📊 総合評価: ${result.overallStatus} (${validationResults.score}/100点)\n\n` +
                  `⚠️ エラー: ${validationResults.errors.length}件\n` +
                  `⚡ 警告: ${validationResults.warnings.length}件\n` +
                  `💡 最適化提案: ${validationResults.suggestions.length}件\n\n` +
                  `📋 提出準備: ${result.submissionReadiness.ready ? '完了' : '要修正'}`,
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`申告書検証に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // e-Tax データエクスポート
  private async handleExportETaxData(args: any) {
    const { 
      taxReturnData, 
      outputFormat = 'xml', 
      includeAttachments = true 
    } = args;

    try {
      console.log(`[Tax Return MCP] Exporting e-Tax data in ${outputFormat} format...`);

      let exportData;
      
      switch (outputFormat) {
        case 'xml':
          exportData = await this.generateETaxXML(taxReturnData);
          break;
        case 'csv':
          exportData = await this.generateETaxCSV(taxReturnData);
          break;
        case 'pdf':
          exportData = await this.generateETaxPDF(taxReturnData);
          break;
        default:
          throw new Error(`Unsupported format: ${outputFormat}`);
      }

      const attachments = [];
      if (includeAttachments) {
        attachments.push(...await this.generateETaxAttachments(taxReturnData));
      }

      const result = {
        format: outputFormat,
        exportDate: new Date().toISOString(),
        mainFile: exportData,
        attachments,
        submissionInstructions: this.getETaxSubmissionInstructions(),
        technicalRequirements: {
          software: 'e-Tax用確定申告書等作成コーナー',
          browser: 'Internet Explorer 11 または Edge',
          javaRequired: outputFormat === 'xml',
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: `📤 e-Tax データエクスポート完了\n\n` +
                  `📄 形式: ${outputFormat.toUpperCase()}\n` +
                  `📎 添付書類: ${attachments.length}件\n` +
                  `💻 提出方法: e-Tax（国税電子申告・納税システム）\n\n` +
                  `🔧 必要環境:\n` +
                  `・${result.technicalRequirements.software}\n` +
                  `・${result.technicalRequirements.browser}\n` +
                  `${result.technicalRequirements.javaRequired ? '・Java実行環境\n' : ''}`,
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`e-Taxデータエクスポートに失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 税務期限管理
  private async handleTrackTaxDeadlines(args: any) {
    const { 
      taxpayerType, 
      businessActivities = [], 
      currentYear, 
      includeQuarterly = true 
    } = args;

    try {
      console.log(`[Tax Return MCP] Tracking tax deadlines for ${taxpayerType}...`);

      const deadlines = [];

      // 確定申告期限
      deadlines.push({
        type: 'income_tax_return',
        name: '所得税確定申告',
        dueDate: `${currentYear + 1}-03-15`,
        description: '前年分所得税の確定申告・納税',
        penalty: '無申告加算税・延滞税',
        isRequired: true,
        priority: 'high',
      });

      // 個人事業税
      if (taxpayerType === 'sole_proprietor') {
        deadlines.push({
          type: 'individual_business_tax',
          name: '個人事業税',
          dueDate: `${currentYear}-08-31`,
          description: '第1期分の納税',
          penalty: '延滞税',
          isRequired: true,
          priority: 'medium',
        });
        
        deadlines.push({
          type: 'individual_business_tax',
          name: '個人事業税',
          dueDate: `${currentYear}-11-30`,
          description: '第2期分の納税',
          penalty: '延滞税',
          isRequired: true,
          priority: 'medium',
        });
      }

      // 予定納税
      if (includeQuarterly) {
        deadlines.push({
          type: 'estimated_tax_1st',
          name: '予定納税（第1期）',
          dueDate: `${currentYear}-07-31`,
          description: '予定納税額の1/2を納税',
          penalty: '延滞税',
          isRequired: false, // 前年の税額による
          priority: 'medium',
        });

        deadlines.push({
          type: 'estimated_tax_2nd',
          name: '予定納税（第2期）',
          dueDate: `${currentYear}-11-30`,
          description: '予定納税額の残り1/2を納税',
          penalty: '延滞税',
          isRequired: false,
          priority: 'medium',
        });
      }

      // 住民税
      deadlines.push({
        type: 'resident_tax',
        name: '住民税普通徴収',
        dueDate: `${currentYear}-06-30`,
        description: '第1期分の納税',
        penalty: '延滞金',
        isRequired: true,
        priority: 'medium',
      });

      // 消費税（該当する場合）
      if (businessActivities.includes('taxable_sales') || 
          taxpayerType === 'corporation') {
        deadlines.push({
          type: 'consumption_tax',
          name: '消費税確定申告',
          dueDate: `${currentYear + 1}-03-31`,
          description: '前年分消費税の確定申告・納税',
          penalty: '無申告加算税・延滞税',
          isRequired: false, // 課税売上高による
          priority: 'high',
        });
      }

      // 青色申告承認申請
      if (taxpayerType === 'sole_proprietor') {
        deadlines.push({
          type: 'blue_tax_application',
          name: '青色申告承認申請書',
          dueDate: `${currentYear + 1}-03-15`,
          description: '翌年から青色申告を適用する場合',
          penalty: '申請機会の損失',
          isRequired: false,
          priority: 'low',
        });
      }

      // 期限の並び替えと分類
      const sortedDeadlines = deadlines.sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      );

      const upcoming = sortedDeadlines.filter(d => {
        const dueDate = new Date(d.dueDate);
        const now = new Date();
        const diffDays = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 90; // 90日以内
      });

      const reminders = this.generateDeadlineReminders(upcoming);

      const result = {
        taxpayerType,
        currentYear,
        allDeadlines: sortedDeadlines,
        upcomingDeadlines: upcoming,
        reminders,
        summary: {
          total: deadlines.length,
          upcoming: upcoming.length,
          highPriority: upcoming.filter(d => d.priority === 'high').length,
          required: upcoming.filter(d => d.isRequired).length,
        },
      };

      return {
        content: [
          {
            type: 'text',
            text: `📅 ${currentYear}年度 税務スケジュール\n\n` +
                  `⏰ 今後90日間の予定:\n` +
                  upcoming.map(d => 
                    `・${d.dueDate}: ${d.name}${d.isRequired ? ' (必須)' : ''}`
                  ).join('\n') + '\n\n' +
                  `🚨 優先度高: ${result.summary.highPriority}件\n` +
                  `📋 必須手続き: ${result.summary.required}件`,
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`税務期限管理に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // 予定納税計算
  private async handleEstimateQuarterlyPayments(args: any) {
    const { 
      projectedAnnualIncome, 
      lastYearTaxLiability = 0, 
      businessType = 'sole_proprietor',
      paymentMethod = 'bank_transfer',
      safeHarborRule = false 
    } = args;

    try {
      console.log('[Tax Return MCP] Calculating estimated quarterly payments...');

      // 予定納税額の計算
      let estimatedTax;
      
      if (safeHarborRule && lastYearTaxLiability > 0) {
        // セーフハーバールール（前年の100%）
        estimatedTax = lastYearTaxLiability;
      } else {
        // 今年の予想所得から計算
        const estimatedIncomeTax = this.calculateProgressiveIncomeTax(
          projectedAnnualIncome * 0.8 // 概算控除分を考慮
        );
        estimatedTax = estimatedIncomeTax;
      }

      // 予定納税の対象かチェック
      const isSubjectToEstimatedTax = estimatedTax >= 150000; // 15万円以上

      let quarterlyPayments = [];
      
      if (isSubjectToEstimatedTax) {
        const firstPayment = Math.floor(estimatedTax / 3); // 第1期（1/3）
        const secondPayment = Math.floor(estimatedTax / 3); // 第2期（1/3）
        const finalPayment = estimatedTax - firstPayment - secondPayment; // 確定申告時

        quarterlyPayments = [
          {
            period: '第1期',
            dueDate: `${new Date().getFullYear()}-07-31`,
            amount: firstPayment,
            description: '予定納税額の1/3',
            paymentMethods: this.getPaymentMethods(paymentMethod),
          },
          {
            period: '第2期',
            dueDate: `${new Date().getFullYear()}-11-30`,
            amount: secondPayment,
            description: '予定納税額の1/3',
            paymentMethods: this.getPaymentMethods(paymentMethod),
          },
          {
            period: '確定申告時',
            dueDate: `${new Date().getFullYear() + 1}-03-15`,
            amount: finalPayment,
            description: '残額（調整後）',
            paymentMethods: this.getPaymentMethods(paymentMethod),
          },
        ];
      }

      // 減額申請の可能性
      const reductionApplicable = this.checkReductionApplicability(
        projectedAnnualIncome,
        lastYearTaxLiability
      );

      const result = {
        projectedAnnualIncome,
        lastYearTaxLiability,
        estimatedTax,
        isSubjectToEstimatedTax,
        quarterlyPayments,
        totalQuarterlyPayments: quarterlyPayments.reduce(
          (sum, p) => sum + p.amount, 0
        ),
        safeHarborRule,
        reductionApplicable,
        recommendations: this.generateQuarterlyPaymentRecommendations(
          estimatedTax,
          lastYearTaxLiability,
          projectedAnnualIncome
        ),
      };

      return {
        content: [
          {
            type: 'text',
            text: `💰 ${new Date().getFullYear()}年度 予定納税計算\n\n` +
                  `📊 予想年収: ¥${projectedAnnualIncome.toLocaleString()}\n` +
                  `🏛️ 予想税額: ¥${estimatedTax.toLocaleString()}\n\n` +
                  `📅 予定納税: ${isSubjectToEstimatedTax ? '対象' : '非対象'}\n` +
                  (isSubjectToEstimatedTax ? 
                    `・第1期(7/31): ¥${quarterlyPayments[0]?.amount.toLocaleString()}\n` +
                    `・第2期(11/30): ¥${quarterlyPayments[1]?.amount.toLocaleString()}\n` +
                    `・確定申告時: ¥${quarterlyPayments[2]?.amount.toLocaleString()}\n`
                    : '\n予定納税額が15万円未満のため対象外\n'
                  ) +
                  `\n${reductionApplicable ? '💡 減額申請が可能な場合があります' : ''}`,
          },
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new Error(`予定納税計算に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ヘルパーメソッド群

  private async identifyDeductibleBusinessExpenses(expensesByCategory: Record<string, any[]>) {
    const deductibleCategories = {
      'office_supplies': '事務用品費',
      'travel_expense': '旅費交通費',
      'communication': '通信費',
      'utilities': '水道光熱費',
      'rent': '地代家賃',
      'depreciation': '減価償却費',
      'advertising': '広告宣伝費',
      'professional_services': '外注費',
      'insurance': '保険料',
      'taxes_and_dues': '租税公課',
      'entertainment': '接待交際費',
      'training': '研修費',
      'repairs': '修繕費',
      'supplies': '消耗品費',
    };

    const deductible = {};
    
    for (const [category, expenses] of Object.entries(expensesByCategory)) {
      if (deductibleCategories[category]) {
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        deductible[category] = {
          total,
          description: deductibleCategories[category],
          count: expenses.length,
        };
      }
    }

    return deductible;
  }

  private calculateQuarterlyBreakdown(transactions: any[], taxYear: number) {
    const quarters = [
      { name: 'Q1', start: `${taxYear}-01-01`, end: `${taxYear}-03-31` },
      { name: 'Q2', start: `${taxYear}-04-01`, end: `${taxYear}-06-30` },
      { name: 'Q3', start: `${taxYear}-07-01`, end: `${taxYear}-09-30` },
      { name: 'Q4', start: `${taxYear}-10-01`, end: `${taxYear}-12-31` },
    ];

    return quarters.map(quarter => {
      const quarterTransactions = transactions.filter(t => {
        const date = new Date(t.transaction_date);
        return date >= new Date(quarter.start) && date <= new Date(quarter.end);
      });

      const income = quarterTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const expenses = quarterTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      return {
        quarter: quarter.name,
        period: `${quarter.start} 〜 ${quarter.end}`,
        income,
        expenses,
        netIncome: income - expenses,
        transactionCount: quarterTransactions.length,
      };
    });
  }

  private async getPreviousYearComparison(companyId: string, previousYear: number) {
    try {
      const { data: prevTransactions } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('company_id', companyId)
        .gte('transaction_date', `${previousYear}-01-01`)
        .lt('transaction_date', `${previousYear + 1}-01-01`);

      if (!prevTransactions || prevTransactions.length === 0) {
        return null;
      }

      const prevIncome = prevTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const prevExpenses = prevTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      return {
        year: previousYear,
        income: prevIncome,
        expenses: prevExpenses,
        netIncome: prevIncome - prevExpenses,
      };
    } catch (error) {
      console.error('Previous year data fetch failed:', error);
      return null;
    }
  }

  private async generateDataCollectionRecommendations(
    expensesByCategory: Record<string, any[]>,
    totalRevenue: number,
    totalExpenses: number
  ) {
    const recommendations = [];

    // 経費率のチェック
    const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0;
    
    if (expenseRatio > 80) {
      recommendations.push({
        type: 'high_expense_ratio',
        message: '経費率が80%を超えています。経費の妥当性を再確認してください。',
        priority: 'high',
      });
    }

    // 接待交際費の上限チェック
    if (expensesByCategory.entertainment) {
      const entertainmentTotal = expensesByCategory.entertainment.reduce(
        (sum, exp) => sum + exp.amount, 0
      );
      const entertainmentLimit = Math.min(8000000, totalRevenue * 0.0025);
      
      if (entertainmentTotal > entertainmentLimit) {
        recommendations.push({
          type: 'entertainment_limit',
          message: `接待交際費が損金算入限度額(${entertainmentLimit.toLocaleString()}円)を超えています。`,
          priority: 'medium',
        });
      }
    }

    // 青色申告の推奨
    recommendations.push({
      type: 'blue_tax_recommendation',
      message: '青色申告により65万円の特別控除が受けられます。',
      priority: 'low',
    });

    return recommendations;
  }

  private calculateProgressiveIncomeTax(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0;

    const brackets = [
      { min: 0, max: 1950000, rate: 0.05, deduction: 0 },
      { min: 1950000, max: 3300000, rate: 0.10, deduction: 97500 },
      { min: 3300000, max: 6950000, rate: 0.20, deduction: 427500 },
      { min: 6950000, max: 9000000, rate: 0.23, deduction: 636000 },
      { min: 9000000, max: 18000000, rate: 0.33, deduction: 1536000 },
      { min: 18000000, max: 40000000, rate: 0.40, deduction: 2796000 },
      { min: 40000000, max: Infinity, rate: 0.45, deduction: 4796000 },
    ];

    for (const bracket of brackets) {
      if (taxableIncome >= bracket.min && taxableIncome < bracket.max) {
        return Math.floor(taxableIncome * bracket.rate - bracket.deduction);
      }
    }

    // 最高税率
    const highest = brackets[brackets.length - 1];
    return Math.floor(taxableIncome * highest.rate - highest.deduction);
  }

  private calculateResidentTax(taxableIncome: number, prefecture: string): number {
    if (taxableIncome <= 0) return 0;

    // 所得割（10%）+ 均等割
    const incomeLevy = Math.floor(taxableIncome * 0.10);
    const uniformLevy = 5000; // 標準的な均等割

    return incomeLevy + uniformLevy;
  }

  private calculateBusinessTax(businessIncome: number): number {
    const exemption = 2900000; // 事業税控除額
    if (businessIncome <= exemption) return 0;

    const taxableAmount = businessIncome - exemption;
    return Math.floor(taxableAmount * 0.05); // 5%
  }

  // 省略：他のヘルパーメソッドも同様に実装...

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('[Tax Return MCP Server] Server running on stdio');
  }
}

// サーバー起動
if (require.main === module) {
  const server = new TaxReturnMCPServer();
  server.run().catch(console.error);
}

export { TaxReturnMCPServer };