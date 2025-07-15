import { z } from 'zod';
import { createWorkflow } from '@mastra/core';

// 会計ワークフローの入力スキーマ
const accountingWorkflowInputSchema = z.object({
  workflowType: z.enum(['transaction_processing', 'invoice_generation', 'monthly_report', 'tax_calculation']),
  companyId: z.string(),
  
  // 取引処理
  transactionData: z.object({
    description: z.string(),
    amount: z.number(),
    transactionType: z.enum(['income', 'expense', 'transfer']),
    date: z.string(),
    documents: z.array(z.object({
      type: z.string(),
      base64Data: z.string().optional(),
      fileUrl: z.string().optional(),
    })).optional(),
  }).optional(),
  
  // 請求書生成
  invoiceData: z.object({
    customerId: z.string(),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
    })),
    dueDate: z.string().optional(),
  }).optional(),
  
  // レポート期間
  reportPeriod: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
});

// 会計ワークフロー定義
export const accountingWorkflow = createWorkflow({
  id: 'accounting-workflow',
  name: 'Accounting Processing Workflow',
  description: 'Comprehensive accounting workflow for transaction processing, invoice generation, and reporting',
  
  inputSchema: accountingWorkflowInputSchema,
  
  // ワークフローの実行ステップ
  steps: [
    {
      id: 'validate_input',
      name: 'Input Validation',
      agent: 'database-agent',
      input: (workflowInput: any) => ({
        operation: 'validate',
        data: workflowInput
      }),
    },
    
    {
      id: 'process_documents',
      name: 'Document Processing',
      agent: 'ocr-agent',
      condition: (workflowInput: any) => workflowInput.transactionData?.documents?.length > 0,
      input: (workflowInput: any) => ({
        operation: 'process_documents',
        documents: workflowInput.transactionData.documents,
        options: {
          extractFinancialData: true,
          japaneseSupport: true
        }
      }),
    },
    
    {
      id: 'categorize_transaction',
      name: 'Transaction Categorization',
      agent: 'accounting-agent',
      condition: (workflowInput: any) => workflowInput.workflowType === 'transaction_processing',
      input: (workflowInput: any, previousResults: any) => ({
        operation: 'categorize',
        transaction: {
          ...workflowInput.transactionData,
          ocrData: previousResults.process_documents?.result
        }
      }),
    },
    
    {
      id: 'calculate_tax',
      name: 'Tax Calculation',
      agent: 'japan-tax-agent',
      input: (workflowInput: any, previousResults: any) => {
        const transaction = previousResults.categorize_transaction?.result || workflowInput.transactionData;
        return {
          operation: 'calculate_consumption_tax',
          consumptionTax: {
            period: {
              startDate: workflowInput.transactionData.date,
              endDate: workflowInput.transactionData.date
            },
            salesData: {
              standardRateSales: transaction.transactionType === 'income' ? transaction.amount : 0,
              reducedRateSales: 0,
              exportSales: 0,
              exemptSales: 0
            },
            purchaseData: {
              standardRatePurchases: transaction.transactionType === 'expense' ? transaction.amount : 0,
              reducedRatePurchases: 0,
              nonDeductiblePurchases: 0
            }
          }
        };
      },
    },
    
    {
      id: 'create_journal_entry',
      name: 'Journal Entry Creation',
      agent: 'accounting-agent',
      input: (workflowInput: any, previousResults: any) => ({
        operation: 'create_journal_entry',
        entryData: {
          ...workflowInput.transactionData,
          category: previousResults.categorize_transaction?.result?.category,
          taxData: previousResults.calculate_tax?.result
        }
      }),
    },
    
    {
      id: 'generate_invoice',
      name: 'Invoice Generation',
      agent: 'accounting-agent',
      condition: (workflowInput: any) => workflowInput.workflowType === 'invoice_generation',
      input: (workflowInput: any) => ({
        operation: 'create_invoice',
        invoiceData: workflowInput.invoiceData
      }),
    },
    
    {
      id: 'generate_report',
      name: 'Report Generation',
      agent: 'accounting-agent',
      condition: (workflowInput: any) => workflowInput.workflowType === 'monthly_report',
      input: (workflowInput: any) => ({
        operation: 'generate_report',
        reportType: 'monthly',
        period: workflowInput.reportPeriod,
        companyId: workflowInput.companyId
      }),
    },
    
    {
      id: 'save_to_database',
      name: 'Database Storage',
      agent: 'database-agent',
      input: (workflowInput: any, previousResults: any) => ({
        operation: 'create',
        collection: 'transactions',
        data: {
          companyId: workflowInput.companyId,
          journalEntry: previousResults.create_journal_entry?.result,
          taxCalculation: previousResults.calculate_tax?.result,
          invoiceId: previousResults.generate_invoice?.result?.invoiceId,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }),
    },
    
    {
      id: 'update_customer_records',
      name: 'Customer Record Update',
      agent: 'customer-agent',
      condition: (workflowInput: any) => workflowInput.invoiceData?.customerId,
      input: (workflowInput: any, previousResults: any) => ({
        operation: 'update',
        customerData: {
          id: workflowInput.invoiceData.customerId,
          lastInvoiceDate: new Date().toISOString(),
          totalInvoiceAmount: previousResults.generate_invoice?.result?.amount
        }
      }),
    },
  ],
  
  // エラーハンドリング
  errorHandling: {
    retryPolicy: {
      maxRetries: 3,
      backoffMultiplier: 2,
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR']
    },
    rollbackStrategy: 'compensating_actions',
    compensation: {
      save_to_database: async (context: any) => {
        // データベースロールバック
        return context.agents['database-agent'].execute({
          operation: 'rollback',
          transactionId: context.results.save_to_database?.transactionId
        });
      },
      create_journal_entry: async (context: any) => {
        // 仕訳エントリの削除
        return context.agents['accounting-agent'].execute({
          operation: 'delete_journal_entry',
          entryId: context.results.create_journal_entry?.entryId
        });
      }
    }
  },
  
  // 実行ロジック
  execute: async ({ input, agents, context }) => {
    try {
      console.log('[Accounting Workflow] Starting workflow:', input.workflowType);
      
      const results: any = {};
      
      // ステップを順次実行
      for (const step of accountingWorkflow.steps) {
        // 条件チェック
        if (step.condition && !step.condition(input)) {
          console.log(`[Accounting Workflow] Skipping step: ${step.name}`);
          continue;
        }
        
        console.log(`[Accounting Workflow] Executing step: ${step.name}`);
        
        // ステップの入力データを準備
        const stepInput = step.input(input, results);
        
        // エージェントを実行
        const stepResult = await agents[step.agent].execute({
          input: stepInput,
          context: { ...context, workflowId: 'accounting-workflow' }
        });
        
        results[step.id] = stepResult;
        
        // エラーチェック
        if (!stepResult.success) {
          throw new Error(`Step ${step.name} failed: ${stepResult.error}`);
        }
      }
      
      return {
        success: true,
        workflowType: input.workflowType,
        results,
        completedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('[Accounting Workflow] Error:', error);
      
      // エラー処理とロールバック
      if (accountingWorkflow.errorHandling.compensation) {
        console.log('[Accounting Workflow] Initiating rollback...');
        // 補償アクションを実行
      }
      
      throw error;
    }
  },
});

export default accountingWorkflow;