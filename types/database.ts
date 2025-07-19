import { ObjectId } from 'mongodb';

// 基本的なドキュメント型
export interface BaseDocument {
  _id?: ObjectId | string;
  createdAt?: Date;
  updatedAt?: Date;
}

// タイムスタンプ付きドキュメント
export interface TimestampedDocument extends BaseDocument {
  createdAt: Date;
  updatedAt: Date;
}

// ソフト削除対応ドキュメント
export interface SoftDeletableDocument extends TimestampedDocument {
  deletedAt?: Date | null;
  isDeleted?: boolean;
}

// ページネーション
export interface PaginationParams {
  page: number;
  limit: number;
  skip?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// ソートオプション
export type SortOrder = 'asc' | 'desc' | 1 | -1;

export interface SortOptions<T> {
  field: keyof T;
  order: SortOrder;
}

// フィルターオプション
export interface FilterOptions<T> {
  where?: Partial<T>;
  search?: string;
  searchFields?: (keyof T)[];
}

// クエリオプション
export interface QueryOptions<T> {
  filter?: FilterOptions<T>;
  sort?: SortOptions<T>;
  pagination?: PaginationParams;
  projection?: Partial<Record<keyof T, 0 | 1>>;
}

// データベース操作の結果
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// バルク操作の結果
export interface BulkOperationResult {
  success: boolean;
  insertedCount: number;
  modifiedCount: number;
  deletedCount: number;
  errors?: string[];
}

// 集約パイプラインの型
export type AggregationPipeline = Array<Record<string, any>>;

// トランザクションオプション
export interface TransactionOptions {
  readPreference?: 'primary' | 'secondary' | 'primaryPreferred' | 'secondaryPreferred' | 'nearest';
  readConcern?: { level: 'local' | 'available' | 'majority' | 'linearizable' | 'snapshot' };
  writeConcern?: { w: number | 'majority'; j?: boolean; wtimeout?: number };
}

// エンティティ状態
export type EntityStatus = 'active' | 'inactive' | 'pending' | 'suspended' | 'deleted';

// 監査フィールド
export interface AuditFields {
  createdBy?: string | ObjectId;
  updatedBy?: string | ObjectId;
  deletedBy?: string | ObjectId;
}

// 完全な監査対応ドキュメント
export interface AuditableDocument extends SoftDeletableDocument, AuditFields {
  version?: number;
  status?: EntityStatus;
}

// 検索可能なドキュメント
export interface SearchableDocument extends BaseDocument {
  searchText?: string;
  searchKeywords?: string[];
  searchScore?: number;
}

// タグ付き可能なドキュメント
export interface TaggableDocument extends BaseDocument {
  tags?: string[];
  categories?: string[];
}

// ファイル関連
export interface FileMetadata {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  encoding?: string;
  hash?: string;
  url?: string;
  publicUrl?: string;
  thumbnailUrl?: string;
}

// 住所情報
export interface Address {
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
  country?: string;
}

// 連絡先情報
export interface ContactInfo {
  name?: string;
  nameKana?: string;
  email?: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  position?: string;
  department?: string;
}

// 金額関連
export interface MoneyAmount {
  amount: number;
  currency?: string;
  taxIncluded?: boolean;
}

// 税金計算
export interface TaxCalculation {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  taxType?: '内税' | '外税';
}

// 期間
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

// バリデーションエラー
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
}

// 型ユーティリティ
export type WithId<T> = T & { _id: ObjectId | string };
export type WithoutId<T> = Omit<T, '_id'>;
export type CreateInput<T> = Omit<T, '_id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<Omit<T, '_id' | 'createdAt' | 'updatedAt'>>;

// ObjectIdの文字列型
export type ObjectIdString = string;

// 日付文字列型（ISO 8601）
export type DateString = string;

// 数値範囲
export interface NumberRange {
  min?: number;
  max?: number;
}

// 文字列配列から型を生成
export type StringEnum<T extends readonly string[]> = T[number];

// Nullable型
export type Nullable<T> = T | null | undefined;

// DeepPartial型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 必須フィールドを指定
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;