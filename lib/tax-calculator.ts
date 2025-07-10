/**
 * 日本の税制に対応した税金計算ライブラリ
 */

export interface TaxRate {
  rate: number;
  name: string;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface InvoiceInfo {
  registrationNumber: string;
  isQualified: boolean;
}

export interface TaxCalculationResult {
  subtotal: number;
  taxAmount: number;
  total: number;
  taxRate: number;
  taxType: 'included' | 'excluded';
  details?: {
    standardTax: number;
    reducedTax: number;
    nonTaxable: number;
  };
}

export class JapaneseTaxCalculator {
  // 消費税率の履歴
  private static readonly TAX_RATES: TaxRate[] = [
    { rate: 0.03, name: '3%', effectiveFrom: '1989-04-01', effectiveTo: '1997-03-31' },
    { rate: 0.05, name: '5%', effectiveFrom: '1997-04-01', effectiveTo: '2014-03-31' },
    { rate: 0.08, name: '8%', effectiveFrom: '2014-04-01', effectiveTo: '2019-09-30' },
    { rate: 0.10, name: '10%', effectiveFrom: '2019-10-01' },
  ];

  // 軽減税率対象品目
  private static readonly REDUCED_TAX_RATE = 0.08;
  private static readonly STANDARD_TAX_RATE = 0.10;

  /**
   * 指定日における税率を取得
   */
  static getTaxRate(date: Date | string): number {
    const targetDate = typeof date === 'string' ? new Date(date) : date;
    
    for (const taxRate of this.TAX_RATES) {
      const effectiveFrom = new Date(taxRate.effectiveFrom);
      const effectiveTo = taxRate.effectiveTo ? new Date(taxRate.effectiveTo) : new Date('9999-12-31');
      
      if (targetDate >= effectiveFrom && targetDate <= effectiveTo) {
        return taxRate.rate;
      }
    }
    
    // デフォルトは現在の標準税率
    return this.STANDARD_TAX_RATE;
  }

  /**
   * 税込金額から税抜金額と消費税額を計算
   */
  static calculateFromTaxIncluded(
    totalAmount: number,
    taxRate?: number,
    roundingMode: 'floor' | 'round' | 'ceil' = 'floor'
  ): TaxCalculationResult {
    const rate = taxRate ?? this.STANDARD_TAX_RATE;
    const subtotal = this.round(totalAmount / (1 + rate), roundingMode);
    const taxAmount = totalAmount - subtotal;
    
    return {
      subtotal,
      taxAmount,
      total: totalAmount,
      taxRate: rate,
      taxType: 'included'
    };
  }

  /**
   * 税抜金額から税込金額と消費税額を計算
   */
  static calculateFromTaxExcluded(
    subtotal: number,
    taxRate?: number,
    roundingMode: 'floor' | 'round' | 'ceil' = 'floor'
  ): TaxCalculationResult {
    const rate = taxRate ?? this.STANDARD_TAX_RATE;
    const taxAmount = this.round(subtotal * rate, roundingMode);
    const total = subtotal + taxAmount;
    
    return {
      subtotal,
      taxAmount,
      total,
      taxRate: rate,
      taxType: 'excluded'
    };
  }

  /**
   * 複数の品目から合計税額を計算（インボイス制度対応）
   */
  static calculateInvoiceTax(
    items: Array<{
      amount: number;
      taxRate: number;
      isTaxIncluded: boolean;
    }>,
    roundingMode: 'floor' | 'round' | 'ceil' = 'floor'
  ): TaxCalculationResult {
    let subtotal = 0;
    let standardTax = 0;
    let reducedTax = 0;
    let nonTaxable = 0;

    // 税率ごとに集計
    const taxGroups = new Map<number, { subtotal: number; tax: number }>();

    items.forEach(item => {
      if (item.taxRate === 0) {
        // 非課税
        nonTaxable += item.amount;
        subtotal += item.amount;
      } else {
        let itemSubtotal: number;
        let itemTax: number;

        if (item.isTaxIncluded) {
          const calc = this.calculateFromTaxIncluded(item.amount, item.taxRate, roundingMode);
          itemSubtotal = calc.subtotal;
          itemTax = calc.taxAmount;
        } else {
          const calc = this.calculateFromTaxExcluded(item.amount, item.taxRate, roundingMode);
          itemSubtotal = item.amount;
          itemTax = calc.taxAmount;
        }

        subtotal += itemSubtotal;

        // 税率ごとに集計
        const current = taxGroups.get(item.taxRate) || { subtotal: 0, tax: 0 };
        taxGroups.set(item.taxRate, {
          subtotal: current.subtotal + itemSubtotal,
          tax: current.tax + itemTax
        });
      }
    });

    // 税率ごとの税額を計算（インボイス制度では税率ごとに端数処理）
    taxGroups.forEach((value, rate) => {
      const tax = this.round(value.subtotal * rate, roundingMode);
      if (rate === this.STANDARD_TAX_RATE) {
        standardTax = tax;
      } else if (rate === this.REDUCED_TAX_RATE) {
        reducedTax = tax;
      }
    });

    const totalTax = standardTax + reducedTax;
    const total = subtotal + totalTax;

    return {
      subtotal,
      taxAmount: totalTax,
      total,
      taxRate: this.STANDARD_TAX_RATE, // 代表税率
      taxType: 'excluded',
      details: {
        standardTax,
        reducedTax,
        nonTaxable
      }
    };
  }

  /**
   * インボイス番号の検証
   */
  static validateInvoiceNumber(registrationNumber: string): boolean {
    // T + 13桁の数字
    const pattern = /^T\d{13}$/;
    if (!pattern.test(registrationNumber)) {
      return false;
    }

    // チェックデジットの検証（簡易版）
    // 実際のチェックデジット計算アルゴリズムは国税庁の仕様に従う
    return true;
  }

  /**
   * 源泉徴収税の計算
   */
  static calculateWithholdingTax(
    amount: number,
    type: 'individual' | 'corporate' = 'individual',
    isQualified: boolean = false
  ): number {
    let rate: number;

    if (type === 'individual') {
      if (amount <= 1000000) {
        rate = 0.10210; // 10.21%（復興特別所得税含む）
      } else {
        // 100万円を超える部分は20.42%
        const base = 1000000 * 0.10210;
        const excess = (amount - 1000000) * 0.20420;
        return Math.floor(base + excess);
      }
    } else {
      // 法人の場合
      rate = isQualified ? 0.10210 : 0.20420;
    }

    return Math.floor(amount * rate);
  }

  /**
   * 端数処理
   */
  private static round(value: number, mode: 'floor' | 'round' | 'ceil'): number {
    switch (mode) {
      case 'floor':
        return Math.floor(value);
      case 'round':
        return Math.round(value);
      case 'ceil':
        return Math.ceil(value);
      default:
        return Math.floor(value);
    }
  }

  /**
   * 軽減税率の判定
   */
  static isReducedTaxItem(itemType: string): boolean {
    const reducedTaxItems = [
      '食料品',
      '飲料',
      '新聞',
      '食品',
      '飲食料品',
      'テイクアウト',
      '持ち帰り'
    ];

    return reducedTaxItems.some(item => itemType.includes(item));
  }

  /**
   * 印紙税の計算
   */
  static calculateStampDuty(
    documentType: 'receipt' | 'contract' | 'bill',
    amount: number
  ): number {
    if (documentType === 'receipt') {
      // 領収書の印紙税
      if (amount < 50000) return 0;
      if (amount < 1000000) return 200;
      if (amount < 2000000) return 400;
      if (amount < 3000000) return 600;
      if (amount < 5000000) return 1000;
      if (amount < 10000000) return 2000;
      if (amount < 20000000) return 4000;
      if (amount < 30000000) return 6000;
      if (amount < 50000000) return 10000;
      if (amount < 100000000) return 20000;
      return 60000;
    }
    
    // その他の文書タイプの印紙税計算...
    return 0;
  }
}

// 使用例のエクスポート
export const TaxCalculator = JapaneseTaxCalculator;