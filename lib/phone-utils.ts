import { logger } from '@/lib/logger';

/**
 * 全角文字を半角に変換し、電話番号を正規化する包括的な関数
 */
export function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  
  let normalized = phone.trim();
  
  // プレフィックスの削除
  const prefixes = [
    'TEL ', 'TEL', 'Tel ', 'Tel', 'tel ', 'tel',
    'FAX ', 'FAX', 'Fax ', 'Fax', 'fax ', 'fax',
    '電話', '電話番号', 'Phone', 'phone', 'PHONE',
  ];
  
  for (const prefix of prefixes) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.substring(prefix.length).trim();
      break;
    }
  }
  
  // 全角数字を半角に変換
  normalized = normalized.replace(/[０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  
  // 全角ハイフン・記号を半角に変換
  normalized = normalized.replace(/[－‐―ー]/g, '-');
  normalized = normalized.replace(/［/g, '(');
  normalized = normalized.replace(/］/g, ')');
  normalized = normalized.replace(/＋/g, '+');
  normalized = normalized.replace(/　/g, ' '); // 全角スペース→半角
  
  // 余分な空白を削除
  normalized = normalized.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * 電話番号のプレフィックスを削除するユーティリティ関数
 */
export function cleanPhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  
  // 変換前の値をログ出力
  const originalPhone = phone;
  
  // プレフィックスのパターン
  const prefixes = [
    'TEL ',
    'TEL',
    'Tel ',
    'Tel',
    'tel ',
    'tel',
    'FAX ',
    'FAX',
    'Fax ',
    'Fax',
    'fax ',
    'fax',
    '電話',
    '電話番号',
    'Phone',
    'phone',
    'PHONE',
  ];
  
  let cleanedPhone = phone.trim();
  
  // プレフィックスを削除
  for (const prefix of prefixes) {
    if (cleanedPhone.startsWith(prefix)) {
      cleanedPhone = cleanedPhone.substring(prefix.length).trim();
      break;
    }
  }
  
  // 全角数字を半角に変換
  cleanedPhone = cleanedPhone.replace(/[０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  
  // 全角ハイフンを半角に変換
  cleanedPhone = cleanedPhone.replace(/[－‐―ー]/g, '-');
  
  // 余分な空白を削除
  cleanedPhone = cleanedPhone.replace(/\s+/g, '');
  
  // 変換結果をログ出力（デバッグ用）
  if (originalPhone !== cleanedPhone) {
    logger.debug(`[cleanPhoneNumber] Cleaned phone number: "${originalPhone}" → "${cleanedPhone}"`);
  }
  
  return cleanedPhone;
}