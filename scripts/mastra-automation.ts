import { Agent } from '@mastra/core';
import { transactionService, reportService } from '../src/lib/supabase-client';
import { SheetsExportService } from '../src/services/sheets-export-service';
import { OCRProcessor } from '../src/lib/ocr-processor';
import { storageService } from '../src/lib/supabase-client';

/**
 * Mastra AI会計自動化エージェント
 */
export const accountingAgent = new Agent({
  name: 'AI会計自動化エージェント',
  description: 'レシートのOCR処理、仕訳作成、レポート生成を自動化',
  
  instructions: `
    あなたは日本の会計に精通したAIアシスタントです。
    以下のタスクを自動的に実行します：
    1. アップロードされたレシートや請求書をOCR処理
    2. 適切な勘定科目を判定して仕訳を作成
    3. データをSupabaseに保存
    4. 定期的にGoogle Sheetsにエクスポート
    5. 月次レポートを自動生成
  `,
  
  model: {
    provider: 'ANTHROPIC' as const,
    identifier: 'claude-3-sonnet'
  } as any
});

/**
 * 日次処理タスク
 */
export async function runDailyProcessing(userId: string) {
  console.log('🤖 日次処理を開始します...');
  
  try {
    // 1. 未処理のトランザクションを取得
    const pendingTransactions = await transactionService.listByUser(userId);
    const pending = pendingTransactions.filter(tx => tx.status === 'pending');
    
    console.log(`📋 未処理のトランザクション: ${pending.length}件`);
    
    // 2. 各トランザクションを確認・修正
    for (const transaction of pending) {
      try {
        // AIに仕訳内容を確認させる
        const reviewResult = await accountingAgent.generate(`
          以下のトランザクションを確認し、修正が必要かチェックしてください：
          ${JSON.stringify(transaction)}
        `);
        
        // レビュー結果を解析（簡易実装）
        const needsCorrection = reviewResult.text?.includes('修正が必要');
        if (needsCorrection) {
          console.log('修正が必要なトランザクション:', transaction.id);
        }
        
        // ステータスを確認済みに更新
        await transactionService.update(transaction.id!, {
          status: 'confirmed'
        });
        
        console.log(`✅ トランザクション ${transaction.id} を確認しました`);
      } catch (error) {
        console.error(`❌ トランザクション ${transaction.id} の処理に失敗:`, error);
      }
    }
    
    // 3. 日次サマリーをGoogle Sheetsに出力
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayTransactions = await transactionService.listByUser(userId);
    const todayData = todayTransactions.filter(tx => tx.date === todayStr);
    
    if (todayData.length > 0) {
      const exportResult = await SheetsExportService.exportTransactions(todayData, {
        createNew: false,
        spreadsheetId: process.env.DAILY_SHEET_ID,
        sheetName: todayStr
      });
      
      console.log(`📊 日次データをGoogle Sheetsにエクスポート: ${exportResult.spreadsheetUrl}`);
    }
    
    console.log('✅ 日次処理が完了しました');
  } catch (error) {
    console.error('❌ 日次処理エラー:', error);
    throw error;
  }
}

/**
 * 月次レポート生成タスク
 */
export async function generateMonthlyReport(userId: string, year: number, month: number) {
  console.log(`📅 ${year}年${month}月の月次レポートを生成します...`);
  
  try {
    // 1. 月次サマリーを取得
    const summary = await reportService.getMonthlySummary(userId, year, month);
    
    if (!summary) {
      console.log('⚠️ データがありません');
      return;
    }
    
    // 2. Google Sheetsにエクスポート
    const exportResult = await SheetsExportService.exportMonthlyReport(
      summary,
      year,
      month,
      {
        createNew: true
      }
    );
    
    console.log(`📊 月次レポートをGoogle Sheetsに出力: ${exportResult.spreadsheetUrl}`);
    
    // 3. AIによる分析コメントを生成
    const analysisResult = await accountingAgent.generate(`
      ${year}年${month}月の会計データを分析してください：
      ${JSON.stringify(summary)}
    `);
    
    console.log('🔍 AIによる分析結果:');
    console.log(analysisResult.text);
    
    // 4. 税務申告用データを準備
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    const taxData = await reportService.getTaxReport(userId, startDate, endDate);
    
    // 税務データもエクスポート
    if (taxData.length > 0) {
      await SheetsExportService.exportTransactions(taxData, {
        spreadsheetId: exportResult.spreadsheetId,
        sheetName: '税務申告用データ'
      });
    }
    
    console.log('✅ 月次レポートの生成が完了しました');
    
    return {
      spreadsheetUrl: exportResult.spreadsheetUrl,
      summary,
      analysis: analysisResult.text
    };
  } catch (error) {
    console.error('❌ 月次レポート生成エラー:', error);
    throw error;
  }
}

/**
 * 新規レシートの自動処理
 */
export async function processNewReceipt(
  file: File,
  userId: string
): Promise<void> {
  console.log(`📸 新しいレシートを処理します: ${file.name}`);
  
  try {
    // 1. ファイルをSupabase Storageにアップロード
    const receiptUrl = await storageService.uploadReceipt(file, userId);
    console.log('📤 ファイルをアップロードしました');
    
    // 2. OCR処理
    const ocrProcessor = new OCRProcessor();
    const ocrResult = await ocrProcessor.processReceiptFile(file);
    console.log('🔍 OCR処理が完了しました');
    
    // 3. 仕訳データを生成
    const journalEntry = await ocrProcessor.createJournalEntry(ocrResult, userId);
    
    // 4. Supabaseに保存
    const transaction = await transactionService.create({
      user_id: userId,
      date: journalEntry.date,
      vendor: ocrResult.vendor || '不明',
      description: journalEntry.description,
      amount: journalEntry.amount,
      tax_amount: journalEntry.taxAmount,
      tax_rate: journalEntry.taxRate,
      debit_account: journalEntry.debitAccount,
      credit_account: journalEntry.creditAccount,
      receipt_url: receiptUrl,
      ocr_text: ocrResult.text,
      status: 'pending'
    });
    
    console.log(`💾 トランザクションを保存しました: ${transaction.id}`);
    
    // 5. 明細があれば保存
    if (ocrResult.items && ocrResult.items.length > 0 && transaction.id) {
      const items = ocrResult.items.map(item => ({
        transaction_id: transaction.id!,
        name: item.name,
        amount: item.amount
      }));
      
      await transactionService.createItems(items);
      console.log(`📝 ${items.length}件の明細を保存しました`);
    }
    
    console.log('✅ レシートの処理が完了しました');
  } catch (error) {
    console.error('❌ レシート処理エラー:', error);
    throw error;
  }
}

/**
 * Cronジョブ用のエクスポート
 */
export const cronJobs = {
  // 毎日午前1時に実行
  daily: async () => {
    const userId = process.env.DEFAULT_USER_ID || 'system';
    await runDailyProcessing(userId);
  },
  
  // 毎月1日午前2時に実行
  monthly: async () => {
    const userId = process.env.DEFAULT_USER_ID || 'system';
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    await generateMonthlyReport(
      userId,
      lastMonth.getFullYear(),
      lastMonth.getMonth() + 1
    );
  }
};

// スタンドアロン実行用
if (require.main === module) {
  const command = process.argv[2];
  const userId = process.env.DEFAULT_USER_ID || 'test-user';
  
  switch (command) {
    case 'daily':
      runDailyProcessing(userId)
        .then(() => process.exit(0))
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
      break;
      
    case 'monthly':
      const now = new Date();
      generateMonthlyReport(userId, now.getFullYear(), now.getMonth() + 1)
        .then(() => process.exit(0))
        .catch(err => {
          console.error(err);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage: npm run mastra:daily | npm run mastra:monthly');
      process.exit(1);
  }
}