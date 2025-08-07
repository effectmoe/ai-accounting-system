import { NextRequest, NextResponse } from 'next/server';
import { parseSBIBankCSV, extractDeposits } from '@/lib/bank-csv-parser';
import { BankImportService } from '@/services/bank-import.service';
import { logger } from '@/lib/logger';

const bankImportService = new BankImportService();

/**
 * POST /api/bank-import/csv
 * 銀行CSVファイルのインポート
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const autoMatch = formData.get('autoMatch') === 'true';
    const autoConfirm = formData.get('autoConfirm') === 'true';
    const onlyHighConfidence = formData.get('onlyHighConfidence') === 'true';

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // ファイル内容を読み込み
    const csvContent = await file.text();
    
    // CSVをパース
    const parseResult = parseSBIBankCSV(csvContent);
    
    if (!parseResult.success) {
      return NextResponse.json(
        { 
          error: 'CSVファイルのパースに失敗しました',
          details: parseResult.errors 
        },
        { status: 400 }
      );
    }

    logger.info('CSV parsed successfully', {
      totalTransactions: parseResult.totalCount,
      deposits: parseResult.depositCount,
      withdrawals: parseResult.withdrawalCount,
    });

    // 自動マッチングを実行
    let matchResults = [];
    let importResult = { created: 0, skipped: 0, errors: [] as string[] };

    if (autoMatch) {
      // 入金取引のみを対象とする
      const deposits = extractDeposits(parseResult.transactions);
      
      // マッチング実行
      matchResults = await bankImportService.autoMatchTransactions(deposits);
      
      logger.info('Auto-matching completed', {
        totalDeposits: deposits.length,
        highConfidence: matchResults.filter(m => m.confidence === 'high').length,
        mediumConfidence: matchResults.filter(m => m.confidence === 'medium').length,
        lowConfidence: matchResults.filter(m => m.confidence === 'low').length,
        noMatch: matchResults.filter(m => m.confidence === 'none').length,
      });

      // 自動確認が有効な場合、入金記録を作成
      if (autoConfirm) {
        importResult = await bankImportService.createPaymentRecordsFromMatches(
          matchResults,
          { onlyHighConfidence, autoConfirm: true }
        );
        
        logger.info('Payment records created', {
          created: importResult.created,
          skipped: importResult.skipped,
          errors: importResult.errors.length,
        });
      }
    }

    return NextResponse.json({
      success: true,
      parseResult: {
        totalCount: parseResult.totalCount,
        depositCount: parseResult.depositCount,
        withdrawalCount: parseResult.withdrawalCount,
        totalDepositAmount: parseResult.totalDepositAmount,
        totalWithdrawalAmount: parseResult.totalWithdrawalAmount,
        errors: parseResult.errors,
      },
      matchResults: matchResults.map(m => ({
        date: m.transaction.date,
        content: m.transaction.content,
        amount: m.transaction.amount,
        customerName: m.transaction.customerName,
        matchedInvoice: m.matchedInvoice,
        confidence: m.confidence,
        matchReason: m.matchReason,
      })),
      importResult,
    });
  } catch (error) {
    logger.error('Error in POST /api/bank-import/csv:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '銀行CSVインポートに失敗しました' },
      { status: 500 }
    );
  }
}