"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productAgent = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
const mongodb_client_1 = require("@/lib/mongodb-client");
const mongodb_1 = require("mongodb");
const logger_1 = require("@/lib/logger");
const productSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    productCode: zod_1.z.string(),
    productName: zod_1.z.string(),
    productNameKana: zod_1.z.string().optional(),
    productType: zod_1.z.enum(['goods', 'service', 'digital', 'subscription']),
    category: zod_1.z.string(),
    subCategory: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    unit: zod_1.z.string().default('個'),
    pricing: zod_1.z.object({
        basePrice: zod_1.z.number(),
        currency: zod_1.z.string().default('JPY'),
        taxType: zod_1.z.enum(['standard', 'reduced', 'exempt', 'non_taxable']),
        taxRate: zod_1.z.number().optional(),
        priceIncludesTax: zod_1.z.boolean().default(false),
    }),
    cost: zod_1.z.object({
        unitCost: zod_1.z.number().optional(),
        supplier: zod_1.z.string().optional(),
        leadTimeDays: zod_1.z.number().optional(),
    }).optional(),
    inventory: zod_1.z.object({
        trackInventory: zod_1.z.boolean().default(false),
        currentStock: zod_1.z.number().default(0),
        reorderPoint: zod_1.z.number().optional(),
        reorderQuantity: zod_1.z.number().optional(),
        warehouseLocation: zod_1.z.string().optional(),
    }).optional(),
    accounting: zod_1.z.object({
        revenueAccount: zod_1.z.string().default('売上高'),
        inventoryAccount: zod_1.z.string().optional(),
        cogsAccount: zod_1.z.string().optional(),
    }),
    status: zod_1.z.enum(['active', 'inactive', 'discontinued']).default('active'),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    customFields: zod_1.z.record(zod_1.z.any()).optional(),
    companyId: zod_1.z.string(),
});
const inventoryTransactionSchema = zod_1.z.object({
    productId: zod_1.z.string(),
    transactionType: zod_1.z.enum(['purchase', 'sale', 'adjustment', 'return', 'transfer']),
    quantity: zod_1.z.number(),
    unitPrice: zod_1.z.number().optional(),
    totalAmount: zod_1.z.number().optional(),
    reference: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
    date: zod_1.z.string(),
    companyId: zod_1.z.string(),
});
const productInputSchema = zod_1.z.object({
    operation: zod_1.z.enum(['create', 'update', 'search', 'analyze', 'inventory_transaction']),
    productData: productSchema.optional(),
    searchCriteria: zod_1.z.object({
        query: zod_1.z.string().optional(),
        productCode: zod_1.z.string().optional(),
        productName: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        productType: zod_1.z.enum(['goods', 'service', 'digital', 'subscription']).optional(),
        status: zod_1.z.enum(['active', 'inactive', 'discontinued']).optional(),
        priceRange: zod_1.z.object({
            min: zod_1.z.number().optional(),
            max: zod_1.z.number().optional(),
        }).optional(),
        inStock: zod_1.z.boolean().optional(),
        companyId: zod_1.z.string(),
    }).optional(),
    analysisOptions: zod_1.z.object({
        type: zod_1.z.enum(['sales_performance', 'inventory_turnover', 'profitability', 'demand_forecast']),
        period: zod_1.z.object({
            startDate: zod_1.z.string(),
            endDate: zod_1.z.string(),
        }),
        productId: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
        companyId: zod_1.z.string(),
    }).optional(),
    inventoryTransaction: inventoryTransactionSchema.optional(),
});
exports.productAgent = (0, core_1.createAgent)({
    id: 'product-agent',
    name: 'Product Management Agent',
    description: 'Manage products, services, inventory, and analyze product performance with MongoDB integration',
    inputSchema: productInputSchema,
    tools: {
        createProduct: {
            description: 'Create a new product or service',
            execute: async ({ productData }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const existingProduct = await db.findOne(mongodb_client_1.Collections.PRODUCTS, {
                        productCode: productData.productCode,
                        companyId: productData.companyId
                    });
                    if (existingProduct) {
                        throw new Error(`Product code ${productData.productCode} already exists`);
                    }
                    const productRecord = {
                        ...productData,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    const result = await db.create(mongodb_client_1.Collections.PRODUCTS, productRecord);
                    return {
                        success: true,
                        productId: result._id.toString(),
                        message: '商品が作成されました'
                    };
                }
                catch (error) {
                    logger_1.logger.error('Product creation error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        searchProducts: {
            description: 'Search products based on criteria',
            execute: async ({ criteria }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const filters = { companyId: criteria.companyId };
                    if (criteria.productCode) {
                        filters.productCode = criteria.productCode;
                    }
                    if (criteria.productName) {
                        filters.productName = { $regex: criteria.productName, $options: 'i' };
                    }
                    if (criteria.category) {
                        filters.category = criteria.category;
                    }
                    if (criteria.productType) {
                        filters.productType = criteria.productType;
                    }
                    if (criteria.status) {
                        filters.status = criteria.status;
                    }
                    if (criteria.priceRange) {
                        if (criteria.priceRange.min !== undefined) {
                            filters['pricing.basePrice'] = { $gte: criteria.priceRange.min };
                        }
                        if (criteria.priceRange.max !== undefined) {
                            filters['pricing.basePrice'] = {
                                ...filters['pricing.basePrice'],
                                $lte: criteria.priceRange.max
                            };
                        }
                    }
                    const products = await db.findMany(mongodb_client_1.Collections.PRODUCTS, filters, {
                        sort: { productName: 1 }
                    });
                    let filteredProducts = products;
                    if (criteria.inStock !== undefined) {
                        filteredProducts = products.filter(product => {
                            if (!product.inventory?.trackInventory)
                                return true;
                            return criteria.inStock ? product.inventory.currentStock > 0 : product.inventory.currentStock === 0;
                        });
                    }
                    return {
                        success: true,
                        count: filteredProducts.length,
                        products: filteredProducts
                    };
                }
                catch (error) {
                    logger_1.logger.error('Product search error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        processInventoryTransaction: {
            description: 'Process inventory transaction',
            execute: async ({ transaction }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const product = await db.findOne(mongodb_client_1.Collections.PRODUCTS, {
                        _id: new mongodb_1.ObjectId(transaction.productId),
                        companyId: transaction.companyId
                    });
                    if (!product) {
                        throw new Error('Product not found');
                    }
                    if (!product.inventory?.trackInventory) {
                        throw new Error('Inventory tracking is not enabled for this product');
                    }
                    let newStock = product.inventory.currentStock;
                    switch (transaction.transactionType) {
                        case 'purchase':
                            newStock += transaction.quantity;
                            break;
                        case 'sale':
                        case 'transfer':
                            if (newStock < transaction.quantity) {
                                throw new Error(`Insufficient stock. Available: ${newStock}, Requested: ${transaction.quantity}`);
                            }
                            newStock -= transaction.quantity;
                            break;
                        case 'adjustment':
                            newStock = transaction.quantity;
                            break;
                        case 'return':
                            newStock += transaction.quantity;
                            break;
                    }
                    const transactionRecord = {
                        ...transaction,
                        productName: product.productName,
                        previousStock: product.inventory.currentStock,
                        newStock,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    const transactionResult = await db.create('inventory_transactions', transactionRecord);
                    await db.update(mongodb_client_1.Collections.PRODUCTS, transaction.productId, {
                        'inventory.currentStock': newStock,
                        updatedAt: new Date()
                    });
                    if (['purchase', 'sale'].includes(transaction.transactionType)) {
                        await this.createAccountingEntry({
                            product,
                            transaction,
                        });
                    }
                    if (product.inventory.reorderPoint && newStock <= product.inventory.reorderPoint) {
                        await this.sendReorderAlert({
                            product,
                            currentStock: newStock,
                        });
                    }
                    return {
                        success: true,
                        transactionId: transactionResult._id.toString(),
                        previousStock: product.inventory.currentStock,
                        newStock,
                        productName: product.productName,
                        message: '在庫トランザクションが処理されました'
                    };
                }
                catch (error) {
                    logger_1.logger.error('Inventory transaction error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        createAccountingEntry: {
            description: 'Create accounting entry for inventory transaction',
            execute: async ({ product, transaction }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    let journalEntry;
                    if (transaction.transactionType === 'sale') {
                        journalEntry = {
                            companyId: transaction.companyId,
                            date: transaction.date,
                            description: `${product.productName} 売上`,
                            entries: [
                                {
                                    account: '売掛金',
                                    debit: transaction.totalAmount,
                                    credit: 0
                                },
                                {
                                    account: product.accounting.revenueAccount,
                                    debit: 0,
                                    credit: transaction.totalAmount
                                }
                            ],
                            reference: transaction.reference,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        };
                        if (product.cost?.unitCost) {
                            const cogsAmount = product.cost.unitCost * transaction.quantity;
                            const cogsEntry = {
                                companyId: transaction.companyId,
                                date: transaction.date,
                                description: `${product.productName} 売上原価`,
                                entries: [
                                    {
                                        account: product.accounting.cogsAccount || '売上原価',
                                        debit: cogsAmount,
                                        credit: 0
                                    },
                                    {
                                        account: product.accounting.inventoryAccount || '商品',
                                        debit: 0,
                                        credit: cogsAmount
                                    }
                                ],
                                reference: transaction.reference,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            };
                            await db.create(mongodb_client_1.Collections.JOURNAL_ENTRIES, cogsEntry);
                        }
                    }
                    else if (transaction.transactionType === 'purchase') {
                        journalEntry = {
                            companyId: transaction.companyId,
                            date: transaction.date,
                            description: `${product.productName} 仕入`,
                            entries: [
                                {
                                    account: product.accounting.inventoryAccount || '商品',
                                    debit: transaction.totalAmount,
                                    credit: 0
                                },
                                {
                                    account: '買掛金',
                                    debit: 0,
                                    credit: transaction.totalAmount
                                }
                            ],
                            reference: transaction.reference,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        };
                    }
                    if (journalEntry) {
                        const result = await db.create(mongodb_client_1.Collections.JOURNAL_ENTRIES, journalEntry);
                        return {
                            success: true,
                            journalEntryId: result._id.toString()
                        };
                    }
                    return { success: true };
                }
                catch (error) {
                    logger_1.logger.error('Accounting entry creation error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        analyzeProduct: {
            description: 'Analyze product performance',
            execute: async ({ type, period, productId, category, companyId }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    switch (type) {
                        case 'sales_performance':
                            const pipeline = [
                                {
                                    $match: {
                                        companyId,
                                        date: { $gte: new Date(period.startDate), $lte: new Date(period.endDate) },
                                        transactionType: 'sale',
                                        ...(productId && { productId })
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        totalRevenue: { $sum: '$totalAmount' },
                                        totalQuantity: { $sum: '$quantity' },
                                        averagePrice: { $avg: '$unitPrice' },
                                        transactionCount: { $sum: 1 }
                                    }
                                }
                            ];
                            const salesData = await db.aggregate('inventory_transactions', pipeline);
                            const salesResult = salesData[0] || {
                                totalRevenue: 0,
                                totalQuantity: 0,
                                averagePrice: 0,
                                transactionCount: 0
                            };
                            return {
                                type: 'sales_performance',
                                period,
                                totalRevenue: salesResult.totalRevenue,
                                totalQuantity: salesResult.totalQuantity,
                                averagePrice: salesResult.averagePrice,
                                transactionCount: salesResult.transactionCount,
                                message: '売上実績分析が完了しました'
                            };
                        case 'inventory_turnover':
                            const inventoryProducts = await db.findMany(mongodb_client_1.Collections.PRODUCTS, {
                                companyId,
                                'inventory.trackInventory': true,
                                ...(category && { category })
                            });
                            let totalInventoryValue = 0;
                            let totalCOGS = 0;
                            for (const product of inventoryProducts) {
                                const currentValue = (product.inventory?.currentStock || 0) * (product.cost?.unitCost || 0);
                                totalInventoryValue += currentValue;
                                const salesTransactions = await db.findMany('inventory_transactions', {
                                    productId: product._id.toString(),
                                    transactionType: 'sale',
                                    date: { $gte: new Date(period.startDate), $lte: new Date(period.endDate) }
                                });
                                const productCOGS = salesTransactions.reduce((sum, txn) => sum + (txn.quantity * (product.cost?.unitCost || 0)), 0);
                                totalCOGS += productCOGS;
                            }
                            const averageInventory = totalInventoryValue;
                            const turnoverRate = averageInventory > 0 ? totalCOGS / averageInventory : 0;
                            const daysInInventory = turnoverRate > 0 ? 365 / turnoverRate : 0;
                            return {
                                type: 'inventory_turnover',
                                period,
                                turnoverRate: turnoverRate.toFixed(2),
                                daysInInventory: Math.round(daysInInventory),
                                averageInventory,
                                costOfGoodsSold: totalCOGS,
                                recommendation: daysInInventory > 90 ? 'Consider reducing inventory levels' : 'Inventory levels are optimal',
                                message: '在庫回転率分析が完了しました'
                            };
                        case 'profitability':
                            const profitPipeline = [
                                {
                                    $match: {
                                        companyId,
                                        date: { $gte: new Date(period.startDate), $lte: new Date(period.endDate) },
                                        transactionType: 'sale',
                                        ...(productId && { productId })
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        totalRevenue: { $sum: '$totalAmount' },
                                        totalQuantity: { $sum: '$quantity' }
                                    }
                                }
                            ];
                            const profitData = await db.aggregate('inventory_transactions', profitPipeline);
                            const profitResult = profitData[0] || { totalRevenue: 0, totalQuantity: 0 };
                            const estimatedCOGS = profitResult.totalRevenue * 0.6;
                            const grossProfit = profitResult.totalRevenue - estimatedCOGS;
                            const grossMargin = profitResult.totalRevenue > 0 ?
                                (grossProfit / profitResult.totalRevenue) * 100 : 0;
                            return {
                                type: 'profitability',
                                period,
                                revenue: profitResult.totalRevenue,
                                estimatedCOGS,
                                grossProfit,
                                grossMargin: `${grossMargin.toFixed(1)}%`,
                                unitsSold: profitResult.totalQuantity,
                                averageUnitProfit: profitResult.totalQuantity > 0 ?
                                    grossProfit / profitResult.totalQuantity : 0,
                                message: '収益性分析が完了しました'
                            };
                        case 'demand_forecast':
                            const forecastPipeline = [
                                {
                                    $match: {
                                        companyId,
                                        transactionType: 'sale',
                                        ...(productId && { productId }),
                                        date: { $gte: new Date(new Date().getTime() - 365 * 24 * 60 * 60 * 1000) }
                                    }
                                },
                                {
                                    $group: {
                                        _id: {
                                            year: { $year: '$date' },
                                            month: { $month: '$date' }
                                        },
                                        totalQuantity: { $sum: '$quantity' }
                                    }
                                },
                                { $sort: { '_id.year': 1, '_id.month': 1 } }
                            ];
                            const historicalData = await db.aggregate('inventory_transactions', forecastPipeline);
                            const recentMonths = historicalData.slice(-3);
                            const averageMonthlySales = recentMonths.length > 0 ?
                                recentMonths.reduce((sum, month) => sum + month.totalQuantity, 0) / recentMonths.length : 0;
                            const forecastQuantity = Math.round(averageMonthlySales);
                            return {
                                type: 'demand_forecast',
                                nextMonthForecast: forecastQuantity,
                                confidenceLevel: 'medium',
                                historicalAverage: averageMonthlySales,
                                recommendedStock: Math.round(forecastQuantity * 1.2),
                                historicalDataPoints: historicalData.length,
                                message: '需要予測分析が完了しました'
                            };
                        default:
                            throw new Error(`Unknown analysis type: ${type}`);
                    }
                }
                catch (error) {
                    logger_1.logger.error('Product analysis error:', error);
                    return {
                        success: false,
                        error: error.message
                    };
                }
            },
        },
        sendReorderAlert: {
            description: 'Send reorder alert for low stock',
            execute: async ({ product, currentStock }) => {
                try {
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const notification = {
                        companyId: product.companyId,
                        type: 'reorder_alert',
                        title: `在庫警告: ${product.productName}`,
                        message: `現在の在庫数: ${currentStock}、再注文点: ${product.inventory.reorderPoint}`,
                        productId: product._id.toString(),
                        status: 'unread',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    await db.create('notifications', notification);
                    return {
                        success: true,
                        message: '再注文アラートが送信されました'
                    };
                }
                catch (error) {
                    logger_1.logger.error('Reorder alert error:', error);
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
            logger_1.logger.debug('[Product Agent] Starting operation:', input.operation);
            switch (input.operation) {
                case 'create':
                    if (!input.productData) {
                        throw new Error('Product data is required for create operation');
                    }
                    const createResult = await tools.createProduct({
                        productData: input.productData
                    });
                    return {
                        success: createResult.success,
                        operation: 'create',
                        result: createResult
                    };
                case 'update':
                    if (!input.productData || !input.productData.id) {
                        throw new Error('Product ID is required for update operation');
                    }
                    const db = mongodb_client_1.DatabaseService.getInstance();
                    const updateResult = await db.update(mongodb_client_1.Collections.PRODUCTS, input.productData.id, {
                        ...input.productData,
                        updatedAt: new Date()
                    });
                    return {
                        success: !!updateResult,
                        operation: 'update',
                        result: updateResult ? 'Product updated successfully' : 'Product not found'
                    };
                case 'search':
                    if (!input.searchCriteria) {
                        throw new Error('Search criteria is required for search operation');
                    }
                    const searchResult = await tools.searchProducts({
                        criteria: input.searchCriteria
                    });
                    return {
                        success: searchResult.success,
                        operation: 'search',
                        result: searchResult
                    };
                case 'analyze':
                    if (!input.analysisOptions) {
                        throw new Error('Analysis options are required for analyze operation');
                    }
                    const analysisResult = await tools.analyzeProduct({
                        ...input.analysisOptions
                    });
                    return {
                        success: true,
                        operation: 'analyze',
                        result: analysisResult
                    };
                case 'inventory_transaction':
                    if (!input.inventoryTransaction) {
                        throw new Error('Inventory transaction data is required');
                    }
                    const transactionResult = await tools.processInventoryTransaction({
                        transaction: input.inventoryTransaction
                    });
                    return {
                        success: transactionResult.success,
                        operation: 'inventory_transaction',
                        result: transactionResult
                    };
                default:
                    throw new Error(`Unknown operation: ${input.operation}`);
            }
        }
        catch (error) {
            logger_1.logger.error('[Product Agent] Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },
});
exports.default = exports.productAgent;
//# sourceMappingURL=product-agent.js.map