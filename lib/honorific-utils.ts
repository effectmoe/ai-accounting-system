import { Customer } from '@/types/collections';

/**
 * 顧客名に適切な敬称を付与する
 * 
 * ルール:
 * 1. 会社名のみの場合 → 「御中」
 * 2. 会社名と担当者名両方存在する場合 → 会社名には敬称を付けずに担当者名に「様」
 * 3. 担当者名のみの場合 → 「様」
 */
export function formatCustomerNameWithHonorific(
  customer?: Customer | null,
  customerSnapshot?: any
): { displayName: string; hasContactName: boolean } {
  // 顧客情報の取得
  const companyName = customer?.companyName || customerSnapshot?.companyName || '';
  
  // 主要連絡先を探す（isPrimaryがtrueのもの、なければ最初の連絡先）
  const primaryContact = customer?.contacts?.find(c => c.isPrimary) || customer?.contacts?.[0];
  const contactName = primaryContact?.name || customerSnapshot?.contactName || '';
  
  // 敬称付与ルール
  if (companyName && contactName) {
    // ルール2: 会社名と担当者名両方存在する場合
    return {
      displayName: `${companyName}\n${contactName} 様`,
      hasContactName: true
    };
  } else if (contactName && !companyName) {
    // ルール3: 担当者名のみの場合
    return {
      displayName: `${contactName} 様`,
      hasContactName: true
    };
  } else if (companyName) {
    // ルール1: 会社名のみの場合
    return {
      displayName: `${companyName} 御中`,
      hasContactName: false
    };
  }
  
  // フォールバック
  return {
    displayName: '顧客名未設定',
    hasContactName: false
  };
}

/**
 * メール本文用の宛名を生成
 * 会社名と担当者名がある場合は改行で区切る
 */
export function formatCustomerNameForEmail(
  customer?: Customer | null,
  customerSnapshot?: any
): string {
  const companyName = customer?.companyName || customerSnapshot?.companyName || '';
  const primaryContact = customer?.contacts?.find(c => c.isPrimary) || customer?.contacts?.[0];
  const contactName = primaryContact?.name || customerSnapshot?.contactName || '';

  if (companyName && contactName) {
    // 会社名と担当者名を改行で区切る
    return `${companyName}\n${contactName} 様`;
  } else if (contactName && !companyName) {
    return `${contactName} 様`;
  } else if (companyName) {
    return `${companyName} 御中`;
  }

  return '顧客名未設定';
}