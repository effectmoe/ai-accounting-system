"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.japanTaxAgent = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
const withholdingTaxSchema = zod_1.z.object({
    paymentType: zod_1.z.enum(['salary', 'bonus', 'retirement', 'freelance', 'dividend', 'interest']),
    paymentAmount: zod_1.z.number(),
    recipientType: zod_1.z.enum(['individual', 'corporate', 'non_resident']),
    recipientDetails: zod_1.z.object({
        name: zod_1.z.string(),
        address: zod_1.z.string().optional(),
        taxNumber: zod_1.z.string().optional(),
        isResident: zod_1.z.boolean().default(true),
        countryCode: zod_1.z.string().default('JP'),
    }),
    taxTreatyApplicable: zod_1.z.boolean().default(false),
    taxTreatyRate: zod_1.z.number().optional(),
    companyId: zod_1.z.string(),
});
const consumptionTaxSchema = zod_1.z.object({
    period: zod_1.z.object({
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string(),
    }),
    salesData: zod_1.z.object({
        standardRateSales: zod_1.z.number(),
        reducedRateSales: zod_1.z.number(),
        exportSales: zod_1.z.number(),
        exemptSales: zod_1.z.number(),
    }),
    purchaseData: zod_1.z.object({
        standardRatePurchases: zod_1.z.number(),
        reducedRatePurchases: zod_1.z.number(),
        nonDeductiblePurchases: zod_1.z.number(),
    }),
    calculationMethod: zod_1.z.enum(['invoice', 'account_book', 'simplified']).default('invoice'),
    isSimplifiedTaxpayer: zod_1.z.boolean().default(false),
    companyId: zod_1.z.string(),
});
const corporateTaxSchema = zod_1.z.object({
    fiscalYear: zod_1.z.string(),
    income: zod_1.z.object({
        revenue: zod_1.z.number(),
        expenses: zod_1.z.number(),
        nonDeductibleExpenses: zod_1.z.number(),
        taxExemptIncome: zod_1.z.number(),
    }),
    adjustments: zod_1.z.object({
        depreciationAdjustment: zod_1.z.number().default(0),
        provisionAdjustment: zod_1.z.number().default(0),
        entertainmentExpenseAdjustment: zod_1.z.number().default(0),
    }),
    corporationType: zod_1.z.enum(['regular', 'small', 'public_interest']).default('regular'),
    capitalAmount: zod_1.z.number(),
    companyId: zod_1.z.string(),
});
const japanTaxInputSchema = zod_1.z.object({
    operation: zod_1.z.enum([
        'calculate_withholding',
        'calculate_consumption_tax',
        'calculate_corporate_tax',
        'generate_tax_return',
        'check_compliance',
        'get_tax_calendar'
    ]),
    withholdingTax: withholdingTaxSchema.optional(),
    consumptionTax: consumptionTaxSchema.optional(),
    corporateTax: corporateTaxSchema.optional(),
    taxReturnOptions: zod_1.z.object({
        returnType: zod_1.z.enum(['consumption_tax', 'corporate_tax', 'withholding_tax_statement']),
        period: zod_1.z.object({
            startDate: zod_1.z.string(),
            endDate: zod_1.z.string(),
        }),
        companyInfo: zod_1.z.object({
            name: zod_1.z.string(),
            registrationNumber: zod_1.z.string(),
            address: zod_1.z.string(),
            representativeName: zod_1.z.string(),
        }),
        companyId: zod_1.z.string(),
    }).optional(),
    complianceCheckOptions: zod_1.z.object({
        checkType: zod_1.z.enum(['invoice_system', 'consumption_tax', 'withholding_tax', 'general']),
        targetPeriod: zod_1.z.string(),
        companyId: zod_1.z.string(),
    }).optional(),
});
exports.japanTaxAgent = (0, core_1.createAgent)({
    id: 'japan-tax-agent',
    name: 'Japan Tax Compliance Agent',
    description: 'Handle Japanese tax calculations, compliance checks, and tax return generation with MongoDB integration',
    inputSchema: japanTaxInputSchema,
    tools: {
        calculateWithholdingTax: {
            description: 'Calculate Japanese withholding tax',
            execute: async ({ data }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const { paymentType, paymentAmount, recipientType, recipientDetails, companyId } = data;
                    let withholdingRate = 0;
                    let withholdingAmount = 0;
                    let calculationMethod = '';
                    switch (paymentType) {
                        case 'salary':
                            if (paymentAmount <= 88000) {
                                withholdingRate = 0;
                            }
                            else {
                                withholdingRate = 0.05;
                                calculationMethod = '給与所得の源泉徴収税額表（月額）';
                            }
                            break;
                        case 'freelance':
                            if (recipientType === 'individual') {
                                if (paymentAmount <= 1000000) {
                                    withholdingRate = 0.1021;
                                }
                                else {
                                    withholdingAmount = 1000000 * 0.1021 + (paymentAmount - 1000000) * 0.2042;
                                    calculationMethod = '報酬・料金等の源泉徴収（100万円超）';
                                }
                            }
                            break;
                        case 'dividend':
                            if (recipientType === 'individual') {
                                withholdingRate = 0.20315;
                            }
                            else if (recipientType === 'corporate') {
                                withholdingRate = 0.15315;
                            }
                            break;
                        case 'interest':
                            withholdingRate = 0.15315;
                            break;
                        default:
                            withholdingRate = 0.2042;
                    }
                    if (data.taxTreatyApplicable && data.taxTreatyRate) {
                        withholdingRate = data.taxTreatyRate;
                        calculationMethod += ' (租税条約適用)';
                    }
                    if (withholdingAmount === 0) {
                        withholdingAmount = Math.floor(paymentAmount * withholdingRate);
                    }
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
                }
                catch (error) {
                    logger_1.logger.error('Withholding tax calculation error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        calculateConsumptionTax: {
            description: 'Calculate Japanese consumption tax',
            execute: async ({ data, mcpClient }) => {
                const { period, salesData, purchaseData, calculationMethod, isSimplifiedTaxpayer } = data;
                const outputTax = {
                    standard: salesData.standardRateSales * 0.1,
                    reduced: salesData.reducedRateSales * 0.08,
                    total: salesData.standardRateSales * 0.1 + salesData.reducedRateSales * 0.08
                };
                let inputTax = {
                    standard: purchaseData.standardRatePurchases * 0.1,
                    reduced: purchaseData.reducedRatePurchases * 0.08,
                    total: 0
                };
                switch (calculationMethod) {
                    case 'invoice':
                        inputTax.total = inputTax.standard + inputTax.reduced;
                        break;
                    case 'account_book':
                        inputTax.total = (inputTax.standard + inputTax.reduced) * 0.8;
                        break;
                    case 'simplified':
                        const simplifiedRates = {
                            retail: 0.8,
                            wholesale: 0.9,
                            manufacturing: 0.7,
                            service: 0.5,
                            real_estate: 0.4,
                            other: 0.6
                        };
                        inputTax.total = outputTax.total * simplifiedRates.service;
                        break;
                }
                const taxPayable = Math.floor(outputTax.total - inputTax.total);
                const result = await db.create(mongodb_client_1.Collections.JOURNAL_ENTRIES, {
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
        calculateCorporateTax: {
            description: 'Calculate Japanese corporate tax',
            execute: async ({ data, mcpClient }) => {
                const { fiscalYear, income, adjustments, corporationType, capitalAmount } = data;
                let taxableIncome = income.revenue - income.expenses;
                taxableIncome += income.nonDeductibleExpenses;
                taxableIncome -= income.taxExemptIncome;
                taxableIncome += adjustments.depreciationAdjustment;
                taxableIncome += adjustments.provisionAdjustment;
                taxableIncome += adjustments.entertainmentExpenseAdjustment;
                const taxRateInfo = await mcpClient.callTool('nlweb', 'search_tax_info', {
                    query: `法人税率 ${corporationType} ${capitalAmount} ${fiscalYear}`,
                    category: 'corporate_tax'
                });
                let corporateTaxRate = 0.232;
                if (corporationType === 'small' && capitalAmount <= 100000000) {
                    if (taxableIncome <= 8000000) {
                        corporateTaxRate = 0.15;
                    }
                }
                let corporateTax = 0;
                if (corporationType === 'small' && taxableIncome > 8000000) {
                    corporateTax = 8000000 * 0.15 + (taxableIncome - 8000000) * 0.232;
                }
                else {
                    corporateTax = taxableIncome * corporateTaxRate;
                }
                const localCorporateTax = corporateTax * 0.103;
                const localTax = {
                    inhabitantsTax: corporateTax * 0.129,
                    enterpriseTax: taxableIncome * 0.07,
                };
                const totalTax = Math.floor(corporateTax +
                    localCorporateTax +
                    localTax.inhabitantsTax +
                    localTax.enterpriseTax);
                const result = await db.create(mongodb_client_1.Collections.JOURNAL_ENTRIES, {
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
        generateTaxReturn: {
            description: 'Generate tax return documents',
            execute: async ({ returnType, period, companyInfo, mcpClient }) => {
                let returnData;
                switch (returnType) {
                    case 'consumption_tax':
                        const consumptionResult = await db.find(mongodb_client_1.Collections.JOURNAL_ENTRIES, {
                            type: 'consumption_tax_return',
                            periodStart: period.startDate,
                            periodEnd: period.endDate
                        }, { sort: { createdAt: -1 }, limit: 1 });
                        returnData = consumptionResult[0];
                        break;
                    case 'corporate_tax':
                        const corporateResult = await db.find(mongodb_client_1.Collections.JOURNAL_ENTRIES, {
                            type: 'corporate_tax_return',
                            fiscalYear: period.startDate.split('-')[0]
                        }, { sort: { createdAt: -1 }, limit: 1 });
                        returnData = corporateResult[0];
                        break;
                    case 'withholding_tax_statement':
                        const withholdingResult = await db.find(mongodb_client_1.Collections.JOURNAL_ENTRIES, {
                            type: 'withholding_tax_record',
                            createdAt: {
                                $gte: new Date(period.startDate),
                                $lte: new Date(period.endDate)
                            }
                        });
                        returnData = withholdingResult;
                        break;
                }
                const taxReturn = {
                    returnType,
                    companyInfo,
                    period,
                    data: returnData,
                    generatedAt: new Date().toISOString(),
                    formNumber: await tools.getFormNumber(returnType),
                    status: 'draft'
                };
                const documentResult = await mcpClient.callTool('excel', 'create_workbook', {
                    sheets: [{
                            name: '税務申告書',
                            data: [taxReturn],
                            template: `tax_return_${returnType}`
                        }]
                });
                await db.create(mongodb_client_1.Collections.DOCUMENTS, {
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
        checkTaxCompliance: {
            description: 'Check tax compliance status',
            execute: async ({ checkType, targetPeriod, mcpClient }) => {
                const issues = [];
                const recommendations = [];
                switch (checkType) {
                    case 'invoice_system':
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
                        const salesTransactions = await db.find(mongodb_client_1.Collections.TRANSACTIONS, {
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
                        const payments = await db.find(mongodb_client_1.Collections.TRANSACTIONS, {
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
        getTaxDeadlines: {
            description: 'Get tax filing deadlines',
            execute: async ({ year, mcpClient }) => {
                const deadlineInfo = await mcpClient.callTool('nlweb', 'search_tax_info', {
                    query: `税務申告期限 ${year}年`,
                    category: 'general'
                });
                const standardDeadlines = [
                    {
                        name: '法人税確定申告',
                        date: `${year}-05-31`,
                        description: '事業年度終了後2ヶ月以内',
                        type: 'corporate_tax'
                    },
                    {
                        name: '消費税確定申告',
                        date: `${year}-03-31`,
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
    execute: async ({ input, tools, mcpClient }) => {
        try {
            logger_1.logger.debug('[Japan Tax Agent] Starting operation:', input.operation);
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
        }
        catch (error) {
            logger_1.logger.error('[Japan Tax Agent] Error:', error);
            throw error;
        }
    },
});
exports.default = exports.japanTaxAgent;
//# sourceMappingURL=japan-tax-agent.js.map