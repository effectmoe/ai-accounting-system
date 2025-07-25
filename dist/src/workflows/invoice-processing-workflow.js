"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoiceProcessingWorkflow = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
const logger_1 = require("@/lib/logger");
const invoiceProcessingWorkflowInputSchema = zod_1.z.object({
    processingType: zod_1.z.enum(['incoming_invoice', 'outgoing_invoice', 'bulk_processing']),
    companyId: zod_1.z.string(),
    incomingInvoice: zod_1.z.object({
        document: zod_1.z.object({
            type: zod_1.z.enum(['pdf', 'image', 'email']),
            base64Data: zod_1.z.string().optional(),
            fileUrl: zod_1.z.string().optional(),
            emailContent: zod_1.z.string().optional(),
        }),
        vendorInfo: zod_1.z.object({
            name: zod_1.z.string().optional(),
            registrationNumber: zod_1.z.string().optional(),
        }).optional(),
    }).optional(),
    outgoingInvoice: zod_1.z.object({
        customerId: zod_1.z.string(),
        items: zod_1.z.array(zod_1.z.object({
            description: zod_1.z.string(),
            quantity: zod_1.z.number(),
            unitPrice: zod_1.z.number(),
            taxRate: zod_1.z.number().optional(),
        })),
        dueDate: zod_1.z.string().optional(),
        notes: zod_1.z.string().optional(),
        autoSend: zod_1.z.boolean().default(false),
    }).optional(),
    bulkDocuments: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['pdf', 'image']),
        base64Data: zod_1.z.string().optional(),
        fileUrl: zod_1.z.string().optional(),
        filename: zod_1.z.string().optional(),
    })).optional(),
});
exports.invoiceProcessingWorkflow = (0, core_1.createWorkflow)({
    id: 'invoice-processing-workflow',
    name: 'Invoice Processing Workflow',
    description: 'Automated invoice processing for both incoming and outgoing invoices',
    inputSchema: invoiceProcessingWorkflowInputSchema,
    steps: [
        {
            id: 'process_document_ocr',
            name: 'Document OCR Processing',
            agent: 'ocr-agent',
            condition: (workflowInput) => ['incoming_invoice', 'bulk_processing'].includes(workflowInput.processingType),
            input: (workflowInput) => {
                if (workflowInput.processingType === 'incoming_invoice') {
                    return {
                        operation: 'process_documents',
                        documents: [workflowInput.incomingInvoice.document],
                        options: {
                            extractFinancialData: true,
                            japaneseSupport: true,
                            documentType: 'invoice'
                        }
                    };
                }
                else if (workflowInput.processingType === 'bulk_processing') {
                    return {
                        operation: 'process_documents',
                        documents: workflowInput.bulkDocuments,
                        options: {
                            extractFinancialData: true,
                            japaneseSupport: true,
                            documentType: 'invoice',
                            batchMode: true
                        }
                    };
                }
            },
        },
        {
            id: 'extract_invoice_data',
            name: 'Invoice Data Extraction',
            agent: 'accounting-agent',
            condition: (workflowInput) => ['incoming_invoice', 'bulk_processing'].includes(workflowInput.processingType),
            input: (workflowInput, previousResults) => ({
                operation: 'extract_invoice_data',
                ocrResults: previousResults.process_document_ocr?.result,
                vendorInfo: workflowInput.incomingInvoice?.vendorInfo
            }),
        },
        {
            id: 'validate_invoice_registration',
            name: 'Invoice Registration Validation',
            agent: 'customer-agent',
            condition: (workflowInput, previousResults) => {
                const extractedData = previousResults.extract_invoice_data?.result;
                return extractedData?.vendorRegistrationNumber;
            },
            input: (workflowInput, previousResults) => ({
                operation: 'search',
                searchCriteria: {
                    registrationNumber: previousResults.extract_invoice_data.result.vendorRegistrationNumber
                }
            }),
        },
        {
            id: 'calculate_invoice_tax',
            name: 'Invoice Tax Calculation',
            agent: 'japan-tax-agent',
            input: (workflowInput, previousResults) => {
                if (workflowInput.processingType === 'incoming_invoice') {
                    const invoiceData = previousResults.extract_invoice_data?.result;
                    return {
                        operation: 'calculate_consumption_tax',
                        consumptionTax: {
                            period: {
                                startDate: invoiceData?.date || new Date().toISOString().split('T')[0],
                                endDate: invoiceData?.date || new Date().toISOString().split('T')[0]
                            },
                            salesData: {
                                standardRateSales: 0,
                                reducedRateSales: 0,
                                exportSales: 0,
                                exemptSales: 0
                            },
                            purchaseData: {
                                standardRatePurchases: invoiceData?.amount || 0,
                                reducedRatePurchases: 0,
                                nonDeductiblePurchases: 0
                            },
                            calculationMethod: 'invoice'
                        }
                    };
                }
                else if (workflowInput.processingType === 'outgoing_invoice') {
                    const totalAmount = workflowInput.outgoingInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                    return {
                        operation: 'calculate_consumption_tax',
                        consumptionTax: {
                            period: {
                                startDate: new Date().toISOString().split('T')[0],
                                endDate: new Date().toISOString().split('T')[0]
                            },
                            salesData: {
                                standardRateSales: totalAmount,
                                reducedRateSales: 0,
                                exportSales: 0,
                                exemptSales: 0
                            },
                            purchaseData: {
                                standardRatePurchases: 0,
                                reducedRatePurchases: 0,
                                nonDeductiblePurchases: 0
                            },
                            calculationMethod: 'invoice'
                        }
                    };
                }
            },
        },
        {
            id: 'create_journal_entry',
            name: 'Journal Entry Creation',
            agent: 'accounting-agent',
            input: (workflowInput, previousResults) => {
                if (workflowInput.processingType === 'incoming_invoice') {
                    const invoiceData = previousResults.extract_invoice_data?.result;
                    const taxData = previousResults.calculate_invoice_tax?.result;
                    return {
                        operation: 'create_journal_entry',
                        entryData: {
                            description: `請求書: ${invoiceData?.vendorName || '不明'}`,
                            amount: invoiceData?.amount,
                            transactionType: 'expense',
                            date: invoiceData?.date || new Date().toISOString().split('T')[0],
                            taxData: taxData,
                            category: invoiceData?.category || 'general_expense'
                        }
                    };
                }
                else if (workflowInput.processingType === 'outgoing_invoice') {
                    const taxData = previousResults.calculate_invoice_tax?.result;
                    const totalAmount = workflowInput.outgoingInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                    return {
                        operation: 'create_journal_entry',
                        entryData: {
                            description: `売上請求書`,
                            amount: totalAmount,
                            transactionType: 'income',
                            date: new Date().toISOString().split('T')[0],
                            taxData: taxData,
                            category: 'sales_revenue'
                        }
                    };
                }
            },
        },
        {
            id: 'generate_outgoing_invoice',
            name: 'Outgoing Invoice Generation',
            agent: 'accounting-agent',
            condition: (workflowInput) => workflowInput.processingType === 'outgoing_invoice',
            input: (workflowInput, previousResults) => ({
                operation: 'create_invoice',
                invoiceData: {
                    ...workflowInput.outgoingInvoice,
                    taxCalculation: previousResults.calculate_invoice_tax?.result
                }
            }),
        },
        {
            id: 'save_invoice_record',
            name: 'Invoice Record Storage',
            agent: 'database-agent',
            input: (workflowInput, previousResults) => {
                const baseData = {
                    companyId: workflowInput.companyId,
                    processingType: workflowInput.processingType,
                    journalEntryId: previousResults.create_journal_entry?.result?.entryId,
                    taxCalculation: previousResults.calculate_invoice_tax?.result,
                    createdAt: new Date()
                };
                if (workflowInput.processingType === 'incoming_invoice') {
                    return {
                        operation: 'create',
                        collection: 'invoices',
                        data: {
                            ...baseData,
                            invoiceType: 'incoming',
                            vendorData: previousResults.extract_invoice_data?.result,
                            ocrData: previousResults.process_document_ocr?.result,
                            vendorRegistrationValid: !!previousResults.validate_invoice_registration?.result?.length
                        }
                    };
                }
                else if (workflowInput.processingType === 'outgoing_invoice') {
                    return {
                        operation: 'create',
                        collection: 'invoices',
                        data: {
                            ...baseData,
                            invoiceType: 'outgoing',
                            customerId: workflowInput.outgoingInvoice.customerId,
                            invoiceData: previousResults.generate_outgoing_invoice?.result,
                            dueDate: workflowInput.outgoingInvoice.dueDate
                        }
                    };
                }
                else {
                    return {
                        operation: 'create',
                        collection: 'import_batches',
                        data: {
                            ...baseData,
                            batchSize: workflowInput.bulkDocuments?.length || 0,
                            processedDocuments: previousResults.process_document_ocr?.result?.length || 0
                        }
                    };
                }
            },
        },
        {
            id: 'update_customer_records',
            name: 'Customer Record Update',
            agent: 'customer-agent',
            condition: (workflowInput) => workflowInput.processingType === 'outgoing_invoice',
            input: (workflowInput, previousResults) => ({
                operation: 'update',
                customerData: {
                    id: workflowInput.outgoingInvoice.customerId,
                    lastInvoiceDate: new Date().toISOString(),
                    totalInvoiceAmount: previousResults.generate_outgoing_invoice?.result?.totalAmount
                }
            }),
        },
        {
            id: 'send_invoice_notification',
            name: 'Invoice Notification',
            agent: 'ui-agent',
            condition: (workflowInput) => workflowInput.outgoingInvoice?.autoSend,
            input: (workflowInput, previousResults) => ({
                operation: 'generate_component',
                componentType: 'notification',
                data: {
                    type: 'invoice_sent',
                    title: '請求書を送信しました',
                    message: `請求書 ${previousResults.generate_outgoing_invoice?.result?.invoiceNumber} を顧客に送信しました。`,
                    actions: [
                        { label: '請求書確認', action: 'view_invoice' },
                        { label: '顧客情報確認', action: 'view_customer' }
                    ]
                }
            }),
        },
        {
            id: 'generate_processing_summary',
            name: 'Processing Summary Generation',
            agent: 'accounting-agent',
            input: (workflowInput, previousResults) => ({
                operation: 'generate_report',
                reportType: 'invoice_processing_summary',
                data: {
                    processingType: workflowInput.processingType,
                    processedAt: new Date().toISOString(),
                    ocrResults: previousResults.process_document_ocr?.result,
                    extractedData: previousResults.extract_invoice_data?.result,
                    taxCalculation: previousResults.calculate_invoice_tax?.result,
                    journalEntry: previousResults.create_journal_entry?.result,
                    invoiceGenerated: previousResults.generate_outgoing_invoice?.result,
                    databaseRecord: previousResults.save_invoice_record?.result
                }
            }),
        },
    ],
    execute: async ({ input, agents, context }) => {
        try {
            logger_1.logger.debug('[Invoice Processing Workflow] Starting processing:', input.processingType);
            const results = {};
            let processedCount = 0;
            if (input.processingType === 'bulk_processing') {
                processedCount = input.bulkDocuments?.length || 0;
            }
            else {
                processedCount = 1;
            }
            for (const step of exports.invoiceProcessingWorkflow.steps) {
                if (step.condition && !step.condition(input, results)) {
                    logger_1.logger.debug(`[Invoice Processing Workflow] Skipping step: ${step.name}`);
                    continue;
                }
                logger_1.logger.debug(`[Invoice Processing Workflow] Executing step: ${step.name}`);
                const stepInput = step.input(input, results);
                const stepResult = await agents[step.agent].execute({
                    input: stepInput,
                    context: { ...context, workflowId: 'invoice-processing-workflow' }
                });
                results[step.id] = stepResult;
                if (!stepResult.success) {
                    logger_1.logger.warn(`[Invoice Processing Workflow] Step ${step.name} completed with issues:`, stepResult.error);
                }
            }
            return {
                success: true,
                processingType: input.processingType,
                processedCount,
                results,
                summary: results.generate_processing_summary?.result,
                completedAt: new Date().toISOString()
            };
        }
        catch (error) {
            logger_1.logger.error('[Invoice Processing Workflow] Error:', error);
            throw error;
        }
    },
});
exports.default = exports.invoiceProcessingWorkflow;
//# sourceMappingURL=invoice-processing-workflow.js.map