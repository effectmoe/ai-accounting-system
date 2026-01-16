/**
 * スキャン領収書処理 型定義
 * scan-receipt/ フォルダのPDFをOCR処理して領収書登録
 */

import { ObjectId } from 'mongodb';

// スキャン処理の個別結果
export interface ScanReceiptItemResult {
  fileName: string;
  status: 'success' | 'failed' | 'skipped';
  receiptId?: string;
  receiptNumber?: string;
  processingTime?: number; // milliseconds
  error?: string;
}

// スキャン処理の全体結果
export interface ScanReceiptResult {
  processedCount: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  results: ScanReceiptItemResult[];
}

// スキャン済み領収書のメタデータ
export interface ScannedReceiptMetadata {
  originalFileName: string;
  processedAt: Date;
  visionModelUsed: string;
  ocrConfidence?: number; // 0-1
  rawOcrText?: string; // OCR生テキスト（デバッグ用）

  // 画像アップロード情報
  imageKey?: string; // R2オブジェクトキー
  imageSize?: number; // 画像サイズ（バイト）
  imageWidth?: number;
  imageHeight?: number;
  imageFormat?: string; // 'webp'

  // 学習ルール適用情報
  learningRuleApplied?: boolean; // 学習ルールが適用されたか
  appliedRuleName?: string; // 適用されたルール名
}

// Vision Model から抽出されるデータ構造
export interface ExtractedReceiptData {
  // 発行元情報
  issuerName?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerRegistrationNumber?: string;

  // 日付情報
  issueDate?: string; // YYYY-MM-DD

  // 金額情報
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  taxRate?: number;

  // 領収書番号（あれば）
  receiptNumber?: string;

  // 明細（あれば）
  items?: ExtractedReceiptItem[];

  // その他
  subject?: string; // 但し書き
  notes?: string;

  // 勘定科目推定
  accountCategory?: string; // AI推定の勘定科目
  accountCategoryReason?: string; // 推定理由
}

// 抽出された明細項目
export interface ExtractedReceiptItem {
  itemName?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  amount?: number;
}

// スキャン処理リクエストパラメータ
export interface ScanReceiptProcessRequest {
  forceReprocess?: boolean; // 処理済みPDFも再処理するか
  targetFiles?: string[]; // 特定のファイルのみ処理（空なら全ファイル）
}

// スキャン済み領収書一覧取得パラメータ
export interface ScanReceiptListParams {
  limit?: number;
  skip?: number;
  sortBy?: 'createdAt' | 'issueDate' | 'totalAmount';
  sortOrder?: 'asc' | 'desc';
}

// PDF処理ステータス（内部用）
export type PdfProcessStatus = 'pending' | 'processing' | 'completed' | 'failed';

// PDF処理情報（内部用）
export interface PdfProcessInfo {
  fileName: string;
  filePath: string;
  status: PdfProcessStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}
