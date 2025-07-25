"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productAgent = void 0;
const zod_1 = require("zod");
const core_1 = require("@mastra/core");
// 商品情報スキーマ
const productSchema = zod_1.z.object({
    id: zod_1.z.string().optional(),
    productCode: zod_1.z.string(),
    productName: zod_1.z.string(),
    productNameKana: zod_1.z.string().optional(),
    productType: zod_1.z.enum(['goods', 'service', 'digital', 'subscription']),
    category: zod_1.z.string(),
    subCategory: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    unit: zod_1.z.string().default('個'), // 個、本、枚、時間、月額等
    pricing: zod_1.z.object({
        basePrice: zod_1.z.number(),
        currency: zod_1.z.string().default('JPY'),
        taxType: zod_1.z.enum(['standard', 'reduced', 'exempt', 'non_taxable']),
        taxRate: zod_1.z.number().optional(), // NLWebから動的に取得
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
        cogsAccount: zod_1.z.string().optional(), // Cost of Goods Sold
    }),
    status: zod_1.z.enum(['active', 'inactive', 'discontinued']).default('active'),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    customFields: zod_1.z.record(zod_1.z.any()).optional(),
});
// 在庫トランザクションスキーマ
const inventoryTransactionSchema = zod_1.z.object({
    productId: zod_1.z.string(),
    transactionType: zod_1.z.enum(['purchase', 'sale', 'adjustment', 'return', 'transfer']),
    quantity: zod_1.z.number(),
    unitPrice: zod_1.z.number().optional(),
    totalAmount: zod_1.z.number().optional(),
    reference: zod_1.z.string().optional(), // 注文番号、請求書番号等
    notes: zod_1.z.string().optional(),
    date: zod_1.z.string(),
});
// 商品管理エージェントの入力スキーマ
const productInputSchema = zod_1.z.object({
    // 商品操作
    operation: zod_1.z.enum(['create', 'update', 'search', 'analyze', 'inventory_transaction']),
    // 商品データ
    productData: productSchema.optional(),
    // 検索条件
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
    }).optional(),
    // 分析オプション
    analysisOptions: zod_1.z.object({
        type: zod_1.z.enum(['sales_performance', 'inventory_turnover', 'profitability', 'demand_forecast']),
        period: zod_1.z.object({
            startDate: zod_1.z.string(),
            endDate: zod_1.z.string(),
        }),
        productId: zod_1.z.string().optional(),
        category: zod_1.z.string().optional(),
    }).optional(),
    // 在庫トランザクション
    inventoryTransaction: inventoryTransactionSchema.optional(),
});
// 商品管理エージェント定義
exports.productAgent = (0, core_1.createAgent)({
    id: 'product-agent',
    name: 'Product Management Agent',
    description: 'Manage products, services, inventory, and analyze product performance',
    inputSchema: productInputSchema,
    // エージェントのツール
    tools: {
        // 商品作成
        createProduct: {
            description: 'Create a new product or service',
            execute: async ({ productData, mcpClient }) => {
                // 税率の自動判定（NLWeb使用）
                if (!productData.pricing.taxRate) {
                    const taxResult = await mcpClient.callTool('nlweb', 'get_tax_rate', {
                        item: productData.productName,
                        context: {
                            category: productData.category,
                            productType: productData.productType,
                            date: new Date().toISOString().split('T')[0]
                        }
                    });
                    productData.pricing.taxRate = taxResult.taxRate;
                    productData.pricing.taxType = taxResult.taxRate === 0.08 ? 'reduced' : 'standard';
                }
                // 勘定科目の自動判定
                if (!productData.accounting.inventoryAccount && productData.productType === 'goods') {
                    const accountResult = await mcpClient.callTool('nlweb', 'determine_account_category', {
                        description: `商品在庫：${productData.productName}`,
                        businessContext: {
                            type: 'inventory',
                            category: productData.category
                        }
                    });
                    productData.accounting.inventoryAccount = accountResult.suggestedCategory || '商品';
                }
                // データベースに保存
                const result = await mcpClient.callTool('supabase', 'insert', {
                    table: 'products',
                    data: {
                        ...productData,
                        created_at: new Date().toISOString()
                    }
                });
                return result;
            },
        },
        // 商品検索
        searchProducts: {
            description: 'Search products based on criteria',
            execute: async ({ criteria, mcpClient }) => {
                const filters = {};
                if (criteria.productCode) {
                    filters.productCode = criteria.productCode;
                }
                if (criteria.productName) {
                    filters.productName = { ilike: `%${criteria.productName}%` };
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
                // 価格範囲フィルタ
                if (criteria.priceRange) {
                    if (criteria.priceRange.min !== undefined) {
                        filters['pricing.basePrice'] = { gte: criteria.priceRange.min };
                    }
                    if (criteria.priceRange.max !== undefined) {
                        filters['pricing.basePrice'] = {
                            ...filters['pricing.basePrice'],
                            lte: criteria.priceRange.max
                        };
                    }
                }
                const result = await mcpClient.callTool('supabase', 'select', {
                    table: 'products',
                    filters,
                    options: {
                        orderBy: 'productName',
                        orderDirection: 'asc'
                    }
                });
                // 在庫フィルタ（後処理）
                if (criteria.inStock !== undefined) {
                    result.data = result.data.filter(product => {
                        if (!product.inventory?.trackInventory)
                            return true;
                        return criteria.inStock ? product.inventory.currentStock > 0 : product.inventory.currentStock === 0;
                    });
                }
                return result;
            },
        },
        // 在庫トランザクション処理
        processInventoryTransaction: {
            description: 'Process inventory transaction',
            execute: async ({ transaction, mcpClient }) => {
                // 商品情報取得
                const productResult = await mcpClient.callTool('supabase', 'select', {
                    table: 'products',
                    filters: { id: transaction.productId }
                });
                if (!productResult.data || productResult.data.length === 0) {
                    throw new Error('Product not found');
                }
                const product = productResult.data[0];
                if (!product.inventory?.trackInventory) {
                    throw new Error('Inventory tracking is not enabled for this product');
                }
                // 在庫数量の計算
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
                        newStock = transaction.quantity; // 絶対値で設定
                        break;
                    case 'return':
                        newStock += transaction.quantity;
                        break;
                }
                // トランザクション開始
                const transactionId = `inv_txn_${Date.now()}`;
                try {
                    // 在庫トランザクション記録
                    await mcpClient.callTool('supabase', 'insert', {
                        table: 'inventory_transactions',
                        data: {
                            ...transaction,
                            transaction_id: transactionId,
                            previous_stock: product.inventory.currentStock,
                            new_stock: newStock,
                            created_at: new Date().toISOString()
                        }
                    });
                    // 商品在庫更新
                    await mcpClient.callTool('supabase', 'update', {
                        table: 'products',
                        filters: { id: transaction.productId },
                        data: {
                            'inventory.currentStock': newStock,
                            updated_at: new Date().toISOString()
                        }
                    });
                    // 会計仕訳の作成（売上・仕入の場合）
                    if (['purchase', 'sale'].includes(transaction.transactionType)) {
                        const journalEntry = await tools.createAccountingEntry({
                            product,
                            transaction,
                            mcpClient
                        });
                    }
                    // 在庫警告チェック
                    if (product.inventory.reorderPoint && newStock <= product.inventory.reorderPoint) {
                        await tools.sendReorderAlert({
                            product,
                            currentStock: newStock,
                            mcpClient
                        });
                    }
                    return {
                        success: true,
                        transactionId,
                        previousStock: product.inventory.currentStock,
                        newStock,
                        product: product.productName
                    };
                }
                catch (error) {
                    // ロールバック処理
                    console.error('Inventory transaction failed:', error);
                    throw error;
                }
            },
        },
        // 会計仕訳作成
        createAccountingEntry: {
            description: 'Create accounting entry for inventory transaction',
            execute: async ({ product, transaction, mcpClient }) => {
                let journalEntry;
                if (transaction.transactionType === 'sale') {
                    // 売上仕訳
                    journalEntry = {
                        date: transaction.date,
                        description: `${product.productName} 売上`,
                        debit: { account: '売掛金', amount: transaction.totalAmount },
                        credit: { account: product.accounting.revenueAccount, amount: transaction.totalAmount },
                        reference: transaction.reference
                    };
                    // 売上原価計上（在庫商品の場合）
                    if (product.cost?.unitCost) {
                        const cogsAmount = product.cost.unitCost * transaction.quantity;
                        const cogsEntry = {
                            date: transaction.date,
                            description: `${product.productName} 売上原価`,
                            debit: { account: product.accounting.cogsAccount || '売上原価', amount: cogsAmount },
                            credit: { account: product.accounting.inventoryAccount || '商品', amount: cogsAmount },
                            reference: transaction.reference
                        };
                        await mcpClient.callTool('accounting', 'create_journal_entry', cogsEntry);
                    }
                }
                else if (transaction.transactionType === 'purchase') {
                    // 仕入仕訳
                    journalEntry = {
                        date: transaction.date,
                        description: `${product.productName} 仕入`,
                        debit: { account: product.accounting.inventoryAccount || '商品', amount: transaction.totalAmount },
                        credit: { account: '買掛金', amount: transaction.totalAmount },
                        reference: transaction.reference
                    };
                }
                if (journalEntry) {
                    return await mcpClient.callTool('accounting', 'create_journal_entry', journalEntry);
                }
            },
        },
        // 商品分析
        analyzeProduct: {
            description: 'Analyze product performance',
            execute: async ({ type, period, productId, category, mcpClient }) => {
                switch (type) {
                    case 'sales_performance':
                        // 売上実績分析
                        const salesData = await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'analyze_product_sales',
                            params: {
                                product_id: productId,
                                category: category,
                                start_date: period.startDate,
                                end_date: period.endDate
                            }
                        });
                        return {
                            type: 'sales_performance',
                            period,
                            totalRevenue: salesData.total_revenue,
                            totalQuantity: salesData.total_quantity,
                            averagePrice: salesData.average_price,
                            monthlyTrend: salesData.monthly_trend,
                            topCustomers: salesData.top_customers,
                            growthRate: salesData.growth_rate
                        };
                    case 'inventory_turnover':
                        // 在庫回転率分析
                        const inventoryData = await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'analyze_inventory_turnover',
                            params: {
                                product_id: productId,
                                category: category,
                                start_date: period.startDate,
                                end_date: period.endDate
                            }
                        });
                        const turnoverRate = inventoryData.cogs / inventoryData.average_inventory;
                        const daysInInventory = 365 / turnoverRate;
                        return {
                            type: 'inventory_turnover',
                            period,
                            turnoverRate: turnoverRate.toFixed(2),
                            daysInInventory: Math.round(daysInInventory),
                            averageInventory: inventoryData.average_inventory,
                            costOfGoodsSold: inventoryData.cogs,
                            stockouts: inventoryData.stockout_count,
                            recommendation: daysInInventory > 90 ? 'Consider reducing inventory levels' : 'Inventory levels are optimal'
                        };
                    case 'profitability':
                        // 収益性分析
                        const profitData = await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'analyze_product_profitability',
                            params: {
                                product_id: productId,
                                category: category,
                                start_date: period.startDate,
                                end_date: period.endDate
                            }
                        });
                        const grossMargin = ((profitData.revenue - profitData.cogs) / profitData.revenue) * 100;
                        return {
                            type: 'profitability',
                            period,
                            revenue: profitData.revenue,
                            costOfGoodsSold: profitData.cogs,
                            grossProfit: profitData.revenue - profitData.cogs,
                            grossMargin: `${grossMargin.toFixed(1)}%`,
                            unitsSold: profitData.units_sold,
                            averageUnitProfit: (profitData.revenue - profitData.cogs) / profitData.units_sold,
                            profitTrend: profitData.monthly_profit_trend
                        };
                    case 'demand_forecast':
                        // 需要予測
                        const historicalData = await mcpClient.callTool('supabase', 'rpc', {
                            functionName: 'get_sales_history',
                            params: {
                                product_id: productId,
                                months: 12
                            }
                        });
                        // 簡易的な移動平均予測
                        const recentMonths = historicalData.slice(-3);
                        const averageMonthlySales = recentMonths.reduce((sum, month) => sum + month.quantity, 0) / 3;
                        // 季節性を考慮（前年同月比）
                        const lastYearSameMonth = historicalData.find(d => new Date(d.month).getMonth() === new Date().getMonth() - 1);
                        const seasonalFactor = lastYearSameMonth ? lastYearSameMonth.quantity / averageMonthlySales : 1;
                        const forecastQuantity = Math.round(averageMonthlySales * seasonalFactor);
                        return {
                            type: 'demand_forecast',
                            nextMonthForecast: forecastQuantity,
                            confidenceLevel: 'medium',
                            historicalAverage: averageMonthlySales,
                            seasonalFactor: seasonalFactor.toFixed(2),
                            recommendedStock: forecastQuantity * 1.2, // 20%のバッファ
                            historicalData: historicalData
                        };
                    default:
                        throw new Error(`Unknown analysis type: ${type}`);
                }
            },
        },
        // 再注文アラート送信
        sendReorderAlert: {
            description: 'Send reorder alert for low stock',
            execute: async ({ product, currentStock, mcpClient }) => {
                // 通知を記録
                await mcpClient.callTool('supabase', 'insert', {
                    table: 'notifications',
                    data: {
                        type: 'reorder_alert',
                        title: `在庫警告: ${product.productName}`,
                        message: `現在の在庫数: ${currentStock}、再注文点: ${product.inventory.reorderPoint}`,
                        productId: product.id,
                        status: 'unread',
                        created_at: new Date().toISOString()
                    }
                });
                // TODO: メール送信、Slack通知等の実装
                return { sent: true };
            },
        },
    },
    // メイン実行ロジック
    execute: async ({ input, tools, mcpClient }) => {
        try {
            console.log('[Product Agent] Starting operation:', input.operation);
            switch (input.operation) {
                case 'create':
                    if (!input.productData) {
                        throw new Error('Product data is required for create operation');
                    }
                    const createResult = await tools.createProduct({
                        productData: input.productData,
                        mcpClient
                    });
                    return {
                        success: true,
                        operation: 'create',
                        productId: createResult.data[0].id,
                        result: createResult
                    };
                case 'update':
                    if (!input.productData || !input.productData.id) {
                        throw new Error('Product ID is required for update operation');
                    }
                    const updateResult = await mcpClient.callTool('supabase', 'update', {
                        table: 'products',
                        filters: { id: input.productData.id },
                        data: {
                            ...input.productData,
                            updated_at: new Date().toISOString()
                        }
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
                    const searchResult = await tools.searchProducts({
                        criteria: input.searchCriteria,
                        mcpClient
                    });
                    return {
                        success: true,
                        operation: 'search',
                        count: searchResult.data.length,
                        result: searchResult
                    };
                case 'analyze':
                    if (!input.analysisOptions) {
                        throw new Error('Analysis options are required for analyze operation');
                    }
                    const analysisResult = await tools.analyzeProduct({
                        ...input.analysisOptions,
                        mcpClient
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
                        transaction: input.inventoryTransaction,
                        mcpClient
                    });
                    return {
                        success: true,
                        operation: 'inventory_transaction',
                        result: transactionResult
                    };
                default:
                    throw new Error(`Unknown operation: ${input.operation}`);
            }
        }
        catch (error) {
            console.error('[Product Agent] Error:', error);
            throw error;
        }
    },
});
// エージェントのエクスポート
exports.default = exports.productAgent;
