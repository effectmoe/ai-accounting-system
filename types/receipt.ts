import { ObjectId } from 'mongodb';
import type { ScannedReceiptMetadata } from './scan-receipt';

// 領収書ステータス
export type ReceiptStatus = 'draft' | 'issued' | 'sent' | 'cancelled';

// 勘定科目
export type AccountCategory =
  | '旅費交通費'      // 交通機関、ガソリン、駐車場
  | '接待交際費'      // 接待、贈答品
  | '会議費'          // 会議中の飲食
  | '福利厚生費'      // 従業員向け飲食・慰安
  | '消耗品費'        // 事務用品、10万円未満の備品
  | '通信費'          // 電話、インターネット、郵送
  | '水道光熱費'      // 電気、ガス、水道
  | '地代家賃'        // 事務所家賃
  | '保険料'          // 各種保険
  | '修繕費'          // 修理、メンテナンス
  | '広告宣伝費'      // 広告、宣伝
  | '支払手数料'      // 振込手数料、各種手数料
  | '車両費'          // 車両維持費、洗車、車検
  | '新聞図書費'      // 新聞、書籍、雑誌
  | '研修費'          // セミナー、研修
  | '租税公課'        // 税金、印紙
  | '雑費'            // その他
  | '未分類';         // 分類できなかった場合

// 勘定科目の詳細情報
export interface AccountCategoryInfo {
  code: AccountCategory;
  name: string;
  description: string;
  keywords: string[]; // 自動判定用キーワード
}

// 勘定科目マスタ
export const ACCOUNT_CATEGORIES: AccountCategoryInfo[] = [
  { code: '旅費交通費', name: '旅費交通費', description: '交通機関、ガソリン、駐車場、高速道路', keywords: ['JR', '地下鉄', 'バス', 'タクシー', 'ガソリン', '駐車', '高速', 'ETC', 'Suica', 'PASMO', '切符'] },
  { code: '接待交際費', name: '接待交際費', description: '接待目的の飲食、贈答品', keywords: ['接待', '贈答', 'ギフト', '御礼'] },
  { code: '会議費', name: '会議費', description: '会議中の飲食代（1人5,000円以下）', keywords: ['会議', 'ミーティング'] },
  { code: '福利厚生費', name: '福利厚生費', description: '従業員向けの飲食・慰安', keywords: ['慰労', '歓送迎', '忘年会', '新年会'] },
  { code: '消耗品費', name: '消耗品費', description: '事務用品、10万円未満の備品', keywords: ['文具', 'ペン', 'ノート', '用紙', 'トナー', 'インク', '電池', 'USB', 'ケーブル'] },
  { code: '通信費', name: '通信費', description: '電話、インターネット、郵送', keywords: ['電話', '携帯', 'インターネット', '郵便', '切手', '宅配', '郵送'] },
  { code: '水道光熱費', name: '水道光熱費', description: '電気、ガス、水道', keywords: ['電気', 'ガス', '水道', '電力'] },
  { code: '地代家賃', name: '地代家賃', description: '事務所・店舗の家賃', keywords: ['家賃', '賃料', '敷金', '礼金'] },
  { code: '保険料', name: '保険料', description: '各種保険', keywords: ['保険', '共済'] },
  { code: '修繕費', name: '修繕費', description: '修理、メンテナンス', keywords: ['修理', '修繕', 'メンテナンス', '整備'] },
  { code: '広告宣伝費', name: '広告宣伝費', description: '広告、宣伝', keywords: ['広告', '宣伝', 'PR', 'マーケティング', 'チラシ', 'ポスター'] },
  { code: '支払手数料', name: '支払手数料', description: '振込手数料、各種手数料', keywords: ['手数料', '振込', 'ATM'] },
  { code: '車両費', name: '車両費', description: '車両維持費、洗車、車検、駐車場', keywords: ['洗車', '車検', 'オイル', 'タイヤ', '整備', '車両', 'カー'] },
  { code: '新聞図書費', name: '新聞図書費', description: '新聞、書籍、雑誌', keywords: ['書籍', '本', '雑誌', '新聞', 'Amazon'] },
  { code: '研修費', name: '研修費', description: 'セミナー、研修', keywords: ['セミナー', '研修', '講座', '勉強会'] },
  { code: '租税公課', name: '租税公課', description: '税金、印紙', keywords: ['印紙', '税', '収入印紙'] },
  { code: '雑費', name: '雑費', description: 'その他の経費', keywords: [] },
  { code: '未分類', name: '未分類', description: '分類できなかった場合', keywords: [] },
];

// 領収書インターフェース
export interface Receipt {
  _id?: ObjectId;

  // 基本情報
  receiptNumber: string; // 領収書番号 (例: REC-0000000001)
  invoiceId?: ObjectId; // 関連する請求書ID（スキャン取込の場合は未設定）
  invoiceNumber?: string; // 関連する請求書番号

  // 顧客情報
  customerId?: ObjectId; // スキャン取込の場合は未設定
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

  // 勘定科目（自動推定）
  accountCategory?: AccountCategory;
  accountCategoryConfidence?: number; // 推定の確信度（0-1）

  // メール送信記録
  emailSentAt?: Date;
  emailSentTo?: string[];

  // PDF情報
  pdfUrl?: string;
  pdfGeneratedAt?: Date;

  // 画像情報（スキャン取込時にR2にアップロードされた画像）
  imageUrl?: string; // R2のWEBP画像URL
  imageUploadedAt?: Date;

  // スキャン取込情報
  scannedFromPdf?: boolean; // PDFスキャンから作成された領収書
  scanMetadata?: ScannedReceiptMetadata; // スキャン処理のメタデータ

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
  scannedFromPdf?: boolean; // スキャン取込フィルタ
  search?: string; // 検索クエリ
  accountCategory?: string; // 勘定科目フィルタ
  amountMin?: number; // 金額（最小）
  amountMax?: number; // 金額（最大）
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