"use strict";
/**
 * 税務関連のユーティリティ関数
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccountingPeriod = getAccountingPeriod;
exports.calculateMonthlyTaxSummary = calculateMonthlyTaxSummary;
exports.calculateSimplifiedTax = calculateSimplifiedTax;
exports.estimateCorporateTax = estimateCorporateTax;
exports.isTaxableEntity = isTaxableEntity;
exports.validateInvoiceRequirements = validateInvoiceRequirements;
const tax_calculator_1 = require("./tax-calculator");
/**
 * 会計期間を取得
 */
function getAccountingPeriod(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth();
    // 3月決算の場合（日本の一般的な会計年度）
    if (month >= 3) {
        return {
            startDate: `${year}-04-01`,
            endDate: `${year + 1}-03-31`,
            fiscalYear: year
        };
    }
    else {
        return {
            startDate: `${year - 1}-04-01`,
            endDate: `${year}-03-31`,
            fiscalYear: year - 1
        };
    }
}
/**
 * 月次の消費税集計
 */
function calculateMonthlyTaxSummary(transactions, targetMonth // YYYY-MM形式
) {
    const [year, month] = targetMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const period = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        fiscalYear: getAccountingPeriod(startDate).fiscalYear
    };
    const summary = {
        period,
        sales: { taxable: 0, nonTaxable: 0, export: 0, total: 0 },
        purchases: { taxable: 0, nonTaxable: 0, nonDeductible: 0, total: 0 },
        taxPayable: 0,
        taxRefundable: 0
    };
    let salesTax = 0;
    let purchaseTax = 0;
    transactions.forEach(tx => {
        const txDate = new Date(tx.date);
        if (txDate < startDate || txDate > endDate)
            return;
        let amount;
        let tax;
        if (tx.isTaxIncluded) {
            const calc = tax_calculator_1.TaxCalculator.calculateFromTaxIncluded(tx.amount, tx.taxRate);
            amount = calc.subtotal;
            tax = calc.taxAmount;
        }
        else {
            const calc = tax_calculator_1.TaxCalculator.calculateFromTaxExcluded(tx.amount, tx.taxRate);
            amount = tx.amount;
            tax = calc.taxAmount;
        }
        if (tx.type === 'sale') {
            if (tx.isExport) {
                summary.sales.export += amount;
            }
            else if (tx.taxRate > 0) {
                summary.sales.taxable += amount;
                salesTax += tax;
            }
            else {
                summary.sales.nonTaxable += amount;
            }
            summary.sales.total += amount;
        }
        else {
            if (tx.isNonDeductible) {
                summary.purchases.nonDeductible += amount;
            }
            else if (tx.taxRate > 0) {
                summary.purchases.taxable += amount;
                purchaseTax += tax;
            }
            else {
                summary.purchases.nonTaxable += amount;
            }
            summary.purchases.total += amount;
        }
    });
    // 納付税額または還付税額の計算
    const netTax = salesTax - purchaseTax;
    if (netTax > 0) {
        summary.taxPayable = Math.floor(netTax);
    }
    else {
        summary.taxRefundable = Math.floor(-netTax);
    }
    return summary;
}
/**
 * 簡易課税制度の計算
 */
function calculateSimplifiedTax(salesAmount, businessType, taxRate = 0.10) {
    // みなし仕入率
    const deductionRates = {
        wholesale: 0.90, // 第1種事業（卸売業）
        retail: 0.80, // 第2種事業（小売業）
        manufacturing: 0.70, // 第3種事業（製造業等）
        other: 0.60, // 第4種事業（その他）
        service: 0.50, // 第5種事業（サービス業等）
        real_estate: 0.40 // 第6種事業（不動産業）
    };
    const deductionRate = deductionRates[businessType] || 0.60;
    const salesTax = salesAmount * taxRate;
    const deductibleTax = salesTax * deductionRate;
    return Math.floor(salesTax - deductibleTax);
}
/**
 * 法人税の概算計算
 */
function estimateCorporateTax(taxableIncome, companySize = 'small') {
    let nationalTax = 0;
    if (companySize === 'small') {
        // 中小法人の軽減税率
        if (taxableIncome <= 8000000) {
            nationalTax = taxableIncome * 0.15;
        }
        else {
            nationalTax = 8000000 * 0.15 + (taxableIncome - 8000000) * 0.2332;
        }
    }
    else {
        // 一般法人
        nationalTax = taxableIncome * 0.2332;
    }
    // 地方法人税（法人税額の10.3%）
    const localCorporateTax = nationalTax * 0.103;
    // 法人住民税（法人税額の7%と仮定）
    const residentTax = nationalTax * 0.07;
    // 法人事業税（所得の約7%と仮定）
    const businessTax = taxableIncome * 0.07;
    const totalNationalTax = nationalTax + localCorporateTax;
    const totalLocalTax = residentTax + businessTax;
    const totalTax = totalNationalTax + totalLocalTax;
    return {
        nationalTax: Math.floor(totalNationalTax),
        localTax: Math.floor(totalLocalTax),
        totalTax: Math.floor(totalTax),
        effectiveRate: totalTax / taxableIncome
    };
}
/**
 * 消費税の納税義務判定
 */
function isTaxableEntity(basePeriodSales, specificPeriodSales) {
    // 基準期間の課税売上高が1,000万円超
    if (basePeriodSales > 10000000) {
        return true;
    }
    // 特定期間の課税売上高が1,000万円超
    if (specificPeriodSales && specificPeriodSales > 10000000) {
        return true;
    }
    return false;
}
/**
 * 適格請求書（インボイス）の必要項目チェック
 */
function validateInvoiceRequirements(invoice) {
    const missingFields = [];
    if (!invoice.issuerName)
        missingFields.push('発行者名');
    if (!invoice.issuerRegistrationNumber)
        missingFields.push('登録番号');
    if (!invoice.recipientName)
        missingFields.push('交付を受ける者の名称');
    if (!invoice.transactionDate)
        missingFields.push('取引年月日');
    if (!invoice.items || invoice.items.length === 0)
        missingFields.push('取引内容');
    if (!invoice.taxSummary)
        missingFields.push('税率ごとの区分記載');
    // 登録番号の形式チェック
    if (invoice.issuerRegistrationNumber &&
        !tax_calculator_1.TaxCalculator.validateInvoiceNumber(invoice.issuerRegistrationNumber)) {
        missingFields.push('登録番号（形式不正）');
    }
    return {
        isValid: missingFields.length === 0,
        missingFields
    };
}
