import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

// 商品情報スキーマ
const productSchema = z.object({
  id: z.string().optional(),
  productCode: z.string(),
  productName: z.string(),
  productNameKana: z.string().optional(),
  productType: z.enum(['goods', 'service', 'digital', 'subscription']),
  category: z.string(),
  subCategory: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().default('個'), // 個、本、枚、時間、月額等
  pricing: z.object({
    basePrice: z.number(),
    currency: z.string().default('JPY'),
    taxType: z.enum(['standard', 'reduced', 'exempt', 'non_taxable']),
    taxRate: z.number().optional(), // NLWebから動的に取得
    priceIncludesTax: z.boolean().default(false),
  }),
  cost: z.object({
    unitCost: z.number().optional(),
    supplier: z.string().optional(),
    leadTimeDays: z.number().optional(),
  }).optional(),
  inventory: z.object({
    trackInventory: z.boolean().default(false),
    currentStock: z.number().default(0),
    reorderPoint: z.number().optional(),
    reorderQuantity: z.number().optional(),
    warehouseLocation: z.string().optional(),
  }).optional(),
  accounting: z.object({
    revenueAccount: z.string().default('売上高'),
    inventoryAccount: z.string().optional(),
    cogsAccount: z.string().optional(), // Cost of Goods Sold
  }),
  status: z.enum(['active', 'inactive', 'discontinued']).default('active'),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  companyId: z.string(),
});

// 在庫トランザクションスキーマ
const inventoryTransactionSchema = z.object({
  productId: z.string(),
  transactionType: z.enum(['purchase', 'sale', 'adjustment', 'return', 'transfer']),
  quantity: z.number(),
  unitPrice: z.number().optional(),
  totalAmount: z.number().optional(),
  reference: z.string().optional(), // 注文番号、請求書番号等
  notes: z.string().optional(),
  date: z.string(),
  companyId: z.string(),
});

// 商品管理エージェントの入力スキーマ
const productInputSchema = z.object({
  // 商品操作
  operation: z.enum(['create', 'update', 'search', 'analyze', 'inventory_transaction']),
  
  // 商品データ
  productData: productSchema.optional(),
  
  // 検索条件
  searchCriteria: z.object({
    query: z.string().optional(),
    productCode: z.string().optional(),
    productName: z.string().optional(),
    category: z.string().optional(),
    productType: z.enum(['goods', 'service', 'digital', 'subscription']).optional(),
    status: z.enum(['active', 'inactive', 'discontinued']).optional(),
    priceRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
    inStock: z.boolean().optional(),
    companyId: z.string(),
  }).optional(),
  
  // 分析オプション
  analysisOptions: z.object({
    type: z.enum(['sales_performance', 'inventory_turnover', 'profitability', 'demand_forecast']),
    period: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    productId: z.string().optional(),
    category: z.string().optional(),
    companyId: z.string(),
  }).optional(),
  
  // 在庫トランザクション
  inventoryTransaction: inventoryTransactionSchema.optional(),
});

// 商品管理エージェント定義
export const productAgent = createAgent({
  id: 'product-agent',
  name: 'Product Management Agent',
  description: 'Manage products, services, inventory, and analyze product performance with MongoDB integration',
  
  inputSchema: productInputSchema,
  
  // エージェントのツール
  tools: {
    // 商品作成
    createProduct: {
      description: 'Create a new product or service',
      execute: async ({ productData }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // 商品コードの重複チェック
          const existingProduct = await db.findOne(Collections.PRODUCTS, {
            productCode: productData.productCode,
            companyId: productData.companyId
          });
          
          if (existingProduct) {
            throw new Error(`Product code ${productData.productCode} already exists`);
          }
          
          // 商品データの準備
          const productRecord = {
            ...productData,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          // データベースに保存
          const result = await db.create(Collections.PRODUCTS, productRecord);
          
          return {
            success: true,
            productId: result._id.toString(),
            message: '商品が作成されました'
          };
          
        } catch (error) {
          console.error('Product creation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 商品検索
    searchProducts: {
      description: 'Search products based on criteria',
      execute: async ({ criteria }) => {
        try {
          const db = DatabaseService.getInstance();
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
          
          // 価格範囲フィルタ
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
          
          const products = await db.findMany(Collections.PRODUCTS, filters, {
            sort: { productName: 1 }
          });
          
          // 在庫フィルタ（後処理）
          let filteredProducts = products;
          if (criteria.inStock !== undefined) {
            filteredProducts = products.filter(product => {
              if (!product.inventory?.trackInventory) return true;
              return criteria.inStock ? product.inventory.currentStock > 0 : product.inventory.currentStock === 0;
            });
          }
          
          return {
            success: true,
            count: filteredProducts.length,
            products: filteredProducts
          };
          
        } catch (error) {
          console.error('Product search error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 在庫トランザクション処理
    processInventoryTransaction: {
      description: 'Process inventory transaction',
      execute: async ({ transaction }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // 商品情報取得
          const product = await db.findOne(Collections.PRODUCTS, { 
            _id: new ObjectId(transaction.productId),
            companyId: transaction.companyId
          });
          
          if (!product) {
            throw new Error('Product not found');
          }
          
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
          
          // トランザクション記録の準備
          const transactionRecord = {
            ...transaction,
            productName: product.productName,
            previousStock: product.inventory.currentStock,
            newStock,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          // トランザクション記録を保存
          const transactionResult = await db.create('inventory_transactions', transactionRecord);
          
          // 商品在庫更新
          await db.update(Collections.PRODUCTS, transaction.productId, {
            'inventory.currentStock': newStock,
            updatedAt: new Date()
          });
          
          // 会計仕訳の作成（売上・仕入の場合）
          if (['purchase', 'sale'].includes(transaction.transactionType)) {
            await this.createAccountingEntry({
              product,
              transaction,
            });
          }
          
          // 在庫警告チェック
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
          
        } catch (error) {
          console.error('Inventory transaction error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 会計仕訳作成
    createAccountingEntry: {
      description: 'Create accounting entry for inventory transaction',
      execute: async ({ product, transaction }) => {
        try {
          const db = DatabaseService.getInstance();
          let journalEntry;
          
          if (transaction.transactionType === 'sale') {
            // 売上仕訳
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
            
            // 売上原価計上（在庫商品の場合）
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
              
              await db.create(Collections.JOURNAL_ENTRIES, cogsEntry);
            }
          } else if (transaction.transactionType === 'purchase') {
            // 仕入仕訳
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
            const result = await db.create(Collections.JOURNAL_ENTRIES, journalEntry);
            return {
              success: true,
              journalEntryId: result._id.toString()
            };
          }
          
          return { success: true };
          
        } catch (error) {
          console.error('Accounting entry creation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 商品分析
    analyzeProduct: {
      description: 'Analyze product performance',
      execute: async ({ type, period, productId, category, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          switch (type) {
            case 'sales_performance':
              // 売上実績分析
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
              // 在庫回転率分析
              const inventoryProducts = await db.findMany(Collections.PRODUCTS, {
                companyId,
                'inventory.trackInventory': true,
                ...(category && { category })
              });
              
              let totalInventoryValue = 0;
              let totalCOGS = 0;
              
              for (const product of inventoryProducts) {
                const currentValue = (product.inventory?.currentStock || 0) * (product.cost?.unitCost || 0);
                totalInventoryValue += currentValue;
                
                // 売上原価計算（簡易）
                const salesTransactions = await db.findMany('inventory_transactions', {
                  productId: product._id.toString(),
                  transactionType: 'sale',
                  date: { $gte: new Date(period.startDate), $lte: new Date(period.endDate) }
                });
                
                const productCOGS = salesTransactions.reduce((sum, txn) => 
                  sum + (txn.quantity * (product.cost?.unitCost || 0)), 0);
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
              // 収益性分析
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
              
              // 簡易的な原価計算
              const estimatedCOGS = profitResult.totalRevenue * 0.6; // 仮定: 原価率60%
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
              // 需要予測
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
              
              // 簡易的な移動平均予測
              const recentMonths = historicalData.slice(-3);
              const averageMonthlySales = recentMonths.length > 0 ? 
                recentMonths.reduce((sum, month) => sum + month.totalQuantity, 0) / recentMonths.length : 0;
              
              const forecastQuantity = Math.round(averageMonthlySales);
              
              return {
                type: 'demand_forecast',
                nextMonthForecast: forecastQuantity,
                confidenceLevel: 'medium',
                historicalAverage: averageMonthlySales,
                recommendedStock: Math.round(forecastQuantity * 1.2), // 20%のバッファ
                historicalDataPoints: historicalData.length,
                message: '需要予測分析が完了しました'
              };
              
            default:
              throw new Error(`Unknown analysis type: ${type}`);
          }
          
        } catch (error) {
          console.error('Product analysis error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 再注文アラート送信
    sendReorderAlert: {
      description: 'Send reorder alert for low stock',
      execute: async ({ product, currentStock }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // 通知を記録
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
          
        } catch (error) {
          console.error('Reorder alert error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('[Product Agent] Starting operation:', input.operation);
      
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
          
          const db = DatabaseService.getInstance();
          const updateResult = await db.update(Collections.PRODUCTS, input.productData.id, {
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
      
    } catch (error) {
      console.error('[Product Agent] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },
});

// エージェントのエクスポート
export default productAgent;