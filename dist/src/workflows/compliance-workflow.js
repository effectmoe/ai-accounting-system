"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceWorkflow = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
const logger_1 = require("@/lib/logger");
const complianceWorkflowInputSchema = zod_1.z.object({
    complianceType: zod_1.z.enum(['tax_return', 'invoice_compliance', 'monthly_compliance', 'annual_audit']),
    companyId: zod_1.z.string(),
    taxReturnData: zod_1.z.object({
        returnType: zod_1.z.enum(['consumption_tax', 'corporate_tax', 'withholding_tax']),
        fiscalYear: zod_1.z.string(),
        period: zod_1.z.object({
            startDate: zod_1.z.string(),
            endDate: zod_1.z.string(),
        }),
    }).optional(),
    checkPeriod: zod_1.z.object({
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string(),
    }).optional(),
});
exports.complianceWorkflow = (0, core_1.createWorkflow)({
    id: 'compliance-workflow',
    name: 'Tax Compliance Workflow',
    description: 'Automated tax compliance checking and reporting workflow',
    inputSchema: complianceWorkflowInputSchema,
    steps: [
        {
            id: 'gather_financial_data',
            name: 'Financial Data Collection',
            agent: 'database-agent',
            input: (workflowInput) => ({
                operation: 'findMany',
                collection: 'transactions',
                query: {
                    companyId: workflowInput.companyId,
                    createdAt: {
                        $gte: new Date(workflowInput.checkPeriod?.startDate || workflowInput.taxReturnData?.period?.startDate),
                        $lte: new Date(workflowInput.checkPeriod?.endDate || workflowInput.taxReturnData?.period?.endDate)
                    }
                }
            }),
        },
        {
            id: 'check_invoice_compliance',
            name: 'Invoice System Compliance Check',
            agent: 'japan-tax-agent',
            condition: (workflowInput) => ['invoice_compliance', 'monthly_compliance', 'annual_audit'].includes(workflowInput.complianceType),
            input: (workflowInput) => ({
                operation: 'check_compliance',
                complianceCheckOptions: {
                    checkType: 'invoice_system',
                    targetPeriod: workflowInput.taxReturnData?.fiscalYear || new Date().getFullYear().toString()
                }
            }),
        },
        {
            id: 'check_consumption_tax_compliance',
            name: 'Consumption Tax Compliance Check',
            agent: 'japan-tax-agent',
            input: (workflowInput) => ({
                operation: 'check_compliance',
                complianceCheckOptions: {
                    checkType: 'consumption_tax',
                    targetPeriod: workflowInput.taxReturnData?.fiscalYear || new Date().getFullYear().toString()
                }
            }),
        },
        {
            id: 'check_withholding_tax_compliance',
            name: 'Withholding Tax Compliance Check',
            agent: 'japan-tax-agent',
            input: (workflowInput) => ({
                operation: 'check_compliance',
                complianceCheckOptions: {
                    checkType: 'withholding_tax',
                    targetPeriod: workflowInput.taxReturnData?.fiscalYear || new Date().getFullYear().toString()
                }
            }),
        },
        {
            id: 'calculate_taxes_for_return',
            name: 'Tax Calculation for Return',
            agent: 'japan-tax-agent',
            condition: (workflowInput) => workflowInput.complianceType === 'tax_return',
            input: (workflowInput, previousResults) => {
                const financialData = previousResults.gather_financial_data?.result?.data || [];
                const totalRevenue = financialData
                    .filter((t) => t.transaction_type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                const totalExpenses = financialData
                    .filter((t) => t.transaction_type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                if (workflowInput.taxReturnData.returnType === 'consumption_tax') {
                    return {
                        operation: 'calculate_consumption_tax',
                        consumptionTax: {
                            period: workflowInput.taxReturnData.period,
                            salesData: {
                                standardRateSales: totalRevenue,
                                reducedRateSales: 0,
                                exportSales: 0,
                                exemptSales: 0
                            },
                            purchaseData: {
                                standardRatePurchases: totalExpenses,
                                reducedRatePurchases: 0,
                                nonDeductiblePurchases: 0
                            },
                            calculationMethod: 'invoice',
                            isSimplifiedTaxpayer: false
                        }
                    };
                }
                else if (workflowInput.taxReturnData.returnType === 'corporate_tax') {
                    return {
                        operation: 'calculate_corporate_tax',
                        corporateTax: {
                            fiscalYear: workflowInput.taxReturnData.fiscalYear,
                            income: {
                                revenue: totalRevenue,
                                expenses: totalExpenses,
                                nonDeductibleExpenses: 0,
                                taxExemptIncome: 0
                            },
                            adjustments: {
                                depreciationAdjustment: 0,
                                provisionAdjustment: 0,
                                entertainmentExpenseAdjustment: 0
                            },
                            corporationType: 'small',
                            capitalAmount: 10000000
                        }
                    };
                }
                return { operation: 'get_tax_calendar' };
            },
        },
        {
            id: 'generate_tax_return_document',
            name: 'Tax Return Document Generation',
            agent: 'japan-tax-agent',
            condition: (workflowInput) => workflowInput.complianceType === 'tax_return',
            input: (workflowInput, previousResults) => ({
                operation: 'generate_tax_return',
                taxReturnOptions: {
                    returnType: workflowInput.taxReturnData.returnType,
                    period: workflowInput.taxReturnData.period,
                    companyInfo: {
                        name: '株式会社サンプル',
                        registrationNumber: 'T1234567890123',
                        address: '東京都渋谷区',
                        representativeName: '代表者名'
                    }
                }
            }),
        },
        {
            id: 'generate_compliance_report',
            name: 'Compliance Report Generation',
            agent: 'accounting-agent',
            input: (workflowInput, previousResults) => ({
                operation: 'generate_report',
                reportType: 'compliance',
                data: {
                    complianceType: workflowInput.complianceType,
                    period: workflowInput.checkPeriod || workflowInput.taxReturnData?.period,
                    invoiceCompliance: previousResults.check_invoice_compliance?.result,
                    consumptionTaxCompliance: previousResults.check_consumption_tax_compliance?.result,
                    withholdingTaxCompliance: previousResults.check_withholding_tax_compliance?.result,
                    taxCalculations: previousResults.calculate_taxes_for_return?.result,
                    taxReturnDocument: previousResults.generate_tax_return_document?.result
                }
            }),
        },
        {
            id: 'save_compliance_record',
            name: 'Compliance Record Storage',
            agent: 'database-agent',
            input: (workflowInput, previousResults) => ({
                operation: 'create',
                collection: 'complianceReports',
                data: {
                    companyId: workflowInput.companyId,
                    complianceType: workflowInput.complianceType,
                    periodStart: workflowInput.checkPeriod?.startDate || workflowInput.taxReturnData?.period?.startDate,
                    periodEnd: workflowInput.checkPeriod?.endDate || workflowInput.taxReturnData?.period?.endDate,
                    reportData: previousResults.generate_compliance_report?.result,
                    taxReturnId: previousResults.generate_tax_return_document?.result?.returnId,
                    complianceStatus: previousResults.check_invoice_compliance?.result?.isCompliant ? 'compliant' : 'non_compliant',
                    createdAt: new Date()
                }
            }),
        },
        {
            id: 'notify_stakeholders',
            name: 'Stakeholder Notification',
            agent: 'ui-agent',
            condition: (workflowInput, previousResults) => {
                const hasIssues = [
                    previousResults.check_invoice_compliance?.result?.issues?.length > 0,
                    previousResults.check_consumption_tax_compliance?.result?.issues?.length > 0,
                    previousResults.check_withholding_tax_compliance?.result?.issues?.length > 0
                ].some(Boolean);
                return hasIssues;
            },
            input: (workflowInput, previousResults) => ({
                operation: 'generate_component',
                componentType: 'notification',
                data: {
                    type: 'compliance_alert',
                    severity: 'warning',
                    title: 'コンプライアンス確認が必要です',
                    message: 'システムがコンプライアンス上の問題を検出しました。詳細を確認してください。',
                    actions: [
                        { label: '詳細確認', action: 'view_compliance_report' },
                        { label: '税理士に相談', action: 'contact_accountant' }
                    ]
                }
            }),
        },
    ],
    execute: async ({ input, agents, context }) => {
        try {
            logger_1.logger.debug('[Compliance Workflow] Starting compliance check:', input.complianceType);
            const results = {};
            for (const step of exports.complianceWorkflow.steps) {
                if (step.condition && !step.condition(input, results)) {
                    logger_1.logger.debug(`[Compliance Workflow] Skipping step: ${step.name}`);
                    continue;
                }
                logger_1.logger.debug(`[Compliance Workflow] Executing step: ${step.name}`);
                const stepInput = step.input(input, results);
                const stepResult = await agents[step.agent].execute({
                    input: stepInput,
                    context: { ...context, workflowId: 'compliance-workflow' }
                });
                results[step.id] = stepResult;
                if (!stepResult.success) {
                    logger_1.logger.warn(`[Compliance Workflow] Step ${step.name} completed with issues:`, stepResult.error);
                }
            }
            const complianceScore = calculateComplianceScore(results);
            return {
                success: true,
                complianceType: input.complianceType,
                complianceScore,
                results,
                summary: generateComplianceSummary(results),
                completedAt: new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error('[Compliance Workflow] Error:', error);
            throw error;
        }
    },
});
function calculateComplianceScore(results) {
    let score = 100;
    let totalChecks = 0;
    const complianceChecks = [
        'check_invoice_compliance',
        'check_consumption_tax_compliance',
        'check_withholding_tax_compliance'
    ];
    complianceChecks.forEach(checkId => {
        const checkResult = results[checkId]?.result;
        if (checkResult) {
            totalChecks++;
            if (!checkResult.isCompliant) {
                score -= 20;
            }
            if (checkResult.issues?.length > 0) {
                score -= checkResult.issues.length * 5;
            }
        }
    });
    return Math.max(0, Math.round(score));
}
function generateComplianceSummary(results) {
    const summary = {
        totalIssues: 0,
        criticalIssues: 0,
        recommendations: [],
        nextActions: []
    };
    Object.values(results).forEach((result) => {
        if (result?.result?.issues) {
            summary.totalIssues += result.result.issues.length;
        }
        if (result?.result?.recommendations) {
            summary.recommendations.push(...result.result.recommendations);
        }
    });
    if (summary.totalIssues === 0) {
        summary.nextActions.push('コンプライアンスチェック完了。問題は見つかりませんでした。');
    }
    else {
        summary.nextActions.push('検出された問題を確認し、必要な修正を行ってください。');
        if (summary.totalIssues > 5) {
            summary.nextActions.push('多数の問題が検出されました。税理士への相談を推奨します。');
        }
    }
    return summary;
}
exports.default = exports.complianceWorkflow;
//# sourceMappingURL=compliance-workflow.js.map