/**
 * 銀行CSVインポート関連の型定義
 */

/**
 * 住信SBIネット銀行のCSV行データ
 */
export interface SBIBankCSVRow {
  date: string; // 日付 (YYYY/MM/DD)
  content: string; // 内容
  withdrawal: string; // 出金金額(円)
  deposit: string; // 入金金額(円)
  balance: string; // 残高(円)
  memo: string; // メモ
}

/**
 * パース済み銀行取引データ
 */
export interface BankTransaction {
  date: Date;
  content: string;
  amount: number; // 入金の場合は正、出金の場合は負
  balance: number;
  type: 'deposit' | 'withdrawal';
  memo?: string;
  // マッチング用の情報
  customerName?: string; // 振込人名から抽出
  referenceNumber?: string; // 参照番号
}

/**
 * CSVインポート結果
 */
export interface CSVImportResult {
  success: boolean;
  transactions: BankTransaction[];
  errors: string[];
  totalCount: number;
  depositCount: number;
  withdrawalCount: number;
  totalDepositAmount: number;
  totalWithdrawalAmount: number;
}

/**
 * 自動マッチング結果
 */
export interface AutoMatchResult {
  transaction: BankTransaction;
  matchedInvoice?: {
    _id: string;
    invoiceNumber: string;
    customerName: string;
    totalAmount: number;
    remainingAmount: number;
  };
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchReason?: string;
}

/**
 * CSVインポートリクエスト
 */
export interface CSVImportRequest {
  csvContent: string;
  encoding?: 'utf-8' | 'shift-jis';
  autoMatch?: boolean;
  confirmAll?: boolean;
}