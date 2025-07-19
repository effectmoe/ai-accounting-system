import { z } from 'zod';
import { createAgent } from '@mastra/core';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

import { logger } from '@/lib/logger';
// 仕訳エントリスキーマ
const journalEntrySchema = z.object({
  description: z.string(),
  amount: z.number(),
  transactionType: z.enum(['income', 'expense', 'transfer']),
  date: z.string(),
  category: z.string().optional(),
  debitAccount: z.string().optional(),
  creditAccount: z.string().optional(),
  taxData: z.any().optional(),
  companyId: z.string(),
});

// 請求書作成スキーマ
const invoiceSchema = z.object({
  customerId: z.string(),
  items: z.array(z.object({
    description: z.string(),
    quantity: z.number(),
    unitPrice: z.number(),
    taxRate: z.number().optional(),
  })),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  companyId: z.string(),
});

// レポート生成スキーマ
const reportSchema = z.object({
  reportType: z.enum(['monthly', 'quarterly', 'annual', 'trial_balance', 'profit_loss', 'balance_sheet', 'compliance']),
  period: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }),
  companyId: z.string(),
  data: z.any().optional(),
});

// 会計エージェント入力スキーマ
const accountingInputSchema = z.object({
  operation: z.enum([
    'categorize',
    'create_journal_entry',
    'generate_report',
    'create_invoice',
    'extract_invoice_data',
    'analyze_financial_data',
    'export_data'
  ]),
  
  transactionData: z.object({
    description: z.string(),
    amount: z.number(),
    transactionType: z.enum(['income', 'expense', 'transfer']),
    date: z.string(),
    companyId: z.string(),
    vendorName: z.string().optional(),
    ocrData: z.any().optional(),
  }).optional(),
  
  entryData: journalEntrySchema.optional(),
  invoiceData: invoiceSchema.optional(),
  reportData: reportSchema.optional(),
  
  ocrResults: z.any().optional(),
  vendorInfo: z.any().optional(),
  
  analysisOptions: z.object({
    type: z.enum(['revenue_analysis', 'expense_analysis', 'cash_flow', 'profitability']),
    period: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    companyId: z.string(),
  }).optional(),
  
  exportOptions: z.object({
    format: z.enum(['csv', 'excel', 'json']),
    dataType: z.enum(['transactions', 'invoices', 'reports']),
    period: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    companyId: z.string(),
  }).optional(),
});

// 会計エージェント定義
export const accountingAgent = createAgent({
  id: 'accounting-agent',
  name: 'Accounting Management Agent',
  description: 'Handle accounting operations, journal entries, invoices, and financial reporting with MongoDB and Azure integration',
  
  inputSchema: accountingInputSchema,
  
  tools: {
    // 取引分類
    categorizeTransaction: {
      description: 'Categorize transaction and determine account codes',
      execute: async ({ transactionData }) => {
        try {
          const { AccountCategoryAI } = await import('@/lib/account-category-ai');
          const categoryAI = new AccountCategoryAI();
          
          const ocrResult = {
            text: transactionData.ocrData?.extractedText || '',
            vendor: transactionData.vendorName || 'Unknown',
            amount: transactionData.amount,
            date: transactionData.date,
            items: []
          };
          
          const prediction = await categoryAI.predictAccountCategory(
            ocrResult,
            transactionData.companyId
          );
          
          if (prediction && prediction.category) {
            return {
              success: true,
              category: prediction.category,
              confidence: prediction.confidence,
              reasoning: prediction.reasoning,
              suggestedAccounts: {
                debit: prediction.debitAccount || prediction.category,
                credit: prediction.creditAccount || '現金'
              }
            };
          }
          
          // フォールバック分類
          const fallbackCategory = await tools.fallbackCategorization({
            description: transactionData.description,
            vendorName: transactionData.vendorName,
            amount: transactionData.amount
          });
          
          return fallbackCategory;
          
        } catch (error) {
          logger.error('Transaction categorization error:', error);
          return {
            success: false,
            error: error.message,
            category: '未分類',
            confidence: 0.0
          };
        }
      },
    },
    
    // フォールバック分類
    fallbackCategorization: {
      description: 'Fallback categorization using rule-based logic',
      execute: async ({ description, vendorName, amount }) => {
        // ルールベースの分類ロジック
        const rules = [
          { keywords: ['交通費', 'タクシー', '電車', 'バス'], category: '旅費交通費' },
          { keywords: ['会議', '打ち合わせ', '食事', 'レストラン'], category: '会議費' },
          { keywords: ['文具', '用紙', 'ペン', '事務'], category: '事務用品費' },
          { keywords: ['電話', '通信', 'インターネット', 'Wi-Fi'], category: '通信費' },
          { keywords: ['電気', 'ガス', '水道', '光熱'], category: '水道光熱費' },
          { keywords: ['家賃', '賃料', 'オフィス'], category: '地代家賃' },
          { keywords: ['コンサル', '顧問', '士業'], category: '支払手数料' },
        ];
        
        const searchText = `${description} ${vendorName}`.toLowerCase();
        
        for (const rule of rules) {
          if (rule.keywords.some(keyword => searchText.includes(keyword))) {
            return {
              success: true,
              category: rule.category,
              confidence: 0.7,
              reasoning: `ルールベース分類: ${rule.keywords.find(k => searchText.includes(k))}`,
              suggestedAccounts: {
                debit: rule.category,
                credit: '現金'
              }
            };
          }
        }
        
        return {
          success: true,
          category: '未分類',
          confidence: 0.3,
          reasoning: 'ルールにマッチしませんでした',
          suggestedAccounts: {
            debit: '未分類',
            credit: '現金'
          }
        };
      },
    },
    
    // 仕訳エントリ作成
    createJournalEntry: {
      description: 'Create journal entry in MongoDB',
      execute: async ({ entryData }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // 勘定科目の自動判定
          let debitAccount = entryData.debitAccount;
          let creditAccount = entryData.creditAccount;
          
          if (!debitAccount && entryData.category) {
            debitAccount = entryData.category;
          }
          
          if (!creditAccount) {
            creditAccount = entryData.transactionType === 'expense' ? '現金' : '売上高';
          }
          
          // 仕訳エントリの作成
          const journalEntry = {
            companyId: entryData.companyId,
            description: entryData.description,
            date: new Date(entryData.date),
            reference: `JE-${Date.now()}`,
            lines: [
              {
                account: debitAccount,
                accountType: 'debit',
                amount: entryData.amount,
                description: entryData.description,
              },
              {
                account: creditAccount,
                accountType: 'credit',
                amount: entryData.amount,
                description: entryData.description,
              }
            ],
            taxData: entryData.taxData,
            status: 'posted',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const result = await db.create(Collections.JOURNAL_ENTRIES, journalEntry);
          
          return {
            success: true,
            entryId: result._id.toString(),
            journalEntry: result,
            message: '仕訳エントリが作成されました'
          };
          
        } catch (error) {
          logger.error('Journal entry creation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 請求書作成
    createInvoice: {
      description: 'Create invoice in MongoDB',
      execute: async ({ invoiceData, taxCalculation }) => {
        try {
          const db = DatabaseService.getInstance();
          
          // 請求書番号生成
          const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-6)}`;
          
          // 小計・税額・合計の計算
          const subtotal = invoiceData.items.reduce((sum, item) => 
            sum + (item.quantity * item.unitPrice), 0);
          const taxRate = invoiceData.items[0]?.taxRate || 0.1;
          const taxAmount = Math.floor(subtotal * taxRate);
          const totalAmount = subtotal + taxAmount;
          
          const invoice = {
            invoiceNumber,
            companyId: invoiceData.companyId,
            customerId: invoiceData.customerId,
            issueDate: new Date(),
            dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            items: invoiceData.items,
            subtotal,
            taxRate,
            taxAmount,
            totalAmount,
            notes: invoiceData.notes,
            status: 'draft',
            taxCalculation: taxCalculation,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const result = await db.create(Collections.INVOICES, invoice);
          
          // 売上仕訳の自動作成
          const salesJournalEntry = {
            companyId: invoiceData.companyId,
            description: `売上 - 請求書 ${invoiceNumber}`,
            date: new Date(),
            reference: invoiceNumber,
            lines: [
              {
                account: '売掛金',
                accountType: 'debit',
                amount: totalAmount,
                description: `請求書 ${invoiceNumber}`,
              },
              {
                account: '売上高',
                accountType: 'credit',
                amount: subtotal,
                description: `売上 ${invoiceNumber}`,
              },
              {
                account: '仮受消費税等',
                accountType: 'credit',
                amount: taxAmount,
                description: `消費税 ${invoiceNumber}`,
              }
            ],
            invoiceId: result._id.toString(),
            status: 'posted',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          await db.create(Collections.JOURNAL_ENTRIES, salesJournalEntry);
          
          return {
            success: true,
            invoiceId: result._id.toString(),
            invoiceNumber,
            totalAmount,
            invoice: result,
            message: '請求書が作成されました'
          };
          
        } catch (error) {
          logger.error('Invoice creation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 請求書データ抽出
    extractInvoiceData: {
      description: 'Extract invoice data from OCR results',
      execute: async ({ ocrResults, vendorInfo }) => {
        try {
          // OCR結果から請求書データを抽出
          const extractedData = {
            vendorName: ocrResults?.vendorName || ocrResults?.merchantName || vendorInfo?.name || 'Unknown',
            invoiceNumber: ocrResults?.invoiceNumber || ocrResults?.documentId || null,
            issueDate: ocrResults?.invoiceDate || ocrResults?.date || new Date().toISOString().split('T')[0],
            dueDate: ocrResults?.dueDate || null,
            totalAmount: parseFloat(ocrResults?.totalAmount || ocrResults?.InvoiceTotal || 0),
            taxAmount: parseFloat(ocrResults?.taxAmount || ocrResults?.tax || 0),
            subtotal: 0,
            items: [],
            registrationNumber: ocrResults?.registrationNumber || vendorInfo?.registrationNumber || null,
          };
          
          // 小計の計算
          extractedData.subtotal = extractedData.totalAmount - extractedData.taxAmount;
          
          // アイテムの抽出（可能な場合）
          if (ocrResults?.items && Array.isArray(ocrResults.items)) {
            extractedData.items = ocrResults.items.map(item => ({
              description: item.description || item.name || '商品',
              quantity: parseInt(item.quantity || 1),
              unitPrice: parseFloat(item.unitPrice || item.price || 0),
              amount: parseFloat(item.amount || item.total || 0),
            }));
          } else {
            // アイテム詳細がない場合は総額から1つのアイテムとして作成
            extractedData.items = [{
              description: extractedData.vendorName + ' - 請求',
              quantity: 1,
              unitPrice: extractedData.subtotal,
              amount: extractedData.subtotal,
            }];
          }
          
          return {
            success: true,
            extractedData,
            confidence: ocrResults?.confidence || 0.8,
            message: '請求書データが抽出されました'
          };
          
        } catch (error) {
          logger.error('Invoice data extraction error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 財務レポート生成
    generateReport: {
      description: 'Generate financial reports from MongoDB data',
      execute: async ({ reportType, period, companyId, data }) => {
        try {
          const db = DatabaseService.getInstance();
          const startDate = new Date(period.startDate);
          const endDate = new Date(period.endDate);
          
          let reportData;
          
          switch (reportType) {
            case 'monthly':
            case 'quarterly':
            case 'annual':
              // 期間損益レポート
              const transactions = await db.find(Collections.JOURNAL_ENTRIES, {
                companyId,
                date: { $gte: startDate, $lte: endDate }
              });
              
              let totalRevenue = 0;
              let totalExpenses = 0;
              const categoryBreakdown = {};
              
              transactions.forEach(entry => {
                entry.lines.forEach(line => {
                  if (line.accountType === 'credit' && line.account.includes('売上')) {
                    totalRevenue += line.amount;
                  } else if (line.accountType === 'debit' && !line.account.includes('売掛') && !line.account.includes('現金')) {
                    totalExpenses += line.amount;
                    categoryBreakdown[line.account] = (categoryBreakdown[line.account] || 0) + line.amount;
                  }
                });
              });
              
              reportData = {
                period: { startDate: period.startDate, endDate: period.endDate },
                summary: {
                  totalRevenue,
                  totalExpenses,
                  netIncome: totalRevenue - totalExpenses,
                  profitMargin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(2) + '%' : '0%'
                },
                categoryBreakdown,
                transactionCount: transactions.length
              };
              break;
              
            case 'trial_balance':
              // 試算表
              const allEntries = await db.find(Collections.JOURNAL_ENTRIES, {
                companyId,
                date: { $lte: endDate }
              });
              
              const accounts = {};
              allEntries.forEach(entry => {
                entry.lines.forEach(line => {
                  if (!accounts[line.account]) {
                    accounts[line.account] = { debit: 0, credit: 0 };
                  }
                  accounts[line.account][line.accountType] += line.amount;
                });
              });
              
              reportData = {
                period: { endDate: period.endDate },
                accounts,
                balanceCheck: {
                  totalDebits: Object.values(accounts).reduce((sum, acc) => sum + acc.debit, 0),
                  totalCredits: Object.values(accounts).reduce((sum, acc) => sum + acc.credit, 0)
                }
              };
              break;
              
            case 'compliance':
              // コンプライアンスレポート
              reportData = {
                period: { startDate: period.startDate, endDate: period.endDate },
                complianceData: data,
                generatedAt: new Date().toISOString(),
                companyId
              };
              break;
              
            default:
              throw new Error(`Unknown report type: ${reportType}`);
          }
          
          // レポートをMongoDBに保存
          const report = {
            companyId,
            reportType,
            period,
            data: reportData,
            generatedAt: new Date(),
            status: 'completed',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          
          const savedReport = await db.create('reports', report);
          
          return {
            success: true,
            reportId: savedReport._id.toString(),
            reportType,
            data: reportData,
            message: 'レポートが生成されました'
          };
          
        } catch (error) {
          logger.error('Report generation error:', error);
          return {
            success: false,
            error: error.message
          };
        }
      },
    },
    
    // 財務データ分析
    analyzeFinancialData: {
      description: 'Analyze financial data for insights',
      execute: async ({ type, period, companyId }) => {
        try {
          const db = DatabaseService.getInstance();
          const startDate = new Date(period.startDate);
          const endDate = new Date(period.endDate);
          
          const transactions = await db.find(Collections.JOURNAL_ENTRIES, {
            companyId,
            date: { $gte: startDate, $lte: endDate }
          });
          
          let analysisResult;
          
          switch (type) {
            case 'revenue_analysis':
              const revenueByMonth = {};
              transactions.forEach(entry => {
                const month = entry.date.toISOString().substring(0, 7);
                entry.lines.forEach(line => {
                  if (line.accountType === 'credit' && line.account.includes('売上')) {
                    revenueByMonth[month] = (revenueByMonth[month] || 0) + line.amount;
                  }
                });
              });
              
              analysisResult = {
                type: 'revenue_analysis',
                monthlyRevenue: revenueByMonth,
                totalRevenue: Object.values(revenueByMonth).reduce((sum, val) => sum + val, 0),
                averageMonthlyRevenue: Object.values(revenueByMonth).reduce((sum, val) => sum + val, 0) / Object.keys(revenueByMonth).length,
                trend: calculateTrend(Object.values(revenueByMonth))
              };
              break;
              
            case 'expense_analysis':
              const expenseByCategory = {};
              transactions.forEach(entry => {
                entry.lines.forEach(line => {
                  if (line.accountType === 'debit' && !line.account.includes('売掛') && !line.account.includes('現金')) {
                    expenseByCategory[line.account] = (expenseByCategory[line.account] || 0) + line.amount;
                  }
                });
              });
              
              analysisResult = {
                type: 'expense_analysis',
                categoryBreakdown: expenseByCategory,
                totalExpenses: Object.values(expenseByCategory).reduce((sum, val) => sum + val, 0),
                topCategories: Object.entries(expenseByCategory)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([category, amount]) => ({ category, amount }))
              };
              break;
              
            default:
              throw new Error(`Unknown analysis type: ${type}`);
          }
          
          return {
            success: true,
            analysis: analysisResult,
            period,
            companyId,
            message: '財務分析が完了しました'
          };
          
        } catch (error) {
          logger.error('Financial analysis error:', error);
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
      logger.debug('[Accounting Agent] Starting operation:', input.operation);
      
      switch (input.operation) {
        case 'categorize':
          if (!input.transactionData) {
            throw new Error('Transaction data is required for categorize operation');
          }
          
          const categorizeResult = await tools.categorizeTransaction({
            transactionData: input.transactionData
          });
          
          return {
            success: true,
            operation: 'categorize',
            result: categorizeResult
          };
          
        case 'create_journal_entry':
          if (!input.entryData) {
            throw new Error('Entry data is required for create_journal_entry operation');
          }
          
          const entryResult = await tools.createJournalEntry({
            entryData: input.entryData
          });
          
          return {
            success: true,
            operation: 'create_journal_entry',
            result: entryResult
          };
          
        case 'create_invoice':
          if (!input.invoiceData) {
            throw new Error('Invoice data is required for create_invoice operation');
          }
          
          const invoiceResult = await tools.createInvoice({
            invoiceData: input.invoiceData,
            taxCalculation: input.taxCalculation
          });
          
          return {
            success: true,
            operation: 'create_invoice',
            result: invoiceResult
          };
          
        case 'extract_invoice_data':
          if (!input.ocrResults) {
            throw new Error('OCR results are required for extract_invoice_data operation');
          }
          
          const extractResult = await tools.extractInvoiceData({
            ocrResults: input.ocrResults,
            vendorInfo: input.vendorInfo
          });
          
          return {
            success: true,
            operation: 'extract_invoice_data',
            result: extractResult
          };
          
        case 'generate_report':
          if (!input.reportData) {
            throw new Error('Report data is required for generate_report operation');
          }
          
          const reportResult = await tools.generateReport({
            reportType: input.reportData.reportType,
            period: input.reportData.period,
            companyId: input.reportData.companyId,
            data: input.reportData.data
          });
          
          return {
            success: true,
            operation: 'generate_report',
            result: reportResult
          };
          
        case 'analyze_financial_data':
          if (!input.analysisOptions) {
            throw new Error('Analysis options are required for analyze_financial_data operation');
          }
          
          const analysisResult = await tools.analyzeFinancialData({
            type: input.analysisOptions.type,
            period: input.analysisOptions.period,
            companyId: input.analysisOptions.companyId
          });
          
          return {
            success: true,
            operation: 'analyze_financial_data',
            result: analysisResult
          };
          
        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }
      
    } catch (error) {
      logger.error('[Accounting Agent] Error:', error);
      return {
        success: false,
        operation: input.operation,
        error: error.message
      };
    }
  },
});

// ヘルパー関数
function calculateTrend(values) {
  if (values.length < 2) return 'insufficient_data';
  
  const lastValue = values[values.length - 1];
  const previousValue = values[values.length - 2];
  
  if (lastValue > previousValue * 1.1) return 'increasing';
  if (lastValue < previousValue * 0.9) return 'decreasing';
  return 'stable';
}

export default accountingAgent;