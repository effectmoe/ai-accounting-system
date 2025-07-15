import { z } from 'zod';
import { createAgent } from '@mastra/core';

// 源泉徴収スキーマ
const withholdingTaxSchema = z.object({
  paymentType: z.enum(['salary', 'bonus', 'retirement', 'freelance', 'dividend', 'interest']),
  paymentAmount: z.number(),
  recipientType: z.enum(['individual', 'corporate', 'non_resident']),
  recipientDetails: z.object({
    name: z.string(),
    address: z.string().optional(),
    taxNumber: z.string().optional(),
    isResident: z.boolean().default(true),
    countryCode: z.string().default('JP'),
  }),
  taxTreatyApplicable: z.boolean().default(false),
  taxTreatyRate: z.number().optional(),
});

// 消費税計算スキーマ
const consumptionTaxSchema = z.object({
  period: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  salesData: z.object({
    standardRateSales: z.number(),
    reducedRateSales: z.number(),
    exportSales: z.number(),
    exemptSales: z.number(),
  }),
  purchaseData: z.object({
    standardRatePurchases: z.number(),
    reducedRatePurchases: z.number(),
    nonDeductiblePurchases: z.number(),
  }),
  calculationMethod: z.enum(['invoice', 'account_book', 'simplified']).default('invoice'),
  isSimplifiedTaxpayer: z.boolean().default(false),
});

// 法人税計算スキーマ
const corporateTaxSchema = z.object({
  fiscalYear: z.string(),
  income: z.object({
    revenue: z.number(),
    expenses: z.number(),
    nonDeductibleExpenses: z.number(),
    taxExemptIncome: z.number(),
  }),
  adjustments: z.object({
    depreciationAdjustment: z.number().default(0),
    provisionAdjustment: z.number().default(0),
    entertainmentExpenseAdjustment: z.number().default(0),
  }),
  corporationType: z.enum(['regular', 'small', 'public_interest']).default('regular'),
  capitalAmount: z.number(),
});

// 日本税務エージェントの入力スキーマ
const japanTaxInputSchema = z.object({
  operation: z.enum([
    'calculate_withholding',
    'calculate_consumption_tax',
    'calculate_corporate_tax',
    'generate_tax_return',
    'check_compliance',
    'get_tax_calendar'
  ]),
  
  // 源泉徴収計算
  withholdingTax: withholdingTaxSchema.optional(),
  
  // 消費税計算
  consumptionTax: consumptionTaxSchema.optional(),
  
  // 法人税計算
  corporateTax: corporateTaxSchema.optional(),
  
  // 税務申告書生成
  taxReturnOptions: z.object({
    returnType: z.enum(['consumption_tax', 'corporate_tax', 'withholding_tax_statement']),
    period: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    companyInfo: z.object({
      name: z.string(),
      registrationNumber: z.string(),
      address: z.string(),
      representativeName: z.string(),
    }),
  }).optional(),
  
  // コンプライアンスチェック
  complianceCheckOptions: z.object({
    checkType: z.enum(['invoice_system', 'consumption_tax', 'withholding_tax', 'general']),
    targetPeriod: z.string(),
  }).optional(),
});

// 日本税務エージェント定義
export const japanTaxAgent = createAgent({
  id: 'japan-tax-agent',
  name: 'Japan Tax Compliance Agent',
  description: 'Handle Japanese tax calculations, compliance checks, and tax return generation',
  
  inputSchema: japanTaxInputSchema,
  
  // エージェントのツール
  tools: {
    // 源泉徴収税計算
    calculateWithholdingTax: {
      description: 'Calculate Japanese withholding tax',
      execute: async ({ data, mcpClient }) => {
        const { paymentType, paymentAmount, recipientType, recipientDetails } = data;
        
        // NLWebから最新の源泉徴収税率を取得
        const taxRateInfo = await mcpClient.callTool('nlweb', 'search_tax_info', {
          query: `源泉徴収税率 ${paymentType} ${recipientType} ${new Date().getFullYear()}`,
          category: 'income_tax'
        });
        
        let withholdingRate = 0;
        let withholdingAmount = 0;
        let calculationMethod = '';
        
        // 支払種別による税率判定
        switch (paymentType) {
          case 'salary':
            // 給与所得の源泉徴収（月額表または賞与表を使用）
            if (paymentAmount <= 88000) {
              withholdingRate = 0;
            } else {
              // 簡易計算（実際は源泉徴収税額表を参照）
              withholdingRate = 0.05; // 5%～45%の累進課税
              calculationMethod = '給与所得の源泉徴収税額表（月額）';
            }
            break;
            
          case 'freelance':
            // 報酬・料金等の源泉徴収
            if (recipientType === 'individual') {
              if (paymentAmount <= 1000000) {
                withholdingRate = 0.1021; // 10.21%（復興特別所得税含む）
              } else {
                // 100万円超の部分は20.42%
                withholdingAmount = 1000000 * 0.1021 + (paymentAmount - 1000000) * 0.2042;
                calculationMethod = '報酬・料金等の源泉徴収（100万円超）';
              }
            }
            break;
            
          case 'dividend':
            // 配当所得の源泉徴収
            if (recipientType === 'individual') {
              withholdingRate = 0.20315; // 20.315%（所得税15.315% + 住民税5%）
            } else if (recipientType === 'corporate') {
              withholdingRate = 0.15315; // 15.315%（法人は住民税なし）
            }
            break;
            
          case 'interest':
            // 利子所得の源泉徴収
            withholdingRate = 0.15315; // 15.315%
            break;
            
          default:
            withholdingRate = 0.2042; // デフォルト20.42%
        }
        
        // 租税条約適用の場合
        if (data.taxTreatyApplicable && data.taxTreatyRate) {
          withholdingRate = data.taxTreatyRate;
          calculationMethod += ' (租税条約適用)';
        }
        
        // 源泉徴収税額の計算
        if (withholdingAmount === 0) {
          withholdingAmount = Math.floor(paymentAmount * withholdingRate);
        }
        
        // 源泉徴収票データの保存
        const result = await mcpClient.callTool('supabase', 'insert', {
          table: 'withholding_tax_records',
          data: {
            payment_type: paymentType,
            payment_amount: paymentAmount,
            withholding_rate: withholdingRate,
            withholding_amount: withholdingAmount,
            recipient_name: recipientDetails.name,
            recipient_type: recipientType,
            calculation_method: calculationMethod,
            created_at: new Date().toISOString()
          }
        });
        
        return {
          paymentAmount,
          withholdingRate: `${(withholdingRate * 100).toFixed(3)}%`,
          withholdingAmount,
          netPayment: paymentAmount - withholdingAmount,
          calculationMethod,
          recordId: result.data[0].id
        };
      },
    },
    
    // 消費税計算
    calculateConsumptionTax: {
      description: 'Calculate Japanese consumption tax',
      execute: async ({ data, mcpClient }) => {
        const { period, salesData, purchaseData, calculationMethod, isSimplifiedTaxpayer } = data;
        
        // 売上に係る消費税
        const outputTax = {
          standard: salesData.standardRateSales * 0.1,
          reduced: salesData.reducedRateSales * 0.08,
          total: salesData.standardRateSales * 0.1 + salesData.reducedRateSales * 0.08
        };
        
        // 仕入に係る消費税
        let inputTax = {
          standard: purchaseData.standardRatePurchases * 0.1,
          reduced: purchaseData.reducedRatePurchases * 0.08,
          total: 0
        };
        
        // 仕入税額控除の計算方法による調整
        switch (calculationMethod) {
          case 'invoice':
            // インボイス方式（適格請求書等保存方式）
            inputTax.total = inputTax.standard + inputTax.reduced;
            break;
            
          case 'account_book':
            // 帳簿方式（経過措置）
            inputTax.total = (inputTax.standard + inputTax.reduced) * 0.8; // 80%控除
            break;
            
          case 'simplified':
            // 簡易課税制度
            const simplifiedRates = {
              retail: 0.8,      // 小売業 80%
              wholesale: 0.9,   // 卸売業 90%
              manufacturing: 0.7, // 製造業 70%
              service: 0.5,     // サービス業 50%
              real_estate: 0.4, // 不動産業 40%
              other: 0.6        // その他 60%
            };
            // デフォルトでサービス業として計算
            inputTax.total = outputTax.total * simplifiedRates.service;
            break;
        }
        
        // 納付税額の計算
        const taxPayable = Math.floor(outputTax.total - inputTax.total);
        
        // 消費税申告データの保存
        const result = await mcpClient.callTool('supabase', 'insert', {
          table: 'consumption_tax_returns',
          data: {
            period_start: period.startDate,
            period_end: period.endDate,
            sales_data: salesData,
            purchase_data: purchaseData,
            output_tax: outputTax,
            input_tax: inputTax,
            tax_payable: taxPayable,
            calculation_method: calculationMethod,
            is_simplified_taxpayer: isSimplifiedTaxpayer,
            created_at: new Date().toISOString()
          }
        });
        
        return {
          period,
          outputTax,
          inputTax,
          taxPayable,
          calculationMethod,
          details: {
            totalSales: Object.values(salesData).reduce((a, b) => a + b, 0),
            totalPurchases: Object.values(purchaseData).reduce((a, b) => a + b, 0),
            effectiveTaxRate: (taxPayable / Object.values(salesData).reduce((a, b) => a + b, 0) * 100).toFixed(2) + '%'
          },
          returnId: result.data[0].id
        };
      },
    },
    
    // 法人税計算
    calculateCorporateTax: {
      description: 'Calculate Japanese corporate tax',
      execute: async ({ data, mcpClient }) => {
        const { fiscalYear, income, adjustments, corporationType, capitalAmount } = data;
        
        // 課税所得の計算
        let taxableIncome = income.revenue - income.expenses;
        taxableIncome += income.nonDeductibleExpenses; // 損金不算入額を加算
        taxableIncome -= income.taxExemptIncome; // 益金不算入額を減算
        
        // 税務調整
        taxableIncome += adjustments.depreciationAdjustment;
        taxableIncome += adjustments.provisionAdjustment;
        taxableIncome += adjustments.entertainmentExpenseAdjustment;
        
        // 法人税率の決定（NLWebから最新税率を取得）
        const taxRateInfo = await mcpClient.callTool('nlweb', 'search_tax_info', {
          query: `法人税率 ${corporationType} ${capitalAmount} ${fiscalYear}`,
          category: 'corporate_tax'
        });
        
        let corporateTaxRate = 0.232; // 標準税率 23.2%
        
        // 中小法人の軽減税率
        if (corporationType === 'small' && capitalAmount <= 100000000) {
          if (taxableIncome <= 8000000) {
            corporateTaxRate = 0.15; // 年800万円以下の部分は15%
          }
        }
        
        // 法人税額の計算
        let corporateTax = 0;
        if (corporationType === 'small' && taxableIncome > 8000000) {
          corporateTax = 8000000 * 0.15 + (taxableIncome - 8000000) * 0.232;
        } else {
          corporateTax = taxableIncome * corporateTaxRate;
        }
        
        // 地方法人税（法人税額の10.3%）
        const localCorporateTax = corporateTax * 0.103;
        
        // 法人住民税・事業税（簡易計算）
        const localTax = {
          inhabitantsTax: corporateTax * 0.129, // 法人住民税（法人税割）約12.9%
          enterpriseTax: taxableIncome * 0.07,  // 事業税（所得割）約7%
        };
        
        // 総税額
        const totalTax = Math.floor(
          corporateTax + 
          localCorporateTax + 
          localTax.inhabitantsTax + 
          localTax.enterpriseTax
        );
        
        // 法人税申告データの保存
        const result = await mcpClient.callTool('supabase', 'insert', {
          table: 'corporate_tax_returns',
          data: {
            fiscal_year: fiscalYear,
            taxable_income: taxableIncome,
            corporate_tax_rate: corporateTaxRate,
            corporate_tax: corporateTax,
            local_corporate_tax: localCorporateTax,
            local_taxes: localTax,
            total_tax: totalTax,
            corporation_type: corporationType,
            capital_amount: capitalAmount,
            created_at: new Date().toISOString()
          }
        });
        
        return {
          fiscalYear,
          taxableIncome,
          taxes: {
            corporateTax: Math.floor(corporateTax),
            localCorporateTax: Math.floor(localCorporateTax),
            inhabitantsTax: Math.floor(localTax.inhabitantsTax),
            enterpriseTax: Math.floor(localTax.enterpriseTax),
            totalTax
          },
          effectiveTaxRate: `${(totalTax / taxableIncome * 100).toFixed(2)}%`,
          breakdown: {
            revenue: income.revenue,
            expenses: income.expenses,
            adjustments: Object.values(adjustments).reduce((a, b) => a + b, 0),
            finalTaxableIncome: taxableIncome
          },
          returnId: result.data[0].id
        };
      },
    },
    
    // 税務申告書生成
    generateTaxReturn: {
      description: 'Generate tax return documents',
      execute: async ({ returnType, period, companyInfo, mcpClient }) => {
        // 申告書データの取得
        let returnData;
        switch (returnType) {
          case 'consumption_tax':
            const consumptionResult = await mcpClient.callTool('supabase', 'select', {
              table: 'consumption_tax_returns',
              filters: {
                period_start: period.startDate,
                period_end: period.endDate
              },
              options: { limit: 1, orderBy: 'created_at', orderDirection: 'desc' }
            });
            returnData = consumptionResult.data[0];
            break;
            
          case 'corporate_tax':
            const corporateResult = await mcpClient.callTool('supabase', 'select', {
              table: 'corporate_tax_returns',
              filters: {
                fiscal_year: period.startDate.split('-')[0]
              },
              options: { limit: 1, orderBy: 'created_at', orderDirection: 'desc' }
            });
            returnData = corporateResult.data[0];
            break;
            
          case 'withholding_tax_statement':
            const withholdingResult = await mcpClient.callTool('supabase', 'select', {
              table: 'withholding_tax_records',
              filters: {
                created_at: { gte: period.startDate, lte: period.endDate }
              }
            });
            returnData = withholdingResult.data;
            break;
        }
        
        // 申告書フォーマットの生成
        const taxReturn = {
          returnType,
          companyInfo,
          period,
          data: returnData,
          generatedAt: new Date().toISOString(),
          formNumber: this.getFormNumber(returnType),
          status: 'draft'
        };
        
        // PDFまたはExcel形式で出力
        const documentResult = await mcpClient.callTool('excel', 'create_workbook', {
          sheets: [{
            name: '税務申告書',
            data: [taxReturn],
            template: `tax_return_${returnType}`
          }]
        });
        
        // 申告書記録の保存
        await mcpClient.callTool('supabase', 'insert', {
          table: 'tax_returns',
          data: {
            type: returnType,
            period_start: period.startDate,
            period_end: period.endDate,
            company_name: companyInfo.name,
            registration_number: companyInfo.registrationNumber,
            document_url: documentResult.url,
            status: 'draft',
            created_at: new Date().toISOString()
          }
        });
        
        return {
          success: true,
          returnType,
          documentUrl: documentResult.url,
          formNumber: taxReturn.formNumber,
          status: 'draft',
          nextSteps: [
            '申告書の内容を確認してください',
            '必要に応じて税理士の確認を受けてください',
            'e-Taxまたは書面で提出してください'
          ]
        };
      },
    },
    
    // 税務コンプライアンスチェック
    checkTaxCompliance: {
      description: 'Check tax compliance status',
      execute: async ({ checkType, targetPeriod, mcpClient }) => {
        const issues = [];
        const recommendations = [];
        
        switch (checkType) {
          case 'invoice_system':
            // インボイス制度対応チェック
            const invoiceCheck = await mcpClient.callTool('nlweb', 'check_tax_compliance', {
              documentType: 'invoice',
              requirements: ['registration_number', 'tax_rate_separation', 'retention_period']
            });
            
            if (!invoiceCheck.isCompliant) {
              issues.push(...invoiceCheck.issues);
              recommendations.push(...invoiceCheck.recommendations);
            }
            break;
            
          case 'consumption_tax':
            // 消費税納税義務チェック
            const salesData = await mcpClient.callTool('supabase', 'rpc', {
              functionName: 'get_annual_sales',
              params: { year: targetPeriod }
            });
            
            if (salesData.total > 10000000) {
              recommendations.push('課税売上高が1,000万円を超えています。消費税の納税義務があります。');
            }
            
            if (salesData.total > 50000000) {
              recommendations.push('課税売上高が5,000万円を超えています。簡易課税制度は選択できません。');
            }
            break;
            
          case 'withholding_tax':
            // 源泉徴収漏れチェック
            const payments = await mcpClient.callTool('supabase', 'select', {
              table: 'payments',
              filters: {
                payment_date: { gte: `${targetPeriod}-01-01`, lte: `${targetPeriod}-12-31` },
                payment_type: { in: ['salary', 'freelance', 'dividend'] }
              }
            });
            
            const missingWithholding = payments.data.filter(p => !p.withholding_tax_id);
            if (missingWithholding.length > 0) {
              issues.push(`${missingWithholding.length}件の支払いで源泉徴収が行われていない可能性があります`);
              recommendations.push('源泉徴収対象の支払いを確認し、必要な源泉徴収を行ってください');
            }
            break;
        }
        
        // 一般的な期限チェック
        const deadlines = await tools.getTaxDeadlines({ year: targetPeriod, mcpClient });
        const upcomingDeadlines = deadlines.filter(d => {
          const daysUntil = Math.floor((new Date(d.date) - new Date()) / (1000 * 60 * 60 * 24));
          return daysUntil > 0 && daysUntil <= 30;
        });
        
        if (upcomingDeadlines.length > 0) {
          recommendations.push(`今後30日以内に${upcomingDeadlines.length}件の税務申告期限があります`);
        }
        
        return {
          checkType,
          targetPeriod,
          isCompliant: issues.length === 0,
          issues,
          recommendations,
          upcomingDeadlines,
          checkedAt: new Date().toISOString()
        };
      },
    },
    
    // 税務カレンダー取得
    getTaxDeadlines: {
      description: 'Get tax filing deadlines',
      execute: async ({ year, mcpClient }) => {
        // NLWebから最新の申告期限情報を取得
        const deadlineInfo = await mcpClient.callTool('nlweb', 'search_tax_info', {
          query: `税務申告期限 ${year}年`,
          category: 'general'
        });
        
        // 標準的な申告期限
        const standardDeadlines = [
          {
            name: '法人税確定申告',
            date: `${year}-05-31`, // 3月決算の場合
            description: '事業年度終了後2ヶ月以内',
            type: 'corporate_tax'
          },
          {
            name: '消費税確定申告',
            date: `${year}-03-31`, // 個人事業者
            description: '課税期間終了後2ヶ月以内',
            type: 'consumption_tax'
          },
          {
            name: '源泉所得税納付（毎月分）',
            date: '翌月10日',
            description: '給与等の支払月の翌月10日',
            type: 'withholding_tax',
            recurring: 'monthly'
          },
          {
            name: '法定調書提出',
            date: `${year}-01-31`,
            description: '前年分の法定調書',
            type: 'legal_document'
          },
          {
            name: '償却資産申告',
            date: `${year}-01-31`,
            description: '1月1日現在の償却資産',
            type: 'depreciable_assets'
          }
        ];
        
        return standardDeadlines;
      },
    },
    
    // フォーム番号取得
    getFormNumber: {
      description: 'Get official tax form number',
      execute: async ({ returnType }) => {
        const formNumbers = {
          consumption_tax: '第26号様式',
          corporate_tax: '別表一',
          withholding_tax_statement: '給与所得の源泉徴収票'
        };
        return formNumbers[returnType] || '未定義';
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools, mcpClient }) => {
    try {
      console.log('[Japan Tax Agent] Starting operation:', input.operation);
      
      switch (input.operation) {
        case 'calculate_withholding':
          if (!input.withholdingTax) {
            throw new Error('Withholding tax data is required');
          }
          
          const withholdingResult = await tools.calculateWithholdingTax({
            data: input.withholdingTax,
            mcpClient
          });
          
          return {
            success: true,
            operation: 'calculate_withholding',
            result: withholdingResult
          };
          
        case 'calculate_consumption_tax':
          if (!input.consumptionTax) {
            throw new Error('Consumption tax data is required');
          }
          
          const consumptionResult = await tools.calculateConsumptionTax({
            data: input.consumptionTax,
            mcpClient
          });
          
          return {
            success: true,
            operation: 'calculate_consumption_tax',
            result: consumptionResult
          };
          
        case 'calculate_corporate_tax':
          if (!input.corporateTax) {
            throw new Error('Corporate tax data is required');
          }
          
          const corporateResult = await tools.calculateCorporateTax({
            data: input.corporateTax,
            mcpClient
          });
          
          return {
            success: true,
            operation: 'calculate_corporate_tax',
            result: corporateResult
          };
          
        case 'generate_tax_return':
          if (!input.taxReturnOptions) {
            throw new Error('Tax return options are required');
          }
          
          const returnResult = await tools.generateTaxReturn({
            ...input.taxReturnOptions,
            mcpClient
          });
          
          return {
            success: true,
            operation: 'generate_tax_return',
            result: returnResult
          };
          
        case 'check_compliance':
          if (!input.complianceCheckOptions) {
            throw new Error('Compliance check options are required');
          }
          
          const complianceResult = await tools.checkTaxCompliance({
            ...input.complianceCheckOptions,
            mcpClient
          });
          
          return {
            success: true,
            operation: 'check_compliance',
            result: complianceResult
          };
          
        case 'get_tax_calendar':
          const year = new Date().getFullYear();
          const calendarResult = await tools.getTaxDeadlines({
            year: year.toString(),
            mcpClient
          });
          
          return {
            success: true,
            operation: 'get_tax_calendar',
            result: {
              year,
              deadlines: calendarResult
            }
          };
          
        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }
      
    } catch (error) {
      console.error('[Japan Tax Agent] Error:', error);
      throw error;
    }
  },
});

// エージェントのエクスポート
export default japanTaxAgent;