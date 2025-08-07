/**
 * 銀行CSVファイルのパーサー
 */

import { SBIBankCSVRow, BankTransaction, CSVImportResult } from '@/types/bank-csv';
import { parse } from 'csv-parse/sync';

/**
 * 住信SBIネット銀行のCSVをパース
 */
export function parseSBIBankCSV(csvContent: string): CSVImportResult {
  const errors: string[] = [];
  const transactions: BankTransaction[] = [];
  let totalDepositAmount = 0;
  let totalWithdrawalAmount = 0;

  try {
    // CSVをパース
    const records = parse(csvContent, {
      columns: false,
      skip_empty_lines: true,
      from_line: 2, // ヘッダー行をスキップ
    }) as string[][];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      if (row.length < 6) {
        errors.push(`行 ${i + 2}: 列数が不足しています`);
        continue;
      }

      try {
        const [dateStr, content, withdrawalStr, depositStr, balanceStr, memo] = row;
        
        // 日付をパース
        const dateParts = dateStr.split('/');
        if (dateParts.length !== 3) {
          errors.push(`行 ${i + 2}: 日付形式が不正です: ${dateStr}`);
          continue;
        }
        const date = new Date(
          parseInt(dateParts[0]),
          parseInt(dateParts[1]) - 1,
          parseInt(dateParts[2])
        );

        // 金額をパース（カンマを除去して数値に変換）
        const withdrawal = withdrawalStr ? parseFloat(withdrawalStr.replace(/,/g, '')) : 0;
        const deposit = depositStr ? parseFloat(depositStr.replace(/,/g, '')) : 0;
        const balance = parseFloat(balanceStr.replace(/,/g, ''));

        // 入金か出金かを判定
        const isDeposit = deposit > 0;
        const amount = isDeposit ? deposit : -withdrawal;

        // 振込人名を抽出（振込＊から始まる場合）
        let customerName: string | undefined;
        let referenceNumber: string | undefined;
        
        if (content.startsWith('振込＊')) {
          customerName = content.substring(3).trim();
          // カッコ内の略称を処理
          customerName = customerName.replace(/[（(].*?[）)]/g, '').trim();
        }

        // 取引データを作成
        const transaction: BankTransaction = {
          date,
          content,
          amount,
          balance,
          type: isDeposit ? 'deposit' : 'withdrawal',
          memo: memo === '-' ? undefined : memo,
          customerName,
          referenceNumber,
        };

        transactions.push(transaction);

        // 集計
        if (isDeposit) {
          totalDepositAmount += deposit;
        } else {
          totalWithdrawalAmount += withdrawal;
        }
      } catch (error) {
        errors.push(`行 ${i + 2}: パースエラー: ${error}`);
      }
    }

    return {
      success: errors.length === 0,
      transactions,
      errors,
      totalCount: transactions.length,
      depositCount: transactions.filter(t => t.type === 'deposit').length,
      withdrawalCount: transactions.filter(t => t.type === 'withdrawal').length,
      totalDepositAmount,
      totalWithdrawalAmount,
    };
  } catch (error) {
    return {
      success: false,
      transactions: [],
      errors: [`CSVパースエラー: ${error}`],
      totalCount: 0,
      depositCount: 0,
      withdrawalCount: 0,
      totalDepositAmount: 0,
      totalWithdrawalAmount: 0,
    };
  }
}

/**
 * 日付範囲でフィルタリング
 */
export function filterTransactionsByDateRange(
  transactions: BankTransaction[],
  startDate?: Date,
  endDate?: Date
): BankTransaction[] {
  return transactions.filter(t => {
    if (startDate && t.date < startDate) return false;
    if (endDate && t.date > endDate) return false;
    return true;
  });
}

/**
 * 入金のみを抽出
 */
export function extractDeposits(transactions: BankTransaction[]): BankTransaction[] {
  return transactions.filter(t => t.type === 'deposit');
}

/**
 * 振込人名を正規化（マッチング精度向上のため）
 */
export function normalizeCustomerName(name: string): string {
  return name
    .replace(/[\s　]+/g, '') // スペースを除去
    .replace(/[（(].*?[）)]/g, '') // カッコ内を除去
    .replace(/カ）|ユ）|シャ）|ド）/g, '') // 法人格の略称を除去
    .toUpperCase(); // 大文字に統一
}