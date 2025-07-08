import { ObjectId } from 'mongodb';

// 基本的なタイムスタンプインターフェース
export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

// 列挙型の定義
export enum DocumentType {
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  PURCHASE_ORDER = 'purchaseOrder',
  ESTIMATE = 'estimate',
  DELIVERY_NOTE = 'deliveryNote',
  OTHER = 'other',
}

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

export enum AccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

// 会社情報
export interface Company extends Timestamps {
  _id: ObjectId;
  name: string;
  nameKana?: string;
  taxId?: string;
  address?: {
    postalCode?: string;
    prefecture?: string;
    city?: string;
    street?: string;
    building?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  fiscalYearStart?: number; // 1-12
  settings?: Record<string, any>;
}

// 取引先（顧客・仕入先）
export interface Partner extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  name: string;
  nameKana?: string;
  type: 'customer' | 'supplier' | 'both';
  code?: string;
  taxId?: string;
  address?: {
    postalCode?: string;
    prefecture?: string;
    city?: string;
    street?: string;
    building?: string;
  };
  contactPerson?: string;
  phone?: string;
  email?: string;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  customFields?: Record<string, any>;
}

// 勘定科目
export interface Account extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  code: string;
  name: string;
  nameKana?: string;
  type: AccountType;
  parentId?: ObjectId;
  description?: string;
  taxRate?: number;
  isActive: boolean;
  isSystem: boolean; // システム標準科目
  balance?: number; // 現在残高（キャッシュ用）
}

// OCR結果（Azure Form Recognizer）
export interface OcrResult extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  
  // ファイル情報
  sourceFileId: ObjectId; // GridFS reference
  fileName: string;
  fileSize: number;
  mimeType: string;
  
  // OCR処理情報
  processedAt: Date;
  processingTime: number; // milliseconds
  documentType: DocumentType;
  confidence: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  
  // 抽出データ（柔軟なスキーマ）
  extractedData: {
    // 共通フィールド
    vendorName?: string;
    customerName?: string;
    documentNumber?: string;
    date?: Date;
    dueDate?: Date;
    totalAmount?: number;
    taxAmount?: number;
    subtotal?: number;
    
    // 請求書特有
    invoiceId?: string;
    purchaseOrder?: string;
    paymentTerms?: string;
    
    // 領収書特有
    merchantName?: string;
    transactionTime?: string;
    paymentMethod?: string;
    receiptNumber?: string;
    
    // 明細行
    lineItems?: Array<{
      description: string;
      quantity?: number;
      unitPrice?: number;
      amount: number;
      taxRate?: number;
      taxAmount?: number;
    }>;
    
    // その他のカスタムフィールド
    customFields?: Record<string, any>;
  };
  
  // 生のOCR結果（デバッグ用）
  rawResult?: any;
  
  // 手書きOCR結果（HandwritingOcrとの互換性）
  handwritingOcrResult?: {
    text: string;
    confidence: number;
    provider: string;
  };
}

// 請求書・領収書などのドキュメント
export interface Document extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  
  // 基本情報
  documentType: DocumentType;
  documentNumber: string;
  date: Date;
  dueDate?: Date;
  
  // 関連情報
  partnerId?: ObjectId;
  ocrResultId?: ObjectId;
  
  // 金額情報
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  
  // ステータス
  status: TransactionStatus;
  paymentStatus?: PaymentStatus;
  
  // 詳細情報
  description?: string;
  notes?: string;
  tags?: string[];
  
  // メタデータ
  metadata?: {
    sourceSystem?: string;
    importBatchId?: ObjectId;
    originalData?: any;
  };
  
  // カスタムフィールド
  customFields?: Record<string, any>;
}

// ドキュメント明細行
export interface DocumentItem extends Timestamps {
  _id: ObjectId;
  documentId: ObjectId;
  
  // 明細情報
  lineNumber: number;
  description: string;
  accountId?: ObjectId;
  
  // 数量・金額
  quantity: number;
  unit?: string;
  unitPrice: number;
  amount: number;
  
  // 税金
  taxRate?: number;
  taxAmount?: number;
  
  // その他
  notes?: string;
  customFields?: Record<string, any>;
}

// 取引（トランザクション）
export interface Transaction extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  
  // 基本情報
  date: Date;
  type: TransactionType;
  status: TransactionStatus;
  
  // 関連情報
  documentId?: ObjectId;
  partnerId?: ObjectId;
  accountId: ObjectId;
  
  // 金額
  amount: number;
  taxAmount?: number;
  currency: string;
  
  // 詳細
  description: string;
  reference?: string;
  notes?: string;
  tags?: string[];
  
  // 承認情報
  approvedBy?: ObjectId;
  approvedAt?: Date;
  
  // メタデータ
  metadata?: Record<string, any>;
}

// 仕訳
export interface JournalEntry extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  
  // 基本情報
  entryNumber: string;
  date: Date;
  description: string;
  
  // 関連情報
  documentId?: ObjectId;
  transactionId?: ObjectId;
  
  // ステータス
  status: TransactionStatus;
  isAdjusting: boolean;
  isClosing: boolean;
  
  // 承認情報
  approvedBy?: ObjectId;
  approvedAt?: Date;
  
  // メタデータ
  source?: string; // 'manual', 'auto', 'import'
  metadata?: Record<string, any>;
}

// 仕訳明細行
export interface JournalEntryLine extends Timestamps {
  _id: ObjectId;
  journalEntryId: ObjectId;
  
  // 明細情報
  lineNumber: number;
  accountId: ObjectId;
  partnerId?: ObjectId;
  
  // 金額（借方または貸方のいずれか）
  debitAmount?: number;
  creditAmount?: number;
  
  // 詳細
  description?: string;
  reference?: string;
  
  // 分析用タグ
  departmentId?: ObjectId;
  projectId?: ObjectId;
  tags?: string[];
}

// 監査ログ
export interface AuditLog extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  
  // アクション情報
  action: string;
  entityType: string;
  entityId: ObjectId;
  
  // 変更情報
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  
  // ユーザー情報
  userId: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // その他
  notes?: string;
  metadata?: Record<string, any>;
}

// インポートバッチ
export interface ImportBatch extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  
  // バッチ情報
  batchNumber: string;
  importDate: Date;
  source: string;
  
  // ファイル情報
  fileName?: string;
  fileSize?: number;
  rowCount: number;
  
  // 処理結果
  status: 'pending' | 'processing' | 'completed' | 'failed';
  successCount: number;
  errorCount: number;
  errors?: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  
  // メタデータ
  metadata?: Record<string, any>;
}

// 商品・サービスマスタ
export interface Item extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  
  // 基本情報
  code: string;
  name: string;
  nameKana?: string;
  type: 'product' | 'service';
  
  // 分類
  categoryId?: ObjectId;
  tags?: string[];
  
  // 価格情報
  unitPrice?: number;
  unit?: string;
  taxRate?: number;
  
  // 在庫情報（商品の場合）
  isStockItem?: boolean;
  stockQuantity?: number;
  reorderPoint?: number;
  
  // その他
  description?: string;
  isActive: boolean;
  customFields?: Record<string, any>;
}

// タグマスタ
export interface Tag extends Timestamps {
  _id: ObjectId;
  companyId: ObjectId;
  
  name: string;
  type: 'transaction' | 'document' | 'partner' | 'item' | 'general';
  color?: string;
  description?: string;
  isActive: boolean;
}

// コレクション名の定義
export const Collections = {
  COMPANIES: 'companies',
  USERS: 'users',
  PARTNERS: 'partners',
  ACCOUNTS: 'accounts',
  OCR_RESULTS: 'ocrResults',
  DOCUMENTS: 'documents',
  DOCUMENT_ITEMS: 'documentItems',
  TRANSACTIONS: 'transactions',
  JOURNAL_ENTRIES: 'journalEntries',
  JOURNAL_ENTRY_LINES: 'journalEntryLines',
  AUDIT_LOGS: 'auditLogs',
  CATEGORIES: 'categories',
  ITEMS: 'items',
  TAGS: 'tags',
} as const;

// インデックス定義
export const indexes = {
  companies: [
    { name: 1 },
    { taxId: 1 },
  ],
  
  partners: [
    { companyId: 1, name: 1 },
    { companyId: 1, code: 1 },
    { companyId: 1, type: 1 },
  ],
  
  accounts: [
    { companyId: 1, code: 1 },
    { companyId: 1, type: 1 },
    { parentId: 1 },
  ],
  
  ocrResults: [
    { companyId: 1, createdAt: -1 },
    { companyId: 1, documentType: 1 },
    { sourceFileId: 1 },
    { status: 1 },
  ],
  
  documents: [
    { companyId: 1, documentNumber: 1 },
    { companyId: 1, documentType: 1, date: -1 },
    { companyId: 1, partnerId: 1 },
    { ocrResultId: 1 },
  ],
  
  transactions: [
    { companyId: 1, date: -1 },
    { companyId: 1, accountId: 1 },
    { companyId: 1, status: 1 },
    { documentId: 1 },
  ],
  
  journalEntries: [
    { companyId: 1, entryNumber: 1 },
    { companyId: 1, date: -1 },
    { documentId: 1 },
    { transactionId: 1 },
  ],
  
  auditLogs: [
    { companyId: 1, createdAt: -1 },
    { entityType: 1, entityId: 1 },
    { userId: 1 },
  ],
};

// テキスト検索インデックス
export const textIndexes = {
  partners: { name: 'text', nameKana: 'text' },
  documents: { description: 'text', notes: 'text' },
  items: { name: 'text', nameKana: 'text', description: 'text' },
};