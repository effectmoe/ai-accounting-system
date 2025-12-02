import { NextRequest, NextResponse } from 'next/server';
import { extractDeposits } from '@/lib/bank-csv-parser';
import { parseOFX, extractOFXDeposits, detectFileType } from '@/lib/bank-ofx-parser';
import { parseBankCSV, detectBankType, getSupportedBanks, BankType, BANK_INFO } from '@/lib/bank-parsers';
import { BankImportService } from '@/services/bank-import.service';
import { bankTransactionService } from '@/services/bank-transaction.service';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

const bankImportService = new BankImportService();

/**
 * POST /api/bank-import
 * 銀行取引ファイルのインポート（CSV/OFX自動判定）
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const autoMatch = formData.get('autoMatch') === 'true';
    const autoConfirm = formData.get('autoConfirm') === 'true';
    const onlyHighConfidence = formData.get('onlyHighConfidence') === 'true';
    const skipDuplicates = formData.get('skipDuplicates') !== 'false'; // デフォルトtrue
    const saveTransactions = formData.get('saveTransactions') === 'true';
    const forceFileType = formData.get('fileType') as string | null; // 'csv' or 'ofx'
    const bankType = (formData.get('bankType') as BankType) || 'auto'; // 銀行タイプ

    // インポートセッションID
    const importId = uuidv4();

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      );
    }

    // ファイル内容を読み込み
    const fileContent = await file.text();

    // ファイル形式を判定
    let detectedType = forceFileType || detectFileType(fileContent);

    // ファイル拡張子でも判定
    if (detectedType === 'unknown') {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.csv')) {
        detectedType = 'csv';
      } else if (fileName.endsWith('.ofx') || fileName.endsWith('.qfx')) {
        detectedType = 'ofx';
      }
    }

    if (detectedType === 'unknown') {
      return NextResponse.json(
        { error: 'ファイル形式を判定できませんでした。CSVまたはOFXファイルを選択してください。' },
        { status: 400 }
      );
    }

    logger.info('File type detected', { fileName: file.name, detectedType });

    // ファイル形式に応じてパース
    let parseResult;
    let deposits;
    let detectedBank: BankType | undefined;

    if (detectedType === 'csv') {
      // 複数銀行対応のCSVパーサーを使用
      const csvResult = parseBankCSV(fileContent, bankType);
      parseResult = csvResult;
      detectedBank = csvResult.detectedBank;
      deposits = extractDeposits(parseResult.transactions);
    } else {
      const ofxResult = parseOFX(fileContent);
      parseResult = {
        ...ofxResult,
        success: ofxResult.success,
      };
      deposits = extractOFXDeposits(ofxResult.transactions);
    }

    if (!parseResult.success && parseResult.transactions.length === 0) {
      return NextResponse.json(
        {
          error: `${detectedType.toUpperCase()}ファイルのパースに失敗しました`,
          details: parseResult.errors
        },
        { status: 400 }
      );
    }

    logger.info('File parsed successfully', {
      fileType: detectedType,
      totalTransactions: parseResult.totalCount,
      deposits: parseResult.depositCount,
      withdrawals: parseResult.withdrawalCount,
    });

    // 重複チェックを実行
    const allTransactions = parseResult.transactions;
    const duplicateResults = await bankTransactionService.checkDuplicates(allTransactions);

    // 重複統計
    const duplicateCount = Array.from(duplicateResults.values()).filter(r => r.isDuplicate).length;
    const newTransactionCount = allTransactions.length - duplicateCount;

    logger.info('Duplicate check completed', {
      totalTransactions: allTransactions.length,
      duplicates: duplicateCount,
      newTransactions: newTransactionCount,
    });

    // 取引をデータベースに保存
    let transactionImportResult = null;
    if (saveTransactions && allTransactions.length > 0) {
      transactionImportResult = await bankTransactionService.importTransactions(
        allTransactions,
        {
          importId,
          fileName: file.name,
          fileType: detectedType as 'csv' | 'ofx',
          bankType: detectedBank,
          skipDuplicates,
        }
      );

      // インポート履歴を作成
      await bankTransactionService.createImportHistory({
        importId,
        fileName: file.name,
        fileSize: file.size,
        fileType: detectedType as 'csv' | 'ofx',
        bankType: detectedBank,
        bankName: detectedBank && detectedBank !== 'auto' ? BANK_INFO[detectedBank]?.name : undefined,
        accountInfo: (parseResult as any).accountInfo,
        totalCount: parseResult.totalCount,
        depositCount: parseResult.depositCount,
        withdrawalCount: parseResult.withdrawalCount,
        totalDepositAmount: parseResult.totalDepositAmount,
        totalWithdrawalAmount: parseResult.totalWithdrawalAmount,
        matchedCount: 0,
        highConfidenceCount: 0,
        autoConfirmedCount: 0,
        duplicateCount,
        newTransactionCount: transactionImportResult.created,
        skippedTransactionIds: [],
        status: transactionImportResult.success ? 'completed' : 'partial',
        errors: transactionImportResult.errors,
      });

      logger.info('Transactions imported', {
        created: transactionImportResult.created,
        skipped: transactionImportResult.skipped,
        duplicates: transactionImportResult.duplicates,
      });
    }

    // 自動マッチングを実行
    let matchResults = [];
    let importResult = { created: 0, skipped: 0, errors: [] as string[] };

    if (autoMatch && deposits.length > 0) {
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

    // 重複取引の詳細を生成
    const duplicateTransactions = Array.from(duplicateResults.entries())
      .filter(([, result]) => result.isDuplicate)
      .map(([hash, result]) => {
        const transaction = allTransactions.find(t =>
          bankTransactionService.generateTransactionHash(t) === hash
        );
        return {
          date: transaction?.date,
          content: transaction?.content,
          amount: transaction?.amount,
          existingImportDate: result.existingTransaction?.importedAt,
          existingFileName: result.existingTransaction?.fileName,
        };
      });

    return NextResponse.json({
      success: true,
      importId,
      fileType: detectedType,
      detectedBank: detectedBank,
      bankInfo: detectedBank && detectedBank !== 'auto' ? BANK_INFO[detectedBank] : undefined,
      parseResult: {
        totalCount: parseResult.totalCount,
        depositCount: parseResult.depositCount,
        withdrawalCount: parseResult.withdrawalCount,
        totalDepositAmount: parseResult.totalDepositAmount,
        totalWithdrawalAmount: parseResult.totalWithdrawalAmount,
        errors: parseResult.errors,
        accountInfo: (parseResult as any).accountInfo,
      },
      duplicateCheck: {
        totalChecked: allTransactions.length,
        duplicateCount,
        newTransactionCount,
        duplicateTransactions: duplicateTransactions.slice(0, 10), // 最大10件まで
      },
      transactionImportResult: transactionImportResult ? {
        success: transactionImportResult.success,
        created: transactionImportResult.created,
        skipped: transactionImportResult.skipped,
        duplicates: transactionImportResult.duplicates,
        errors: transactionImportResult.errors,
      } : null,
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
    logger.error('Error in POST /api/bank-import:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '銀行データインポートに失敗しました' },
      { status: 500 }
    );
  }
}
