import { logger } from '@/lib/logger';

/**
 * 全角文字を半角に変換し、電話番号を正規化する包括的な関数
 */
export function normalizePhoneNumber(phone: string | undefined | null): string {
  if (!phone) return '';
  
  logger.debug(`[normalizePhoneNumber] 入力値: "${phone}"`);
  
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
      logger.debug(`[normalizePhoneNumber] プレフィックス除去: "${prefix}" → "${normalized}"`);
      break;
    }
  }
  
  // 全角数字を半角に変換
  const beforeDigit = normalized;
  normalized = normalized.replace(/[０-９]/g, (s) => {
    return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
  });
  if (beforeDigit !== normalized) {
    logger.debug(`[normalizePhoneNumber] 全角数字変換: "${beforeDigit}" → "${normalized}"`);
  }
  
  // 全角ハイフン・記号を半角に変換（より包括的に）
  const beforeSymbol = normalized;
  // より多くの全角ハイフンパターンに対応
  normalized = normalized.replace(/[－‐―ー−─]/g, '-'); // 長い線も追加
  normalized = normalized.replace(/［/g, '(');
  normalized = normalized.replace(/］/g, ')');
  normalized = normalized.replace(/（/g, '('); // 全角括弧も追加
  normalized = normalized.replace(/）/g, ')'); // 全角括弧も追加
  normalized = normalized.replace(/＋/g, '+');
  normalized = normalized.replace(/　/g, ' '); // 全角スペース→半角
  normalized = normalized.replace(/．/g, '.'); // 全角ピリオドも追加
  normalized = normalized.replace(/＃/g, '#'); // 全角シャープも追加
  
  if (beforeSymbol !== normalized) {
    logger.debug(`[normalizePhoneNumber] 記号変換: "${beforeSymbol}" → "${normalized}"`);
  }
  
  // 余分な空白を削除
  const beforeTrim = normalized;
  normalized = normalized.replace(/\s+/g, ' ').trim();
  if (beforeTrim !== normalized) {
    logger.debug(`[normalizePhoneNumber] 空白整理: "${beforeTrim}" → "${normalized}"`);
  }
  
  logger.debug(`[normalizePhoneNumber] 最終結果: "${phone}" → "${normalized}"`);
  
  // 残存全角文字チェック
  const hasRemainingZenkaku = /[０-９－‐―ー−─（）＋　．＃]/g.test(normalized);
  if (hasRemainingZenkaku) {
    logger.warn(`[normalizePhoneNumber] 警告: 変換後も全角文字が残存している: "${normalized}"`);
  }
  
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