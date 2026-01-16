import { ObjectId } from 'mongodb';
import type { AccountCategory } from './receipt';

/**
 * RAG学習レコード
 * 領収書分類のための過去データ
 */
export interface RAGRecord {
  _id?: ObjectId | string;

  // 検索用テキスト（店舗名 + 品目 + 但し書きを結合したもの）
  document: string;

  // メタデータ
  storeName: string;           // 店舗名
  category: AccountCategory;    // 勘定科目
  description: string;          // 但し書き
  itemDescription?: string;     // 品目
  totalAmount?: number;         // 合計金額
  issueDate?: string;           // 発行日（YYYY-MM-DD形式）

  // 検証状態
  verified: boolean;            // 人間が確認済みか

  // 参照元
  sourceReceiptId?: string;     // 元の領収書ID

  // タイムスタンプ
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * RAGレコード作成パラメータ
 */
export interface CreateRAGRecordParams {
  storeName: string;
  category: AccountCategory;
  description: string;
  itemDescription?: string;
  totalAmount?: number;
  issueDate?: string;
  verified?: boolean;
  sourceReceiptId?: string;
}

/**
 * RAGレコード更新パラメータ
 */
export interface UpdateRAGRecordParams {
  storeName?: string;
  category?: AccountCategory;
  description?: string;
  itemDescription?: string;
  verified?: boolean;
}

/**
 * RAGレコード検索パラメータ
 */
export interface RAGRecordSearchParams {
  verified?: boolean;
  search?: string;
  storeName?: string;
  category?: AccountCategory;
  limit?: number;
  skip?: number;
}

/**
 * RAG類似検索パラメータ
 */
export interface RAGSimilarSearchParams {
  storeName: string;
  itemDescription?: string;
  description?: string;
}

/**
 * RAG類似検索結果
 */
export interface RAGSimilarSearchResult {
  success: boolean;
  category: AccountCategory | null;
  subject: string | null;
  similarity: number;
  source: 'rag' | 'fallback';
  error?: string;
  matchedStore?: string;
  matchedItem?: string;
}

/**
 * API用のRAGレコード形式（ChromaDB互換）
 */
export interface RAGRecordAPIResponse {
  id: string;
  document: string;
  metadata: {
    store_name: string;
    category: string;
    description: string;
    item_description?: string;
    total_amount?: number;
    issue_date?: string;
    verified: boolean;
  };
}

/**
 * RAGレコードをAPI形式に変換
 */
export function toAPIFormat(record: RAGRecord): RAGRecordAPIResponse {
  return {
    id: record._id?.toString() || '',
    document: record.document,
    metadata: {
      store_name: record.storeName,
      category: record.category,
      description: record.description,
      item_description: record.itemDescription,
      total_amount: record.totalAmount,
      issue_date: record.issueDate,
      verified: record.verified,
    },
  };
}

/**
 * API形式からRAGレコードに変換
 */
export function fromAPIFormat(apiRecord: {
  store_name: string;
  category: string;
  description: string;
  item_description?: string;
  total_amount?: number;
  issue_date?: string;
  verified?: boolean;
}): Omit<RAGRecord, '_id' | 'document' | 'createdAt' | 'updatedAt'> {
  return {
    storeName: apiRecord.store_name,
    category: apiRecord.category as AccountCategory,
    description: apiRecord.description,
    itemDescription: apiRecord.item_description,
    totalAmount: apiRecord.total_amount,
    issueDate: apiRecord.issue_date,
    verified: apiRecord.verified ?? false,
  };
}
