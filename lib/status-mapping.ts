import { InvoiceStatus, QuoteStatus, DeliveryNoteStatus } from '@/types/collections';

// 請求書ステータスの日本語→英語マッピング
export const INVOICE_STATUS_MAPPING = {
  '下書き': 'draft',
  '送信済み': 'sent',
  '開封済み': 'viewed',
  '未払い': 'unpaid',
  '支払済み': 'paid',
  '一部支払済み': 'partially_paid',
  '期限超過': 'overdue',
  'キャンセル': 'cancelled'
} as const;

// 請求書ステータスの英語→日本語マッピング
export const INVOICE_STATUS_LABELS = {
  draft: '下書き',
  sent: '送信済み',
  viewed: '開封済み',
  unpaid: '未払い',
  paid: '支払済み',
  partially_paid: '一部支払済み',
  overdue: '期限超過',
  cancelled: 'キャンセル'
} as const;

// 請求書ステータスの色設定
export const INVOICE_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-purple-100 text-purple-800',
  unpaid: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500'
} as const;

// 見積書ステータスの日本語→英語マッピング
export const QUOTE_STATUS_MAPPING = {
  '下書き': 'draft',
  '送信済み': 'sent',
  '保存済み': 'saved',
  '承認済み': 'accepted',
  '却下済み': 'rejected',
  '期限切れ': 'expired',
  '変換済み': 'converted'
} as const;

// 見積書ステータスの英語→日本語マッピング
export const QUOTE_STATUS_LABELS = {
  draft: '下書き',
  sent: '送信済み',
  saved: '保存済み',
  accepted: '承認済み',
  rejected: '却下済み',
  expired: '期限切れ',
  converted: '変換済み'
} as const;

// 納品書ステータスの日本語→英語マッピング
export const DELIVERY_NOTE_STATUS_MAPPING = {
  '下書き': 'draft',
  '保存済み': 'saved',
  '納品済み': 'delivered',
  '受領済み': 'received',
  'キャンセル': 'cancelled'
} as const;

// 納品書ステータスの英語→日本語マッピング
export const DELIVERY_NOTE_STATUS_LABELS = {
  draft: '下書き',
  saved: '保存済み',
  delivered: '納品済み',
  received: '受領済み',
  cancelled: 'キャンセル'
} as const;

// 日本語ステータスを英語に変換する関数
export function mapJapaneseToEnglishStatus(japaneseStatus: string): InvoiceStatus | null {
  return INVOICE_STATUS_MAPPING[japaneseStatus as keyof typeof INVOICE_STATUS_MAPPING] || null;
}

// 英語ステータスを日本語に変換する関数
export function mapEnglishToJapaneseStatus(englishStatus: string): string {
  return INVOICE_STATUS_LABELS[englishStatus as keyof typeof INVOICE_STATUS_LABELS] || englishStatus;
}

// ステータスに対応する色を取得する関数
export function getStatusColor(status: string): string {
  return INVOICE_STATUS_COLORS[status as keyof typeof INVOICE_STATUS_COLORS] || 'bg-gray-100 text-gray-800';
}

// 見積書ステータス変換関数
export function mapJapaneseToEnglishQuoteStatus(japaneseStatus: string): QuoteStatus | null {
  return QUOTE_STATUS_MAPPING[japaneseStatus as keyof typeof QUOTE_STATUS_MAPPING] || null;
}

export function mapEnglishToJapaneseQuoteStatus(englishStatus: string): string {
  return QUOTE_STATUS_LABELS[englishStatus as keyof typeof QUOTE_STATUS_LABELS] || englishStatus;
}

// 納品書ステータス変換関数
export function mapJapaneseToEnglishDeliveryNoteStatus(japaneseStatus: string): DeliveryNoteStatus | null {
  return DELIVERY_NOTE_STATUS_MAPPING[japaneseStatus as keyof typeof DELIVERY_NOTE_STATUS_MAPPING] || null;
}

export function mapEnglishToJapaneseDeliveryNoteStatus(englishStatus: string): string {
  return DELIVERY_NOTE_STATUS_LABELS[englishStatus as keyof typeof DELIVERY_NOTE_STATUS_LABELS] || englishStatus;
}

// 売上として計上すべきステータスかどうかを判定
export function isRevenueStatus(status: string): boolean {
  return ['sent', 'viewed', 'paid', 'partially_paid', 'overdue'].includes(status);
}

// 支払い完了ステータスかどうかを判定
export function isPaidStatus(status: string): boolean {
  return ['paid'].includes(status);
}

// 部分支払いステータスかどうかを判定
export function isPartiallyPaidStatus(status: string): boolean {
  return ['partially_paid'].includes(status);
}