import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { spawn } from 'child_process';
import path from 'path';

// 税務操作結果のスキーマ
const taxResultSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  calculation: z.any().optional(),
  tax_rate: z.number().optional(),
  rate_type: z.string().optional(),
  is_deductible: z.boolean().optional(),
  deductible_amount: z.number().optional(),
  invoice_summary: z.any().optional(),
  tax_return: z.any().optional(),
  business_status: z.any().optional(),
  calendar: z.array(z.any()).optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

// 税務エージェントの入力スキーマ
const taxInputSchema = z.object({
  operation: z.enum([
    'calculate_tax',
    'determine_rate',
    'check_deductibility',
    'calculate_invoice',
    'estimate_return',
    'check_invoice_system',
    'calculate_withholding',
    'get_calendar',
    'validate_expense'
  ]),
  
  // 消費税計算用
  taxCalculation: z.object({
    amount: z.number(),
    category: z.string(),
    is_tax_included: z.boolean().default(false),
    calculation_date: z.string().optional(),
  }).optional(),
  
  // 税率判定用
  rateInquiry: z.object({
    item_description: z.string(),
    category: z.string().optional(),
    is_takeout: z.boolean().optional(),
    is_subscription: z.boolean().optional(),
  }).optional(),
  
  // 経費控除確認用
  deductibilityCheck: z.object({
    expense_category: z.string(),
    amount: z.number(),
    description: z.string().optional(),
    is_business_use: z.boolean().default(true),
    business_use_percentage: z.number().default(100),
  }).optional(),
  
  // インボイス計算用
  invoiceData: z.object({
    items: z.array(z.object({
      description: z.string(),
      amount: z.number(),
      quantity: z.number(),
      tax_rate: z.number().optional(),
    })),
    invoice_date: z.string().optional(),
    is_qualified_invoice: z.boolean().default(true),
  }).optional(),
  
  // 確定申告見積用
  returnEstimate: z.object({
    year: z.number(),
    return_type: z.enum(['blue', 'white']),
    income: z.object({
      sales: z.number(),
      other: z.number().default(0),
    }),
    expenses: z.record(z.number()).optional(),
    deductions: z.object({
      social_insurance: z.number().optional(),
      life_insurance: z.number().optional(),
      medical_expenses: z.number().optional(),
    }).optional(),
  }).optional(),
  
  // インボイス制度確認用
  invoiceSystemCheck: z.object({
    business_info: z.object({
      is_registered: z.boolean(),
      registration_number: z.string().optional(),
      annual_sales: z.number(),
    }),
    transaction_type: z.string().optional(),
  }).optional(),
  
  // 源泉徴収計算用
  withholdingData: z.object({
    payment_type: z.enum(['salary', 'bonus', 'freelance', 'dividend']),
    gross_amount: z.number(),
    recipient_type: z.enum(['individual', 'corporation']).default('individual'),
  }).optional(),
  
  // 税務カレンダー用
  calendarRequest: z.object({
    year: z.number(),
    business_type: z.enum(['individual', 'corporation']).default('individual'),
  }).optional(),
  
  // 経費検証用（OCR結果から）
  expenseValidation: z.object({
    vendor_name: z.string(),
    amount: z.number(),
    category: z.string(),
    receipt_date: z.string(),
    items: z.array(z.string()).optional(),
  }).optional(),
});

// MCP Client for Japan Tax MCP Server
class JapanTaxMCPClient {
  async callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const mcpServerPath = path.join(__dirname, '../mcp-servers/japan-tax-mcp-server.ts');
        
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
            reject(new Error(`Japan Tax MCP Server exited with code ${code}: ${errorData}`));
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
          reject(new Error(`Japan Tax MCP Server process error: ${error.message}`));
        });

        // Timeout
        setTimeout(() => {
          mcpProcess.kill();
          reject(new Error('Japan Tax MCP Server request timeout'));
        }, 30000);

      } catch (error) {
        reject(new Error(`Japan Tax MCP Client error: ${error.message}`));
      }
    });
  }
}

// 日本税務エージェント定義
export const japanTaxAgent = createAgent({
  id: 'japan-tax-agent',
  name: 'Japan Tax Compliance Agent with MCP Integration',
  description: 'Handle Japanese tax calculations and compliance',
  
  inputSchema: taxInputSchema,
  outputSchema: taxResultSchema,
  
  tools: {
    // 消費税計算
    calculateConsumptionTax: {
      description: 'Calculate Japanese consumption tax',
      execute: async ({ amount, category, is_tax_included, calculation_date }) => {
        const mcpClient = new JapanTaxMCPClient();
        
        try {
          const result = await mcpClient.callTool('calculate_consumption_tax', {
            amount,
            category,
            is_tax_included,
            calculation_date,
          });

          return result;
        } catch (error) {
          throw new Error(`Tax calculation failed: ${error.message}`);
        }
      },
    },

    // 税率判定
    determineTaxRate: {
      description: 'Determine applicable tax rate',
      execute: async ({ item_description, category, is_takeout, is_subscription }) => {
        const mcpClient = new JapanTaxMCPClient();
        
        try {
          const result = await mcpClient.callTool('determine_tax_rate', {
            item_description,
            category,
            is_takeout,
            is_subscription,
          });

          return result;
        } catch (error) {
          throw new Error(`Tax rate determination failed: ${error.message}`);
        }
      },
    },

    // 経費控除確認
    checkDeductibility: {
      description: 'Check if expense is tax deductible',
      execute: async ({ expense_category, amount, description, is_business_use, business_use_percentage }) => {
        const mcpClient = new JapanTaxMCPClient();
        
        try {
          const result = await mcpClient.callTool('check_deductibility', {
            expense_category,
            amount,
            description,
            is_business_use,
            business_use_percentage,
          });

          return result;
        } catch (error) {
          throw new Error(`Deductibility check failed: ${error.message}`);
        }
      },
    },

    // インボイス計算
    calculateInvoiceTax: {
      description: 'Calculate tax for qualified invoice',
      execute: async ({ items, invoice_date, is_qualified_invoice }) => {
        const mcpClient = new JapanTaxMCPClient();
        
        try {
          const result = await mcpClient.callTool('calculate_invoice_tax', {
            items,
            invoice_date,
            is_qualified_invoice,
          });

          return result;
        } catch (error) {
          throw new Error(`Invoice tax calculation failed: ${error.message}`);
        }
      },
    },

    // 確定申告見積
    estimateTaxReturn: {
      description: 'Estimate tax return calculation',
      execute: async ({ year, return_type, income, expenses, deductions }) => {
        const mcpClient = new JapanTaxMCPClient();
        
        try {
          const result = await mcpClient.callTool('estimate_tax_return', {
            year,
            return_type,
            income,
            expenses,
            deductions,
          });

          return result;
        } catch (error) {
          throw new Error(`Tax return estimation failed: ${error.message}`);
        }
      },
    },

    // インボイス制度確認
    checkInvoiceRequirements: {
      description: 'Check invoice system requirements',
      execute: async ({ business_info, transaction_type }) => {
        const mcpClient = new JapanTaxMCPClient();
        
        try {
          const result = await mcpClient.callTool('check_invoice_requirements', {
            business_info,
            transaction_type,
          });

          return result;
        } catch (error) {
          throw new Error(`Invoice requirements check failed: ${error.message}`);
        }
      },
    },

    // 源泉徴収計算
    calculateWithholdingTax: {
      description: 'Calculate withholding tax',
      execute: async ({ payment_type, gross_amount, recipient_type }) => {
        const mcpClient = new JapanTaxMCPClient();
        
        try {
          const result = await mcpClient.callTool('calculate_withholding_tax', {
            payment_type,
            gross_amount,
            recipient_type,
          });

          return result;
        } catch (error) {
          throw new Error(`Withholding tax calculation failed: ${error.message}`);
        }
      },
    },

    // 税務カレンダー取得
    getTaxCalendar: {
      description: 'Get tax calendar and deadlines',
      execute: async ({ year, business_type }) => {
        const mcpClient = new JapanTaxMCPClient();
        
        try {
          const result = await mcpClient.callTool('get_tax_calendar', {
            year,
            business_type,
          });

          return result;
        } catch (error) {
          throw new Error(`Tax calendar retrieval failed: ${error.message}`);
        }
      },
    },

    // 経費検証（OCR結果から）
    validateExpenseFromReceipt: {
      description: 'Validate expense from receipt OCR result',
      execute: async ({ vendor_name, amount, category, receipt_date, items }) => {
        // 領収書データから税務上の妥当性を検証
        const mcpClient = new JapanTaxMCPClient();
        
        try {
          // まず適用税率を判定
          const rateResult = await mcpClient.callTool('determine_tax_rate', {
            item_description: items ? items.join(', ') : category,
            category,
          });

          // 経費控除可能性をチェック
          const deductResult = await mcpClient.callTool('check_deductibility', {
            expense_category: category,
            amount,
            description: `${vendor_name} - ${items ? items.join(', ') : category}`,
            is_business_use: true,
          });

          return {
            success: true,
            validation: {
              vendor_name,
              amount,
              category,
              receipt_date,
              tax_rate: rateResult.tax_rate,
              rate_type: rateResult.rate_type,
              is_deductible: deductResult.is_deductible,
              deductible_amount: deductResult.deductible_amount,
              category_ja: deductResult.category_ja,
              documentation_needed: deductResult.documentation_needed,
            },
            recommendations: [
              ...(rateResult.reasoning || []),
              ...(deductResult.reasons || []),
            ],
            message: `経費検証完了: ${deductResult.is_deductible ? '経費計上可能' : '経費計上不可'}`,
            timestamp: new Date().toISOString(),
          };

        } catch (error) {
          throw new Error(`Expense validation failed: ${error.message}`);
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('🇯🇵 [Japan Tax Agent] Starting tax operation:', input.operation);

      switch (input.operation) {
        case 'calculate_tax': {
          if (!input.taxCalculation) {
            throw new Error('Tax calculation data is required');
          }

          const result = await tools.calculateConsumptionTax({
            amount: input.taxCalculation.amount,
            category: input.taxCalculation.category,
            is_tax_included: input.taxCalculation.is_tax_included,
            calculation_date: input.taxCalculation.calculation_date,
          });

          return {
            success: result.success,
            operation: 'calculate_tax',
            calculation: result.calculation,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'determine_rate': {
          if (!input.rateInquiry) {
            throw new Error('Rate inquiry data is required');
          }

          const result = await tools.determineTaxRate({
            item_description: input.rateInquiry.item_description,
            category: input.rateInquiry.category,
            is_takeout: input.rateInquiry.is_takeout,
            is_subscription: input.rateInquiry.is_subscription,
          });

          return {
            success: result.success,
            operation: 'determine_rate',
            tax_rate: result.tax_rate,
            rate_type: result.rate_type,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'check_deductibility': {
          if (!input.deductibilityCheck) {
            throw new Error('Deductibility check data is required');
          }

          const result = await tools.checkDeductibility({
            expense_category: input.deductibilityCheck.expense_category,
            amount: input.deductibilityCheck.amount,
            description: input.deductibilityCheck.description,
            is_business_use: input.deductibilityCheck.is_business_use,
            business_use_percentage: input.deductibilityCheck.business_use_percentage,
          });

          return {
            success: result.success,
            operation: 'check_deductibility',
            is_deductible: result.is_deductible,
            deductible_amount: result.deductible_amount,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'calculate_invoice': {
          if (!input.invoiceData) {
            throw new Error('Invoice data is required');
          }

          const result = await tools.calculateInvoiceTax({
            items: input.invoiceData.items,
            invoice_date: input.invoiceData.invoice_date,
            is_qualified_invoice: input.invoiceData.is_qualified_invoice,
          });

          return {
            success: result.success,
            operation: 'calculate_invoice',
            invoice_summary: result.invoice_summary,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'estimate_return': {
          if (!input.returnEstimate) {
            throw new Error('Return estimate data is required');
          }

          const result = await tools.estimateTaxReturn({
            year: input.returnEstimate.year,
            return_type: input.returnEstimate.return_type,
            income: input.returnEstimate.income,
            expenses: input.returnEstimate.expenses,
            deductions: input.returnEstimate.deductions,
          });

          return {
            success: result.success,
            operation: 'estimate_return',
            tax_return: result.tax_return,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'check_invoice_system': {
          if (!input.invoiceSystemCheck) {
            throw new Error('Invoice system check data is required');
          }

          const result = await tools.checkInvoiceRequirements({
            business_info: input.invoiceSystemCheck.business_info,
            transaction_type: input.invoiceSystemCheck.transaction_type,
          });

          return {
            success: result.success,
            operation: 'check_invoice_system',
            business_status: result.business_status,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'calculate_withholding': {
          if (!input.withholdingData) {
            throw new Error('Withholding data is required');
          }

          const result = await tools.calculateWithholdingTax({
            payment_type: input.withholdingData.payment_type,
            gross_amount: input.withholdingData.gross_amount,
            recipient_type: input.withholdingData.recipient_type,
          });

          return {
            success: result.success,
            operation: 'calculate_withholding',
            calculation: result.calculation,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'get_calendar': {
          if (!input.calendarRequest) {
            throw new Error('Calendar request data is required');
          }

          const result = await tools.getTaxCalendar({
            year: input.calendarRequest.year,
            business_type: input.calendarRequest.business_type,
          });

          return {
            success: result.success,
            operation: 'get_calendar',
            calendar: result.calendar,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'validate_expense': {
          if (!input.expenseValidation) {
            throw new Error('Expense validation data is required');
          }

          const result = await tools.validateExpenseFromReceipt({
            vendor_name: input.expenseValidation.vendor_name,
            amount: input.expenseValidation.amount,
            category: input.expenseValidation.category,
            receipt_date: input.expenseValidation.receipt_date,
            items: input.expenseValidation.items,
          });

          return {
            success: result.success,
            operation: 'validate_expense',
            is_deductible: result.validation.is_deductible,
            deductible_amount: result.validation.deductible_amount,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }

    } catch (error) {
      console.error('❌ [Japan Tax Agent] Operation failed:', error);
      return {
        success: false,
        operation: input.operation || 'unknown',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
});

export default japanTaxAgent;