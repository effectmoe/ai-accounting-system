import { getDatabase } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';

/**
 * 消費税を計算（軽減税率対応）
 */
export const calculateConsumptionTaxTool = {
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
  handler: async (params: any) => {
    logger.info('Calculating consumption tax:', params);
    
    let taxableAmount = params.amount;
    let taxAmount = 0;
    let totalAmount = 0;
    
    // 税込価格から税抜価格を計算
    if (params.is_tax_included) {
      taxableAmount = params.amount / (1 + params.tax_rate);
      taxAmount = params.amount - taxableAmount;
      totalAmount = params.amount;
    } else {
      // 税抜価格から税額を計算
      taxAmount = taxableAmount * params.tax_rate;
      totalAmount = taxableAmount + taxAmount;
    }
    
    // 端数処理（切り捨て）
    taxAmount = Math.floor(taxAmount);
    
    // 品目タイプに応じた情報
    let itemInfo = '';
    switch (params.item_type) {
      case 'food':
        itemInfo = '食品（軽減税率8%適用）';
        break;
      case 'newspaper':
        itemInfo = '新聞（週2回以上発行、定期購読契約、軽減税率8%適用）';
        break;
      case 'standard':
        itemInfo = '標準税率10%適用';
        break;
      case 'mixed':
        itemInfo = '軽減税率と標準税率の混在';
        break;
    }
    
    return {
      success: true,
      calculation: {
        original_amount: params.amount,
        is_tax_included: params.is_tax_included,
        taxable_amount: Math.floor(taxableAmount),
        tax_rate: params.tax_rate,
        tax_rate_percentage: `${params.tax_rate * 100}%`,
        tax_amount: taxAmount,
        total_amount: Math.floor(totalAmount),
        item_type: params.item_type,
        item_info: itemInfo,
        calculation_method: params.calculation_method || 'item_by_item',
      },
      invoice_requirement: params.tax_rate === 0.08 || params.item_type === 'mixed' 
        ? '適格請求書の記載が必要です（軽減税率対象品目のため）' 
        : '標準税率のみの場合も適格請求書の発行が推奨されます',
    };
  }
};

/**
 * 源泉徴収税を計算
 */
export const calculateWithholdingTaxTool = {
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
  handler: async (params: any) => {
    logger.info('Calculating withholding tax:', params);
    
    let withholdingAmount = 0;
    let taxRate = 0;
    let calculationMethod = '';
    
    const db = await getDatabase();
    const collection = db.collection('withholding_tax_calculations');
    
    switch (params.payment_type) {
      case 'salary':
        // 給与所得の源泉徴収税額表に基づく計算（簡易版）
        const monthlyAmount = params.gross_amount;
        const socialInsurance = params.employee_info?.insurance_deduction || monthlyAmount * 0.15;
        const taxableAmount = monthlyAmount - socialInsurance;
        const dependents = params.employee_info?.dependents || 0;
        
        // 簡易的な税額計算（実際は源泉徴収税額表を参照）
        if (taxableAmount <= 88000) {
          taxRate = 0;
        } else if (taxableAmount <= 89000) {
          withholdingAmount = 130;
        } else if (taxableAmount <= 90000) {
          withholdingAmount = 180;
        } else if (taxableAmount <= 93000) {
          withholdingAmount = 290;
        } else if (taxableAmount <= 94000) {
          withholdingAmount = 340;
        } else {
          // 概算計算
          taxRate = 0.05;
          withholdingAmount = taxableAmount * taxRate;
        }
        
        // 扶養控除の適用
        withholdingAmount = Math.max(0, withholdingAmount - (dependents * 3000));
        calculationMethod = '給与所得の源泉徴収税額表（月額表）';
        break;
        
      case 'bonus':
        // 賞与の源泉徴収税額計算
        const previousMonthSalary = params.employee_info?.previous_month_salary || 300000;
        const bonusTaxRate = getBonusTaxRate(previousMonthSalary);
        withholdingAmount = params.gross_amount * bonusTaxRate;
        taxRate = bonusTaxRate;
        calculationMethod = '賞与に対する源泉徴収税額の算出率表';
        break;
        
      case 'professional_fee':
        // 報酬・料金等の源泉徴収
        if (params.gross_amount <= 1000000) {
          taxRate = 0.1021; // 10.21%（復興特別所得税含む）
        } else {
          taxRate = 0.2042; // 20.42%（復興特別所得税含む）
          withholdingAmount = (params.gross_amount - 1000000) * 0.2042 + 102100;
        }
        
        if (params.gross_amount <= 1000000) {
          withholdingAmount = params.gross_amount * taxRate;
        }
        calculationMethod = '報酬・料金等の源泉徴収';
        break;
        
      case 'dividend':
        // 配当金の源泉徴収
        taxRate = params.employee_info?.is_resident ? 0.20315 : 0.20315; // 20.315%
        withholdingAmount = params.gross_amount * taxRate;
        calculationMethod = '配当所得の源泉徴収';
        break;
        
      default:
        taxRate = 0.20315; // デフォルト税率
        withholdingAmount = params.gross_amount * taxRate;
        calculationMethod = '標準税率による計算';
    }
    
    // 計算結果を保存
    const calculation = {
      payment_type: params.payment_type,
      gross_amount: params.gross_amount,
      withholding_amount: Math.floor(withholdingAmount),
      net_amount: params.gross_amount - Math.floor(withholdingAmount),
      tax_rate: taxRate,
      calculation_method: calculationMethod,
      payment_date: params.payment_date || new Date(),
      employee_info: params.employee_info,
      created_at: new Date(),
    };
    
    await collection.insertOne(calculation);
    
    return {
      success: true,
      withholding_tax: {
        gross_amount: params.gross_amount,
        withholding_amount: Math.floor(withholdingAmount),
        net_amount: params.gross_amount - Math.floor(withholdingAmount),
        effective_tax_rate: `${(taxRate * 100).toFixed(3)}%`,
        calculation_method: calculationMethod,
      },
      payment_slip: {
        payment_date: params.payment_date || new Date().toISOString().split('T')[0],
        payment_type: params.payment_type,
        deadline: '翌月10日までに納付',
      },
      notes: [
        '復興特別所得税（2.1%）を含む税率で計算しています',
        '実際の計算は最新の源泉徴収税額表をご確認ください',
      ],
    };
  }
};

/**
 * 節税戦略を提案
 */
export const optimizeTaxStrategyTool = {
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
  handler: async (params: any) => {
    logger.info('Optimizing tax strategy:', params);
    
    const strategies: any[] = [];
    const isSmallCompany = params.company_profile.capital <= 100000000; // 1億円以下
    
    // 中小企業向けの節税策
    if (isSmallCompany) {
      strategies.push({
        strategy: '中小企業投資促進税制',
        description: '機械装置等の取得に対する特別償却または税額控除',
        potential_benefit: '取得価額の30%特別償却または7%税額控除',
        requirements: ['資本金1億円以下', '青色申告法人', '対象設備の新規取得'],
        applicable: true,
      });
      
      strategies.push({
        strategy: '中小企業経営強化税制',
        description: '経営力向上計画に基づく設備投資の即時償却',
        potential_benefit: '取得価額の100%即時償却または10%税額控除',
        requirements: ['経営力向上計画の認定', '対象設備の取得'],
        applicable: true,
      });
    }
    
    // 一般的な節税策
    strategies.push({
      strategy: '役員報酬の最適化',
      description: '定期同額給与による損金算入と所得分散',
      potential_benefit: '法人税と所得税の税率差を活用した節税',
      implementation: [
        '事前確定届出給与の活用',
        '退職金規程の整備',
        '社会保険料の最適化',
      ],
    });
    
    strategies.push({
      strategy: '減価償却の最適化',
      description: '定率法採用や特別償却の活用',
      potential_benefit: '初年度の経費計上額増加による節税',
      implementation: [
        '定率法への変更届出',
        '少額減価償却資産の特例活用（30万円未満）',
        '一括償却資産の活用（20万円未満）',
      ],
    });
    
    // 業種別の節税策
    if (params.company_profile.industry === 'IT' || params.company_profile.industry === 'ソフトウェア') {
      strategies.push({
        strategy: '研究開発税制',
        description: '試験研究費の税額控除',
        potential_benefit: '試験研究費の8-14%を税額控除',
        requirements: ['試験研究費の適正な区分経理', '青色申告法人'],
      });
    }
    
    // タイミング戦略
    if (params.target_areas?.includes('timing')) {
      strategies.push({
        strategy: '決算期変更',
        description: '利益の繰り延べによる節税',
        potential_benefit: '高収益期の課税所得を分散',
        considerations: ['株主総会の承認が必要', '税務署への届出'],
      });
    }
    
    const totalPotentialSaving = Math.floor(params.company_profile.annual_revenue * 0.02); // 売上の2%程度
    
    return {
      success: true,
      company_profile: params.company_profile,
      tax_optimization_strategies: strategies,
      estimated_annual_tax_saving: totalPotentialSaving,
      implementation_priority: [
        '1. 中小企業税制の活用（該当する場合）',
        '2. 役員報酬の見直し',
        '3. 減価償却方法の最適化',
        '4. 各種税額控除の活用',
      ],
      next_steps: [
        '税理士との詳細な相談',
        '各制度の要件確認',
        '必要書類の準備',
        '実施スケジュールの策定',
      ],
      warnings: [
        '税制は頻繁に改正されるため、最新情報の確認が必要です',
        '過度な節税は税務調査のリスクを高める可能性があります',
        '専門家のアドバイスを受けることを推奨します',
      ],
    };
  }
};

// ヘルパー関数
function getBonusTaxRate(previousMonthSalary: number): number {
  // 簡易的な賞与税率表（実際はもっと細かい）
  if (previousMonthSalary <= 68000) return 0;
  if (previousMonthSalary <= 79000) return 0.02042;
  if (previousMonthSalary <= 252000) return 0.04084;
  if (previousMonthSalary <= 300000) return 0.06126;
  if (previousMonthSalary <= 334000) return 0.08168;
  if (previousMonthSalary <= 363000) return 0.10210;
  if (previousMonthSalary <= 395000) return 0.12252;
  if (previousMonthSalary <= 426000) return 0.14294;
  if (previousMonthSalary <= 550000) return 0.16336;
  return 0.18378;
}

// すべてのツールをエクスポート
export const japanTaxTools = [
  calculateConsumptionTaxTool,
  calculateWithholdingTaxTool,
  optimizeTaxStrategyTool,
];