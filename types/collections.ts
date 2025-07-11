import { ObjectId } from 'mongodb';

// 支払い方法
export type PaymentMethod = 'cash' | 'credit_card' | 'bank_transfer' | 'invoice' | 'other';

// 口座種別
export type AccountType = 'checking' | 'savings';

// 請求書ステータス
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

// 顧客インターフェース
export interface Customer {
  _id?: ObjectId;
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
  isGeneratedByAI?: boolean;
  aiGenerationMetadata?: {
    source?: string;
    confidence?: number;
    timestamp?: Date;
  };
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