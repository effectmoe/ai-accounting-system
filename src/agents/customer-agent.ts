import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

import { logger } from '@/lib/logger';
// 顧客情報スキーマ
const customerSchema = z.object({
  _id: z.string().optional(),
  companyName: z.string(),
  companyNameKana: z.string().optional(),
  registrationNumber: z.string().optional(), // インボイス登録番号
  customerType: z.enum(['corporate', 'individual', 'government']),
  industry: z.string(),
  address: z.object({
    postalCode: z.string(),
    prefecture: z.string(),
    city: z.string(),
    street: z.string(),
    building: z.string().optional(),
  }),
  contact: z.object({
    primaryName: z.string(),
    primaryEmail: z.string().email(),
    primaryPhone: z.string(),
    secondaryName: z.string().optional(),
    secondaryEmail: z.string().email().optional(),
    secondaryPhone: z.string().optional(),
  }),
  billing: z.object({
    paymentTerms: z.enum(['immediate', 'net30', 'net60', 'net90']),
    preferredPaymentMethod: z.enum(['bank_transfer', 'credit_card', 'invoice']),
    bankAccount: z.object({
      bankName: z.string(),
      branchName: z.string(),
      accountType: z.enum(['普通', '当座']),
      accountNumber: z.string(),
      accountName: z.string(),
    }).optional(),
  }),
  status: z.enum(['active', 'inactive', 'suspended']).default('active'),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  companyId: z.string(),
  creditLimit: z.number().optional(),
  riskLevel: z.enum(['low', 'medium', 'high']).optional(),
  lastAssessmentDate: z.string().optional(),
  lastInvoiceDate: z.string().optional(),
  totalInvoiceAmount: z.number().optional(),
});

// 顧客管理エージェントの入力スキーマ
const customerInputSchema = z.object({
  // 顧客操作
  operation: z.enum(['create', 'update', 'search', 'analyze', 'export', 'validate_invoice_number']),
  
  // 顧客データ
  customerData: customerSchema.optional(),
  
  // 検索条件
  searchCriteria: z.object({
    query: z.string().optional(),
    companyName: z.string().optional(),
    industry: z.string().optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    tags: z.array(z.string()).optional(),
    hasInvoiceRegistration: z.boolean().optional(),
    registrationNumber: z.string().optional(),
    companyId: z.string().optional(),
  }).optional(),
  
  // 分析オプション
  analysisOptions: z.object({
    type: z.enum(['revenue', 'payment_history', 'transaction_frequency', 'credit_risk']),
    period: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    customerId: z.string().optional(),
    companyId: z.string(),
  }).optional(),
  
  // エクスポートオプション
  exportOptions: z.object({
    format: z.enum(['csv', 'excel', 'json']),
    fields: z.array(z.string()).optional(),
    filters: z.any().optional(),
    companyId: z.string(),
  }).optional(),
  
  // インボイス検証
  validationData: z.object({
    registrationNumber: z.string(),
  }).optional(),
});

// 顧客管理エージェント定義
export const customerAgent = createAgent({
  id: 'customer-agent',
  name: 'Customer Management Agent',
  description: 'Manage customer information, analyze customer data, and handle customer-related operations with MongoDB integration',
  
  inputSchema: customerInputSchema,
  
  // エージェントのツール
  tools: {
    // 顧客作成
    createCustomer: {
      description: 'Create a new customer in MongoDB',
      execute: async ({ customerData }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // インボイス登録番号の検証
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
          
          // 重複チェック
          const existingCustomer = await db.findOne(Collections.CUSTOMERS, {
            companyName: customerData.companyName,
            companyId: customerData.companyId
          });
          
          if (existingCustomer) {
            return {
              success: false,
              error: 'Customer with this company name already exists'
            };
          }
          
          // 顧客データの準備
          const newCustomer = {
            ...customerData,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          // MongoDBに保存
          const result = await db.create(Collections.CUSTOMERS, newCustomer);
          
          return {
            success: true,
            customerId: result._id.toString(),
            customer: result,
            message: '顧客が正常に作成されました'
          };
          
        } catch (error) {
          logger.error('Customer creation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // インボイス番号検証
    validateInvoiceNumber: {
      description: 'Validate invoice registration number format',
      execute: async ({ registrationNumber }) => {
        try {
          // 形式チェック（T + 13桁の数字）
          if (!/^T\d{13}$/.test(registrationNumber)) {
            return {
              success: false,
              error: 'Invalid format. Should be T followed by 13 digits',
              valid: false
            };
          }
          
          // 将来的には国税庁APIとの連携も可能
          // 現在は形式チェックのみ
          return {
            success: true,
            valid: true,
            message: 'Invoice registration number format is valid'
          };
          
        } catch (error) {
          logger.error('Invoice number validation error:', error);
          return {
            success: false,
            error: error.message,
            valid: false
          };
        }
      },
    },
    
    // 顧客検索
    searchCustomers: {
      description: 'Search customers based on criteria in MongoDB',
      execute: async ({ criteria }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // 検索フィルターの構築
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
            } else {
              filters.registrationNumber = { $exists: false };
            }
          }
          
          // MongoDB検索実行
          const customers = await db.find(Collections.CUSTOMERS, filters, {
            sort: { companyName: 1 }
          });
          
          // タグでのフィルタリング（後処理）
          let filteredCustomers = customers;
          if (criteria.tags && criteria.tags.length > 0) {
            filteredCustomers = customers.filter(customer => 
              criteria.tags.some(tag => customer.tags?.includes(tag))
            );
          }
          
          return {
            success: true,
            customers: filteredCustomers,
            count: filteredCustomers.length,
            message: `${filteredCustomers.length}件の顧客が見つかりました`
          };
          
        } catch (error) {
          logger.error('Customer search error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 顧客更新
    updateCustomer: {
      description: 'Update customer information in MongoDB',
      execute: async ({ customerData }) => {
        try {
          const db = DatabaseService.getInstance();
          
          if (!customerData._id) {
            throw new Error('Customer ID is required for update operation');
          }
          
          // インボイス登録番号の検証（更新時）
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
          
          // _idフィールドを除外してupdateDataを作成
          const { _id, ...updateData } = customerData;
          updateData.updatedAt = new Date();
          
          // MongoDB更新実行
          const result = await db.update(Collections.CUSTOMERS, _id, updateData);
          
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
          
        } catch (error) {
          logger.error('Customer update error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 顧客分析
    analyzeCustomer: {
      description: 'Analyze customer data and relationships',
      execute: async ({ type, period, customerId, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          let analysisResult;
          
          switch (type) {
            case 'revenue':
              // 売上分析 - 請求書データから集計
              const invoices = await db.find(Collections.INVOICES, {
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
              
              // 成長率計算
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
              // 支払履歴分析 - 請求書の支払状況から
              const paymentInvoices = await db.find(Collections.INVOICES, {
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
              
              // 平均支払日数の計算（簡易版）
              let averagePaymentDays = 0;
              if (paidInvoices.length > 0) {
                // 実際の支払日データがある場合の計算
                // 現在は簡易的に期日から推定
                averagePaymentDays = 15; // デフォルト値
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
              // 取引頻度分析
              const allInvoices = await db.find(Collections.INVOICES, {
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
              
              // トレンド分析
              const monthlyValues = Object.values(transactionsByMonth);
              let trend = 'stable';
              if (monthlyValues.length >= 2) {
                const recent = monthlyValues.slice(-2);
                if (recent[1] > recent[0] * 1.2) trend = 'increasing';
                else if (recent[1] < recent[0] * 0.8) trend = 'decreasing';
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
              // 信用リスク評価
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
          
        } catch (error) {
          logger.error('Customer analysis error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 信用リスク計算
    calculateCreditRisk: {
      description: 'Calculate customer credit risk based on payment history and transaction patterns',
      execute: async ({ customerId, period, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // 顧客情報取得
          const customer = await db.findById(Collections.CUSTOMERS, customerId);
          if (!customer) {
            throw new Error('Customer not found');
          }
          
          // 過去12ヶ月の請求書データ取得
          const twelveMonthsAgo = new Date();
          twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
          
          const invoices = await db.find(Collections.INVOICES, {
            customerId: customerId,
            companyId: companyId,
            issueDate: { $gte: twelveMonthsAgo }
          });
          
          let riskScore = 100; // 満点から減点方式
          const factors = [];
          
          // 支払遅延の評価
          const overdueInvoices = invoices.filter(inv => {
            const dueDate = new Date(inv.dueDate);
            return inv.status !== 'paid' && dueDate < new Date();
          });
          
          const overdueRate = invoices.length > 0 ? (overdueInvoices.length / invoices.length) : 0;
          
          if (overdueRate > 0.3) {
            riskScore -= 30;
            factors.push('High overdue payment rate (>30%)');
          } else if (overdueRate > 0.1) {
            riskScore -= 15;
            factors.push('Moderate overdue payment rate (>10%)');
          }
          
          // 取引頻度の評価
          const recentInvoices = invoices.filter(inv => {
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            return inv.issueDate >= threeMonthsAgo;
          });
          
          if (recentInvoices.length === 0 && invoices.length > 0) {
            riskScore -= 20;
            factors.push('No recent transactions (last 3 months)');
          }
          
          // 業種リスク
          const riskyIndustries = ['飲食業', '小売業', '観光業', 'イベント業'];
          if (riskyIndustries.includes(customer.industry)) {
            riskScore -= 10;
            factors.push(`High-risk industry: ${customer.industry}`);
          }
          
          // 取引金額の安定性
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
          
          // リスクレベル判定
          let level = 'low';
          if (riskScore < 50) level = 'high';
          else if (riskScore < 70) level = 'medium';
          
          // 推奨事項
          const recommendations = [];
          if (level === 'high') {
            recommendations.push('Consider requiring advance payment or deposits');
            recommendations.push('Set lower credit limit');
            recommendations.push('Monitor transactions closely');
            recommendations.push('Consider payment guarantees or insurance');
          } else if (level === 'medium') {
            recommendations.push('Regular payment monitoring');
            recommendations.push('Consider shorter payment terms');
            recommendations.push('Establish credit limit');
          } else {
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
              overdueRate: Math.round(overdueRate * 1000) / 10, // パーセンテージ
              recentTransactions: recentInvoices.length,
              industry: customer.industry
            }
          };
          
        } catch (error) {
          logger.error('Credit risk calculation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 顧客データエクスポート
    exportCustomers: {
      description: 'Export customer data in various formats',
      execute: async ({ format, fields, filters, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // データ取得
          const searchFilters = {
            companyId: companyId,
            ...(filters || {})
          };
          
          const customers = await db.find(Collections.CUSTOMERS, searchFilters, {
            sort: { companyName: 1 }
          });
          
          // フィールド選択
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
              } else {
                row[field] = customer[field] || '';
              }
            });
            return row;
          });
          
          let result;
          
          switch (format) {
            case 'csv':
              // CSV形式に変換
              const headers = selectedFields.join(',');
              const rows = exportData.map(row => 
                selectedFields.map(field => `"${(row[field] || '').toString().replace(/"/g, '""')}"`).join(',')
              );
              result = {
                success: true,
                format: 'csv',
                content: [headers, ...rows].join('\n'),
                filename: `customers_${new Date().toISOString().split('T')[0]}.csv`,
                recordCount: customers.length
              };
              break;
              
            case 'json':
              // JSON形式
              result = {
                success: true,
                format: 'json',
                content: JSON.stringify(exportData, null, 2),
                filename: `customers_${new Date().toISOString().split('T')[0]}.json`,
                recordCount: customers.length
              };
              break;
              
            case 'excel':
              // Excel用データ準備（実装は外部ライブラリが必要）
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
          
        } catch (error) {
          logger.error('Customer export error:', error);
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
      logger.debug('[Customer Agent] Starting operation:', input.operation);
      
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
      
    } catch (error) {
      logger.error('[Customer Agent] Error:', error);
      return {
        success: false,
        operation: input.operation,
        error: error.message
      };
    }
  },
});

export default customerAgent;