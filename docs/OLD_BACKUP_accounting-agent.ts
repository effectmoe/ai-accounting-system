import { z } from 'zod';
import { createAgent } from '@mastra/core';

// 仕訳エントリのスキーマ
const journalEntrySchema = z.object({
  date: z.string(),
  description: z.string(),
  debit: z.object({
    account: z.string(),
    amount: z.number(),
  }),
  credit: z.object({
    account: z.string(),
    amount: z.number(),
  }),
  taxRate: z.number().optional(),
  taxAmount: z.number().optional(),
  documentId: z.string().optional(),
});

// 会計エージェントの入力スキーマ
const accountingInputSchema = z.object({
  // 自然言語入力
  naturalLanguageInput: z.string().optional(),
  
  // 構造化入力（OCRから）
  structuredInput: z.object({
    vendor: z.string(),
    amount: z.number(),
    date: z.string(),
    description: z.string(),
    category: z.string().optional(),
    ocrResultId: z.string().optional(),
  }).optional(),
  
  // 処理タイプ
  processType: z.enum(['journal_entry', 'tax_calculation', 'report_generation']),
  
  // レポートオプション
  reportOptions: z.object({
    type: z.enum(['trial_balance', 'balance_sheet', 'profit_loss', 'journal']),
    period: z.object({
      startDate: z.string(),
      endDate: z.string(),
    }),
    format: z.enum(['google_sheets', 'excel', 'pdf', 'csv']),
  }).optional(),
});

// 会計エージェント定義
export const accountingAgent = createAgent({
  id: 'accounting-agent',
  name: 'Accounting Processing Agent',
  description: 'Process accounting transactions, calculate taxes, and generate reports',
  
  inputSchema: accountingInputSchema,
  
  // エージェントのツール
  tools: {
    // 自然言語を仕訳に変換
    parseNaturalLanguage: {
      description: 'Parse natural language input into accounting transaction',
      execute: async ({ input, llm }) => {
        const prompt = `
        以下の文章から会計仕訳を作成してください：
        "${input}"
        
        以下の形式でJSONを返してください：
        {
          "date": "YYYY-MM-DD",
          "description": "取引の説明",
          "amount": 金額,
          "category": "費用カテゴリ",
          "vendor": "取引先",
          "needsTaxCalculation": true/false
        }
        `;
        
        const response = await llm.complete(prompt);
        return JSON.parse(response);
      },
    },
    
    // NLWeb経由で勘定科目を判定
    determineAccount: {
      description: 'Determine account category using NLWeb',
      execute: async ({ description, amount, vendor, mcpClient }) => {
        const result = await mcpClient.callTool('nlweb', 'determine_account_category', {
          description,
          amount,
          vendor,
          businessContext: {
            industry: 'IT',
            purpose: 'business_expense'
          }
        });
        
        return result;
      },
    },
    
    // 税額計算
    calculateTax: {
      description: 'Calculate tax using NLWeb',
      execute: async ({ item, amount, context, mcpClient }) => {
        const taxRateResult = await mcpClient.callTool('nlweb', 'get_tax_rate', {
          item,
          context
        });
        
        const taxRate = taxRateResult.taxRate;
        const taxAmount = Math.floor(amount * taxRate / (1 + taxRate));
        const amountExcludingTax = amount - taxAmount;
        
        return {
          taxRate,
          taxAmount,
          amountExcludingTax,
          totalAmount: amount,
          reasoning: taxRateResult.reasoning
        };
      },
    },
    
    // 複式簿記の仕訳生成
    createJournalEntry: {
      description: 'Create double-entry bookkeeping journal entry',
      execute: async ({ transaction }) => {
        const { date, description, amount, category, vendor } = transaction;
        
        // 基本的な仕訳ルール（実際はもっと複雑）
        const journalRules = {
          '旅費交通費': { debit: '旅費交通費', credit: '現金' },
          '会議費': { debit: '会議費', credit: '現金' },
          '接待交際費': { debit: '接待交際費', credit: '現金' },
          '消耗品費': { debit: '消耗品費', credit: '現金' },
          '通信費': { debit: '通信費', credit: '未払金' },
          '売上': { debit: '売掛金', credit: '売上高' },
        };
        
        const rule = journalRules[category] || { debit: category, credit: '現金' };
        
        return {
          date,
          description: `${vendor} - ${description}`,
          debit: {
            account: rule.debit,
            amount: amount
          },
          credit: {
            account: rule.credit,
            amount: amount
          }
        };
      },
    },
    
    // Supabaseに仕訳を保存
    saveJournalEntry: {
      description: 'Save journal entry to Supabase',
      execute: async ({ entry, mcpClient }) => {
        const result = await mcpClient.callTool('supabase', 'insert', {
          table: 'journal_entries',
          data: {
            ...entry,
            created_at: new Date().toISOString()
          }
        });
        
        return result;
      },
    },
    
    // 試算表の生成
    generateTrialBalance: {
      description: 'Generate trial balance',
      execute: async ({ period, mcpClient }) => {
        // Supabaseから期間内の仕訳を取得
        const entries = await mcpClient.callTool('supabase', 'select', {
          table: 'journal_entries',
          filters: {
            date: { gte: period.startDate, lte: period.endDate }
          }
        });
        
        // 勘定科目ごとに集計
        const accounts = {};
        
        entries.forEach(entry => {
          // 借方
          if (!accounts[entry.debit.account]) {
            accounts[entry.debit.account] = { debit: 0, credit: 0 };
          }
          accounts[entry.debit.account].debit += entry.debit.amount;
          
          // 貸方
          if (!accounts[entry.credit.account]) {
            accounts[entry.credit.account] = { debit: 0, credit: 0 };
          }
          accounts[entry.credit.account].credit += entry.credit.amount;
        });
        
        return accounts;
      },
    },
    
    // Google Sheetsに出力
    exportToGoogleSheets: {
      description: 'Export report to Google Sheets',
      execute: async ({ reportData, reportType, mcpClient }) => {
        // 新しいシートを作成
        const sheetResult = await mcpClient.callTool('google-sheets', 'create_sheet', {
          title: `${reportType}_${new Date().toISOString().split('T')[0]}`
        });
        
        const sheetId = sheetResult.spreadsheetId;
        
        // ヘッダーを書き込み
        const headers = reportType === 'trial_balance' 
          ? ['勘定科目', '借方', '貸方', '残高']
          : ['日付', '摘要', '借方科目', '借方金額', '貸方科目', '貸方金額'];
          
        await mcpClient.callTool('google-sheets', 'write_sheet', {
          spreadsheetId: sheetId,
          range: 'A1',
          values: [headers]
        });
        
        // データを書き込み
        let row = 2;
        for (const [account, data] of Object.entries(reportData)) {
          await mcpClient.callTool('google-sheets', 'append_row', {
            spreadsheetId: sheetId,
            values: [account, data.debit, data.credit, data.debit - data.credit]
          });
          row++;
        }
        
        return { spreadsheetId: sheetId, url: `https://docs.google.com/spreadsheets/d/${sheetId}` };
      },
    },
    
    // Excelに出力
    exportToExcel: {
      description: 'Export report to Excel',
      execute: async ({ reportData, reportType, mcpClient }) => {
        // Excel MCPサーバーを使用
        const result = await mcpClient.callTool('excel', 'create_workbook', {
          sheets: [{
            name: reportType,
            data: reportData
          }]
        });
        
        return result;
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools, mcpClient }) => {
    try {
      console.log('[Accounting Agent] Starting process:', input.processType);
      
      // 仕訳作成の場合
      if (input.processType === 'journal_entry') {
        let transaction;
        
        // 自然言語入力の解析
        if (input.naturalLanguageInput) {
          transaction = await tools.parseNaturalLanguage({ 
            input: input.naturalLanguageInput 
          });
        } else if (input.structuredInput) {
          transaction = input.structuredInput;
        } else {
          throw new Error('No input provided');
        }
        
        // 勘定科目の判定（NLWeb使用）
        if (!transaction.category) {
          const categoryResult = await tools.determineAccount({
            description: transaction.description,
            amount: transaction.amount,
            vendor: transaction.vendor,
            mcpClient
          });
          transaction.category = categoryResult.suggestedCategory;
        }
        
        // 税額計算
        if (transaction.needsTaxCalculation !== false) {
          const taxResult = await tools.calculateTax({
            item: transaction.description,
            amount: transaction.amount,
            context: { date: transaction.date },
            mcpClient
          });
          transaction.taxAmount = taxResult.taxAmount;
          transaction.taxRate = taxResult.taxRate;
        }
        
        // 仕訳作成
        const journalEntry = await tools.createJournalEntry({ transaction });
        
        // 保存
        const saveResult = await tools.saveJournalEntry({ 
          entry: journalEntry, 
          mcpClient 
        });
        
        return {
          success: true,
          journalEntry,
          saveResult
        };
      }
      
      // レポート生成の場合
      if (input.processType === 'report_generation' && input.reportOptions) {
        const { type, period, format } = input.reportOptions;
        
        let reportData;
        
        // レポートタイプに応じてデータ生成
        if (type === 'trial_balance') {
          reportData = await tools.generateTrialBalance({ period, mcpClient });
        }
        
        // 出力形式に応じて処理
        let exportResult;
        if (format === 'google_sheets') {
          exportResult = await tools.exportToGoogleSheets({
            reportData,
            reportType: type,
            mcpClient
          });
        } else if (format === 'excel') {
          exportResult = await tools.exportToExcel({
            reportData,
            reportType: type,
            mcpClient
          });
        }
        
        return {
          success: true,
          reportType: type,
          format,
          exportResult
        };
      }
      
    } catch (error) {
      console.error('[Accounting Agent] Error:', error);
      throw error;
    }
  },
});

// エージェントのエクスポート
export default accountingAgent;