import { ObjectId } from 'mongodb';

// 基本的なタイムスタンプを持つドキュメント
export interface BaseDocument {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// 顧客管理（customersコレクション）
export interface Customer extends BaseDocument {
  // 会社情報
  companyName: string;
  companyNameKana?: string;
  registrationNumber?: string; // 法人番号
  invoiceRegistrationNumber?: string; // 適格請求書発行事業者登録番号
  
  // 住所
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2?: string;
  
  // 連絡先
  phone: string;
  fax?: string;
  email: string;
  website?: string;
  
  // 担当者情報
  contacts: Contact[];
  
  // 支払条件
  paymentTerms: PaymentTerms;
  
  // その他
  notes?: string;
  isActive: boolean;
  tags?: string[];
}

// 担当者情報
export interface Contact {
  name: string;
  nameKana?: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  isPrimary: boolean;
}

// 支払条件
export interface PaymentTerms {
  paymentMethod: PaymentMethod;
  paymentDueDays: number; // 支払期限（日数）
  closingDay?: number; // 締め日（1-31、月末は31）
  paymentDay?: number; // 支払日（1-31、月末は31）
  bankAccountId?: string; // デフォルトの振込先口座ID
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer', // 銀行振込
  CASH = 'cash', // 現金
  CREDIT_CARD = 'credit_card', // クレジットカード
  CHECK = 'check', // 小切手
  OTHER = 'other' // その他
}

// 自社情報（companyInfoコレクション）
export interface CompanyInfo extends BaseDocument {
  // 基本情報
  companyName: string;
  companyNameKana?: string;
  companyNameEn?: string;
  registrationNumber?: string; // 法人番号
  invoiceRegistrationNumber?: string; // 適格請求書発行事業者登録番号
  
  // 住所
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2?: string;
  
  // 連絡先
  phone: string;
  fax?: string;
  email: string;
  website?: string;
  
  // 画像
  logoUrl?: string;
  sealImageUrl?: string; // 印鑑画像URL
  
  // 代表者情報
  representative: {
    name: string;
    nameKana?: string;
    position: string;
  };
  
  // 事業内容
  businessDescription?: string;
  establishedDate?: Date;
  capital?: number; // 資本金
  fiscalYearEnd?: string; // 決算月（MM形式）
  
  // その他
  isDefault: boolean; // デフォルトの自社情報フラグ
}

// 銀行口座（bankAccountsコレクション）
export interface BankAccount extends BaseDocument {
  // 口座情報
  accountName: string; // 口座名（例：「メイン口座」）
  bankName: string;
  bankNameKana?: string;
  bankCode?: string; // 銀行コード
  branchName: string;
  branchNameKana?: string;
  branchCode?: string; // 支店コード
  accountType: AccountType;
  accountNumber: string;
  accountHolder: string; // 口座名義
  accountHolderKana?: string;
  
  // 設定
  isDefault: boolean; // デフォルト口座フラグ
  isActive: boolean;
  
  // その他
  notes?: string;
  swiftCode?: string; // 国際送金用
  iban?: string; // 国際送金用
}

export enum AccountType {
  CHECKING = 'checking', // 当座預金
  SAVINGS = 'savings', // 普通預金
  TIME_DEPOSIT = 'time_deposit', // 定期預金
  OTHER = 'other' // その他
}

// 請求書（invoicesコレクション）
export interface Invoice extends BaseDocument {
  // 請求書情報
  invoiceNumber: string; // 請求書番号
  invoiceDate: Date; // 発行日
  dueDate: Date; // 支払期限
  
  // 顧客情報
  customerId: string;
  customerSnapshot: CustomerSnapshot; // 発行時点の顧客情報スナップショット
  
  // 明細
  items: InvoiceItem[];
  
  // 金額計算
  subtotal: number; // 小計
  taxAmount: number; // 消費税額
  totalAmount: number; // 合計金額
  
  // 支払情報
  paymentMethod: PaymentMethod;
  bankAccountId?: string; // 振込先口座ID
  
  // ステータス
  status: InvoiceStatus;
  paidAmount: number; // 支払済み金額
  paidDate?: Date; // 支払完了日
  
  // AI生成情報
  isGeneratedByAI: boolean; // AI会話から生成されたかのフラグ
  aiConversationId?: string; // AI会話ID（関連付け用）
  
  // その他
  notes?: string;
  internalNotes?: string; // 社内メモ
  attachmentUrls?: string[]; // 添付ファイルURL
  
  // 自社情報
  companyInfoId: string;
  companySnapshot: CompanySnapshot; // 発行時点の自社情報スナップショット
}

// 請求書明細
export interface InvoiceItem {
  itemName: string; // 品目名
  description?: string; // 詳細説明
  quantity: number; // 数量
  unit?: string; // 単位
  unitPrice: number; // 単価
  amount: number; // 金額（数量×単価）
  taxRate: number; // 税率（0.08, 0.10など）
  taxAmount: number; // 税額
  totalAmount: number; // 税込金額
  sortOrder: number; // 表示順
}

// 請求書ステータス
export enum InvoiceStatus {
  DRAFT = 'draft', // 下書き
  SENT = 'sent', // 送付済み
  VIEWED = 'viewed', // 閲覧済み
  PARTIALLY_PAID = 'partially_paid', // 一部支払済み
  PAID = 'paid', // 支払済み
  OVERDUE = 'overdue', // 期限超過
  CANCELLED = 'cancelled' // キャンセル
}

// 顧客情報スナップショット（請求書発行時点の情報を保存）
export interface CustomerSnapshot {
  companyName: string;
  postalCode: string;
  address: string; // フルアドレス
  phone: string;
  email: string;
  contactName?: string; // 主担当者名
}

// 自社情報スナップショット（請求書発行時点の情報を保存）
export interface CompanySnapshot {
  companyName: string;
  invoiceRegistrationNumber?: string;
  postalCode: string;
  address: string; // フルアドレス
  phone: string;
  email: string;
  logoUrl?: string;
  sealImageUrl?: string;
  bankAccount?: {
    bankName: string;
    branchName: string;
    accountType: string;
    accountNumber: string;
    accountHolder: string;
  };
}

// コレクション名のマッピング用の型
export interface CollectionTypes {
  customers: Customer;
  companyInfo: CompanyInfo;
  bankAccounts: BankAccount;
  invoices: Invoice;
}