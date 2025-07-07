#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// 顧客情報の型定義
interface CustomerRecord {
  id?: string;
  customer_code: string;
  company_name: string;
  company_name_kana?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: {
    postal_code?: string;
    prefecture?: string;
    city?: string;
    street?: string;
    building?: string;
  };
  billing_info?: {
    payment_terms?: string; // 'immediate', 'net30', 'net60'
    credit_limit?: number;
    tax_id?: string;
    bank_account?: string;
  };
  business_type?: string;
  industry?: string;
  tags?: string[];
  notes?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// 取引履歴の型定義
interface TransactionHistory {
  customer_id: string;
  transactions: Array<{
    date: string;
    type: 'invoice' | 'payment' | 'receipt' | 'credit_note';
    amount: number;
    reference: string;
    status: string;
  }>;
  total_sales: number;
  outstanding_balance: number;
  last_transaction_date: string;
}

// Customer MCP Server
class CustomerMCPServer {
  private server: Server;
  private customers: Map<string, CustomerRecord> = new Map();
  private transactions: Map<string, TransactionHistory> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'customer-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initializeData();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private initializeData(): void {
    // デモ用の顧客データ
    const demoCustomers: CustomerRecord[] = [
      {
        id: 'cust_001',
        customer_code: 'C001',
        company_name: '株式会社サンプル商事',
        company_name_kana: 'カブシキガイシャサンプルショウジ',
        contact_name: '山田太郎',
        contact_email: 'yamada@sample.co.jp',
        contact_phone: '03-1234-5678',
        address: {
          postal_code: '100-0001',
          prefecture: '東京都',
          city: '千代田区',
          street: '千代田1-1-1',
          building: 'サンプルビル5F',
        },
        billing_info: {
          payment_terms: 'net30',
          credit_limit: 1000000,
          tax_id: '1234567890123',
        },
        business_type: 'B2B',
        industry: '商社',
        tags: ['重要顧客', '月次契約'],
        is_active: true,
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'cust_002',
        customer_code: 'C002',
        company_name: 'テック株式会社',
        company_name_kana: 'テックカブシキガイシャ',
        contact_name: '鈴木花子',
        contact_email: 'suzuki@tech.co.jp',
        contact_phone: '06-9876-5432',
        address: {
          postal_code: '530-0001',
          prefecture: '大阪府',
          city: '大阪市北区',
          street: '梅田2-2-2',
        },
        billing_info: {
          payment_terms: 'immediate',
          credit_limit: 500000,
        },
        business_type: 'B2B',
        industry: 'IT',
        tags: ['新規顧客'],
        is_active: true,
        created_at: '2024-06-01T00:00:00Z',
      },
    ];

    // デモデータをMapに格納
    demoCustomers.forEach(customer => {
      this.customers.set(customer.id!, customer);
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[Customer MCP Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'create_customer',
            description: 'Create a new customer record',
            inputSchema: {
              type: 'object',
              properties: {
                customerData: {
                  type: 'object',
                  properties: {
                    customer_code: { type: 'string' },
                    company_name: { type: 'string' },
                    company_name_kana: { type: 'string' },
                    contact_name: { type: 'string' },
                    contact_email: { type: 'string' },
                    contact_phone: { type: 'string' },
                    address: {
                      type: 'object',
                      properties: {
                        postal_code: { type: 'string' },
                        prefecture: { type: 'string' },
                        city: { type: 'string' },
                        street: { type: 'string' },
                        building: { type: 'string' },
                      },
                    },
                    billing_info: {
                      type: 'object',
                      properties: {
                        payment_terms: { type: 'string' },
                        credit_limit: { type: 'number' },
                        tax_id: { type: 'string' },
                        bank_account: { type: 'string' },
                      },
                    },
                    business_type: { type: 'string' },
                    industry: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    notes: { type: 'string' },
                  },
                  required: ['customer_code', 'company_name'],
                },
              },
              required: ['customerData'],
            },
          },
          {
            name: 'get_customer',
            description: 'Get customer information by ID or code',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: { type: 'string' },
                customerCode: { type: 'string' },
              },
            },
          },
          {
            name: 'update_customer',
            description: 'Update customer information',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: { type: 'string' },
                updates: {
                  type: 'object',
                  properties: {
                    contact_name: { type: 'string' },
                    contact_email: { type: 'string' },
                    contact_phone: { type: 'string' },
                    address: { type: 'object' },
                    billing_info: { type: 'object' },
                    tags: { type: 'array', items: { type: 'string' } },
                    notes: { type: 'string' },
                    is_active: { type: 'boolean' },
                  },
                },
              },
              required: ['customerId', 'updates'],
            },
          },
          {
            name: 'search_customers',
            description: 'Search customers by various criteria',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' },
                filters: {
                  type: 'object',
                  properties: {
                    industry: { type: 'string' },
                    business_type: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    is_active: { type: 'boolean' },
                  },
                },
                limit: { type: 'number', default: 50 },
              },
            },
          },
          {
            name: 'get_transaction_history',
            description: 'Get customer transaction history',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: { type: 'string' },
                dateFrom: { type: 'string' },
                dateTo: { type: 'string' },
                transactionType: { type: 'string' },
              },
              required: ['customerId'],
            },
          },
          {
            name: 'check_credit_limit',
            description: 'Check if customer has available credit',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: { type: 'string' },
                amount: { type: 'number' },
              },
              required: ['customerId', 'amount'],
            },
          },
          {
            name: 'get_customer_analytics',
            description: 'Get customer analytics and insights',
            inputSchema: {
              type: 'object',
              properties: {
                customerId: { type: 'string' },
                metrics: {
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: ['total_sales', 'average_order', 'payment_history', 'growth_rate'],
                  },
                },
              },
              required: ['customerId'],
            },
          },
          {
            name: 'merge_customers',
            description: 'Merge duplicate customer records',
            inputSchema: {
              type: 'object',
              properties: {
                primaryCustomerId: { type: 'string' },
                duplicateCustomerIds: {
                  type: 'array',
                  items: { type: 'string' },
                },
                mergeStrategy: {
                  type: 'string',
                  enum: ['keep_primary', 'keep_newest', 'manual'],
                },
              },
              required: ['primaryCustomerId', 'duplicateCustomerIds'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'create_customer':
            return await this.handleCreateCustomer(args);
          case 'get_customer':
            return await this.handleGetCustomer(args);
          case 'update_customer':
            return await this.handleUpdateCustomer(args);
          case 'search_customers':
            return await this.handleSearchCustomers(args);
          case 'get_transaction_history':
            return await this.handleGetTransactionHistory(args);
          case 'check_credit_limit':
            return await this.handleCheckCreditLimit(args);
          case 'get_customer_analytics':
            return await this.handleGetCustomerAnalytics(args);
          case 'merge_customers':
            return await this.handleMergeCustomers(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  // Create customer
  private async handleCreateCustomer(args: any) {
    const { customerData } = args;

    try {
      // Validate required fields
      if (!customerData.customer_code || !customerData.company_name) {
        throw new Error('Customer code and company name are required');
      }

      // Check for duplicate customer code
      const existingCustomer = Array.from(this.customers.values()).find(
        c => c.customer_code === customerData.customer_code
      );
      if (existingCustomer) {
        throw new Error(`Customer code ${customerData.customer_code} already exists`);
      }

      // Create new customer record
      const newCustomer: CustomerRecord = {
        id: `cust_${Date.now()}`,
        ...customerData,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Store customer
      this.customers.set(newCustomer.id!, newCustomer);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              customer: {
                id: newCustomer.id,
                customer_code: newCustomer.customer_code,
                company_name: newCustomer.company_name,
                created_at: newCustomer.created_at,
              },
              message: 'Customer created successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Get customer
  private async handleGetCustomer(args: any) {
    const { customerId, customerCode } = args;

    try {
      let customer: CustomerRecord | undefined;

      if (customerId) {
        customer = this.customers.get(customerId);
      } else if (customerCode) {
        customer = Array.from(this.customers.values()).find(
          c => c.customer_code === customerCode
        );
      }

      if (!customer) {
        throw new Error('Customer not found');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              customer,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Update customer
  private async handleUpdateCustomer(args: any) {
    const { customerId, updates } = args;

    try {
      const customer = this.customers.get(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Update customer data
      const updatedCustomer: CustomerRecord = {
        ...customer,
        ...updates,
        updated_at: new Date().toISOString(),
      };

      // Merge nested objects properly
      if (updates.address) {
        updatedCustomer.address = {
          ...customer.address,
          ...updates.address,
        };
      }
      if (updates.billing_info) {
        updatedCustomer.billing_info = {
          ...customer.billing_info,
          ...updates.billing_info,
        };
      }

      // Store updated customer
      this.customers.set(customerId, updatedCustomer);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              customer: updatedCustomer,
              message: 'Customer updated successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Search customers
  private async handleSearchCustomers(args: any) {
    const { query, filters = {}, limit = 50 } = args;

    try {
      let results = Array.from(this.customers.values());

      // Apply text search
      if (query) {
        const searchQuery = query.toLowerCase();
        results = results.filter(customer => 
          customer.company_name.toLowerCase().includes(searchQuery) ||
          customer.company_name_kana?.toLowerCase().includes(searchQuery) ||
          customer.contact_name?.toLowerCase().includes(searchQuery) ||
          customer.customer_code.toLowerCase().includes(searchQuery)
        );
      }

      // Apply filters
      if (filters.industry) {
        results = results.filter(c => c.industry === filters.industry);
      }
      if (filters.business_type) {
        results = results.filter(c => c.business_type === filters.business_type);
      }
      if (filters.tags && filters.tags.length > 0) {
        results = results.filter(c => 
          c.tags?.some(tag => filters.tags.includes(tag))
        );
      }
      if (filters.is_active !== undefined) {
        results = results.filter(c => c.is_active === filters.is_active);
      }

      // Apply limit
      results = results.slice(0, limit);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              customers: results,
              count: results.length,
              query,
              filters,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Get transaction history
  private async handleGetTransactionHistory(args: any) {
    const { customerId, dateFrom, dateTo, transactionType } = args;

    try {
      const customer = this.customers.get(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Generate demo transaction history
      const history: TransactionHistory = {
        customer_id: customerId,
        transactions: [
          {
            date: '2024-12-01',
            type: 'invoice',
            amount: 108000,
            reference: 'INV-2024-001',
            status: 'paid',
          },
          {
            date: '2024-12-15',
            type: 'payment',
            amount: -108000,
            reference: 'PAY-2024-001',
            status: 'completed',
          },
          {
            date: '2025-01-05',
            type: 'invoice',
            amount: 216000,
            reference: 'INV-2025-001',
            status: 'pending',
          },
        ],
        total_sales: 324000,
        outstanding_balance: 216000,
        last_transaction_date: '2025-01-05',
      };

      // Filter by date range
      if (dateFrom || dateTo) {
        history.transactions = history.transactions.filter(t => {
          const tDate = new Date(t.date);
          if (dateFrom && tDate < new Date(dateFrom)) return false;
          if (dateTo && tDate > new Date(dateTo)) return false;
          return true;
        });
      }

      // Filter by transaction type
      if (transactionType) {
        history.transactions = history.transactions.filter(
          t => t.type === transactionType
        );
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              customer: {
                id: customer.id,
                company_name: customer.company_name,
              },
              history,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Check credit limit
  private async handleCheckCreditLimit(args: any) {
    const { customerId, amount } = args;

    try {
      const customer = this.customers.get(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      const creditLimit = customer.billing_info?.credit_limit || 0;
      const outstandingBalance = 216000; // Demo value
      const availableCredit = creditLimit - outstandingBalance;
      const isApproved = amount <= availableCredit;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              customer: {
                id: customer.id,
                company_name: customer.company_name,
              },
              creditCheck: {
                requested_amount: amount,
                credit_limit: creditLimit,
                outstanding_balance: outstandingBalance,
                available_credit: availableCredit,
                is_approved: isApproved,
                message: isApproved 
                  ? 'Credit check approved' 
                  : 'Credit limit exceeded',
              },
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Get customer analytics
  private async handleGetCustomerAnalytics(args: any) {
    const { customerId, metrics = ['total_sales', 'average_order'] } = args;

    try {
      const customer = this.customers.get(customerId);
      if (!customer) {
        throw new Error('Customer not found');
      }

      // Generate demo analytics
      const analytics: any = {
        customer: {
          id: customer.id,
          company_name: customer.company_name,
        },
        metrics: {},
      };

      if (metrics.includes('total_sales')) {
        analytics.metrics.total_sales = {
          value: 324000,
          currency: 'JPY',
          period: 'last_12_months',
        };
      }

      if (metrics.includes('average_order')) {
        analytics.metrics.average_order = {
          value: 162000,
          currency: 'JPY',
          order_count: 2,
        };
      }

      if (metrics.includes('payment_history')) {
        analytics.metrics.payment_history = {
          on_time_rate: 100,
          average_days_to_pay: 15,
          late_payments: 0,
        };
      }

      if (metrics.includes('growth_rate')) {
        analytics.metrics.growth_rate = {
          current_year: 324000,
          previous_year: 250000,
          growth_percentage: 29.6,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              analytics,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Merge customers
  private async handleMergeCustomers(args: any) {
    const { primaryCustomerId, duplicateCustomerIds, mergeStrategy = 'keep_primary' } = args;

    try {
      const primaryCustomer = this.customers.get(primaryCustomerId);
      if (!primaryCustomer) {
        throw new Error('Primary customer not found');
      }

      const mergedData = {
        customers_merged: [] as string[],
        transactions_merged: 0,
        notes: [] as string[],
      };

      // Merge each duplicate into primary
      for (const dupId of duplicateCustomerIds) {
        const dupCustomer = this.customers.get(dupId);
        if (!dupCustomer) continue;

        // Merge tags
        if (dupCustomer.tags) {
          primaryCustomer.tags = [...new Set([
            ...(primaryCustomer.tags || []),
            ...dupCustomer.tags,
          ])];
        }

        // Merge notes
        if (dupCustomer.notes) {
          mergedData.notes.push(`From ${dupCustomer.company_name}: ${dupCustomer.notes}`);
        }

        // Delete duplicate
        this.customers.delete(dupId);
        mergedData.customers_merged.push(dupId);
      }

      // Update primary customer
      primaryCustomer.updated_at = new Date().toISOString();
      if (mergedData.notes.length > 0) {
        primaryCustomer.notes = [
          primaryCustomer.notes || '',
          ...mergedData.notes,
        ].filter(Boolean).join('\n\n');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              primary_customer: primaryCustomer,
              merge_result: {
                customers_merged: mergedData.customers_merged.length,
                duplicate_ids: mergedData.customers_merged,
                strategy: mergeStrategy,
              },
              message: 'Customers merged successfully',
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Customer MCP Server running on stdio');
  }
}

// Create and run server
const server = new CustomerMCPServer();
server.run().catch((error) => {
  console.error('Fatal error in Customer MCP server:', error);
  process.exit(1);
});