import { ObjectId } from 'mongodb';

// 領収書ステータス
export type ReceiptStatus = 'draft' | 'issued' | 'sent' | 'cancelled';

// 領収書インターフェース
export interface Receipt {
  _id?: ObjectId;

  // 基本情報
  receiptNumber: string; // 領収書番号 (例: REC-0000000001)
  invoiceId: ObjectId; // 関連する請求書ID
  invoiceNumber?: string; // 関連する請求書番号

  // 顧客情報
  customerId: ObjectId;
  customerName: string; // 宛名（〇〇御中）
  customerAddress?: string;

  // 発行者情報
  issuerName: string; // 発行者名（会社名）
  issuerAddress?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  issuerRegistrationNumber?: string; // 登録番号（適格請求書発行事業者登録番号）
  issuerStamp?: string; // 印影画像データ（Base64）

  // 金額情報
  subtotal: number; // 小計
  taxAmount: number; // 消費税額
  totalAmount: number; // 合計金額
  taxRate: number; // 消費税率（10% = 0.1）

  // 内訳
  items: ReceiptItem[];

  // 日付情報
  issueDate: Date; // 領収日
  paidDate?: Date; // 支払日（請求書の支払日）

  // その他
  title?: string; // タイトル/件名
  subject?: string; // 但し書き
  notes?: string; // 備考
  status: ReceiptStatus;

  // メール送信記録
  emailSentAt?: Date;
  emailSentTo?: string[];

  // PDF情報
  pdfUrl?: string;
  pdfGeneratedAt?: Date;

  // タイムスタンプ
  createdAt?: Date;
  updatedAt?: Date;
}

// 領収書明細インターフェース
export interface ReceiptItem {
  itemName?: string; // 商品名
  description: string; // 摘要
  quantity: number; // 数量
  unit?: string; // 単位（個、枚など）
  unitPrice: number; // 単価
  amount: number; // 明細金額
  taxType?: 'taxable' | 'non-taxable' | 'tax-exempt'; // 課税区分
}

// 領収書生成パラメータ
export interface CreateReceiptParams {
  invoiceId: string; // 請求書ID
  issueDate?: Date | string; // 領収日（省略時は現在日時）
  subject?: string; // 但し書き
  notes?: string; // 備考
}

// 領収書検索パラメータ
export interface ReceiptSearchParams {
  customerId?: string;
  invoiceId?: string;
  status?: ReceiptStatus;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  skip?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// 領収書メール送信パラメータ
export interface SendReceiptEmailParams {
  receiptId: string;
  to: string[]; // 送信先メールアドレス
  cc?: string[]; // CC
  bcc?: string[]; // BCC
  subject?: string; // 件名（省略時はデフォルト）
  message?: string; // メッセージ本文
}

// 領収書検索結果
export interface ReceiptSearchResult {
  receipts: Receipt[];
  total: number;
  hasMore: boolean;
}