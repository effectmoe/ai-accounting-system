import { NextRequest, NextResponse } from 'next/server';
import { parseOFX, extractOFXDeposits } from '@/lib/bank-ofx-parser';
import { BankImportService } from '@/services/bank-import.service';
import { logger } from '@/lib/logger';

const bankImportService = new BankImportService();

/**
 * POST /api/bank-import/ofx
 * 銀行OFXファイルのインポート
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
    const ofxContent = await file.text();

    // OFXをパース
    const parseResult = parseOFX(ofxContent);

    if (!parseResult.success && parseResult.transactions.length === 0) {
      return NextResponse.json(
        {
          error: 'OFXファイルのパースに失敗しました',
          details: parseResult.errors
        },
        { status: 400 }
      );
    }

    logger.info('OFX parsed successfully', {
      totalTransactions: parseResult.totalCount,
      deposits: parseResult.depositCount,
      withdrawals: parseResult.withdrawalCount,
      accountInfo: parseResult.accountInfo,
    });

    // 自動マッチングを実行
    let matchResults = [];
    let importResult = { created: 0, skipped: 0, errors: [] as string[] };

    if (autoMatch) {
      // 入金取引のみを対象とする
      const deposits = extractOFXDeposits(parseResult.transactions);

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
      fileType: 'ofx',
      parseResult: {
        totalCount: parseResult.totalCount,
        depositCount: parseResult.depositCount,
        withdrawalCount: parseResult.withdrawalCount,
        totalDepositAmount: parseResult.totalDepositAmount,
        totalWithdrawalAmount: parseResult.totalWithdrawalAmount,
        errors: parseResult.errors,
        accountInfo: parseResult.accountInfo,
      },
      matchResults: matchResults.map(m => ({
        date: m.transaction.date,
        content: m.transaction.content,
        amount: m.transaction.amount,
        customerName: m.transaction.customerName,
        referenceNumber: m.transaction.referenceNumber,
        matchedInvoice: m.matchedInvoice,
        confidence: m.confidence,
        matchReason: m.matchReason,
      })),
      importResult,
    });
  } catch (error) {
    logger.error('Error in POST /api/bank-import/ofx:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '銀行OFXインポートに失敗しました' },
      { status: 500 }
    );
  }
}
