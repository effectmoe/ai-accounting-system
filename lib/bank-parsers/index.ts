/**
 * 銀行別CSVパーサー
 * 主要銀行のCSVフォーマットに対応
 */

import { BankTransaction, CSVImportResult } from '@/types/bank-csv';
import { parse } from 'csv-parse/sync';

// 対応銀行の定義
export type BankType =
  | 'sbi'           // 住信SBIネット銀行
  | 'mufg'          // 三菱UFJ銀行
  | 'smbc'          // 三井住友銀行
  | 'mizuho'        // みずほ銀行
  | 'rakuten'       // 楽天銀行
  | 'japan-post'    // ゆうちょ銀行
  | 'sony'          // ソニー銀行
  | 'aeon'          // イオン銀行
  | 'auto';         // 自動判定

export interface BankInfo {
  code: string;
  name: string;
  nameEn: string;
}

export const BANK_INFO: Record<Exclude<BankType, 'auto'>, BankInfo> = {
  sbi: { code: '0038', name: '住信SBIネット銀行', nameEn: 'SBI Sumishin Net Bank' },
  mufg: { code: '0005', name: '三菱UFJ銀行', nameEn: 'MUFG Bank' },
  smbc: { code: '0009', name: '三井住友銀行', nameEn: 'SMBC' },
  mizuho: { code: '0001', name: 'みずほ銀行', nameEn: 'Mizuho Bank' },
  rakuten: { code: '0036', name: '楽天銀行', nameEn: 'Rakuten Bank' },
  'japan-post': { code: '9900', name: 'ゆうちょ銀行', nameEn: 'Japan Post Bank' },
  sony: { code: '0035', name: 'ソニー銀行', nameEn: 'Sony Bank' },
  aeon: { code: '0040', name: 'イオン銀行', nameEn: 'AEON Bank' },
};

/**
 * 銀行CSVを自動判定してパース
 */
export function parseBankCSV(csvContent: string, bankType: BankType = 'auto'): CSVImportResult & { detectedBank?: BankType } {
  // 自動判定
  if (bankType === 'auto') {
    bankType = detectBankType(csvContent);
    if (bankType === 'auto') {
      return {
        success: false,
        transactions: [],
        errors: ['銀行フォーマットを自動判定できませんでした。銀行を手動で選択してください。'],
        totalCount: 0,
        depositCount: 0,
        withdrawalCount: 0,
        totalDepositAmount: 0,
        totalWithdrawalAmount: 0,
      };
    }
  }

  const parser = BANK_PARSERS[bankType];
  if (!parser) {
    return {
      success: false,
      transactions: [],
      errors: [`${bankType}銀行のパーサーは未実装です`],
      totalCount: 0,
      depositCount: 0,
      withdrawalCount: 0,
      totalDepositAmount: 0,
      totalWithdrawalAmount: 0,
    };
  }

  const result = parser(csvContent);
  return { ...result, detectedBank: bankType };
}

/**
 * CSVの内容から銀行タイプを自動判定
 */
export function detectBankType(csvContent: string): BankType {
  const firstLines = csvContent.split('\n').slice(0, 5).join('\n');

  // 住信SBIネット銀行: 日付,内容,出金金額(円),入金金額(円),残高(円),メモ
  if (firstLines.includes('出金金額(円)') && firstLines.includes('入金金額(円)')) {
    return 'sbi';
  }

  // 三菱UFJ銀行: 日付,摘要,お支払金額,お預り金額,差引残高
  if (firstLines.includes('お支払金額') && firstLines.includes('お預り金額')) {
    return 'mufg';
  }

  // 三井住友銀行: 年月日,お引出し,お預入れ,残高,摘要
  if (firstLines.includes('お引出し') && firstLines.includes('お預入れ')) {
    return 'smbc';
  }

  // みずほ銀行: 日付,摘要,お支払金額,お預かり金額,残高
  if (firstLines.includes('お支払金額') && firstLines.includes('お預かり金額')) {
    return 'mizuho';
  }

  // 楽天銀行: 取引日,入出金(税込),取引後残高,摘要
  if (firstLines.includes('取引日') && firstLines.includes('入出金')) {
    return 'rakuten';
  }

  // ゆうちょ銀行: 日付,取扱内容,お預入金額,お引出金額,現在高
  if (firstLines.includes('お預入金額') && firstLines.includes('お引出金額')) {
    return 'japan-post';
  }

  // ソニー銀行: 取引日,摘要,お支払い金額,お預かり金額,残高
  if (firstLines.includes('お支払い金額') && firstLines.includes('お預かり金額')) {
    return 'sony';
  }

  // イオン銀行: 取引日,摘要,出金,入金,残高
  if (firstLines.match(/取引日.*摘要.*出金.*入金.*残高/)) {
    return 'aeon';
  }

  return 'auto'; // 判定不能
}

/**
 * 共通のCSVパース処理
 */
function parseCSVCommon(
  csvContent: string,
  config: {
    skipLines: number;
    dateIndex: number;
    contentIndex: number;
    withdrawalIndex: number;
    depositIndex: number;
    balanceIndex: number;
    memoIndex?: number;
    dateFormat: 'ymd-slash' | 'ymd-dot' | 'ymd-dash' | 'yyyymmdd';
    combinedAmountIndex?: number; // 入出金が1列の場合
  }
): CSVImportResult {
  const errors: string[] = [];
  const transactions: BankTransaction[] = [];
  let totalDepositAmount = 0;
  let totalWithdrawalAmount = 0;

  try {
    const records = parse(csvContent, {
      columns: false,
      skip_empty_lines: true,
      relax_column_count: true,
      from_line: config.skipLines + 1,
    }) as string[][];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const lineNum = i + config.skipLines + 1;

      try {
        // 日付をパース
        const dateStr = row[config.dateIndex]?.trim();
        if (!dateStr) continue;

        const date = parseDateByFormat(dateStr, config.dateFormat);
        if (!date) {
          errors.push(`行 ${lineNum}: 日付形式が不正です: ${dateStr}`);
          continue;
        }

        // 取引内容
        const content = row[config.contentIndex]?.trim() || '';

        // 金額をパース
        let withdrawal = 0;
        let deposit = 0;

        if (config.combinedAmountIndex !== undefined) {
          // 入出金が1列の場合（楽天銀行など）
          const amount = parseAmount(row[config.combinedAmountIndex]);
          if (amount > 0) {
            deposit = amount;
          } else {
            withdrawal = Math.abs(amount);
          }
        } else {
          withdrawal = parseAmount(row[config.withdrawalIndex]);
          deposit = parseAmount(row[config.depositIndex]);
        }

        const balance = parseAmount(row[config.balanceIndex]);
        const isDeposit = deposit > 0;
        const amount = isDeposit ? deposit : -withdrawal;

        // 振込人名を抽出
        const customerName = extractCustomerName(content);

        const transaction: BankTransaction = {
          date,
          content,
          amount,
          balance,
          type: isDeposit ? 'deposit' : 'withdrawal',
          memo: config.memoIndex !== undefined ? row[config.memoIndex]?.trim() : undefined,
          customerName,
        };

        transactions.push(transaction);

        if (isDeposit) {
          totalDepositAmount += deposit;
        } else {
          totalWithdrawalAmount += withdrawal;
        }
      } catch (error) {
        errors.push(`行 ${lineNum}: パースエラー: ${error}`);
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
 * 日付フォーマットに応じてパース
 */
function parseDateByFormat(dateStr: string, format: string): Date | null {
  try {
    let year: number, month: number, day: number;

    switch (format) {
      case 'ymd-slash': // YYYY/MM/DD
        const slashParts = dateStr.split('/');
        if (slashParts.length !== 3) return null;
        [year, month, day] = slashParts.map(p => parseInt(p, 10));
        break;
      case 'ymd-dot': // YYYY.MM.DD
        const dotParts = dateStr.split('.');
        if (dotParts.length !== 3) return null;
        [year, month, day] = dotParts.map(p => parseInt(p, 10));
        break;
      case 'ymd-dash': // YYYY-MM-DD
        const dashParts = dateStr.split('-');
        if (dashParts.length !== 3) return null;
        [year, month, day] = dashParts.map(p => parseInt(p, 10));
        break;
      case 'yyyymmdd': // YYYYMMDD
        if (dateStr.length !== 8) return null;
        year = parseInt(dateStr.substring(0, 4), 10);
        month = parseInt(dateStr.substring(4, 6), 10);
        day = parseInt(dateStr.substring(6, 8), 10);
        break;
      default:
        return null;
    }

    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * 金額文字列をパース
 */
function parseAmount(amountStr: string | undefined): number {
  if (!amountStr) return 0;
  const cleaned = amountStr.replace(/[,円￥\s]/g, '');
  if (!cleaned || cleaned === '-') return 0;
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : amount;
}

/**
 * 振込人名を抽出
 */
function extractCustomerName(content: string): string | undefined {
  // 振込＊、フリコミ などのパターン
  const patterns = [
    /^振込[＊*]?\s*(.+)/,
    /^フリコミ[＊*]?\s*(.+)/,
    /^ﾌﾘｺﾐ[＊*]?\s*(.+)/,
    /^入金\s*(.+)/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      // カッコ内の略称を除去
      return match[1].replace(/[（(].*?[）)]/g, '').trim();
    }
  }

  return undefined;
}

// 各銀行別パーサー
const BANK_PARSERS: Record<Exclude<BankType, 'auto'>, (csv: string) => CSVImportResult> = {
  // 住信SBIネット銀行
  // 日付,内容,出金金額(円),入金金額(円),残高(円),メモ
  sbi: (csv) => parseCSVCommon(csv, {
    skipLines: 1,
    dateIndex: 0,
    contentIndex: 1,
    withdrawalIndex: 2,
    depositIndex: 3,
    balanceIndex: 4,
    memoIndex: 5,
    dateFormat: 'ymd-slash',
  }),

  // 三菱UFJ銀行
  // 日付,摘要,お支払金額,お預り金額,差引残高
  mufg: (csv) => parseCSVCommon(csv, {
    skipLines: 1,
    dateIndex: 0,
    contentIndex: 1,
    withdrawalIndex: 2,
    depositIndex: 3,
    balanceIndex: 4,
    dateFormat: 'ymd-slash',
  }),

  // 三井住友銀行
  // 年月日,お引出し,お預入れ,残高,摘要
  smbc: (csv) => parseCSVCommon(csv, {
    skipLines: 1,
    dateIndex: 0,
    contentIndex: 4,
    withdrawalIndex: 1,
    depositIndex: 2,
    balanceIndex: 3,
    dateFormat: 'ymd-slash',
  }),

  // みずほ銀行
  // 日付,摘要,お支払金額,お預かり金額,残高
  mizuho: (csv) => parseCSVCommon(csv, {
    skipLines: 1,
    dateIndex: 0,
    contentIndex: 1,
    withdrawalIndex: 2,
    depositIndex: 3,
    balanceIndex: 4,
    dateFormat: 'ymd-slash',
  }),

  // 楽天銀行
  // 取引日,入出金(税込),取引後残高,摘要
  rakuten: (csv) => parseCSVCommon(csv, {
    skipLines: 1,
    dateIndex: 0,
    contentIndex: 3,
    withdrawalIndex: -1, // 使用しない
    depositIndex: -1, // 使用しない
    combinedAmountIndex: 1, // 入出金が1列
    balanceIndex: 2,
    dateFormat: 'ymd-slash',
  }),

  // ゆうちょ銀行
  // 日付,取扱内容,お預入金額,お引出金額,現在高
  'japan-post': (csv) => parseCSVCommon(csv, {
    skipLines: 1,
    dateIndex: 0,
    contentIndex: 1,
    withdrawalIndex: 3,
    depositIndex: 2,
    balanceIndex: 4,
    dateFormat: 'ymd-slash',
  }),

  // ソニー銀行
  // 取引日,摘要,お支払い金額,お預かり金額,残高
  sony: (csv) => parseCSVCommon(csv, {
    skipLines: 1,
    dateIndex: 0,
    contentIndex: 1,
    withdrawalIndex: 2,
    depositIndex: 3,
    balanceIndex: 4,
    dateFormat: 'ymd-slash',
  }),

  // イオン銀行
  // 取引日,摘要,出金,入金,残高
  aeon: (csv) => parseCSVCommon(csv, {
    skipLines: 1,
    dateIndex: 0,
    contentIndex: 1,
    withdrawalIndex: 2,
    depositIndex: 3,
    balanceIndex: 4,
    dateFormat: 'ymd-slash',
  }),
};

/**
 * 対応銀行一覧を取得
 */
export function getSupportedBanks(): Array<{ type: BankType; info: BankInfo }> {
  return Object.entries(BANK_INFO).map(([type, info]) => ({
    type: type as BankType,
    info,
  }));
}
