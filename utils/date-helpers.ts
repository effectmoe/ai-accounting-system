// date-fnsの個別インポートを使用した日付ヘルパー関数

import { format } from 'date-fns';
import { parseISO } from 'date-fns';
import { startOfMonth } from 'date-fns';
import { endOfMonth } from 'date-fns';
import { addDays } from 'date-fns';
import { subDays } from 'date-fns';
import { differenceInDays } from 'date-fns';
import { isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

// 日付フォーマット関数
export function formatDate(date: Date | string, formatStr: string = 'yyyy年MM月dd日'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) return '無効な日付';
  
  return format(dateObj, formatStr, { locale: ja });
}

// 日付範囲ヘルパー
export function getMonthRange(date: Date = new Date()) {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date)
  };
}

// 日付計算ヘルパー
export function addBusinessDays(date: Date, days: number): Date {
  let result = date;
  let daysToAdd = Math.abs(days);
  const direction = days > 0 ? 1 : -1;
  
  while (daysToAdd > 0) {
    result = addDays(result, direction);
    const dayOfWeek = result.getDay();
    
    // 土日をスキップ
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysToAdd--;
    }
  }
  
  return result;
}

// 期限チェック
export function isOverdue(dueDate: Date | string): boolean {
  const due = typeof dueDate === 'string' ? parseISO(dueDate) : dueDate;
  return differenceInDays(new Date(), due) > 0;
}

// 日付の妥当性チェック
export function isValidDate(date: any): boolean {
  if (!date) return false;
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return isValid(dateObj);
}

// よく使う日付フォーマット
export const dateFormats = {
  japanese: 'yyyy年MM月dd日',
  japaneseShort: 'M月d日',
  iso: 'yyyy-MM-dd',
  datetime: 'yyyy-MM-dd HH:mm:ss',
  time: 'HH:mm',
  yearMonth: 'yyyy年MM月',
} as const;

// デフォルトのエクスポート（必要に応じて削除可能）
export default {
  formatDate,
  getMonthRange,
  addBusinessDays,
  isOverdue,
  isValidDate,
  dateFormats,
};