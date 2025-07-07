import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { supabase } from '../lib/supabase';

// 確定申告関連のスキーマ定義
const taxReturnInputSchema = z.object({
  operation: z.enum([
    'collect_annual_data',        // 年間データ収集
    'calculate_income_tax',       // 所得税計算
    'calculate_resident_tax',     // 住民税計算
    'calculate_business_tax',     // 事業税計算
    'identify_deductions',        // 控除項目識別
    'generate_tax_return',        // 申告書生成
    'optimize_tax',              // 税務最適化
    'validate_return',           // 申告書検証
    'export_etax',              // e-Tax用データ出力
    'generate_supporting_docs'   // 添付書類生成
  ]),
  taxYear: z.number().int().min(2020).max(2030),
  taxpayerInfo: z.object({
    companyId: z.string(),
    businessType: z.enum(['individual', 'sole_proprietor', 'corporation']),
    name: z.string(),
    address: z.string().optional(),
    myNumber: z.string().optional(),
    spouseInfo: z.object({
      hasSpouse: z.boolean(),
      spouseIncome: z.number().optional(),
      spouseDeduction: z.number().optional(),
    }).optional(),
    dependents: z.array(z.object({
      name: z.string(),
      relationship: z.string(),
      age: z.number(),
      income: z.number(),
    })).optional(),
  }),
  incomeData: z.object({
    businessIncome: z.number().optional(),      // 事業所得
    salaryIncome: z.number().optional(),        // 給与所得
    pensionIncome: z.number().optional(),       // 年金所得
    dividendIncome: z.number().optional(),      // 配当所得
    realEstateIncome: z.number().optional(),    // 不動産所得
    capitalGains: z.number().optional(),        // 譲渡所得
    otherIncome: z.number().optional(),         // その他所得
  }).optional(),
  expenseData: z.object({
    businessExpenses: z.record(z.number()).optional(),  // 事業経費
    deductibleExpenses: z.record(z.number()).optional(), // 控除対象経費
  }).optional(),
  settings: z.object({
    blueTaxReturn: z.boolean().default(false),   // 青色申告
    simplified: z.boolean().default(false),      // 簡易帳簿
    electronicFiling: z.boolean().default(true), // e-Tax利用
    optimizeTax: z.boolean().default(true),      // 税務最適化
  }).optional(),
});

const taxReturnOutputSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  data: z.record(z.any()).optional(),
  taxCalculation: z.object({
    totalIncome: z.number(),           // 総所得
    taxableIncome: z.number(),         // 課税所得
    incomeTax: z.number(),            // 所得税
    residentTax: z.number(),          // 住民税
    businessTax: z.number().optional(), // 事業税
    totalTax: z.number(),             // 総税額
    deductions: z.record(z.number()),  // 控除一覧
    taxCredit: z.number(),            // 税額控除
    refund: z.number(),               // 還付額
    additionalTax: z.number(),        // 追加納税額
  }).optional(),
  documents: z.array(z.object({
    type: z.string(),
    filename: z.string(),
    content: z.string(),
    format: z.enum(['pdf', 'xml', 'csv', 'html']),
  })).optional(),
  recommendations: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

// 税率・控除額の定数（2024年基準）
const TAX_CONSTANTS_2024 = {
  // 所得税率（累進課税）
  INCOME_TAX_BRACKETS: [
    { min: 0, max: 1950000, rate: 0.05, deduction: 0 },
    { min: 1950000, max: 3300000, rate: 0.10, deduction: 97500 },
    { min: 3300000, max: 6950000, rate: 0.20, deduction: 427500 },
    { min: 6950000, max: 9000000, rate: 0.23, deduction: 636000 },
    { min: 9000000, max: 18000000, rate: 0.33, deduction: 1536000 },
    { min: 18000000, max: 40000000, rate: 0.40, deduction: 2796000 },
    { min: 40000000, max: Infinity, rate: 0.45, deduction: 4796000 },
  ],
  
  // 基礎控除等
  BASIC_DEDUCTION: 480000,              // 基礎控除
  SPOUSE_DEDUCTION: 380000,             // 配偶者控除
  DEPENDENT_DEDUCTION: 380000,          // 扶養控除
  BLUE_TAX_DEDUCTION_65: 650000,        // 青色申告特別控除65万
  BLUE_TAX_DEDUCTION_10: 100000,        // 青色申告特別控除10万
  SOCIAL_INSURANCE_DEDUCTION_RATE: 0.15, // 社会保険料控除率
  
  // 住民税
  RESIDENT_TAX_RATE: 0.10,              // 住民税率10%
  RESIDENT_TAX_UNIFORM: 5000,           // 均等割
  
  // 事業税
  BUSINESS_TAX_RATE: 0.05,              // 事業税率5%
  BUSINESS_TAX_EXEMPTION: 2900000,      // 事業税控除額
};

export const taxReturnAgent = createAgent({
  id: 'tax-return-agent',
  name: 'Tax Return Processing Agent',
  description: 'Handle Japanese tax return calculations and document generation',
  
  inputSchema: taxReturnInputSchema,
  outputSchema: taxReturnOutputSchema,
  
  tools: {
    // 年間データ収集
    collectAnnualData: {
      description: 'Collect annual financial data for tax return',
      execute: async ({ taxYear, companyId }) => {
        try {
          console.log(`[Tax Return] Collecting annual data for ${taxYear}...`);
          
          // 取引データの集計
          const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('company_id', companyId)
            .gte('transaction_date', `${taxYear}-01-01`)
            .lt('transaction_date', `${taxYear + 1}-01-01`);
          
          // 収入の集計
          const income = transactions
            ?.filter(t => t.type === 'income')
            .reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
          
          // 経費の集計（カテゴリ別）
          const expenses = transactions
            ?.filter(t => t.type === 'expense')
            .reduce((acc, t) => {
              const category = t.category || 'other';
              acc[category] = (acc[category] || 0) + (t.amount || 0);
              return acc;
            }, {} as Record<string, number>) || {};
          
          // 控除対象の経費を識別
          const deductibleExpenses = await identifyDeductibleExpenses(expenses);
          
          return {
            success: true,
            data: {
              income: {
                businessIncome: income,
                totalIncome: income,
              },
              expenses: expenses,
              deductibleExpenses: deductibleExpenses,
              transactionCount: transactions?.length || 0,
              period: {
                start: `${taxYear}-01-01`,
                end: `${taxYear}-12-31`,
              }
            }
          };
        } catch (error) {
          console.error('[Tax Return] Data collection failed:', error);
          return {
            success: false,
            errors: [`Data collection failed: ${error.message}`]
          };
        }
      },
    },
    
    // 所得税計算
    calculateIncomeTax: {
      description: 'Calculate income tax based on annual income and deductions',
      execute: async ({ incomeData, expenseData, taxpayerInfo, settings }) => {
        try {
          console.log('[Tax Return] Calculating income tax...');
          
          // 総所得の計算
          const totalIncome = (
            (incomeData?.businessIncome || 0) +
            (incomeData?.salaryIncome || 0) +
            (incomeData?.pensionIncome || 0) +
            (incomeData?.dividendIncome || 0) +
            (incomeData?.realEstateIncome || 0) +
            (incomeData?.capitalGains || 0) +
            (incomeData?.otherIncome || 0)
          );
          
          // 必要経費の計算
          const totalExpenses = Object.values(expenseData?.businessExpenses || {})
            .reduce((sum, amount) => sum + amount, 0);
          
          // 事業所得（総収入 - 必要経費）
          const businessIncome = Math.max(0, totalIncome - totalExpenses);
          
          // 各種控除の計算
          const deductions = calculateDeductions(taxpayerInfo, settings);
          
          // 課税所得（事業所得 - 各種控除）
          const taxableIncome = Math.max(0, businessIncome - deductions.total);
          
          // 所得税の計算
          const incomeTax = calculateProgressiveTax(taxableIncome);
          
          // 住民税の計算
          const residentTax = calculateResidentTax(taxableIncome);
          
          // 事業税の計算
          const businessTax = calculateBusinessTax(businessIncome);
          
          return {
            success: true,
            taxCalculation: {
              totalIncome: totalIncome,
              businessIncome: businessIncome,
              taxableIncome: taxableIncome,
              incomeTax: incomeTax,
              residentTax: residentTax,
              businessTax: businessTax,
              totalTax: incomeTax + residentTax + businessTax,
              deductions: deductions.breakdown,
              taxCredit: 0,
              refund: 0,
              additionalTax: incomeTax + residentTax + businessTax,
            }
          };
        } catch (error) {
          console.error('[Tax Return] Tax calculation failed:', error);
          return {
            success: false,
            errors: [`Tax calculation failed: ${error.message}`]
          };
        }
      },
    },
    
    // 控除項目識別
    identifyDeductions: {
      description: 'Identify applicable tax deductions',
      execute: async ({ taxpayerInfo, expenseData, settings }) => {
        try {
          console.log('[Tax Return] Identifying deductions...');
          
          const deductions = calculateDeductions(taxpayerInfo, settings);
          
          // 追加の控除項目を自動識別
          const additionalDeductions = await identifyAdditionalDeductions(
            expenseData,
            taxpayerInfo
          );
          
          return {
            success: true,
            data: {
              standardDeductions: deductions.breakdown,
              additionalDeductions: additionalDeductions,
              totalDeductions: deductions.total + 
                Object.values(additionalDeductions).reduce((sum, amount) => sum + amount, 0),
              recommendations: generateDeductionRecommendations(taxpayerInfo, expenseData)
            }
          };
        } catch (error) {
          console.error('[Tax Return] Deduction identification failed:', error);
          return {
            success: false,
            errors: [`Deduction identification failed: ${error.message}`]
          };
        }
      },
    },
    
    // 確定申告書生成
    generateTaxReturn: {
      description: 'Generate tax return forms',
      execute: async ({ taxYear, taxpayerInfo, taxCalculation, settings }) => {
        try {
          console.log('[Tax Return] Generating tax return forms...');
          
          const documents = [];
          
          // 青色申告決算書または収支内訳書
          if (settings?.blueTaxReturn) {
            const blueForm = await generateBlueFormDeclaration(
              taxYear,
              taxpayerInfo,
              taxCalculation
            );
            documents.push(blueForm);
          } else {
            const whiteForm = await generateIncomeStatementForm(
              taxYear,
              taxpayerInfo,
              taxCalculation
            );
            documents.push(whiteForm);
          }
          
          // 確定申告書B（第一表・第二表）
          const taxReturnFormB = await generateTaxReturnFormB(
            taxYear,
            taxpayerInfo,
            taxCalculation
          );
          documents.push(...taxReturnFormB);
          
          // 添付書類
          const supportingDocs = await generateSupportingDocuments(
            taxYear,
            taxpayerInfo,
            taxCalculation
          );
          documents.push(...supportingDocs);
          
          return {
            success: true,
            documents: documents,
            data: {
              formType: settings?.blueTaxReturn ? 'blue' : 'white',
              documentCount: documents.length,
              generated: new Date().toISOString(),
            }
          };
        } catch (error) {
          console.error('[Tax Return] Form generation failed:', error);
          return {
            success: false,
            errors: [`Form generation failed: ${error.message}`]
          };
        }
      },
    },
    
    // 税務最適化提案
    optimizeTax: {
      description: 'Provide tax optimization recommendations',
      execute: async ({ taxCalculation, taxpayerInfo, expenseData }) => {
        try {
          console.log('[Tax Return] Analyzing tax optimization opportunities...');
          
          const recommendations = [];
          
          // 青色申告への移行提案
          if (!taxpayerInfo.settings?.blueTaxReturn) {
            const blueReturnBenefit = TAX_CONSTANTS_2024.BLUE_TAX_DEDUCTION_65;
            const potentialSavings = blueReturnBenefit * 0.20; // 概算税率20%
            recommendations.push({
              type: 'blue_tax_return',
              title: '青色申告への移行',
              description: `青色申告特別控除65万円により、年間約${potentialSavings.toLocaleString()}円の節税効果が期待できます。`,
              impact: potentialSavings,
              effort: 'medium',
              deadline: '来年3月15日まで',
            });
          }
          
          // 控除漏れのチェック
          const missedDeductions = await checkMissedDeductions(taxpayerInfo, expenseData);
          recommendations.push(...missedDeductions);
          
          // 経費計上の最適化
          const expenseOptimization = await analyzeExpenseOptimization(expenseData);
          recommendations.push(...expenseOptimization);
          
          // 来年度の税務戦略
          const nextYearStrategy = await generateNextYearStrategy(taxCalculation);
          recommendations.push(...nextYearStrategy);
          
          return {
            success: true,
            data: {
              recommendations: recommendations,
              totalPotentialSavings: recommendations.reduce(
                (sum, rec) => sum + (rec.impact || 0), 0
              ),
              priorityActions: recommendations
                .filter(rec => rec.impact > 50000)
                .sort((a, b) => (b.impact || 0) - (a.impact || 0))
                .slice(0, 3),
            }
          };
        } catch (error) {
          console.error('[Tax Return] Tax optimization failed:', error);
          return {
            success: false,
            errors: [`Tax optimization failed: ${error.message}`]
          };
        }
      },
    },
  },
  
  execute: async ({ input, tools }) => {
    try {
      console.log(`[Tax Return Agent] Processing operation: ${input.operation}`);
      
      switch (input.operation) {
        case 'collect_annual_data':
          return await tools.collectAnnualData({
            taxYear: input.taxYear,
            companyId: input.taxpayerInfo.companyId,
          });
          
        case 'calculate_income_tax':
          return await tools.calculateIncomeTax({
            incomeData: input.incomeData,
            expenseData: input.expenseData,
            taxpayerInfo: input.taxpayerInfo,
            settings: input.settings,
          });
          
        case 'identify_deductions':
          return await tools.identifyDeductions({
            taxpayerInfo: input.taxpayerInfo,
            expenseData: input.expenseData,
            settings: input.settings,
          });
          
        case 'generate_tax_return':
          return await tools.generateTaxReturn({
            taxYear: input.taxYear,
            taxpayerInfo: input.taxpayerInfo,
            taxCalculation: input.taxCalculation,
            settings: input.settings,
          });
          
        case 'optimize_tax':
          return await tools.optimizeTax({
            taxCalculation: input.taxCalculation,
            taxpayerInfo: input.taxpayerInfo,
            expenseData: input.expenseData,
          });
          
        default:
          return {
            success: false,
            errors: [`Unknown operation: ${input.operation}`]
          };
      }
    } catch (error) {
      console.error('[Tax Return Agent] Execution failed:', error);
      return {
        success: false,
        operation: input.operation,
        errors: [error.message],
      };
    }
  },
});

// ヘルパー関数群

// 累進課税による所得税計算
function calculateProgressiveTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  
  for (const bracket of TAX_CONSTANTS_2024.INCOME_TAX_BRACKETS) {
    if (taxableIncome >= bracket.min && taxableIncome < bracket.max) {
      return Math.floor(taxableIncome * bracket.rate - bracket.deduction);
    }
  }
  
  // 最高税率
  const highest = TAX_CONSTANTS_2024.INCOME_TAX_BRACKETS[
    TAX_CONSTANTS_2024.INCOME_TAX_BRACKETS.length - 1
  ];
  return Math.floor(taxableIncome * highest.rate - highest.deduction);
}

// 住民税計算
function calculateResidentTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  
  // 所得割（10%）+ 均等割（5,000円）
  const incomeLevy = Math.floor(taxableIncome * TAX_CONSTANTS_2024.RESIDENT_TAX_RATE);
  return incomeLevy + TAX_CONSTANTS_2024.RESIDENT_TAX_UNIFORM;
}

// 事業税計算
function calculateBusinessTax(businessIncome: number): number {
  if (businessIncome <= TAX_CONSTANTS_2024.BUSINESS_TAX_EXEMPTION) return 0;
  
  const taxableAmount = businessIncome - TAX_CONSTANTS_2024.BUSINESS_TAX_EXEMPTION;
  return Math.floor(taxableAmount * TAX_CONSTANTS_2024.BUSINESS_TAX_RATE);
}

// 各種控除の計算
function calculateDeductions(taxpayerInfo: any, settings: any) {
  const deductions = {
    basic: TAX_CONSTANTS_2024.BASIC_DEDUCTION,
    spouse: 0,
    dependent: 0,
    socialInsurance: 0,
    blueTax: 0,
  };
  
  // 配偶者控除
  if (taxpayerInfo.spouseInfo?.hasSpouse) {
    deductions.spouse = taxpayerInfo.spouseInfo.spouseDeduction || 
                      TAX_CONSTANTS_2024.SPOUSE_DEDUCTION;
  }
  
  // 扶養控除
  if (taxpayerInfo.dependents) {
    deductions.dependent = taxpayerInfo.dependents.length * 
                          TAX_CONSTANTS_2024.DEPENDENT_DEDUCTION;
  }
  
  // 青色申告特別控除
  if (settings?.blueTaxReturn) {
    deductions.blueTax = settings.electronicFiling ? 
                        TAX_CONSTANTS_2024.BLUE_TAX_DEDUCTION_65 :
                        TAX_CONSTANTS_2024.BLUE_TAX_DEDUCTION_10;
  }
  
  const total = Object.values(deductions).reduce((sum, amount) => sum + amount, 0);
  
  return {
    breakdown: deductions,
    total: total,
  };
}

// 控除対象経費の識別
async function identifyDeductibleExpenses(expenses: Record<string, number>) {
  const deductibleCategories = [
    'office_supplies',     // 事務用品
    'travel_expense',      // 旅費交通費
    'communication',       // 通信費
    'utilities',          // 水道光熱費
    'rent',               // 地代家賃
    'depreciation',       // 減価償却費
    'advertising',        // 広告宣伝費
    'professional_services', // 外注費
    'insurance',          // 保険料
    'taxes_and_dues',     // 租税公課
    'entertainment',      // 接待交際費
    'training',           // 研修費
  ];
  
  const deductible = {};
  
  for (const [category, amount] of Object.entries(expenses)) {
    if (deductibleCategories.includes(category)) {
      deductible[category] = amount;
    }
  }
  
  return deductible;
}

// 追加控除項目の識別
async function identifyAdditionalDeductions(expenseData: any, taxpayerInfo: any) {
  const additional = {};
  
  // 小規模企業共済等掛金控除
  if (expenseData?.deductibleExpenses?.pension_contributions) {
    additional.small_business_pension = expenseData.deductibleExpenses.pension_contributions;
  }
  
  // 生命保険料控除
  if (expenseData?.deductibleExpenses?.life_insurance) {
    additional.life_insurance = Math.min(
      expenseData.deductibleExpenses.life_insurance,
      120000 // 上限12万円
    );
  }
  
  // 地震保険料控除
  if (expenseData?.deductibleExpenses?.earthquake_insurance) {
    additional.earthquake_insurance = Math.min(
      expenseData.deductibleExpenses.earthquake_insurance,
      50000 // 上限5万円
    );
  }
  
  return additional;
}

// 控除項目の推奨事項生成
function generateDeductionRecommendations(taxpayerInfo: any, expenseData: any) {
  const recommendations = [];
  
  // 青色申告の推奨
  if (!taxpayerInfo.settings?.blueTaxReturn) {
    recommendations.push(
      '青色申告への移行により65万円の特別控除が受けられます。'
    );
  }
  
  // 小規模企業共済の推奨
  if (!expenseData?.deductibleExpenses?.pension_contributions) {
    recommendations.push(
      '小規模企業共済への加入により全額所得控除が受けられます。'
    );
  }
  
  // 経費計上の推奨
  const homeOfficeRatio = 0.3; // 自宅兼事務所の場合の目安
  if (expenseData?.businessExpenses?.rent) {
    recommendations.push(
      `自宅兼事務所の場合、家賃の${homeOfficeRatio * 100}%程度が経費計上可能です。`
    );
  }
  
  return recommendations;
}

// 経費最適化の分析
async function analyzeExpenseOptimization(expenseData: any) {
  const optimizations = [];
  
  // 通信費の最適化
  if (expenseData?.businessExpenses?.communication > 100000) {
    optimizations.push({
      type: 'expense_optimization',
      title: '通信費の見直し',
      description: '通信費が高額です。プランの見直しやビジネス向けプランへの変更を検討してください。',
      impact: 20000,
      effort: 'low',
    });
  }
  
  // 接待交際費の上限チェック
  const entertainmentLimit = 8000000; // 800万円または売上の0.25%
  if (expenseData?.businessExpenses?.entertainment > entertainmentLimit) {
    optimizations.push({
      type: 'expense_limit',
      title: '接待交際費の上限注意',
      description: '接待交際費が上限を超える可能性があります。一部を会議費等に振り替えを検討してください。',
      impact: 50000,
      effort: 'medium',
    });
  }
  
  return optimizations;
}

// 来年度戦略の生成
async function generateNextYearStrategy(taxCalculation: any) {
  const strategies = [];
  
  // 所得分散の提案
  if (taxCalculation.taxableIncome > 10000000) {
    strategies.push({
      type: 'income_splitting',
      title: '所得分散の検討',
      description: '家族への所得分散により税率を下げることができる可能性があります。',
      impact: 200000,
      effort: 'high',
    });
  }
  
  // 設備投資による節税
  strategies.push({
    type: 'equipment_investment',
    title: '設備投資による即時償却',
    description: '中小企業経営強化税制を活用した設備投資により即時償却が可能です。',
    impact: 100000,
    effort: 'medium',
  });
  
  return strategies;
}

// 見逃し控除のチェック
async function checkMissedDeductions(taxpayerInfo: any, expenseData: any) {
  const missed = [];
  
  // セルフメディケーション税制
  if (expenseData?.personalExpenses?.medical > 12000) {
    missed.push({
      type: 'medical_deduction',
      title: 'セルフメディケーション税制',
      description: '医療費控除またはセルフメディケーション税制の適用が可能です。',
      impact: 15000,
      effort: 'low',
    });
  }
  
  // ふるさと納税
  const furusatoLimit = Math.min(taxpayerInfo.taxCalculation?.taxableIncome * 0.02, 200000);
  missed.push({
    type: 'furusato_nozei',
    title: 'ふるさと納税の活用',
    description: `年間${furusatoLimit.toLocaleString()}円まで実質負担2,000円でふるさと納税が可能です。`,
    impact: furusatoLimit - 2000,
    effort: 'low',
  });
  
  return missed;
}

// 青色申告決算書の生成
async function generateBlueFormDeclaration(taxYear: number, taxpayerInfo: any, taxCalculation: any) {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>青色申告決算書（一般用）</title>
    <style>
        body { font-family: 'MS Gothic', monospace; font-size: 12px; margin: 20px; }
        .form-title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 20px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .section { border: 1px solid #000; padding: 10px; margin-bottom: 10px; }
        .field { display: flex; justify-content: space-between; margin: 5px 0; }
        .amount { text-align: right; min-width: 100px; border-bottom: 1px solid #000; }
        table { width: 100%; border-collapse: collapse; }
        td, th { border: 1px solid #000; padding: 3px; text-align: center; }
        .left { text-align: left; }
        .right { text-align: right; }
    </style>
</head>
<body>
    <div class="form-title">
        令和${taxYear - 2018}年分　青色申告決算書（一般用）<br>
        収支内訳書・青色申告決算書（一般用）
    </div>
    
    <div class="section">
        <h3>事業者情報</h3>
        <div class="field">氏名：${taxpayerInfo.name}</div>
        <div class="field">住所：${taxpayerInfo.address || ''}</div>
        <div class="field">事業種目：${taxpayerInfo.businessType === 'sole_proprietor' ? '個人事業' : '事業'}</div>
    </div>
    
    <div class="form-grid">
        <div class="section">
            <h3>収入金額</h3>
            <div class="field">
                売上（収入）金額
                <span class="amount">${(taxCalculation.totalIncome || 0).toLocaleString()}</span>
            </div>
        </div>
        
        <div class="section">
            <h3>必要経費</h3>
            <div class="field">
                給料賃金
                <span class="amount">0</span>
            </div>
            <div class="field">
                外注工賃
                <span class="amount">0</span>
            </div>
            <div class="field">
                減価償却費
                <span class="amount">0</span>
            </div>
            <div class="field">
                地代家賃
                <span class="amount">0</span>
            </div>
            <div class="field">
                利子割引料
                <span class="amount">0</span>
            </div>
            <div class="field">
                租税公課
                <span class="amount">0</span>
            </div>
            <div class="field">
                荷造運賃
                <span class="amount">0</span>
            </div>
            <div class="field">
                水道光熱費
                <span class="amount">0</span>
            </div>
            <div class="field">
                旅費交通費
                <span class="amount">0</span>
            </div>
            <div class="field">
                通信費
                <span class="amount">0</span>
            </div>
            <div class="field">
                その他の経費
                <span class="amount">0</span>
            </div>
            <div class="field" style="border-top: 2px solid #000; font-weight: bold;">
                経費合計
                <span class="amount">${((taxCalculation.totalIncome || 0) - (taxCalculation.businessIncome || 0)).toLocaleString()}</span>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h3>所得金額の計算</h3>
        <div class="field">
            差引金額（収入金額－必要経費）
            <span class="amount">${(taxCalculation.businessIncome || 0).toLocaleString()}</span>
        </div>
        <div class="field">
            青色申告特別控除額
            <span class="amount">${(taxCalculation.deductions?.blueTax || 0).toLocaleString()}</span>
        </div>
        <div class="field" style="border-top: 2px solid #000; font-weight: bold;">
            所得金額
            <span class="amount">${(taxCalculation.taxableIncome || 0).toLocaleString()}</span>
        </div>
    </div>
    
    <div class="section">
        <p style="font-size: 10px;">
            ※この決算書は自動生成されたものです。正式な提出前に税理士等の専門家にご相談ください。<br>
            ※実際の提出には、貸借対照表や現金出納帳等の帳簿類の添付が必要です。
        </p>
    </div>
</body>
</html>`;

  return {
    type: 'blue_tax_return',
    filename: `青色申告決算書_${taxYear}年.html`,
    content: html,
    format: 'html' as const,
  };
}

// 収支内訳書の生成
async function generateIncomeStatementForm(taxYear: number, taxpayerInfo: any, taxCalculation: any) {
  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>収支内訳書</title>
    <style>
        body { font-family: 'MS Gothic', monospace; font-size: 12px; margin: 20px; }
        .form-title { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 20px; }
        .section { border: 1px solid #000; padding: 10px; margin-bottom: 10px; }
        .field { display: flex; justify-content: space-between; margin: 5px 0; }
        .amount { text-align: right; min-width: 100px; border-bottom: 1px solid #000; }
    </style>
</head>
<body>
    <div class="form-title">
        令和${taxYear - 2018}年分　収支内訳書（一般用）
    </div>
    
    <div class="section">
        <h3>事業者情報</h3>
        <div class="field">氏名：${taxpayerInfo.name}</div>
        <div class="field">住所：${taxpayerInfo.address || ''}</div>
    </div>
    
    <div class="section">
        <h3>収支計算</h3>
        <div class="field">
            収入金額
            <span class="amount">${(taxCalculation.totalIncome || 0).toLocaleString()}</span>
        </div>
        <div class="field">
            必要経費
            <span class="amount">${((taxCalculation.totalIncome || 0) - (taxCalculation.businessIncome || 0)).toLocaleString()}</span>
        </div>
        <div class="field" style="border-top: 2px solid #000; font-weight: bold;">
            所得金額
            <span class="amount">${(taxCalculation.businessIncome || 0).toLocaleString()}</span>
        </div>
    </div>
</body>
</html>`;

  return {
    type: 'income_statement',
    filename: `収支内訳書_${taxYear}年.html`,
    content: html,
    format: 'html' as const,
  };
}

// 確定申告書Bの生成
async function generateTaxReturnFormB(taxYear: number, taxpayerInfo: any, taxCalculation: any) {
  const formB1 = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>確定申告書B（第一表）</title>
    <style>
        body { font-family: 'MS Gothic', monospace; font-size: 11px; margin: 10px; }
        .form-title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; }
        .section { border: 1px solid #000; padding: 8px; margin-bottom: 8px; }
        .field { display: flex; justify-content: space-between; margin: 3px 0; }
        .amount { text-align: right; min-width: 80px; border-bottom: 1px solid #000; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    </style>
</head>
<body>
    <div class="form-title">
        令和${taxYear - 2018}年分　所得税及び復興特別所得税の確定申告書B【第一表】
    </div>
    
    <div class="section">
        <h4>納税者情報</h4>
        <div class="field">氏名：${taxpayerInfo.name}</div>
        <div class="field">住所：${taxpayerInfo.address || ''}</div>
        ${taxpayerInfo.myNumber ? `<div class="field">個人番号：${taxpayerInfo.myNumber}</div>` : ''}
    </div>
    
    <div class="grid">
        <div class="section">
            <h4>収入金額等</h4>
            <div class="field">
                営業等
                <span class="amount">${(taxCalculation.totalIncome || 0).toLocaleString()}</span>
            </div>
            <div class="field">
                給与
                <span class="amount">0</span>
            </div>
            <div class="field">
                年金
                <span class="amount">0</span>
            </div>
        </div>
        
        <div class="section">
            <h4>所得金額</h4>
            <div class="field">
                営業等
                <span class="amount">${(taxCalculation.businessIncome || 0).toLocaleString()}</span>
            </div>
            <div class="field">
                給与
                <span class="amount">0</span>
            </div>
            <div class="field" style="border-top: 2px solid #000; font-weight: bold;">
                合計
                <span class="amount">${(taxCalculation.businessIncome || 0).toLocaleString()}</span>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h4>所得控除</h4>
        <div class="field">
            基礎控除
            <span class="amount">${(taxCalculation.deductions?.basic || 0).toLocaleString()}</span>
        </div>
        <div class="field">
            配偶者控除
            <span class="amount">${(taxCalculation.deductions?.spouse || 0).toLocaleString()}</span>
        </div>
        <div class="field">
            扶養控除
            <span class="amount">${(taxCalculation.deductions?.dependent || 0).toLocaleString()}</span>
        </div>
        <div class="field" style="border-top: 2px solid #000; font-weight: bold;">
            所得控除計
            <span class="amount">${Object.values(taxCalculation.deductions || {}).reduce((sum, val) => sum + val, 0).toLocaleString()}</span>
        </div>
    </div>
    
    <div class="section">
        <h4>税金の計算</h4>
        <div class="field">
            課税される所得金額
            <span class="amount">${(taxCalculation.taxableIncome || 0).toLocaleString()}</span>
        </div>
        <div class="field">
            所得税額
            <span class="amount">${(taxCalculation.incomeTax || 0).toLocaleString()}</span>
        </div>
        <div class="field">
            復興特別所得税額
            <span class="amount">${Math.floor((taxCalculation.incomeTax || 0) * 0.021).toLocaleString()}</span>
        </div>
        <div class="field" style="border-top: 2px solid #000; font-weight: bold;">
            申告納税額
            <span class="amount">${Math.floor((taxCalculation.incomeTax || 0) * 1.021).toLocaleString()}</span>
        </div>
    </div>
</body>
</html>`;

  const formB2 = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>確定申告書B（第二表）</title>
    <style>
        body { font-family: 'MS Gothic', monospace; font-size: 11px; margin: 10px; }
        .form-title { text-align: center; font-size: 14px; font-weight: bold; margin-bottom: 15px; }
        .section { border: 1px solid #000; padding: 8px; margin-bottom: 8px; }
        .field { display: flex; justify-content: space-between; margin: 3px 0; }
        .amount { text-align: right; min-width: 80px; border-bottom: 1px solid #000; }
    </style>
</head>
<body>
    <div class="form-title">
        令和${taxYear - 2018}年分　所得税及び復興特別所得税の確定申告書B【第二表】
    </div>
    
    <div class="section">
        <h4>所得の内訳</h4>
        <table style="width: 100%; border-collapse: collapse;">
            <tr style="border-bottom: 1px solid #000;">
                <th>所得の種類</th>
                <th>支払者の名称</th>
                <th>収入金額</th>
                <th>源泉徴収税額</th>
            </tr>
            <tr>
                <td>営業等所得</td>
                <td>-</td>
                <td style="text-align: right;">${(taxCalculation.totalIncome || 0).toLocaleString()}</td>
                <td style="text-align: right;">0</td>
            </tr>
        </table>
    </div>
    
    <div class="section">
        <h4>所得控除の内訳</h4>
        <div class="field">基礎控除：${(taxCalculation.deductions?.basic || 0).toLocaleString()}円</div>
        ${taxpayerInfo.spouseInfo?.hasSpouse ? 
          `<div class="field">配偶者控除：${(taxCalculation.deductions?.spouse || 0).toLocaleString()}円</div>` : ''}
        ${taxpayerInfo.dependents?.length ? 
          `<div class="field">扶養控除：${(taxCalculation.deductions?.dependent || 0).toLocaleString()}円</div>` : ''}
    </div>
</body>
</html>`;

  return [
    {
      type: 'tax_return_form_b1',
      filename: `確定申告書B第一表_${taxYear}年.html`,
      content: formB1,
      format: 'html' as const,
    },
    {
      type: 'tax_return_form_b2', 
      filename: `確定申告書B第二表_${taxYear}年.html`,
      content: formB2,
      format: 'html' as const,
    }
  ];
}

// 添付書類の生成
async function generateSupportingDocuments(taxYear: number, taxpayerInfo: any, taxCalculation: any) {
  const docs = [];
  
  // 申告書チェックリスト
  const checklistHtml = `
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>確定申告チェックリスト</title>
    <style>
        body { font-family: 'MS Gothic', sans-serif; margin: 20px; }
        .checklist { list-style-type: none; }
        .checklist li { margin: 10px 0; padding: 5px; border-left: 3px solid #007acc; }
        .required { background-color: #ffe6e6; }
        .optional { background-color: #e6f3ff; }
        .completed { background-color: #e6ffe6; }
    </style>
</head>
<body>
    <h1>${taxYear}年分 確定申告チェックリスト</h1>
    
    <h2>必要書類（必須）</h2>
    <ul class="checklist">
        <li class="required">□ 確定申告書B（第一表・第二表）</li>
        <li class="required">□ ${taxpayerInfo.settings?.blueTaxReturn ? '青色申告決算書' : '収支内訳書'}</li>
        <li class="required">□ 各種控除証明書</li>
        <li class="required">□ 源泉徴収票（該当する場合）</li>
        <li class="required">□ 本人確認書類（マイナンバーカード等）</li>
    </ul>
    
    <h2>推奨書類（任意）</h2>
    <ul class="checklist">
        <li class="optional">□ 医療費控除の明細書</li>
        <li class="optional">□ ふるさと納税の寄附金受領証明書</li>
        <li class="optional">□ 生命保険料控除証明書</li>
        <li class="optional">□ 地震保険料控除証明書</li>
    </ul>
    
    <h2>提出前の確認事項</h2>
    <ul class="checklist">
        <li class="required">□ 計算に誤りがないか</li>
        <li class="required">□ 必要書類がすべて揃っているか</li>
        <li class="required">□ 押印がされているか</li>
        <li class="required">□ 提出期限（3月15日）を確認</li>
    </ul>
    
    <p style="margin-top: 30px; font-size: 12px; color: #666;">
        ※このチェックリストは一般的な項目を記載しています。<br>
        ※詳細については税務署または税理士にご相談ください。
    </p>
</body>
</html>`;

  docs.push({
    type: 'checklist',
    filename: `確定申告チェックリスト_${taxYear}年.html`,
    content: checklistHtml,
    format: 'html' as const,
  });
  
  return docs;
}

export default taxReturnAgent;