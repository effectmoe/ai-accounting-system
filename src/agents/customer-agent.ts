import { z } from 'zod';
import { Agent } from '@mastra/core';
import { spawn } from 'child_process';
import path from 'path';

// 顧客操作結果のスキーマ
const customerResultSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  customer: z.object({
    id: z.string(),
    customer_code: z.string(),
    company_name: z.string(),
    created_at: z.string().optional(),
  }).optional(),
  customers: z.array(z.any()).optional(),
  history: z.any().optional(),
  creditCheck: z.any().optional(),
  analytics: z.any().optional(),
  merge_result: z.any().optional(),
  count: z.number().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

// 顧客エージェントの入力スキーマ
const customerInputSchema = z.object({
  operation: z.enum([
    'create',
    'get',
    'update',
    'search',
    'get_history',
    'check_credit',
    'get_analytics',
    'merge',
    'identify'
  ]),
  
  // 顧客作成用
  customerData: z.object({
    customer_code: z.string(),
    company_name: z.string(),
    company_name_kana: z.string().optional(),
    contact_name: z.string().optional(),
    contact_email: z.string().optional(),
    contact_phone: z.string().optional(),
    address: z.object({
      postal_code: z.string().optional(),
      prefecture: z.string().optional(),
      city: z.string().optional(),
      street: z.string().optional(),
      building: z.string().optional(),
    }).optional(),
    billing_info: z.object({
      payment_terms: z.string().optional(),
      credit_limit: z.number().optional(),
      tax_id: z.string().optional(),
      bank_account: z.string().optional(),
    }).optional(),
    business_type: z.string().optional(),
    industry: z.string().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }).optional(),
  
  // 顧客取得用
  customerId: z.string().optional(),
  customerCode: z.string().optional(),
  
  // 顧客更新用
  updates: z.object({
    contact_name: z.string().optional(),
    contact_email: z.string().optional(),
    contact_phone: z.string().optional(),
    address: z.any().optional(),
    billing_info: z.any().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    is_active: z.boolean().optional(),
  }).optional(),
  
  // 検索用
  searchParams: z.object({
    query: z.string().optional(),
    filters: z.object({
      industry: z.string().optional(),
      business_type: z.string().optional(),
      tags: z.array(z.string()).optional(),
      is_active: z.boolean().optional(),
    }).optional(),
    limit: z.number().default(50),
  }).optional(),
  
  // 取引履歴用
  historyParams: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    transactionType: z.string().optional(),
  }).optional(),
  
  // 与信チェック用
  creditCheckAmount: z.number().optional(),
  
  // 分析用
  analyticsParams: z.object({
    metrics: z.array(z.enum(['total_sales', 'average_order', 'payment_history', 'growth_rate'])).optional(),
  }).optional(),
  
  // マージ用
  mergeParams: z.object({
    primaryCustomerId: z.string(),
    duplicateCustomerIds: z.array(z.string()),
    mergeStrategy: z.enum(['keep_primary', 'keep_newest', 'manual']).default('keep_primary'),
  }).optional(),
  
  // 顧客識別用（領収書から）
  identifyParams: z.object({
    vendorName: z.string(),
    contactInfo: z.string().optional(),
    fuzzyMatch: z.boolean().default(true),
  }).optional(),
});

// MCP Client for Customer MCP Server
class CustomerMCPClient {
  async callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const mcpServerPath = path.join(__dirname, '../mcp-servers/customer-mcp-server.ts');
        
        // Start MCP server process
        const mcpProcess = spawn('npx', ['tsx', mcpServerPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let responseData = '';
        let errorData = '';

        // Prepare MCP request
        const request = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        };

        // Send request to MCP server
        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        mcpProcess.stdin.end();

        // Handle response
        mcpProcess.stdout.on('data', (data) => {
          responseData += data.toString();
        });

        mcpProcess.stderr.on('data', (data) => {
          errorData += data.toString();
        });

        mcpProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Customer MCP Server exited with code ${code}: ${errorData}`));
            return;
          }

          try {
            // Parse response
            const lines = responseData.trim().split('\n');
            let result = null;

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.result) {
                  result = parsed.result;
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            if (result && result.content && result.content[0]) {
              const content = JSON.parse(result.content[0].text);
              resolve(content);
            } else {
              reject(new Error('Invalid MCP response format'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse MCP response: ${error.message}`));
          }
        });

        mcpProcess.on('error', (error) => {
          reject(new Error(`Customer MCP Server process error: ${error.message}`));
        });

        // Timeout
        setTimeout(() => {
          mcpProcess.kill();
          reject(new Error('Customer MCP Server request timeout'));
        }, 30000);

      } catch (error) {
        reject(new Error(`Customer MCP Client error: ${error.message}`));
      }
    });
  }
}

// 顧客エージェント定義
export const customerAgent = new Agent({
  id: 'customer-agent',
  name: 'Customer Management Agent with MCP Integration',
  description: 'Manage customer information and relationships',
  model: {
    provider: 'OPENAI',
    name: 'gpt-4',
    toolChoice: 'auto',
  },
  inputSchema: customerInputSchema,
  outputSchema: customerResultSchema,
  
  tools: {
    // 顧客作成
    createCustomer: {
      description: 'Create a new customer record',
      execute: async ({ customerData }) => {
        const mcpClient = new CustomerMCPClient();
        
        try {
          const result = await mcpClient.callTool('create_customer', {
            customerData,
          });

          return result;
        } catch (error) {
          throw new Error(`Customer creation failed: ${error.message}`);
        }
      },
    },

    // 顧客取得
    getCustomer: {
      description: 'Get customer information',
      execute: async ({ customerId, customerCode }) => {
        const mcpClient = new CustomerMCPClient();
        
        try {
          const result = await mcpClient.callTool('get_customer', {
            customerId,
            customerCode,
          });

          return result;
        } catch (error) {
          throw new Error(`Customer retrieval failed: ${error.message}`);
        }
      },
    },

    // 顧客更新
    updateCustomer: {
      description: 'Update customer information',
      execute: async ({ customerId, updates }) => {
        const mcpClient = new CustomerMCPClient();
        
        try {
          const result = await mcpClient.callTool('update_customer', {
            customerId,
            updates,
          });

          return result;
        } catch (error) {
          throw new Error(`Customer update failed: ${error.message}`);
        }
      },
    },

    // 顧客検索
    searchCustomers: {
      description: 'Search customers with filters',
      execute: async ({ query, filters, limit }) => {
        const mcpClient = new CustomerMCPClient();
        
        try {
          const result = await mcpClient.callTool('search_customers', {
            query,
            filters,
            limit,
          });

          return result;
        } catch (error) {
          throw new Error(`Customer search failed: ${error.message}`);
        }
      },
    },

    // 取引履歴取得
    getTransactionHistory: {
      description: 'Get customer transaction history',
      execute: async ({ customerId, dateFrom, dateTo, transactionType }) => {
        const mcpClient = new CustomerMCPClient();
        
        try {
          const result = await mcpClient.callTool('get_transaction_history', {
            customerId,
            dateFrom,
            dateTo,
            transactionType,
          });

          return result;
        } catch (error) {
          throw new Error(`Transaction history retrieval failed: ${error.message}`);
        }
      },
    },

    // 与信チェック
    checkCreditLimit: {
      description: 'Check customer credit availability',
      execute: async ({ customerId, amount }) => {
        const mcpClient = new CustomerMCPClient();
        
        try {
          const result = await mcpClient.callTool('check_credit_limit', {
            customerId,
            amount,
          });

          return result;
        } catch (error) {
          throw new Error(`Credit check failed: ${error.message}`);
        }
      },
    },

    // 顧客分析
    getCustomerAnalytics: {
      description: 'Get customer analytics and insights',
      execute: async ({ customerId, metrics }) => {
        const mcpClient = new CustomerMCPClient();
        
        try {
          const result = await mcpClient.callTool('get_customer_analytics', {
            customerId,
            metrics,
          });

          return result;
        } catch (error) {
          throw new Error(`Analytics retrieval failed: ${error.message}`);
        }
      },
    },

    // 顧客マージ
    mergeCustomers: {
      description: 'Merge duplicate customer records',
      execute: async ({ primaryCustomerId, duplicateCustomerIds, mergeStrategy }) => {
        const mcpClient = new CustomerMCPClient();
        
        try {
          const result = await mcpClient.callTool('merge_customers', {
            primaryCustomerId,
            duplicateCustomerIds,
            mergeStrategy,
          });

          return result;
        } catch (error) {
          throw new Error(`Customer merge failed: ${error.message}`);
        }
      },
    },

    // 顧客識別（領収書から）
    identifyCustomerFromReceipt: {
      description: 'Identify customer from receipt vendor name',
      execute: async ({ vendorName, contactInfo, fuzzyMatch }) => {
        // 領収書のベンダー名から既存顧客を特定
        const mcpClient = new CustomerMCPClient();
        
        try {
          // まず完全一致で検索
          let result = await mcpClient.callTool('search_customers', {
            query: vendorName,
            limit: 10,
          });

          if (result.success && result.customers && result.customers.length > 0) {
            // 完全一致または部分一致の顧客を返す
            const exactMatch = result.customers.find(
              (c: any) => c.company_name === vendorName
            );
            
            if (exactMatch) {
              return {
                success: true,
                identified: true,
                customer: exactMatch,
                confidence: 1.0,
                message: 'Exact customer match found',
              };
            }

            // ファジーマッチが有効な場合
            if (fuzzyMatch && result.customers.length > 0) {
              return {
                success: true,
                identified: true,
                customer: result.customers[0],
                confidence: 0.8,
                candidates: result.customers.slice(0, 3),
                message: 'Potential customer match found',
              };
            }
          }

          return {
            success: true,
            identified: false,
            message: 'No matching customer found',
            suggestion: 'Create new customer record',
          };

        } catch (error) {
          throw new Error(`Customer identification failed: ${error.message}`);
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('👥 [Customer Agent] Starting customer operation:', input.operation);

      switch (input.operation) {
        case 'create': {
          if (!input.customerData) {
            throw new Error('Customer data is required');
          }

          const result = await tools.createCustomer({
            customerData: input.customerData,
          });

          return {
            success: result.success,
            operation: 'create',
            customer: result.customer,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'get': {
          if (!input.customerId && !input.customerCode) {
            throw new Error('Customer ID or code is required');
          }

          const result = await tools.getCustomer({
            customerId: input.customerId,
            customerCode: input.customerCode,
          });

          return {
            success: result.success,
            operation: 'get',
            customer: result.customer,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'update': {
          if (!input.customerId || !input.updates) {
            throw new Error('Customer ID and updates are required');
          }

          const result = await tools.updateCustomer({
            customerId: input.customerId,
            updates: input.updates,
          });

          return {
            success: result.success,
            operation: 'update',
            customer: result.customer,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'search': {
          const searchParams = input.searchParams || {};
          const result = await tools.searchCustomers({
            query: searchParams.query,
            filters: searchParams.filters,
            limit: searchParams.limit,
          });

          return {
            success: result.success,
            operation: 'search',
            customers: result.customers,
            count: result.count,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'get_history': {
          if (!input.customerId) {
            throw new Error('Customer ID is required');
          }

          const historyParams = input.historyParams || {};
          const result = await tools.getTransactionHistory({
            customerId: input.customerId,
            dateFrom: historyParams.dateFrom,
            dateTo: historyParams.dateTo,
            transactionType: historyParams.transactionType,
          });

          return {
            success: result.success,
            operation: 'get_history',
            customer: result.customer,
            history: result.history,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'check_credit': {
          if (!input.customerId || input.creditCheckAmount === undefined) {
            throw new Error('Customer ID and amount are required');
          }

          const result = await tools.checkCreditLimit({
            customerId: input.customerId,
            amount: input.creditCheckAmount,
          });

          return {
            success: result.success,
            operation: 'check_credit',
            customer: result.customer,
            creditCheck: result.creditCheck,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'get_analytics': {
          if (!input.customerId) {
            throw new Error('Customer ID is required');
          }

          const analyticsParams = input.analyticsParams || {};
          const result = await tools.getCustomerAnalytics({
            customerId: input.customerId,
            metrics: analyticsParams.metrics,
          });

          return {
            success: result.success,
            operation: 'get_analytics',
            analytics: result.analytics,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'merge': {
          if (!input.mergeParams) {
            throw new Error('Merge parameters are required');
          }

          const result = await tools.mergeCustomers({
            primaryCustomerId: input.mergeParams.primaryCustomerId,
            duplicateCustomerIds: input.mergeParams.duplicateCustomerIds,
            mergeStrategy: input.mergeParams.mergeStrategy,
          });

          return {
            success: result.success,
            operation: 'merge',
            customer: result.primary_customer,
            merge_result: result.merge_result,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'identify': {
          if (!input.identifyParams?.vendorName) {
            throw new Error('Vendor name is required for customer identification');
          }

          const result = await tools.identifyCustomerFromReceipt({
            vendorName: input.identifyParams.vendorName,
            contactInfo: input.identifyParams.contactInfo,
            fuzzyMatch: input.identifyParams.fuzzyMatch,
          });

          return {
            success: result.success,
            operation: 'identify',
            customer: result.customer,
            message: result.message,
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }

    } catch (error) {
      console.error('❌ [Customer Agent] Operation failed:', error);
      return {
        success: false,
        operation: input.operation || 'unknown',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
});

export default customerAgent;