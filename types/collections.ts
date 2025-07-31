import { ObjectId } from 'mongodb';
import { 
  BaseDocument, 
  TimestampedDocument, 
  Address, 
  ContactInfo,
  MoneyAmount,
  TaxCalculation,
  TaggableDocument,
  DateString,
  ObjectIdString
} from './database';

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
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'unpaid' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

// 見積書ステータス
export type QuoteStatus = 'draft' | 'sent' | 'saved' | 'accepted' | 'rejected' | 'expired' | 'converted';

// 納品書ステータス
export type DeliveryNoteStatus = 'draft' | 'saved' | 'delivered' | 'received' | 'cancelled';

// 顧客インターフェース
export interface Customer extends TimestampedDocument, TaggableDocument {
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
  title?: string; // 請求書のタイトル（件名）
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
  cancelledAt?: Date; // キャンセル日時
  isGeneratedByAI?: boolean;
  aiGenerationMetadata?: {
    source?: string;
    confidence?: number;
    timestamp?: Date;
  };
  aiConversationId?: string; // AI会話履歴のID
  // 定期請求書関連
  recurringInvoiceId?: ObjectId; // 元の定期請求書ID
  installmentNumber?: number; // 何回目の請求か
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
  title?: string; // 見積書のタイトル（件名）
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

// チャットセッション履歴インターフェース
export interface ChatSession {
  _id?: ObjectId;
  sessionId: string;
  userId?: string;
  title: string; // 自動生成されるセッションタイトル
  
  // メッセージ履歴
  messages: ChatMessage[];
  
  // セッション設定
  settings: {
    aiModel: 'deepseek' | 'openai';
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  
  // コンテキスト管理
  context: {
    totalTokens: number;
    maxTokensLimit: number;
    summarizedTokens: number; // 要約されたトークン数
    summaries: ContextSummary[]; // コンテキスト要約履歴
  };
  
  // ファイル添付
  attachments?: ChatAttachment[];
  
  // セッション状態
  status: 'active' | 'archived' | 'deleted';
  isBookmarked: boolean;
  
  // 統計情報
  stats: {
    messageCount: number;
    totalResponseTime: number; // 累計応答時間（ms）
    averageResponseTime: number; // 平均応答時間（ms）
    faqGenerated: number; // 生成されたFAQ数
  };
  
  // メタデータ
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    language: string;
    lastActiveAt: Date;
  };
  
  // 日付
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

// 知識ベースチャットセッション（拡張版）
export interface KnowledgeChatSession extends ChatSession {
  category: 'tax' | 'accounting' | 'journal' | 'mixed';
  specialization?: {
    primaryDomain: string;
    subDomains: string[];
    detectedTopics: string[];
  };
  knowledgeContext?: {
    searchFilters?: {
      categories?: string[];
      tags?: string[];
      sourceTypes?: string[];
      difficulty?: string;
      contentType?: string;
      verifiedOnly?: boolean;
    };
    relevantArticles?: string[];
    faqCandidates?: Array<{
      messageId: string;
      question: string;
      answer: string;
      confidence: number;
      category: string;
    }>;
  };
}

// チャットメッセージインターフェース
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  
  // メッセージ固有の設定
  isStreaming?: boolean;
  isComplete: boolean;
  
  // 添付ファイル
  attachments?: string[];
  
  // AI応答メタデータ
  metadata?: {
    model?: string;
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
    responseTime?: number; // ms
    finishReason?: 'stop' | 'length' | 'content_filter';
    
    // 知識ベース活用情報
    knowledgeUsed?: {
      articleIds: string[];
      relevanceScores: number[];
      vectorSearchQuery?: string;
    };
    
    // FAQ生成情報
    faqCandidate?: {
      question: string;
      category: string;
      isGenerated: boolean;
      faqId?: string;
    };
  };
  
  // ユーザーフィードバック
  feedback?: {
    rating: 'good' | 'bad';
    comment?: string;
    timestamp: Date;
  };
  
  // エラー情報
  error?: {
    message: string;
    code?: string;
    retryCount: number;
  };
}

// コンテキスト要約インターフェース
export interface ContextSummary {
  id: string;
  summaryText: string;
  originalTokenCount: number;
  summaryTokenCount: number;
  compressionRatio: number; // 圧縮率
  messageRange: {
    startIndex: number;
    endIndex: number;
    startTimestamp: Date;
    endTimestamp: Date;
  };
  summary_method: 'extractive' | 'abstractive' | 'hierarchical';
  createdAt: Date;
}

// チャット添付ファイルインターフェース
export interface ChatAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  filePath: string;
  uploadedAt: Date;
  
  // ファイル処理状況
  processing: {
    status: 'uploading' | 'processing' | 'completed' | 'failed';
    extractedText?: string;
    ocrResults?: string;
    error?: string;
  };
  
  // 関連情報
  relatedMessageIds: string[];
}

// チャットエクスポート設定インターフェース
export interface ChatExportSettings {
  format: 'markdown' | 'pdf' | 'html' | 'json';
  includeMetadata: boolean;
  includeSystemMessages: boolean;
  includeAttachments: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  messageFilter?: {
    roles: ('user' | 'assistant' | 'system')[];
    hasAttachments?: boolean;
    hasFeedback?: boolean;
  };
  styling?: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: number;
    includeTimestamps: boolean;
    includeTokenCounts: boolean;
  };
}

// ========== 仕入販売管理システム ==========

// 仕入先ステータス
export type SupplierStatus = 'active' | 'inactive' | 'suspended';

// 仕入先インターフェース
export interface Supplier {
  _id?: ObjectId;
  id?: string; // フロントエンド用のIDフィールド
  supplierCode: string; // 仕入先コード
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
  paymentMethod?: PaymentMethod;
  bankAccountId?: ObjectId;
  bankAccount?: BankAccount; // Populated field
  contacts?: Contact[];
  tags?: string[];
  notes?: string;
  status: SupplierStatus;
  creditLimit?: number; // 与信限度額
  currentBalance?: number; // 現在の買掛金残高
  totalPurchaseAmount?: number; // 累計仕入額
  lastPurchaseDate?: Date; // 最終仕入日
  evaluationScore?: number; // 評価スコア (1-5)
  // 振込先情報（複数の銀行口座を持つ場合があるため配列）
  bankTransferInfo?: {
    bankName?: string;
    branchName?: string;
    accountType?: string;
    accountNumber?: string;
    accountName?: string;
    swiftCode?: string;
    additionalInfo?: string;
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

// 商品仕入情報インターフェース
export interface ProductSupplierInfo {
  supplierId: ObjectId;
  supplier?: Supplier; // Populated field
  supplierProductCode?: string; // 仕入先の商品コード
  purchasePrice: number; // 仕入価格
  minimumOrderQuantity?: number; // 最小発注単位
  leadTimeDays?: number; // リードタイム（日数）
  isPreferred?: boolean; // 優先仕入先フラグ
  notes?: string;
  lastPurchaseDate?: Date;
  lastPurchasePrice?: number;
}

// 拡張版商品インターフェース（仕入情報を含む）
export interface ProductWithSupplierInfo extends Product {
  supplierInfo?: ProductSupplierInfo[]; // 複数の仕入先情報
  costPrice?: number; // 原価（主要仕入先の価格）
  profitMargin?: number; // 利益率
  profitAmount?: number; // 利益額
}

// 案件ステータス
export type DealStatus = 'lead' | 'negotiation' | 'quote_sent' | 'won' | 'lost' | 'on_hold';

// 案件インターフェース
export interface Deal {
  _id?: ObjectId;
  id?: string; // フロントエンド用のIDフィールド
  dealNumber: string; // 案件番号
  dealName: string;
  customerId: ObjectId;
  customer?: Customer; // Populated field
  status: DealStatus;
  dealType: 'sale' | 'purchase' | 'both'; // 販売案件/仕入案件/両方
  
  // 案件詳細
  description?: string;
  estimatedValue?: number; // 予想金額
  actualValue?: number; // 実際の金額
  profitMargin?: number; // 利益率
  profitAmount?: number; // 利益額
  
  // 日付情報
  startDate: Date;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  
  // 関連ドキュメント
  relatedQuotes?: ObjectId[]; // 関連見積書
  relatedInvoices?: ObjectId[]; // 関連請求書
  relatedPurchaseOrders?: ObjectId[]; // 関連発注書
  relatedSupplierQuotes?: ObjectId[]; // 関連仕入見積書
  
  // 商品情報
  items?: DealItem[];
  
  // 担当者情報
  assignedTo?: string; // 担当者名
  assignedToEmail?: string;
  
  // メモ・活動履歴
  notes?: string;
  activities?: DealActivity[];
  
  // メタデータ
  tags?: string[];
  customFields?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

// 案件商品インターフェース
export interface DealItem {
  productId?: ObjectId;
  product?: Product; // Populated field
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number; // 販売単価
  purchasePrice?: number; // 仕入単価
  amount: number; // 販売金額
  cost?: number; // 仕入金額
  profitMargin?: number; // 利益率
  profitAmount?: number; // 利益額
  supplierId?: ObjectId;
  supplier?: Supplier; // Populated field
  notes?: string;
}

// 案件活動履歴インターフェース
export interface DealActivity {
  id: string;
  type: 'note' | 'email' | 'call' | 'meeting' | 'quote' | 'invoice' | 'status_change';
  description: string;
  createdBy: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

// 仕入見積書ステータス
export type SupplierQuoteStatus = 'pending' | 'received' | 'accepted' | 'rejected' | 'expired' | 'cancelled' | 'converted';

// 仕入見積書インターフェース
export interface SupplierQuote {
  _id?: ObjectId;
  id?: string;
  quoteNumber: string; // 見積書番号
  supplierId: ObjectId;
  supplier?: Supplier; // Populated field
  dealId?: ObjectId; // 関連案件
  deal?: Deal; // Populated field
  
  // 日付情報
  issueDate: Date;
  validityDate: Date; // 有効期限
  
  // 商品情報
  items: SupplierQuoteItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  
  // ステータス
  status: SupplierQuoteStatus;
  
  // 追加フィールド（赤枠の4項目）
  subject?: string; // 件名
  deliveryLocation?: string; // 納入場所
  paymentTerms?: string; // お支払条件
  quotationValidity?: string; // 見積有効期限（テキスト形式）
  
  // OCRで直接抽出した仕入先情報（supplierが未設定の場合に使用）
  vendorName?: string;
  vendorAddress?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendor?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    fax?: string;
  };
  
  // メタデータ
  notes?: string;
  attachments?: string[]; // ファイルパス
  ocrResultId?: ObjectId; // OCR結果との関連
  fileId?: string; // 元ファイルのID（GridFS）
  
  // 変換情報
  convertedToPurchaseOrderId?: ObjectId;
  convertedToPurchaseOrderDate?: Date;
  
  // AI生成情報
  isGeneratedByAI?: boolean;
  aiGenerationMetadata?: {
    source?: string;
    confidence?: number;
    timestamp?: Date;
  };
  
  createdAt?: Date;
  updatedAt?: Date;
}

// 仕入見積書項目インターフェース
export interface SupplierQuoteItem {
  productId?: ObjectId;
  product?: Product; // Populated field
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  notes?: string;
  remarks?: string; // 備考（空の数量・単価・金額の行の内容）
}

// 発注書インターフェース
export interface PurchaseOrder {
  _id?: ObjectId;
  id?: string;
  purchaseOrderNumber: string;
  supplierId: ObjectId;
  supplier?: Supplier; // Populated field
  dealId?: ObjectId;
  deal?: Deal; // Populated field
  
  // 日付情報
  issueDate: Date;
  deliveryDate?: Date; // 希望納期
  actualDeliveryDate?: Date; // 実際の納品日
  
  // 商品情報
  items: PurchaseOrderItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  
  // ステータス
  status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'completed' | 'cancelled';
  
  // 支払い情報
  paymentMethod?: PaymentMethod;
  paymentTerms?: number;
  paymentDueDate?: Date;
  paymentStatus?: 'pending' | 'partial' | 'paid';
  paidAmount?: number;
  paidDate?: Date;
  
  // 配送情報
  deliveryLocation?: string;
  deliveryMethod?: string;
  trackingNumber?: string;
  
  // メタデータ
  notes?: string;
  internalNotes?: string;
  attachments?: string[];
  
  // 関連情報
  relatedSupplierQuoteId?: ObjectId;
  relatedInvoiceIds?: ObjectId[]; // 仕入請求書
  
  createdAt?: Date;
  updatedAt?: Date;
}

// 発注書項目インターフェース
export interface PurchaseOrderItem {
  productId?: ObjectId;
  product?: Product; // Populated field
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  receivedQuantity?: number; // 受領数量
  receivedDate?: Date;
  notes?: string;
}

// 仕入請求書ステータス
export type PurchaseInvoiceStatus = 'draft' | 'received' | 'approved' | 'paid' | 'overdue' | 'cancelled';

// 仕入請求書インターフェース
export interface PurchaseInvoice {
  _id?: ObjectId;
  id?: string;
  invoiceNumber: string; // 請求書番号
  supplierId: ObjectId;
  supplier?: Supplier; // Populated field
  purchaseOrderId?: ObjectId; // 関連発注書
  purchaseOrder?: PurchaseOrder; // Populated field
  dealId?: ObjectId; // 関連案件
  deal?: Deal; // Populated field
  
  // 日付情報
  issueDate: Date;
  dueDate: Date; // 支払期限
  receivedDate?: Date; // 受領日
  
  // 金額情報
  items: PurchaseInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  
  // 繰越・請求関連情報
  previousBalance?: number; // 前回請求額
  currentPayment?: number; // 今回入金額
  carryoverAmount?: number; // 繰越金額
  currentSales?: number; // 今回売上高
  currentInvoiceAmount?: number; // 今回請求額（繰越金額 + 今回売上高）
  
  // その他
  notes?: string; // 備考
  
  // ステータス
  status: PurchaseInvoiceStatus;
  
  // 支払い情報
  paymentMethod?: PaymentMethod;
  bankAccountId?: ObjectId;
  bankAccount?: BankAccount; // Populated field
  paymentStatus: 'pending' | 'partial' | 'paid';
  paidAmount?: number;
  paidDate?: Date;
  paymentReference?: string; // 振込参照番号など
  
  // OCRで直接抽出した仕入先情報（supplierが未設定の場合に使用）
  vendorName?: string;
  vendorAddress?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  vendor?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    fax?: string;
  };
  
  // メタデータ
  notes?: string;
  internalNotes?: string;
  attachments?: string[]; // ファイルパス
  ocrResultId?: ObjectId; // OCR結果との関連
  fileId?: string; // 元ファイルのID（GridFS）
  
  // 承認情報
  approvedBy?: string;
  approvedAt?: Date;
  approvalNotes?: string;
  
  // AI生成情報
  isGeneratedByAI?: boolean;
  aiGenerationMetadata?: {
    source?: string;
    confidence?: number;
    timestamp?: Date;
  };
  
  createdAt?: Date;
  updatedAt?: Date;
}

// 仕入請求書項目インターフェース
export interface PurchaseInvoiceItem {
  productId?: ObjectId;
  product?: Product; // Populated field
  itemName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  purchaseOrderItemId?: ObjectId; // 関連発注書項目
  notes?: string;
  remarks?: string; // 備考
}

// ダッシュボード用集計データインターフェース
export interface DashboardProfitData {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  
  // 売上データ
  sales: {
    totalAmount: number;
    count: number;
    averageAmount: number;
  };
  
  // 仕入データ
  purchases: {
    totalAmount: number;
    count: number;
    averageAmount: number;
  };
  
  // 利益データ
  profit: {
    totalAmount: number;
    margin: number; // 利益率
    topProducts: Array<{
      productId: ObjectId;
      productName: string;
      profitAmount: number;
      profitMargin: number;
      salesCount: number;
    }>;
    topCustomers: Array<{
      customerId: ObjectId;
      customerName: string;
      profitAmount: number;
      profitMargin: number;
      dealCount: number;
    }>;
  };
  
  // 案件データ
  deals: {
    total: number;
    won: number;
    lost: number;
    inProgress: number;
    winRate: number;
    averageDealSize: number;
  };
}

// アクティビティログタイプ
export type ActivityLogType = 
  | 'document_created' 
  | 'document_updated' 
  | 'invoice_created' 
  | 'invoice_sent'
  | 'invoice_paid'
  | 'quote_created' 
  | 'quote_sent'
  | 'quote_accepted'
  | 'customer_created' 
  | 'customer_updated'
  | 'supplier_created'
  | 'supplier_updated'
  | 'ocr_completed'
  | 'ocr_failed'
  | 'journal_created'
  | 'journal_updated'
  | 'system_error'
  | 'user_action';

// アクティビティログインターフェース
export interface ActivityLog extends TimestampedDocument {
  type: ActivityLogType;
  entityType?: 'document' | 'invoice' | 'quote' | 'customer' | 'supplier' | 'journal' | 'system';
  entityId?: ObjectId | string;
  userId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  severity?: 'low' | 'medium' | 'high';
}