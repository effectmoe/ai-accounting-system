import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

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
  companyId: z.string(),
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
  companyId: z.string(),
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
  companyId: z.string(),
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
    companyId: z.string(),
  }).optional(),
  
  // コンプライアンスチェック
  complianceCheckOptions: z.object({
    checkType: z.enum(['invoice_system', 'consumption_tax', 'withholding_tax', 'general']),
    targetPeriod: z.string(),
    companyId: z.string(),
  }).optional(),
});

// 日本税務エージェント定義
export const japanTaxAgent = createAgent({
  id: 'japan-tax-agent',
  name: 'Japan Tax Compliance Agent',
  description: 'Handle Japanese tax calculations, compliance checks, and tax return generation with MongoDB integration',
  
  inputSchema: japanTaxInputSchema,
  
  // エージェントのツール
  tools: {
    // 源泉徴収税計算
    calculateWithholdingTax: {
      description: 'Calculate Japanese withholding tax',
      execute: async ({ data }) => {
        try {
          const db = DatabaseService.getInstance();
          const { paymentType, paymentAmount, recipientType, recipientDetails, companyId } = data;
          
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
          const withholdingRecord = {
            companyId,
            paymentType,
            paymentAmount,
            withholdingRate,
            withholdingAmount,
            recipientName: recipientDetails.name,
            recipientType,
            recipientDetails,
            calculationMethod,
            taxTreatyApplicable: data.taxTreatyApplicable || false,
            taxTreatyRate: data.taxTreatyRate,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const result = await db.create('withholding_tax_records', withholdingRecord);
          
          return {
            success: true,
            paymentAmount,
            withholdingRate: `${(withholdingRate * 100).toFixed(3)}%`,
            withholdingAmount,
            netPayment: paymentAmount - withholdingAmount,
            calculationMethod,
            recordId: result._id.toString(),
            message: '源泉徴収税額が計算されました'
          };
          
        } catch (error) {
          console.error('Withholding tax calculation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
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
        const result = await db.create(Collections.JOURNAL_ENTRIES, {
          type: 'consumption_tax_return',
          periodStart: period.startDate,
          periodEnd: period.endDate,
          salesData: salesData,
          purchaseData: purchaseData,
          outputTax: outputTax,
          inputTax: inputTax,
          taxPayable: taxPayable,
          calculationMethod: calculationMethod,
          isSimplifiedTaxpayer: isSimplifiedTaxpayer
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
        const result = await db.create(Collections.JOURNAL_ENTRIES, {
          type: 'corporate_tax_return',
          fiscalYear: fiscalYear,
          taxableIncome: taxableIncome,
          corporateTaxRate: corporateTaxRate,
          corporateTax: corporateTax,
          localCorporateTax: localCorporateTax,
          localTaxes: localTax,
          totalTax: totalTax,
          corporationType: corporationType,
          capitalAmount: capitalAmount
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
            const consumptionResult = await db.find(Collections.JOURNAL_ENTRIES, {
              type: 'consumption_tax_return',
              periodStart: period.startDate,
              periodEnd: period.endDate
            }, { sort: { createdAt: -1 }, limit: 1 });
            returnData = consumptionResult[0];
            break;
            
          case 'corporate_tax':
            const corporateResult = await db.find(Collections.JOURNAL_ENTRIES, {
              type: 'corporate_tax_return',
              fiscalYear: period.startDate.split('-')[0]
            }, { sort: { createdAt: -1 }, limit: 1 });
            returnData = corporateResult[0];
            break;
            
          case 'withholding_tax_statement':
            const withholdingResult = await db.find(Collections.JOURNAL_ENTRIES, {
              type: 'withholding_tax_record',
              createdAt: {
                $gte: new Date(period.startDate),
                $lte: new Date(period.endDate)
              }
            });
            returnData = withholdingResult;
            break;
        }
        
        // 申告書フォーマットの生成
        const taxReturn = {
          returnType,
          companyInfo,
          period,
          data: returnData,
          generatedAt: new Date().toISOString(),
          formNumber: await tools.getFormNumber(returnType),
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
        await db.create(Collections.DOCUMENTS, {
          type: 'tax_return',
          returnType: returnType,
          periodStart: period.startDate,
          periodEnd: period.endDate,
          companyName: companyInfo.name,
          registrationNumber: companyInfo.registrationNumber,
          documentUrl: documentResult.url,
          status: 'draft'
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
            const salesTransactions = await db.find(Collections.TRANSACTIONS, {
              date: {
                $gte: new Date(`${targetPeriod}-01-01`),
                $lte: new Date(`${targetPeriod}-12-31`)
              },
              transactionType: 'income'
            });
            
            const salesTotal = salesTransactions.reduce((sum, t) => sum + t.amount, 0);
            
            if (salesTotal > 10000000) {
              recommendations.push('課税売上高が1,000万円を超えています。消費税の納税義務があります。');
            }
            
            if (salesTotal > 50000000) {
              recommendations.push('課税売上高が5,000万円を超えています。簡易課税制度は選択できません。');
            }
            break;
            
          case 'withholding_tax':
            // 源泉徴収漏れチェック
            const payments = await db.find(Collections.TRANSACTIONS, {
              date: {
                $gte: new Date(`${targetPeriod}-01-01`),
                $lte: new Date(`${targetPeriod}-12-31`)
              },
              transactionType: { $in: ['salary', 'freelance', 'dividend'] }
            });
            
            const missingWithholding = payments.filter(p => !p.withholdingTaxId);
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