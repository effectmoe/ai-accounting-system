/**
 * 銀行インポート関連の型定義
 */

import { ObjectId } from 'mongodb';

/**
 * インポート済み銀行取引
 */
export interface ImportedBankTransaction {
  _id?: ObjectId;
  // 取引識別用
  transactionHash: string; // 重複チェック用ハッシュ（日付+金額+内容から生成）
  fitId?: string; // OFXのFITID（存在する場合）

  // 取引情報
  date: Date;
  content: string;
  amount: number;
  balance?: number;
  type: 'deposit' | 'withdrawal';
  memo?: string;
  customerName?: string;
  referenceNumber?: string;

  // インポート情報
  importId: string; // インポートセッションID
  importedAt: Date;
  fileName: string;
  fileType: 'csv' | 'ofx';
  bankType?: string;

  // マッチング情報
  matchedInvoiceId?: ObjectId;
  matchConfidence?: 'high' | 'medium' | 'low' | 'none';
  matchReason?: string;
  isConfirmed: boolean;
  confirmedAt?: Date;
  confirmedBy?: string;

  // メタデータ
  createdAt: Date;
  updatedAt: Date;
}

/**
 * インポート履歴
 */
export interface BankImportHistory {
  _id?: ObjectId;
  importId: string;

  // ファイル情報
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'ofx';
  bankType?: string;
  bankName?: string;

  // 口座情報（OFXの場合）
  accountInfo?: {
    bankId?: string;
    accountId?: string;
    accountType?: string;
  };

  // 結果サマリー
  totalCount: number;
  depositCount: number;
  withdrawalCount: number;
  totalDepositAmount: number;
  totalWithdrawalAmount: number;

  // マッチング結果
  matchedCount: number;
  highConfidenceCount: number;
  autoConfirmedCount: number;

  // 重複チェック結果
  duplicateCount: number;
  newTransactionCount: number;
  skippedTransactionIds: string[];

  // ステータス
  status: 'processing' | 'completed' | 'failed' | 'partial';
  errors: string[];

  // メタデータ
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 重複チェック結果
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingTransaction?: ImportedBankTransaction;
  transactionHash: string;
}

/**
 * インポート結果（拡張版）
 */
export interface ExtendedImportResult {
  success: boolean;
  importId: string;
  created: number;
  skipped: number;
  duplicates: number;
  errors: string[];
  duplicateTransactions: Array<{
    date: Date;
    content: string;
    amount: number;
    existingImportDate: Date;
  }>;
}
