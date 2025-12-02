/**
 * 銀行OFXファイルのパーサー
 * OFX (Open Financial Exchange) 形式のファイルをパースして取引データを抽出
 */

import { BankTransaction, OFXImportResult, OFXAccountInfo } from '@/types/bank-csv';

/**
 * OFXファイルをパース
 */
export function parseOFX(ofxContent: string): OFXImportResult {
  const errors: string[] = [];
  const transactions: BankTransaction[] = [];
  let totalDepositAmount = 0;
  let totalWithdrawalAmount = 0;
  let accountInfo: OFXAccountInfo | undefined;

  try {
    // OFXファイルはSGML/XML風の形式なので、正規表現でパース
    // OFXヘッダー部分を除去（OFXHEADER:100 などの行）
    const bodyMatch = ofxContent.match(/<OFX>[\s\S]*<\/OFX>/i);
    if (!bodyMatch) {
      // OFXタグがない場合、ヘッダー以降の部分を取得
      const headerEnd = ofxContent.indexOf('<OFX>');
      if (headerEnd === -1) {
        return {
          success: false,
          transactions: [],
          errors: ['OFXフォーマットが不正です: <OFX>タグが見つかりません'],
          totalCount: 0,
          depositCount: 0,
          withdrawalCount: 0,
          totalDepositAmount: 0,
          totalWithdrawalAmount: 0,
        };
      }
    }

    // 口座情報を抽出
    accountInfo = extractAccountInfo(ofxContent);

    // トランザクションを抽出
    const stmtTrnMatches = ofxContent.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi);

    if (!stmtTrnMatches || stmtTrnMatches.length === 0) {
      return {
        success: true,
        transactions: [],
        errors: ['取引データが見つかりませんでした'],
        totalCount: 0,
        depositCount: 0,
        withdrawalCount: 0,
        totalDepositAmount: 0,
        totalWithdrawalAmount: 0,
        accountInfo,
      };
    }

    for (let i = 0; i < stmtTrnMatches.length; i++) {
      const stmtTrn = stmtTrnMatches[i];

      try {
        const transaction = parseTransaction(stmtTrn, i + 1);
        if (transaction) {
          transactions.push(transaction);

          if (transaction.type === 'deposit') {
            totalDepositAmount += transaction.amount;
          } else {
            totalWithdrawalAmount += Math.abs(transaction.amount);
          }
        }
      } catch (error) {
        errors.push(`トランザクション ${i + 1}: パースエラー - ${error}`);
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
      accountInfo,
    };
  } catch (error) {
    return {
      success: false,
      transactions: [],
      errors: [`OFXパースエラー: ${error}`],
      totalCount: 0,
      depositCount: 0,
      withdrawalCount: 0,
      totalDepositAmount: 0,
      totalWithdrawalAmount: 0,
    };
  }
}

/**
 * 口座情報を抽出
 */
function extractAccountInfo(ofxContent: string): OFXAccountInfo | undefined {
  const bankId = extractTagValue(ofxContent, 'BANKID');
  const acctId = extractTagValue(ofxContent, 'ACCTID');
  const acctType = extractTagValue(ofxContent, 'ACCTTYPE');

  if (!bankId && !acctId && !acctType) {
    return undefined;
  }

  return {
    BANKID: bankId,
    ACCTID: acctId,
    ACCTTYPE: acctType,
  };
}

/**
 * 単一のトランザクションをパース
 */
function parseTransaction(stmtTrn: string, index: number): BankTransaction | null {
  // 必須フィールドを抽出
  const trnType = extractTagValue(stmtTrn, 'TRNTYPE');
  const dtPosted = extractTagValue(stmtTrn, 'DTPOSTED');
  const trnAmt = extractTagValue(stmtTrn, 'TRNAMT');
  const fitId = extractTagValue(stmtTrn, 'FITID');

  // オプションフィールド
  const name = extractTagValue(stmtTrn, 'NAME');
  const memo = extractTagValue(stmtTrn, 'MEMO');

  if (!dtPosted || !trnAmt) {
    return null;
  }

  // 日付をパース (YYYYMMDD or YYYYMMDDHHMMSS)
  const date = parseOFXDate(dtPosted);
  if (!date) {
    throw new Error(`不正な日付形式: ${dtPosted}`);
  }

  // 金額をパース
  const amount = parseFloat(trnAmt);
  if (isNaN(amount)) {
    throw new Error(`不正な金額: ${trnAmt}`);
  }

  // 取引タイプを判定
  // CREDIT = 入金, DEBIT = 出金
  // または金額の正負で判定
  const isDeposit = trnType === 'CREDIT' || trnType === 'DEP' || trnType === 'INT' || amount > 0;

  // 振込人名を抽出（振込の場合）
  let customerName: string | undefined;
  if (name) {
    // 「振込＊」「フリコミ」などのプレフィックスを除去
    customerName = name
      .replace(/^振込[＊*]?\s*/i, '')
      .replace(/^フリコミ[＊*]?\s*/i, '')
      .replace(/[（(].*?[）)]/g, '')
      .trim();
  }

  return {
    date,
    content: name || memo || `取引 ${fitId || index}`,
    amount: isDeposit ? Math.abs(amount) : -Math.abs(amount),
    balance: 0, // OFXでは残高が含まれないことが多い
    type: isDeposit ? 'deposit' : 'withdrawal',
    memo: memo || undefined,
    customerName: isDeposit ? customerName : undefined,
    referenceNumber: fitId || undefined,
  };
}

/**
 * OFXタグの値を抽出
 */
function extractTagValue(content: string, tagName: string): string | undefined {
  // パターン1: <TAG>value</TAG>
  const closedTagRegex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`, 'i');
  const closedMatch = content.match(closedTagRegex);
  if (closedMatch) {
    return closedMatch[1].trim();
  }

  // パターン2: <TAG>value (閉じタグなし、次のタグまたは改行まで)
  const openTagRegex = new RegExp(`<${tagName}>([^<\\n\\r]*)`, 'i');
  const openMatch = content.match(openTagRegex);
  if (openMatch) {
    return openMatch[1].trim();
  }

  return undefined;
}

/**
 * OFX日付形式をDateに変換
 * 形式: YYYYMMDD または YYYYMMDDHHMMSS または YYYYMMDDHHMMSS[タイムゾーン]
 */
function parseOFXDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // タイムゾーン部分を除去
  const cleanDate = dateStr.replace(/\[.*\]/, '');

  // 最小8文字（YYYYMMDD）
  if (cleanDate.length < 8) return null;

  const year = parseInt(cleanDate.substring(0, 4), 10);
  const month = parseInt(cleanDate.substring(4, 6), 10) - 1; // 0-indexed
  const day = parseInt(cleanDate.substring(6, 8), 10);

  let hour = 0, minute = 0, second = 0;

  if (cleanDate.length >= 14) {
    hour = parseInt(cleanDate.substring(8, 10), 10);
    minute = parseInt(cleanDate.substring(10, 12), 10);
    second = parseInt(cleanDate.substring(12, 14), 10);
  }

  const date = new Date(year, month, day, hour, minute, second);

  // 有効な日付かチェック
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * 入金取引のみを抽出
 */
export function extractOFXDeposits(transactions: BankTransaction[]): BankTransaction[] {
  return transactions.filter(t => t.type === 'deposit');
}

/**
 * ファイル形式を判定（CSV or OFX）
 */
export function detectFileType(content: string): 'csv' | 'ofx' | 'unknown' {
  const trimmedContent = content.trim();

  // OFX形式の判定
  if (
    trimmedContent.includes('OFXHEADER') ||
    trimmedContent.includes('<OFX>') ||
    trimmedContent.includes('<STMTTRN>')
  ) {
    return 'ofx';
  }

  // CSV形式の判定（カンマ区切りで複数行）
  const lines = trimmedContent.split('\n');
  if (lines.length > 1) {
    const firstLine = lines[0];
    const commaCount = (firstLine.match(/,/g) || []).length;
    if (commaCount >= 3) {
      return 'csv';
    }
  }

  return 'unknown';
}
