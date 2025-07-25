"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerAgent = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
const mongodb_client_1 = require("@/lib/mongodb-client");
const logger_1 = require("@/lib/logger");
const customerSchema = zod_1.z.object({
    _id: zod_1.z.string().optional(),
    companyName: zod_1.z.string(),
    companyNameKana: zod_1.z.string().optional(),
    registrationNumber: zod_1.z.string().optional(),
    customerType: zod_1.z.enum(['corporate', 'individual', 'government']),
    industry: zod_1.z.string(),
    address: zod_1.z.object({
        postalCode: zod_1.z.string(),
        prefecture: zod_1.z.string(),
        city: zod_1.z.string(),
        street: zod_1.z.string(),
        building: zod_1.z.string().optional(),
    }),
    contact: zod_1.z.object({
        primaryName: zod_1.z.string(),
        primaryEmail: zod_1.z.string().email(),
        primaryPhone: zod_1.z.string(),
        secondaryName: zod_1.z.string().optional(),
        secondaryEmail: zod_1.z.string().email().optional(),
        secondaryPhone: zod_1.z.string().optional(),
    }),
    billing: zod_1.z.object({
        paymentTerms: zod_1.z.enum(['immediate', 'net30', 'net60', 'net90']),
        preferredPaymentMethod: zod_1.z.enum(['bank_transfer', 'credit_card', 'invoice']),
        bankAccount: zod_1.z.object({
            bankName: zod_1.z.string(),
            branchName: zod_1.z.string(),
            accountType: zod_1.z.enum(['普通', '当座']),
            accountNumber: zod_1.z.string(),
            accountName: zod_1.z.string(),
        }).optional(),
    }),
    status: zod_1.z.enum(['active', 'inactive', 'suspended']).default('active'),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    notes: zod_1.z.string().optional(),
    companyId: zod_1.z.string(),
    creditLimit: zod_1.z.number().optional(),
    riskLevel: zod_1.z.enum(['low', 'medium', 'high']).optional(),
    lastAssessmentDate: zod_1.z.string().optional(),
    lastInvoiceDate: zod_1.z.string().optional(),
    totalInvoiceAmount: zod_1.z.number().optional(),
});
const customerInputSchema = zod_1.z.object({
    operation: zod_1.z.enum(['create', 'update', 'search', 'analyze', 'export', 'validate_invoice_number']),
    customerData: customerSchema.optional(),
    searchCriteria: zod_1.z.object({
        query: zod_1.z.string().optional(),
        companyName: zod_1.z.string().optional(),
        industry: zod_1.z.string().optional(),
        status: zod_1.z.enum(['active', 'inactive', 'suspended']).optional(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        hasInvoiceRegistration: zod_1.z.boolean().optional(),
        registrationNumber: zod_1.z.string().optional(),
        companyId: zod_1.z.string().optional(),
    }).optional(),
    analysisOptions: zod_1.z.object({
        type: zod_1.z.enum(['revenue', 'payment_history', 'transaction_frequency', 'credit_risk']),
        period: zod_1.z.object({
            startDate: zod_1.z.string(),
            endDate: zod_1.z.string(),
        }),
        customerId: zod_1.z.string().optional(),
        companyId: zod_1.z.string(),
    }).optional(),
    exportOptions: zod_1.z.object({
        format: zod_1.z.enum(['csv', 'excel', 'json']),
        fields: zod_1.z.array(zod_1.z.string()).optional(),
        filters: zod_1.z.any().optional(),
        companyId: zod_1.z.string(),
    }).optional(),
    validationData: zod_1.z.object({
        registrationNumber: zod_1.z.string(),
    }).optional(),
});
exports.customerAgent = (0, core_1.createAgent)({
    id: 'customer-agent',
    name: 'Customer Management Agent',
    description: 'Manage customer information, analyze customer data, and handle customer-related operations with MongoDB integration',
    inputSchema: customerInputSchema,
    tools: {
        createCustomer: {
            description: 'Create a new customer in MongoDB',
            execute: async ({ customerData }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    if (customerData.registrationNumber) {
                        const isValid = await tools.validateInvoiceNumber({
                            registrationNumber: customerData.registrationNumber
                        });
                        if (!isValid.success) {
                            return {
                                success: false,
                                error: 'Invalid invoice registration number format'
                            };
                        }
                    }
                    const existingCustomer = await db.findOne(mongodb_client_1.Collections.CUSTOMERS, {
                        companyName: customerData.companyName,
                        companyId: customerData.companyId
                    });
                    if (existingCustomer) {
                        return {
                            success: false,
                            error: 'Customer with this company name already exists'
                        };
                    }
                    const newCustomer = {
                        ...customerData,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    const result = await db.create(mongodb_client_1.Collections.CUSTOMERS, newCustomer);
                    return {
                        success: true,
                        customerId: result._id.toString(),
                        customer: result,
                        message: '顧客が正常に作成されました'
                    };
                }
                catch (error) {
                    logger_1.logger.error('Customer creation error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        validateInvoiceNumber: {
            description: 'Validate invoice registration number format',
            execute: async ({ registrationNumber }) => {
                try {
                    if (!/^T\d{13}$/.test(registrationNumber)) {
                        return {
                            success: false,
                            error: 'Invalid format. Should be T followed by 13 digits',
                            valid: false
                        };
                    }
                    return {
                        success: true,
                        valid: true,
                        message: 'Invoice registration number format is valid'
                    };
                }
                catch (error) {
                    logger_1.logger.error('Invoice number validation error:', error);
                    return {
                        success: false,
                        error: error.message,
                        valid: false
                    };
                }
            },
        },
        searchCustomers: {
            description: 'Search customers based on criteria in MongoDB',
            execute: async ({ criteria }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const filters = {
                        companyId: criteria.companyId
                    };
                    if (criteria.companyName) {
                        filters.companyName = { $regex: criteria.companyName, $options: 'i' };
                    }
                    if (criteria.industry) {
                        filters.industry = criteria.industry;
                    }
                    if (criteria.status) {
                        filters.status = criteria.status;
                    }
                    if (criteria.registrationNumber) {
                        filters.registrationNumber = criteria.registrationNumber;
                    }
                    if (criteria.hasInvoiceRegistration !== undefined) {
                        if (criteria.hasInvoiceRegistration) {
                            filters.registrationNumber = { $exists: true, $ne: null };
                        }
                        else {
                            filters.registrationNumber = { $exists: false };
                        }
                    }
                    const customers = await db.find(mongodb_client_1.Collections.CUSTOMERS, filters, {
                        sort: { companyName: 1 }
                    });
                    let filteredCustomers = customers;
                    if (criteria.tags && criteria.tags.length > 0) {
                        filteredCustomers = customers.filter(customer => criteria.tags.some(tag => customer.tags?.includes(tag)));
                    }
                    return {
                        success: true,
                        customers: filteredCustomers,
                        count: filteredCustomers.length,
                        message: `${filteredCustomers.length}件の顧客が見つかりました`
                    };
                }
                catch (error) {
                    logger_1.logger.error('Customer search error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        updateCustomer: {
            description: 'Update customer information in MongoDB',
            execute: async ({ customerData }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    if (!customerData._id) {
                        throw new Error('Customer ID is required for update operation');
                    }
                    if (customerData.registrationNumber) {
                        const isValid = await tools.validateInvoiceNumber({
                            registrationNumber: customerData.registrationNumber
                        });
                        if (!isValid.success) {
                            return {
                                success: false,
                                error: 'Invalid invoice registration number format'
                            };
                        }
                    }
                    const { _id, ...updateData } = customerData;
                    updateData.updatedAt = new Date();
                    const result = await db.update(mongodb_client_1.Collections.CUSTOMERS, _id, updateData);
                    if (!result) {
                        return {
                            success: false,
                            error: 'Customer not found'
                        };
                    }
                    return {
                        success: true,
                        customer: result,
                        message: '顧客情報が正常に更新されました'
                    };
                }
                catch (error) {
                    logger_1.logger.error('Customer update error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        analyzeCustomer: {
            description: 'Analyze customer data and relationships',
            execute: async ({ type, period, customerId, companyId }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    let analysisResult;
                    switch (type) {
                        case 'revenue':
                            const invoices = await db.find(mongodb_client_1.Collections.INVOICES, {
                                customerId: customerId,
                                companyId: companyId,
                                issueDate: {
                                    $gte: new Date(period.startDate),
                                    $lte: new Date(period.endDate)
                                }
                            });
                            const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
                            const monthlyBreakdown = {};
                            invoices.forEach(invoice => {
                                const month = invoice.issueDate.toISOString().substring(0, 7);
                                monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + invoice.totalAmount;
                            });
                            const months = Object.keys(monthlyBreakdown).sort();
                            let growthRate = 0;
                            if (months.length >= 2) {
                                const lastMonth = monthlyBreakdown[months[months.length - 1]];
                                const previousMonth = monthlyBreakdown[months[months.length - 2]];
                                growthRate = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth * 100) : 0;
                            }
                            analysisResult = {
                                type: 'revenue_analysis',
                                customerId,
                                period,
                                totalRevenue,
                                monthlyBreakdown,
                                invoiceCount: invoices.length,
                                averageInvoiceAmount: invoices.length > 0 ? totalRevenue / invoices.length : 0,
                                growthRate: Math.round(growthRate * 100) / 100
                            };
                            break;
                        case 'payment_history':
                            const paymentInvoices = await db.find(mongodb_client_1.Collections.INVOICES, {
                                customerId: customerId,
                                companyId: companyId,
                                issueDate: {
                                    $gte: new Date(period.startDate),
                                    $lte: new Date(period.endDate)
                                }
                            });
                            const paidInvoices = paymentInvoices.filter(inv => inv.status === 'paid');
                            const overdueInvoices = paymentInvoices.filter(inv => {
                                const dueDate = new Date(inv.dueDate);
                                return inv.status !== 'paid' && dueDate < new Date();
                            });
                            let averagePaymentDays = 0;
                            if (paidInvoices.length > 0) {
                                averagePaymentDays = 15;
                            }
                            analysisResult = {
                                type: 'payment_history',
                                customerId,
                                period,
                                totalInvoices: paymentInvoices.length,
                                paidInvoices: paidInvoices.length,
                                overdueInvoices: overdueInvoices.length,
                                paymentRate: paymentInvoices.length > 0 ? (paidInvoices.length / paymentInvoices.length * 100) : 0,
                                averagePaymentDays: averagePaymentDays
                            };
                            break;
                        case 'transaction_frequency':
                            const allInvoices = await db.find(mongodb_client_1.Collections.INVOICES, {
                                customerId: customerId,
                                companyId: companyId,
                                issueDate: {
                                    $gte: new Date(period.startDate),
                                    $lte: new Date(period.endDate)
                                }
                            });
                            const transactionsByMonth = {};
                            allInvoices.forEach(invoice => {
                                const month = invoice.issueDate.toISOString().substring(0, 7);
                                transactionsByMonth[month] = (transactionsByMonth[month] || 0) + 1;
                            });
                            const monthCount = Object.keys(transactionsByMonth).length;
                            const averageMonthlyTransactions = monthCount > 0 ? allInvoices.length / monthCount : 0;
                            const monthlyValues = Object.values(transactionsByMonth);
                            let trend = 'stable';
                            if (monthlyValues.length >= 2) {
                                const recent = monthlyValues.slice(-2);
                                if (recent[1] > recent[0] * 1.2)
                                    trend = 'increasing';
                                else if (recent[1] < recent[0] * 0.8)
                                    trend = 'decreasing';
                            }
                            analysisResult = {
                                type: 'transaction_frequency',
                                customerId,
                                period,
                                totalTransactions: allInvoices.length,
                                averageMonthlyTransactions: Math.round(averageMonthlyTransactions * 100) / 100,
                                monthlyBreakdown: transactionsByMonth,
                                trend: trend,
                                lastTransactionDate: allInvoices.length > 0 ?
                                    allInvoices.sort((a, b) => b.issueDate - a.issueDate)[0].issueDate : null
                            };
                            break;
                        case 'credit_risk':
                            const riskFactors = await tools.calculateCreditRisk({
                                customerId,
                                period,
                                companyId
                            });
                            analysisResult = riskFactors;
                            break;
                        default:
                            throw new Error(`Unknown analysis type: ${type}`);
                    }
                    return {
                        success: true,
                        analysis: analysisResult,
                        message: '顧客分析が完了しました'
                    };
                }
                catch (error) {
                    logger_1.logger.error('Customer analysis error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        calculateCreditRisk: {
            description: 'Calculate customer credit risk based on payment history and transaction patterns',
            execute: async ({ customerId, period, companyId }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const customer = await db.findById(mongodb_client_1.Collections.CUSTOMERS, customerId);
                    if (!customer) {
                        throw new Error('Customer not found');
                    }
                    const twelveMonthsAgo = new Date();
                    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
                    const invoices = await db.find(mongodb_client_1.Collections.INVOICES, {
                        customerId: customerId,
                        companyId: companyId,
                        issueDate: { $gte: twelveMonthsAgo }
                    });
                    let riskScore = 100;
                    const factors = [];
                    const overdueInvoices = invoices.filter(inv => {
                        const dueDate = new Date(inv.dueDate);
                        return inv.status !== 'paid' && dueDate < new Date();
                    });
                    const overdueRate = invoices.length > 0 ? (overdueInvoices.length / invoices.length) : 0;
                    if (overdueRate > 0.3) {
                        riskScore -= 30;
                        factors.push('High overdue payment rate (>30%)');
                    }
                    else if (overdueRate > 0.1) {
                        riskScore -= 15;
                        factors.push('Moderate overdue payment rate (>10%)');
                    }
                    const recentInvoices = invoices.filter(inv => {
                        const threeMonthsAgo = new Date();
                        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                        return inv.issueDate >= threeMonthsAgo;
                    });
                    if (recentInvoices.length === 0 && invoices.length > 0) {
                        riskScore -= 20;
                        factors.push('No recent transactions (last 3 months)');
                    }
                    const riskyIndustries = ['飲食業', '小売業', '観光業', 'イベント業'];
                    if (riskyIndustries.includes(customer.industry)) {
                        riskScore -= 10;
                        factors.push(`High-risk industry: ${customer.industry}`);
                    }
                    if (invoices.length >= 3) {
                        const amounts = invoices.map(inv => inv.totalAmount);
                        const avg = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
                        const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - avg, 2), 0) / amounts.length;
                        const stdDev = Math.sqrt(variance);
                        const coefficient = avg > 0 ? (stdDev / avg) : 0;
                        if (coefficient > 1.0) {
                            riskScore -= 15;
                            factors.push('High transaction amount volatility');
                        }
                    }
                    let level = 'low';
                    if (riskScore < 50)
                        level = 'high';
                    else if (riskScore < 70)
                        level = 'medium';
                    const recommendations = [];
                    if (level === 'high') {
                        recommendations.push('Consider requiring advance payment or deposits');
                        recommendations.push('Set lower credit limit');
                        recommendations.push('Monitor transactions closely');
                        recommendations.push('Consider payment guarantees or insurance');
                    }
                    else if (level === 'medium') {
                        recommendations.push('Regular payment monitoring');
                        recommendations.push('Consider shorter payment terms');
                        recommendations.push('Establish credit limit');
                    }
                    else {
                        recommendations.push('Maintain current payment terms');
                        recommendations.push('Consider offering extended credit terms for loyal customers');
                    }
                    return {
                        type: 'credit_risk',
                        customerId,
                        riskScore: Math.max(0, riskScore),
                        riskLevel: level,
                        factors: factors,
                        recommendations: recommendations,
                        dataPoints: {
                            totalInvoices: invoices.length,
                            overdueInvoices: overdueInvoices.length,
                            overdueRate: Math.round(overdueRate * 1000) / 10,
                            recentTransactions: recentInvoices.length,
                            industry: customer.industry
                        }
                    };
                }
                catch (error) {
                    logger_1.logger.error('Credit risk calculation error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        exportCustomers: {
            description: 'Export customer data in various formats',
            execute: async ({ format, fields, filters, companyId }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const searchFilters = {
                        companyId: companyId,
                        ...(filters || {})
                    };
                    const customers = await db.find(mongodb_client_1.Collections.CUSTOMERS, searchFilters, {
                        sort: { companyName: 1 }
                    });
                    const selectedFields = fields || [
                        'companyName', 'companyNameKana', 'registrationNumber',
                        'customerType', 'industry', 'status',
                        'contact.primaryName', 'contact.primaryEmail', 'contact.primaryPhone'
                    ];
                    const exportData = customers.map(customer => {
                        const row = {};
                        selectedFields.forEach(field => {
                            if (field.includes('.')) {
                                const [parent, child] = field.split('.');
                                row[field] = customer[parent]?.[child] || '';
                            }
                            else {
                                row[field] = customer[field] || '';
                            }
                        });
                        return row;
                    });
                    let result;
                    switch (format) {
                        case 'csv':
                            const headers = selectedFields.join(',');
                            const rows = exportData.map(row => selectedFields.map(field => `"${(row[field] || '').toString().replace(/"/g, '""')}"`).join(','));
                            result = {
                                success: true,
                                format: 'csv',
                                content: [headers, ...rows].join('\n'),
                                filename: `customers_${new Date().toISOString().split('T')[0]}.csv`,
                                recordCount: customers.length
                            };
                            break;
                        case 'json':
                            result = {
                                success: true,
                                format: 'json',
                                content: JSON.stringify(exportData, null, 2),
                                filename: `customers_${new Date().toISOString().split('T')[0]}.json`,
                                recordCount: customers.length
                            };
                            break;
                        case 'excel':
                            result = {
                                success: true,
                                format: 'excel',
                                data: exportData,
                                headers: selectedFields,
                                filename: `customers_${new Date().toISOString().split('T')[0]}.xlsx`,
                                recordCount: customers.length,
                                message: 'Excel export data prepared (requires external Excel library for file generation)'
                            };
                            break;
                        default:
                            throw new Error(`Unknown export format: ${format}`);
                    }
                    return result;
                }
                catch (error) {
                    logger_1.logger.error('Customer export error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
    },
    execute: async ({ input, tools }) => {
        try {
            logger_1.logger.debug('[Customer Agent] Starting operation:', input.operation);
            switch (input.operation) {
                case 'create':
                    if (!input.customerData) {
                        throw new Error('Customer data is required for create operation');
                    }
                    const createResult = await tools.createCustomer({
                        customerData: input.customerData
                    });
                    return {
                        success: true,
                        operation: 'create',
                        result: createResult
                    };
                case 'update':
                    if (!input.customerData) {
                        throw new Error('Customer data is required for update operation');
                    }
                    const updateResult = await tools.updateCustomer({
                        customerData: input.customerData
                    });
                    return {
                        success: true,
                        operation: 'update',
                        result: updateResult
                    };
                case 'search':
                    if (!input.searchCriteria) {
                        throw new Error('Search criteria is required for search operation');
                    }
                    const searchResult = await tools.searchCustomers({
                        criteria: input.searchCriteria
                    });
                    return {
                        success: true,
                        operation: 'search',
                        result: searchResult
                    };
                case 'analyze':
                    if (!input.analysisOptions) {
                        throw new Error('Analysis options are required for analyze operation');
                    }
                    const analysisResult = await tools.analyzeCustomer({
                        type: input.analysisOptions.type,
                        period: input.analysisOptions.period,
                        customerId: input.analysisOptions.customerId,
                        companyId: input.analysisOptions.companyId
                    });
                    return {
                        success: true,
                        operation: 'analyze',
                        result: analysisResult
                    };
                case 'export':
                    if (!input.exportOptions) {
                        throw new Error('Export options are required for export operation');
                    }
                    const exportResult = await tools.exportCustomers({
                        format: input.exportOptions.format,
                        fields: input.exportOptions.fields,
                        filters: input.exportOptions.filters,
                        companyId: input.exportOptions.companyId
                    });
                    return {
                        success: true,
                        operation: 'export',
                        result: exportResult
                    };
                case 'validate_invoice_number':
                    if (!input.validationData) {
                        throw new Error('Validation data is required for validate_invoice_number operation');
                    }
                    const validationResult = await tools.validateInvoiceNumber({
                        registrationNumber: input.validationData.registrationNumber
                    });
                    return {
                        success: true,
                        operation: 'validate_invoice_number',
                        result: validationResult
                    };
                default:
                    throw new Error(`Unknown operation: ${input.operation}`);
            }
        }
        catch (error) {
            logger_1.logger.error('[Customer Agent] Error:', error);
            return {
                success: false,
                operation: input.operation,
                error: error.message
            };
        }
    },
});
exports.default = exports.customerAgent;
//# sourceMappingURL=customer-agent.js.map