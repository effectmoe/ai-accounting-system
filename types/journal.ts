import { JournalEntry } from './collections';

/**
 * 仕訳表示ビューのタイプ
 */
export type JournalViewType = 'table' | 'timeline';

/**
 * ViewToggleで使用するビューモード（エイリアス）
 */
export type ViewMode = JournalViewType;

/**
 * 仕訳の日付別グループ
 */
export interface GroupedJournals {
  [date: string]: JournalEntry[];
}

/**
 * 仕訳テーブル用のアイテム（DataTable互換）
 */
export interface JournalTableItem extends JournalEntry {
  id: string;
}

/**
 * 仕訳フィルター状態
 */
export interface JournalFilterState {
  status?: string[];
  sourceType?: string[];
  dateFrom?: string;
  dateTo?: string;
  accountCode?: string;
  isBalanced?: boolean;
}

/**
 * 仕訳ソート設定
 */
export interface JournalSortConfig {
  field: 'journalNumber' | 'entryDate' | 'debitTotal' | 'creditTotal' | 'status';
  order: 'asc' | 'desc';
}