import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

import { logger } from '@/lib/logger';
/**
 * 安全な日付フォーマット関数
 * 無効な日付値が渡された場合は '-' を返す
 */
export const safeFormatDate = (
  dateValue: string | Date | null | undefined, 
  formatString: string = 'yyyy/MM/dd'
): string => {
  if (!dateValue) return '-';
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  if (isNaN(date.getTime())) {
    return '-';
  }
  
  try {
    return format(date, formatString, { locale: ja });
  } catch (error) {
    logger.warn('Date formatting error:', error, 'for value:', dateValue);
    return '-';
  }
};

/**
 * 日付値が有効かどうかを判定
 */
export const isValidDate = (dateValue: string | Date | null | undefined): boolean => {
  if (!dateValue) return false;
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  return !isNaN(date.getTime());
};

/**
 * 安全にDateオブジェクトを作成
 */
export const safeCreateDate = (dateValue: string | Date | null | undefined): Date | null => {
  if (!dateValue) return null;
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  if (isNaN(date.getTime())) {
    return null;
  }
  
  return date;
};