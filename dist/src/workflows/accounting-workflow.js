"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountingWorkflow = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
const logger_1 = require("@/lib/logger");
const accountingWorkflowInputSchema = zod_1.z.object({
    workflowType: zod_1.z.enum(['transaction_processing', 'invoice_generation', 'monthly_report', 'tax_calculation']),
    companyId: zod_1.z.string(),
    transactionData: zod_1.z.object({
        description: zod_1.z.string(),
        amount: zod_1.z.number(),
        transactionType: zod_1.z.enum(['income', 'expense', 'transfer']),
        date: zod_1.z.string(),
        documents: zod_1.z.array(zod_1.z.object({
            type: zod_1.z.string(),
            base64Data: zod_1.z.string().optional(),
            fileUrl: zod_1.z.string().optional(),
        })).optional(),
    }).optional(),
    invoiceData: zod_1.z.object({
        customerId: zod_1.z.string(),
        items: zod_1.z.array(zod_1.z.object({
            description: zod_1.z.string(),
            quantity: zod_1.z.number(),
            unitPrice: zod_1.z.number(),
        })),
        dueDate: zod_1.z.string().optional(),
    }).optional(),
    reportPeriod: zod_1.z.object({
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string(),
    }).optional(),
});
exports.accountingWorkflow = (0, core_1.createWorkflow)({
    id: 'accounting-workflow',
    name: 'Accounting Processing Workflow',
    description: 'Comprehensive accounting workflow for transaction processing, invoice generation, and reporting',
    inputSchema: accountingWorkflowInputSchema,
    steps: [
        {
            id: 'validate_input',
            name: 'Input Validation',
            agent: 'database-agent',
            input: (workflowInput) => ({
                operation: 'validate',
                data: workflowInput
            }),
        },
        {
            id: 'process_documents',
            name: 'Document Processing',
            agent: 'ocr-agent',
            condition: (workflowInput) => workflowInput.transactionData?.documents?.length > 0,
            input: (workflowInput) => ({
                operation: 'process_documents',
                documents: workflowInput.transactionData.documents,
                options: {
                    extractFinancialData: true,
                    japaneseSupport: true
                }
            }),
        },
        {
            id: 'categorize_transaction',
            name: 'Transaction Categorization',
            agent: 'accounting-agent',
            condition: (workflowInput) => workflowInput.workflowType === 'transaction_processing',
            input: (workflowInput, previousResults) => ({
                operation: 'categorize',
                transaction: {
                    ...workflowInput.transactionData,
                    ocrData: previousResults.process_documents?.result
                }
            }),
        },
        {
            id: 'calculate_tax',
            name: 'Tax Calculation',
            agent: 'japan-tax-agent',
            input: (workflowInput, previousResults) => {
                const transaction = previousResults.categorize_transaction?.result || workflowInput.transactionData;
                return {
                    operation: 'calculate_consumption_tax',
                    consumptionTax: {
                        period: {
                            startDate: workflowInput.transactionData.date,
                            endDate: workflowInput.transactionData.date
                        },
                        salesData: {
                            standardRateSales: transaction.transactionType === 'income' ? transaction.amount : 0,
                            reducedRateSales: 0,
                            exportSales: 0,
                            exemptSales: 0
                        },
                        purchaseData: {
                            standardRatePurchases: transaction.transactionType === 'expense' ? transaction.amount : 0,
                            reducedRatePurchases: 0,
                            nonDeductiblePurchases: 0
                        }
                    }
                };
            },
        },
        {
            id: 'create_journal_entry',
            name: 'Journal Entry Creation',
            agent: 'accounting-agent',
            input: (workflowInput, previousResults) => ({
                operation: 'create_journal_entry',
                entryData: {
                    ...workflowInput.transactionData,
                    category: previousResults.categorize_transaction?.result?.category,
                    taxData: previousResults.calculate_tax?.result
                }
            }),
        },
        {
            id: 'generate_invoice',
            name: 'Invoice Generation',
            agent: 'accounting-agent',
            condition: (workflowInput) => workflowInput.workflowType === 'invoice_generation',
            input: (workflowInput) => ({
                operation: 'create_invoice',
                invoiceData: workflowInput.invoiceData
            }),
        },
        {
            id: 'generate_report',
            name: 'Report Generation',
            agent: 'accounting-agent',
            condition: (workflowInput) => workflowInput.workflowType === 'monthly_report',
            input: (workflowInput) => ({
                operation: 'generate_report',
                reportType: 'monthly',
                period: workflowInput.reportPeriod,
                companyId: workflowInput.companyId
            }),
        },
        {
            id: 'save_to_database',
            name: 'Database Storage',
            agent: 'database-agent',
            input: (workflowInput, previousResults) => ({
                operation: 'create',
                collection: 'transactions',
                data: {
                    companyId: workflowInput.companyId,
                    journalEntry: previousResults.create_journal_entry?.result,
                    taxCalculation: previousResults.calculate_tax?.result,
                    invoiceId: previousResults.generate_invoice?.result?.invoiceId,
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            }),
        },
        {
            id: 'update_customer_records',
            name: 'Customer Record Update',
            agent: 'customer-agent',
            condition: (workflowInput) => workflowInput.invoiceData?.customerId,
            input: (workflowInput, previousResults) => ({
                operation: 'update',
                customerData: {
                    id: workflowInput.invoiceData.customerId,
                    lastInvoiceDate: new Date().toISOString(),
                    totalInvoiceAmount: previousResults.generate_invoice?.result?.amount
                }
            }),
        },
    ],
    errorHandling: {
        retryPolicy: {
            maxRetries: 3,
            backoffMultiplier: 2,
            retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR']
        },
        rollbackStrategy: 'compensating_actions',
        compensation: {
            save_to_database: async (context) => {
                return context.agents['database-agent'].execute({
                    operation: 'rollback',
                    transactionId: context.results.save_to_database?.transactionId
                });
            },
            create_journal_entry: async (context) => {
                return context.agents['accounting-agent'].execute({
                    operation: 'delete_journal_entry',
                    entryId: context.results.create_journal_entry?.entryId
                });
            }
        }
    },
    execute: async ({ input, agents, context }) => {
        try {
            logger_1.logger.debug('[Accounting Workflow] Starting workflow:', input.workflowType);
            const results = {};
            for (const step of exports.accountingWorkflow.steps) {
                if (step.condition && !step.condition(input)) {
                    logger_1.logger.debug(`[Accounting Workflow] Skipping step: ${step.name}`);
                    continue;
                }
                logger_1.logger.debug(`[Accounting Workflow] Executing step: ${step.name}`);
                const stepInput = step.input(input, results);
                const stepResult = await agents[step.agent].execute({
                    input: stepInput,
                    context: { ...context, workflowId: 'accounting-workflow' }
                });
                results[step.id] = stepResult;
                if (!stepResult.success) {
                    throw new Error(`Step ${step.name} failed: ${stepResult.error}`);
                }
            }
            return {
                success: true,
                workflowType: input.workflowType,
                results,
                completedAt: new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error('[Accounting Workflow] Error:', error);
            if (exports.accountingWorkflow.errorHandling.compensation) {
                logger_1.logger.debug('[Accounting Workflow] Initiating rollback...');
            }
            throw error;
        }
    },
});
exports.default = exports.accountingWorkflow;
//# sourceMappingURL=accounting-workflow.js.map