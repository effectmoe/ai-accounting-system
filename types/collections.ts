import { ObjectId } from 'mongodb';

// 支払い方法
export type PaymentMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'invoice' | 'other';

// 音声認識設定
export interface SpeechSettings {
  aiPromptEnhancement?: {
    enabled: boolean;
    customPromptInstructions?: string;
    contextAwareHomophoneCorrection: boolean;
    businessContextInstructions?: string;
  };
  dictionaryCorrection?: {
    enabled: boolean;
    customDictionary: Array<{
      id: string;
      incorrect: string;
      correct: string;
      category?: string;
      description?: string;
    }>;
  };
}

// 音声認識辞書エントリー
export interface SpeechDictionaryEntry {
  id: string;
  incorrect: string;
  correct: string;
  category?: string;
  description?: string;
}

// 口座種別
export type AccountType = 'checking' | 'savings';

// 請求書ステータス
export type InvoiceStatus = 'draft' | 'saved' | 'paid' | 'overdue' | 'cancelled';

// 見積書ステータス
export type QuoteStatus = 'draft' | 'sent' | 'saved' | 'accepted' | 'rejected' | 'expired' | 'converted';

// 納品書ステータス
export type DeliveryNoteStatus = 'draft' | 'saved' | 'delivered' | 'received' | 'cancelled';

// 顧客インターフェース
export interface Customer {
  _id?: ObjectId;
  id?: string; // フロントエンド用のIDフィールド
  customerId?: string; // 顧客コード
  companyName: string;
  companyNameKana?: string;
  department?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  paymentTerms?: number; // 支払いサイト（日数）
  contacts?: Contact[];
  tags?: string[];
  notes?: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// 連絡先インターフェース
export interface Contact {
  name: string;
  nameKana?: string;
  title?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

// 会社情報インターフェース
export interface CompanyInfo {
  _id?: ObjectId;
  companyName: string;
  companyNameKana?: string;
  registrationNumber?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
  phone?: string;
  fax?: string;
  email?: string;
  website?: string;
  fiscalYearEnd?: string;
  invoiceNumberFormat?: string;
  logoUrl?: string;
  sealUrl?: string;
  isDefault?: boolean;
  quoteValidityDays?: number; // 見積書のデフォルト有効期限日数
  speechSettings?: SpeechSettings; // 音声認識設定
  createdAt?: Date;
  updatedAt?: Date;
}

// 銀行口座インターフェース
export interface BankAccount {
  _id?: ObjectId;
  bankName: string;
  branchName: string;
  accountType: AccountType;
  accountNumber: string;
  accountName: string;
  accountNameKana?: string;
  swiftCode?: string;
  notes?: string;
  isDefault?: boolean;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// 請求書インターフェース
export interface Invoice {
  _id?: ObjectId;
  invoiceNumber: string;
  customerId: ObjectId;
  customer?: Customer; // Populated field
  issueDate: Date;
  dueDate: Date;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  bankAccountId?: ObjectId;
  bankAccount?: BankAccount; // Populated field
  status: InvoiceStatus;
  notes?: string;
  internalNotes?: string;
  paidDate?: Date;
  paidAmount?: number;
  convertedToDeliveryNoteId?: ObjectId; // 納品書に変換された場合のID
  convertedToDeliveryNoteDate?: Date;
  isGeneratedByAI?: boolean;
  aiGenerationMetadata?: {
    source?: string;
    confidence?: number;
    timestamp?: Date;
  };
  aiConversationId?: string; // AI会話履歴のID
  createdAt?: Date;
  updatedAt?: Date;
}

// 請求書項目インターフェース
export interface InvoiceItem {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  notes?: string;
}

// 見積書インターフェース
export interface Quote {
  _id?: ObjectId;
  quoteNumber: string;
  customerId: ObjectId;
  customer?: Customer; // Populated field
  issueDate: Date;
  validityDate: Date; // 見積書有効期限
  items: QuoteItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod;
  bankAccountId?: ObjectId;
  bankAccount?: BankAccount; // Populated field
  status: QuoteStatus;
  notes?: string;
  internalNotes?: string;
  acceptedDate?: Date;
  rejectedDate?: Date;
  expiredDate?: Date;
  convertedToInvoiceId?: ObjectId; // 請求書に変換された場合のID
  convertedToInvoiceDate?: Date;
  isGeneratedByAI?: boolean;
  aiGenerationMetadata?: {
    source?: string;
    confidence?: number;
    timestamp?: Date;
  };
  aiConversationId?: string; // AI会話履歴のID
  companySnapshot?: {
    companyName: string;
    address: string;
    phone?: string;
    email?: string;
    invoiceRegistrationNumber?: string;
    stampImage?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// 見積書項目インターフェース
export interface QuoteItem {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  notes?: string;
}

// 納品書インターフェース
export interface DeliveryNote {
  _id?: ObjectId;
  deliveryNoteNumber: string;
  customerId: ObjectId;
  customer?: Customer; // Populated field
  issueDate: Date;
  deliveryDate: Date; // 納品日
  items: DeliveryNoteItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  deliveryLocation?: string; // 納品先
  deliveryMethod?: string; // 納品方法
  status: DeliveryNoteStatus;
  notes?: string;
  internalNotes?: string;
  receivedDate?: Date; // 受領確認日
  receivedBy?: string; // 受領者
  convertedFromQuoteId?: ObjectId; // 見積書から変換された場合のID
  convertedFromQuoteDate?: Date;
  convertedFromInvoiceId?: ObjectId; // 請求書から変換された場合のID
  convertedFromInvoiceDate?: Date;
  convertedToInvoiceId?: ObjectId; // 請求書に変換された場合のID
  convertedToInvoiceDate?: Date;
  isGeneratedByAI?: boolean;
  aiGenerationMetadata?: {
    source?: string;
    confidence?: number;
    timestamp?: Date;
  };
  aiConversationId?: string; // AI会話履歴のID
  customerSnapshot?: {
    companyName: string;
    contactName?: string;
    address: string;
    phone?: string;
    email?: string;
  };
  companySnapshot?: {
    companyName: string;
    address: string;
    phone?: string;
    email?: string;
    invoiceRegistrationNumber?: string;
    stampImage?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// 納品書項目インターフェース
export interface DeliveryNoteItem {
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  notes?: string;
  deliveredQuantity?: number; // 実際の納品数量
}

// 商品インターフェース
export interface Product {
  _id?: ObjectId;
  productCode: string;
  productName: string;
  productNameKana?: string;
  description?: string;
  category?: string;
  unitPrice: number;
  taxRate?: number;
  unit?: string;
  isActive?: boolean;
  tags?: string[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ドキュメントインターフェース
export interface Document {
  _id?: ObjectId;
  documentNumber: string;
  documentType: 'invoice' | 'receipt' | 'quotation' | 'purchase_order';
  issueDate: Date;
  dueDate?: Date;
  customerId?: ObjectId;
  customerName?: string;
  items: DocumentItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  notes?: string;
  attachments?: string[];
  ocrResultId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ドキュメント項目インターフェース
export interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
}

// OCR結果インターフェース
export interface OCRResult {
  _id?: ObjectId;
  fileName: string;
  fileUrl?: string;
  gdriveFileId?: string;
  processedAt: Date;
  vendor?: string;
  documentDate?: Date;
  totalAmount?: number;
  taxAmount?: number;
  items?: OCRItem[];
  rawText?: string;
  confidence?: number;
  status: 'pending' | 'processed' | 'failed';
  errorMessage?: string;
  linkedDocumentId?: ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

// OCR項目インターフェース
export interface OCRItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  amount: number;
}

// 仕訳インターフェース
export interface JournalEntry {
  _id?: ObjectId;
  companyId: string;
  journalNumber: string;
  entryDate: Date;
  description: string;
  status: 'draft' | 'confirmed' | 'posted';
  sourceType?: 'manual' | 'ocr' | 'import';
  sourceDocumentId?: ObjectId;
  lines: JournalLine[];
  attachments?: string[];
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// 仕訳明細インターフェース
export interface JournalLine {
  accountCode: string;
  accountName: string;
  debitAmount: number;
  creditAmount: number;
  taxRate?: number;
  taxAmount?: number;
  isTaxIncluded?: boolean;
  description?: string;
  departmentCode?: string;
  projectCode?: string;
}

// 勘定科目インターフェース
export interface Account {
  _id?: ObjectId;
  accountCode: string;
  accountName: string;
  accountNameKana?: string;
  accountType: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentAccountCode?: string;
  level: number;
  isActive?: boolean;
  taxRate?: number;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ソート関連の型定義
export type SortableField = 'customerId' | 'companyName' | 'companyNameKana' | 'department' | 'prefecture' | 'city' | 'email' | 'paymentTerms' | 'createdAt' | 'primaryContactName' | 'primaryContactNameKana';
export type ProductSortableField = 'productCode' | 'productName' | 'category' | 'unitPrice' | 'stockQuantity' | 'taxRate' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

// フィルター関連の型定義
export interface FilterState {
  isActive?: boolean;
  prefecture?: string;
  city?: string;
  paymentTermsMin?: number;
  paymentTermsMax?: number;
  createdAtStart?: string; // YYYY-MM-DD
  createdAtEnd?: string;   // YYYY-MM-DD
}

// 商品フィルター用の型定義
export interface ProductFilterState {
  isActive?: boolean;
  category?: string;
  unitPriceMin?: number;
  unitPriceMax?: number;
  stockQuantityMin?: number;
  stockQuantityMax?: number;
  taxRates?: number[]; // 税率のリスト（複数選択可能）
  createdAtStart?: string; // YYYY-MM-DD
  createdAtEnd?: string;   // YYYY-MM-DD
}

// 商品インターフェースの拡張
export interface Product {
  _id?: ObjectId;
  id?: string; // フロントエンド用のIDフィールド
  productCode: string;
  productName: string;
  productNameKana?: string;
  description?: string;
  category?: string;
  unitPrice: number;
  taxRate?: number;
  unit?: string;
  stockQuantity?: number; // 在庫数を追加
  isActive?: boolean;
  tags?: string[];
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ナレッジ記事インターフェース
export interface KnowledgeArticle {
  _id?: ObjectId;
  title: string;
  content: string;
  excerpt?: string;
  sourceUrl: string;
  sourceType: 'blog' | 'youtube' | 'twitter' | 'linkedin' | 'facebook' | 'rss' | 'manual';
  sourceId?: string; // 外部サービスの投稿ID
  authorName?: string;
  authorUrl?: string;
  publishedDate?: Date;
  scrapedDate: Date;
  tags: string[];
  categories: string[];
  taxonomyTags: {
    taxLaw: string[];      // 税法関連タグ
    accountingType: string[];  // 会計種別タグ
    businessType: string[];    // 業種タグ
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    contentType: 'news' | 'guide' | 'case_study' | 'regulation' | 'faq' | 'opinion';
  };
  embeddings?: {
    vector: number[];
    model: string;
    timestamp: Date;
  };
  qualityScore: number; // 0-100の品質スコア
  isVerified: boolean;
  isActive: boolean;
  metadata: {
    wordCount: number;
    readingTime: number; // 分
    imageCount: number;
    linkCount: number;
    extractedData?: {
      pricing?: string[];
      contacts?: string[];
      regulations?: string[];
      dates?: string[];
    };
  };
  relatedArticles?: ObjectId[];
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  processingLog?: string;
  lastUpdated: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ナレッジソースインターフェース
export interface KnowledgeSource {
  _id?: ObjectId;
  name: string;
  type: 'blog' | 'youtube' | 'twitter' | 'linkedin' | 'facebook' | 'rss';
  url: string;
  description?: string;
  isActive: boolean;
  crawlSettings: {
    frequency: 'daily' | 'weekly' | 'monthly';
    maxArticles: number;
    includePatterns?: string[];
    excludePatterns?: string[];
    lastCrawled?: Date;
    nextCrawl?: Date;
  };
  authConfig?: {
    apiKey?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  };
  quality: {
    averageQualityScore: number;
    totalArticles: number;
    successfulCrawls: number;
    failedCrawls: number;
    lastErrorMessage?: string;
  };
  categories: string[];
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

// ナレッジカテゴリインターフェース
export interface KnowledgeCategory {
  _id?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  parentId?: ObjectId;
  level: number;
  isActive: boolean;
  icon?: string;
  color?: string;
  sortOrder: number;
  articleCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ナレッジ埋め込みインターフェース
export interface KnowledgeEmbedding {
  _id?: ObjectId;
  articleId: ObjectId;
  vector: number[];
  model: string;
  chunkIndex: number;
  chunkContent: string;
  createdAt?: Date;
}

// ナレッジ処理ログインターフェース
export interface KnowledgeProcessingLog {
  _id?: ObjectId;
  sourceId?: ObjectId;
  articleId?: ObjectId;
  operation: 'crawl' | 'extract' | 'embed' | 'classify' | 'quality_check';
  status: 'started' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  input?: any;
  output?: any;
  error?: string;
  metadata?: {
    itemsProcessed?: number;
    itemsSkipped?: number;
    itemsFailed?: number;
    apiCallsUsed?: number;
    creditsUsed?: number;
  };
  createdAt?: Date;
}

// AI会話履歴インターフェース（既存の拡張）
export interface AIConversation {
  _id?: ObjectId;
  sessionId: string;
  userId?: string;
  documentType: 'invoice' | 'quote' | 'delivery-note' | 'general' | 'knowledge';
  conversationContext?: {
    knowledgeQuery?: string;
    searchFilters?: {
      categories?: string[];
      tags?: string[];
      dateRange?: {
        start: Date;
        end: Date;
      };
      sources?: string[];
    };
    relevantArticles?: ObjectId[];
  };
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: {
      knowledgeUsed?: {
        articleId: ObjectId;
        relevanceScore: number;
        title: string;
        sourceUrl: string;
      }[];
      processingTime?: number;
      aiModel?: string;
    };
  }[];
  metadata: {
    customerInfo?: any;
    documentData?: any;
    aiModel: 'deepseek' | 'openai';
    knowledgeVersion?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

// FAQ記事インターフェース
export interface FaqArticle {
  _id?: ObjectId;
  id?: string;
  
  // 基本情報
  question: string;
  answer: string;
  category: string;
  subcategory?: string;
  
  // メタデータ
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  priority: number; // 表示優先度 (1-10)
  
  // 構造化データ
  structuredData: {
    contentType: 'tax' | 'accounting' | 'invoice' | 'compliance' | 'procedure' | 'general';
    taxLaw?: string[]; // 関連する税法
    applicableBusinessTypes?: string[]; // 適用される業種
    relatedRegulations?: string[]; // 関連する規制
    effectiveDate?: Date; // 有効開始日
    expirationDate?: Date; // 有効終了日
  };
  
  // ソース情報
  sourceInfo: {
    chatSessionId?: string; // 元のチャットセッションID
    chatMessageId?: string; // 元のメッセージID
    originalQuestion?: string; // 元の質問
    generatedBy: 'chat' | 'manual' | 'import';
    generatedAt: Date;
    verifiedBy?: string; // 検証者
    verifiedAt?: Date;
  };
  
  // 品質管理
  qualityMetrics: {
    accuracy: number; // 正確性 (0-100)
    completeness: number; // 完全性 (0-100)
    clarity: number; // 明確性 (0-100)
    usefulness: number; // 有用性 (0-100)
    overallScore: number; // 総合スコア (0-100)
  };
  
  // 利用統計
  usageStats: {
    viewCount: number;
    helpfulVotes: number;
    unhelpfulVotes: number;
    lastViewed?: Date;
    relatedQuestions?: string[]; // 関連質問のID
  };
  
  // ステータス
  status: 'draft' | 'review' | 'published' | 'archived' | 'deprecated';
  isPublished: boolean;
  isFeatured: boolean; // 注目記事フラグ
  
  // バージョン管理
  version: number;
  previousVersions?: string[]; // 過去バージョンのID
  
  // 検索最適化
  searchKeywords: string[];
  relatedFaqIds?: string[];
  
  // 日付情報
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

// FAQカテゴリー
export interface FaqCategory {
  _id?: ObjectId;
  id?: string;
  
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  
  // 階層構造
  parentCategoryId?: string;
  subcategories?: string[]; // 子カテゴリのID
  
  // 表示設定
  displayOrder: number;
  isVisible: boolean;
  
  // 統計
  articleCount: number;
  totalViews: number;
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
}

// FAQ利用ログ
export interface FaqUsageLog {
  _id?: ObjectId;
  
  faqId: string;
  action: 'view' | 'helpful' | 'unhelpful' | 'share' | 'copy';
  
  // セッション情報
  sessionId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  
  // コンテキスト
  referrer?: string;
  searchQuery?: string;
  chatContext?: {
    chatSessionId: string;
    relatedQuestion: string;
  };
  
  // 詳細データ
  metadata?: {
    feedback?: string;
    rating?: number;
    [key: string]: any;
  };
  
  timestamp: Date;
}