import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 日付をフォーマット
 */
export function formatDate(date: Date | string, formatStr: string = 'yyyy年MM月dd日'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, formatStr, { locale: ja })
}

/**
 * 通貨をフォーマット
 */
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ja-JP')
}