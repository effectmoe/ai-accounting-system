import { z } from 'zod';
import { createAgent } from '@mastra/core';

// 顧客情報スキーマ
const customerSchema = z.object({
  id: z.string().optional(),
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
});

// 顧客管理エージェントの入力スキーマ
const customerInputSchema = z.object({
  // 顧客操作
  operation: z.enum(['create', 'update', 'search', 'analyze', 'export']),
  
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
  }).optional(),
  
  // 分析オプション
  analysisOptions: z.object({
    type: z.enum(['revenue', 'payment_history', 'transaction_frequency', 'credit_risk']),
    period: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    customerId: z.string().optional(),
  }).optional(),
  
  // エクスポートオプション
  exportOptions: z.object({
    format: z.enum(['csv', 'excel', 'google_sheets']),
    fields: z.array(z.string()).optional(),
    filters: z.any().optional(),
  }).optional(),
});

// 顧客管理エージェント定義
export const customerAgent = createAgent({
  id: 'customer-agent',
  name: 'Customer Management Agent',
  description: 'Manage customer information, analyze customer data, and handle customer-related operations',
  
  inputSchema: customerInputSchema,
  
  // エージェントのツール
  tools: {
    // 顧客作成
    createCustomer: {
      description: 'Create a new customer',
      execute: async ({ customerData, mcpClient }) => {
        // インボイス登録番号の検証
        if (customerData.registrationNumber) {
          const isValid = await tools.validateInvoiceNumber({
            registrationNumber: customerData.registrationNumber,
            mcpClient
          });
          
          if (!isValid) {
            throw new Error('Invalid invoice registration number');
          }
        }
        
        // データベースに保存
        const result = await mcpClient.callTool('supabase', 'insert', {
          table: 'customers',
          data: {
            ...customerData,
            created_at: new Date().toISOString()
          }
        });
        
        // Google Sheetsにも同期（オプション）
        if (process.env.SYNC_TO_GOOGLE_SHEETS === 'true') {
          await mcpClient.callTool('google-sheets', 'append_row', {
            spreadsheetId: process.env.CUSTOMER_SHEET_ID,
            values: [
              customerData.companyName,
              customerData.customerType,
              customerData.industry,
              customerData.contact.primaryEmail,
              customerData.status
            ]
          });
        }
        
        return result;
      },
    },
    
    // インボイス番号検証
    validateInvoiceNumber: {
      description: 'Validate invoice registration number',
      execute: async ({ registrationNumber, mcpClient }) => {
        // 形式チェック（T + 13桁の数字）
        if (!/^T\d{13}$/.test(registrationNumber)) {
          return false;
        }
        
        // NLWeb経由で国税庁DBを確認
        const validationResult = await mcpClient.callTool('nlweb', 'search_tax_info', {
          query: `インボイス登録番号 ${registrationNumber} 確認`
        });
        
        // 実際のAPIがあれば使用
        // const apiResult = await fetch(`https://invoice-api.nta.go.jp/validate/${registrationNumber}`);
        
        return true; // 簡易実装
      },
    },
    
    // 顧客検索
    searchCustomers: {
      description: 'Search customers based on criteria',
      execute: async ({ criteria, mcpClient }) => {
        const filters = {};
        
        if (criteria.companyName) {
          filters.companyName = { ilike: `%${criteria.companyName}%` };
        }
        
        if (criteria.industry) {
          filters.industry = criteria.industry;
        }
        
        if (criteria.status) {
          filters.status = criteria.status;
        }
        
        if (criteria.hasInvoiceRegistration !== undefined) {
          if (criteria.hasInvoiceRegistration) {
            filters.registrationNumber = { not: null };
          } else {
            filters.registrationNumber = { is: null };
          }
        }
        
        const result = await mcpClient.callTool('supabase', 'select', {
          table: 'customers',
          filters,
          options: {
            orderBy: 'companyName',
            orderDirection: 'asc'
          }
        });
        
        // タグでのフィルタリング（後処理）
        if (criteria.tags && criteria.tags.length > 0) {
          result.data = result.data.filter(customer => 
            criteria.tags.some(tag => customer.tags?.includes(tag))
          );
        }
        
        return result;
      },
    },
    
    // 顧客分析
    analyzeCustomer: {
      description: 'Analyze customer data',
      execute: async ({ type, period, customerId, mcpClient }) => {
        switch (type) {
          case 'revenue':
            // 売上分析
            const revenueData = await mcpClient.callTool('supabase', 'rpc', {
              functionName: 'analyze_customer_revenue',
              params: {
                customer_id: customerId,
                start_date: period.startDate,
                end_date: period.endDate
              }
            });
            
            return {
              type: 'revenue_analysis',
              customerId,
              period,
              totalRevenue: revenueData.total,
              monthlyBreakdown: revenueData.monthly,
              topProducts: revenueData.top_products,
              growthRate: revenueData.growth_rate
            };
            
          case 'payment_history':
            // 支払履歴分析
            const paymentData = await mcpClient.callTool('supabase', 'select', {
              table: 'payments',
              filters: {
                customer_id: customerId,
                payment_date: {
                  gte: period.startDate,
                  lte: period.endDate
                }
              },
              options: {
                orderBy: 'payment_date',
                orderDirection: 'desc'
              }
            });
            
            // 支払遅延の分析
            const delays = paymentData.data.filter(p => p.days_delayed > 0);
            const averageDelay = delays.length > 0 
              ? delays.reduce((sum, p) => sum + p.days_delayed, 0) / delays.length 
              : 0;
            
            return {
              type: 'payment_history',
              customerId,
              period,
              totalPayments: paymentData.data.length,
              onTimePayments: paymentData.data.length - delays.length,
              delayedPayments: delays.length,
              averageDelayDays: averageDelay,
              paymentHistory: paymentData.data
            };
            
          case 'transaction_frequency':
            // 取引頻度分析
            const transactionData = await mcpClient.callTool('supabase', 'rpc', {
              functionName: 'analyze_transaction_frequency',
              params: {
                customer_id: customerId,
                start_date: period.startDate,
                end_date: period.endDate
              }
            });
            
            return {
              type: 'transaction_frequency',
              customerId,
              period,
              totalTransactions: transactionData.total,
              averageMonthlyTransactions: transactionData.monthly_average,
              trend: transactionData.trend, // increasing, stable, decreasing
              lastTransactionDate: transactionData.last_transaction
            };
            
          case 'credit_risk':
            // 信用リスク評価
            const riskFactors = await tools.calculateCreditRisk({
              customerId,
              period,
              mcpClient
            });
            
            return {
              type: 'credit_risk',
              customerId,
              riskScore: riskFactors.score,
              riskLevel: riskFactors.level, // low, medium, high
              factors: riskFactors.details,
              recommendations: riskFactors.recommendations
            };
            
          default:
            throw new Error(`Unknown analysis type: ${type}`);
        }
      },
    },
    
    // 信用リスク計算
    calculateCreditRisk: {
      description: 'Calculate customer credit risk',
      execute: async ({ customerId, period, mcpClient }) => {
        // 複数の要因から信用リスクを計算
        const [customer, paymentHistory, financialData] = await Promise.all([
          mcpClient.callTool('supabase', 'select', {
            table: 'customers',
            filters: { id: customerId }
          }),
          mcpClient.callTool('supabase', 'rpc', {
            functionName: 'get_payment_history',
            params: { customer_id: customerId, months: 12 }
          }),
          mcpClient.callTool('supabase', 'rpc', {
            functionName: 'get_financial_metrics',
            params: { customer_id: customerId }
          })
        ]);
        
        let riskScore = 100; // 満点から減点方式
        const factors = [];
        
        // 支払遅延履歴
        if (paymentHistory.average_delay > 30) {
          riskScore -= 30;
          factors.push('High average payment delay');
        } else if (paymentHistory.average_delay > 15) {
          riskScore -= 15;
          factors.push('Moderate payment delay');
        }
        
        // 取引頻度の低下
        if (financialData.transaction_trend === 'decreasing') {
          riskScore -= 20;
          factors.push('Decreasing transaction frequency');
        }
        
        // 業種リスク
        const riskyIndustries = ['飲食業', '小売業', '観光業'];
        if (riskyIndustries.includes(customer.data[0].industry)) {
          riskScore -= 10;
          factors.push(`High-risk industry: ${customer.data[0].industry}`);
        }
        
        // リスクレベル判定
        let level = 'low';
        if (riskScore < 50) level = 'high';
        else if (riskScore < 70) level = 'medium';
        
        // 推奨事項
        const recommendations = [];
        if (level === 'high') {
          recommendations.push('Consider requiring advance payment');
          recommendations.push('Set lower credit limit');
          recommendations.push('Monitor transactions closely');
        } else if (level === 'medium') {
          recommendations.push('Regular payment monitoring');
          recommendations.push('Consider shorter payment terms');
        }
        
        return {
          score: riskScore,
          level,
          details: factors,
          recommendations
        };
      },
    },
    
    // 顧客データエクスポート
    exportCustomers: {
      description: 'Export customer data',
      execute: async ({ format, fields, filters, mcpClient }) => {
        // データ取得
        const customers = await mcpClient.callTool('supabase', 'select', {
          table: 'customers',
          filters: filters || {},
          options: {
            orderBy: 'companyName',
            orderDirection: 'asc'
          }
        });
        
        // フィールド選択
        const selectedFields = fields || [
          'companyName', 'companyNameKana', 'registrationNumber',
          'customerType', 'industry', 'status',
          'contact.primaryName', 'contact.primaryEmail', 'contact.primaryPhone'
        ];
        
        const exportData = customers.data.map(customer => {
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
        
        switch (format) {
          case 'csv':
            // CSV形式に変換
            const headers = selectedFields.join(',');
            const rows = exportData.map(row => 
              selectedFields.map(field => `"${row[field]}"`).join(',')
            );
            return {
              format: 'csv',
              content: [headers, ...rows].join('\n'),
              filename: `customers_${new Date().toISOString().split('T')[0]}.csv`
            };
            
          case 'excel':
            // Excel MCPサーバーを使用
            const excelResult = await mcpClient.callTool('excel', 'create_workbook', {
              sheets: [{
                name: 'Customers',
                data: exportData,
                headers: selectedFields
              }]
            });
            return {
              format: 'excel',
              result: excelResult,
              filename: `customers_${new Date().toISOString().split('T')[0]}.xlsx`
            };
            
          case 'google_sheets':
            // Google Sheets MCPサーバーを使用
            const sheetResult = await mcpClient.callTool('google-sheets', 'create_sheet', {
              title: `Customer Export ${new Date().toISOString().split('T')[0]}`
            });
            
            // ヘッダー書き込み
            await mcpClient.callTool('google-sheets', 'write_sheet', {
              spreadsheetId: sheetResult.spreadsheetId,
              range: 'A1',
              values: [selectedFields]
            });
            
            // データ書き込み
            const dataRows = exportData.map(row => 
              selectedFields.map(field => row[field])
            );
            await mcpClient.callTool('google-sheets', 'append_rows', {
              spreadsheetId: sheetResult.spreadsheetId,
              values: dataRows
            });
            
            return {
              format: 'google_sheets',
              spreadsheetId: sheetResult.spreadsheetId,
              url: `https://docs.google.com/spreadsheets/d/${sheetResult.spreadsheetId}`
            };
            
          default:
            throw new Error(`Unknown export format: ${format}`);
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools, mcpClient }) => {
    try {
      console.log('[Customer Agent] Starting operation:', input.operation);
      
      switch (input.operation) {
        case 'create':
          if (!input.customerData) {
            throw new Error('Customer data is required for create operation');
          }
          
          const createResult = await tools.createCustomer({
            customerData: input.customerData,
            mcpClient
          });
          
          return {
            success: true,
            operation: 'create',
            customerId: createResult.data[0].id,
            result: createResult
          };
          
        case 'update':
          if (!input.customerData || !input.customerData.id) {
            throw new Error('Customer ID is required for update operation');
          }
          
          const updateResult = await mcpClient.callTool('supabase', 'update', {
            table: 'customers',
            filters: { id: input.customerData.id },
            data: {
              ...input.customerData,
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
          
          const searchResult = await tools.searchCustomers({
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
          
          const analysisResult = await tools.analyzeCustomer({
            ...input.analysisOptions,
            mcpClient
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
            ...input.exportOptions,
            mcpClient
          });
          
          return {
            success: true,
            operation: 'export',
            result: exportResult
          };
          
        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }
      
    } catch (error) {
      console.error('[Customer Agent] Error:', error);
      throw error;
    }
  },
});

// エージェントのエクスポート
export default customerAgent;