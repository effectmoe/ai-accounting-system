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
    console.log(`[cleanPhoneNumber] Cleaned phone number: "${originalPhone}" → "${cleanedPhone}"`);
  }
  
  return cleanedPhone;
}