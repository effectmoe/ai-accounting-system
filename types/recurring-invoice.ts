import { ObjectId } from 'mongodb';
import { Invoice, InvoiceItem, InvoiceStatus, PaymentMethod } from './collections';

// 定期請求書の頻度
export type RecurringFrequency = 'monthly' | 'bi-monthly' | 'quarterly' | 'semi-annually' | 'annually' | 'custom';

// 定期請求書のステータス
export type RecurringInvoiceStatus = 'active' | 'paused' | 'completed' | 'cancelled';

// 定期請求書インターフェース
export interface RecurringInvoice {
  _id?: ObjectId;
  id?: string; // フロントエンド用のIDフィールド
  
  // 基本情報
  recurringInvoiceNumber: string; // 定期請求書番号（例：R-000001）
  title: string; // 定期請求書のタイトル
  customerId: ObjectId;
  customer?: any; // Populated field (Customer type)
  
  // 請求内容（請求書のテンプレート）
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  totalAmount: number;
  
  // 定期請求設定
  frequency: RecurringFrequency; // 支払いサイクル
  customFrequencyDays?: number; // カスタム頻度の場合の日数
  
  // 金額設定
  totalContractAmount: number; // 総合計金額
  monthlyAmount: number; // 月額（または1回あたりの金額）
  totalInstallments: number; // 総回数
  
  // スケジュール設定
  startDate: Date; // 初回発生日
  endDate?: Date; // 最終発生日（計算値または手動設定）
  nextInvoiceDate?: Date; // 次回請求日
  lastInvoiceDate?: Date; // 最終請求日（実績）
  
  // 支払い設定
  paymentMethod?: PaymentMethod;
  paymentTerms?: number; // 支払いサイト（日数）
  bankAccountId?: ObjectId;
  bankAccount?: any; // Populated field (BankAccount type)
  
  // 決済サービス設定（クレジットカード決済の場合）
  paymentService?: 'square' | 'paypal'; // 決済サービス
  processingFeeRate?: number; // 決済手数料率（例: 0.0325 = 3.25%）
  processingFeeFixed?: number; // 固定決済手数料（例: PayPalの40円）
  netAmount?: number; // 手数料差引後の受取額
  
  // 実績管理
  completedInstallments: number; // 完了した回数
  remainingInstallments: number; // 残りの回数
  totalInvoicedAmount: number; // 請求済み金額合計
  totalPaidAmount: number; // 支払い済み金額合計
  
  // ステータス
  status: RecurringInvoiceStatus;
  
  // メモ・備考
  notes?: string;
  internalNotes?: string;
  
  // 自動化設定
  autoGenerate: boolean; // 自動生成フラグ
  autoSend: boolean; // 自動送信フラグ
  notifyBeforeDays?: number; // 何日前に通知するか
  
  // メタデータ
  createdAt?: Date;
  updatedAt?: Date;
  pausedAt?: Date;
  cancelledAt?: Date;
  completedAt?: Date;
}

// 定期請求書から生成された請求書の関連情報
export interface RecurringInvoiceRelation {
  _id?: ObjectId;
  recurringInvoiceId: ObjectId;
  invoiceId: ObjectId;
  installmentNumber: number; // 何回目の請求か
  scheduledDate: Date; // 予定日
  generatedDate: Date; // 実際の生成日
  status: 'scheduled' | 'generated' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  amount: number;
  paidAmount?: number;
  paidDate?: Date;
  notes?: string;
}

// 定期請求書のスケジュール（カレンダー表示用）
export interface RecurringInvoiceSchedule {
  recurringInvoiceId: ObjectId;
  recurringInvoice?: RecurringInvoice; // Populated field
  installmentNumber: number;
  scheduledDate: Date;
  amount: number;
  status: 'pending' | 'generated' | 'completed';
  invoiceId?: ObjectId; // 生成された請求書のID
  invoice?: Invoice; // Populated field
  isEditable: boolean; // スケジュール編集可能フラグ
  customAmount?: number; // カスタム金額（通常と異なる場合）
  customDate?: Date; // カスタム日付（予定と異なる場合）
  notes?: string;
}

// 定期請求書の支払い履歴
export interface RecurringInvoicePaymentHistory {
  _id?: ObjectId;
  recurringInvoiceId: ObjectId;
  invoiceId: ObjectId;
  installmentNumber: number;
  invoiceNumber: string;
  dueDate: Date;
  amount: number;
  paidAmount: number;
  paidDate?: Date;
  paymentMethod?: PaymentMethod;
  status: InvoiceStatus;
  notes?: string;
  createdAt?: Date;
}

// 定期請求書の集計情報
export interface RecurringInvoiceSummary {
  recurringInvoiceId: ObjectId;
  totalContractAmount: number;
  totalInvoicedAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  completedInstallments: number;
  totalInstallments: number;
  completionRate: number; // 完了率（％）
  paymentRate: number; // 支払い率（％）
  averagePaymentDays: number; // 平均支払い日数
  nextInvoiceDate?: Date;
  estimatedCompletionDate?: Date;
}

// フィルター用の型定義
export interface RecurringInvoiceFilterState {
  status?: RecurringInvoiceStatus;
  customerId?: string;
  frequency?: RecurringFrequency;
  startDateFrom?: string; // YYYY-MM-DD
  startDateTo?: string;
  endDateFrom?: string;
  endDateTo?: string;
  totalAmountMin?: number;
  totalAmountMax?: number;
  completionRateMin?: number; // 0-100
  completionRateMax?: number;
}

// ソート可能フィールド
export type RecurringInvoiceSortableField = 
  | 'recurringInvoiceNumber'
  | 'title'
  | 'customerName'
  | 'totalContractAmount'
  | 'monthlyAmount'
  | 'startDate'
  | 'endDate'
  | 'nextInvoiceDate'
  | 'completionRate'
  | 'status'
  | 'createdAt';