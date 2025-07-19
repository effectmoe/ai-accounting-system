export const statusConfig = {
  // 一般的なステータス
  active: {
    label: 'アクティブ',
    variant: 'success',
    className: 'bg-green-100 text-green-800',
  },
  inactive: {
    label: '非アクティブ',
    variant: 'default',
    className: 'bg-gray-100 text-gray-800',
  },
  pending: {
    label: '保留中',
    variant: 'warning',
    className: 'bg-yellow-100 text-yellow-800',
  },
  completed: {
    label: '完了',
    variant: 'success',
    className: 'bg-green-100 text-green-800',
  },
  cancelled: {
    label: 'キャンセル',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800',
  },
  
  // 請求書ステータス
  draft: {
    label: '下書き',
    variant: 'default',
    className: 'bg-gray-100 text-gray-800',
  },
  sent: {
    label: '送信済み',
    variant: 'info',
    className: 'bg-blue-100 text-blue-800',
  },
  paid: {
    label: '支払済み',
    variant: 'success',
    className: 'bg-green-100 text-green-800',
  },
  overdue: {
    label: '期限超過',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800',
  },
  
  // 注文ステータス
  processing: {
    label: '処理中',
    variant: 'info',
    className: 'bg-blue-100 text-blue-800',
  },
  shipped: {
    label: '発送済み',
    variant: 'info',
    className: 'bg-indigo-100 text-indigo-800',
  },
  delivered: {
    label: '配達完了',
    variant: 'success',
    className: 'bg-green-100 text-green-800',
  },
  
  // エラー/成功
  error: {
    label: 'エラー',
    variant: 'destructive',
    className: 'bg-red-100 text-red-800',
  },
  success: {
    label: '成功',
    variant: 'success',
    className: 'bg-green-100 text-green-800',
  },
  warning: {
    label: '警告',
    variant: 'warning',
    className: 'bg-yellow-100 text-yellow-800',
  },
  info: {
    label: '情報',
    variant: 'info',
    className: 'bg-blue-100 text-blue-800',
  },
} as const;

export type StatusType = keyof typeof statusConfig;
export type StatusVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info';