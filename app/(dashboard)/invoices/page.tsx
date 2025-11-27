'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, FileText, Loader2, Sparkles, FileDown, CheckCircle2, Trash2, Copy, Coins, Calendar, X } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { safeFormatDate } from '@/lib/date-utils';
import { PaymentRecordDialog } from '@/components/payment-record-dialog';

import { logger } from '@/lib/logger';
import { 
  INVOICE_STATUS_LABELS, 
  INVOICE_STATUS_COLORS, 
  mapEnglishToJapaneseStatus, 
  getStatusColor 
} from '@/lib/status-mapping';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  title?: string;
  invoiceDate: string;
  issueDate?: string;
  dueDate: string;
  customer?: {
    companyName?: string;
    name?: string;
    company?: string;
  };
  customerSnapshot?: {
    companyName?: string;
  };
  totalAmount: number;
  status: string;
  paidAmount: number;
  isGeneratedByAI?: boolean;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aiOnlyFilter, setAiOnlyFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [paymentDialogInvoice, setPaymentDialogInvoice] = useState<Invoice | null>(null);
  const [sortBy, setSortBy] = useState<string>('invoiceDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [datePreset, setDatePreset] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const itemsPerPage = 20;

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setCurrentPage(1); // 検索時はページを1に戻す
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // フィルター変更時もページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, aiOnlyFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, aiOnlyFilter, currentPage, sortBy, sortOrder, dateFrom, dateTo, debouncedSearchQuery]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      // フロントエンドのソートフィールドをバックエンドのフィールド名にマッピング
      const sortFieldMap: Record<string, string> = {
        'invoiceNumber': 'invoiceNumber',
        'invoiceDate': 'issueDate',  // バックエンドではissueDateフィールド
        'dueDate': 'dueDate',
        'totalAmount': 'totalAmount',
        'status': 'status',
        'isGeneratedByAI': 'isGeneratedByAI'
      };
      
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        skip: ((currentPage - 1) * itemsPerPage).toString(),
        sortBy: sortFieldMap[sortBy] || sortBy,
        sortOrder: sortOrder,
      });

      if (debouncedSearchQuery) {
        params.append('search', debouncedSearchQuery);
      }
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (aiOnlyFilter) {
        params.append('isGeneratedByAI', 'true');
      }
      if (dateFrom) {
        params.append('dateFrom', dateFrom);
      }
      if (dateTo) {
        params.append('dateTo', dateTo);
      }

      const response = await fetch(`/api/invoices?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setInvoices(data.invoices || []);
        setTotalCount(data.total || 0);
      }
    } catch (error) {
      logger.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();

    switch (preset) {
      case 'today':
        const todayStr = format(today, 'yyyy-MM-dd');
        setDateFrom(todayStr);
        setDateTo(todayStr);
        break;
      case 'last7days':
        setDateFrom(format(subDays(today, 7), 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'last30days':
        setDateFrom(format(subDays(today, 30), 'yyyy-MM-dd'));
        setDateTo(format(today, 'yyyy-MM-dd'));
        break;
      case 'thisMonth':
        setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        setDateFrom(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setDateTo(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        break;
      case 'thisYear':
        setDateFrom(format(startOfYear(today), 'yyyy-MM-dd'));
        setDateTo(format(endOfYear(today), 'yyyy-MM-dd'));
        break;
      case 'custom':
        // カスタムの場合は何もしない（ユーザーが手動入力）
        break;
      case 'all':
      default:
        setDateFrom('');
        setDateTo('');
        break;
    }
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setDatePreset('');
    setCurrentPage(1);
  };

  const getDateFilterLabel = () => {
    if (!dateFrom && !dateTo) return '発行日で絞り込み';
    if (datePreset && datePreset !== 'custom') {
      const presetLabels: Record<string, string> = {
        'today': '今日',
        'last7days': '過去7日',
        'last30days': '過去30日',
        'thisMonth': '今月',
        'lastMonth': '先月',
        'thisYear': '今年',
      };
      return presetLabels[datePreset] || '発行日で絞り込み';
    }
    if (dateFrom && dateTo) {
      return `${format(new Date(dateFrom), 'M/d', { locale: ja })} - ${format(new Date(dateTo), 'M/d', { locale: ja })}`;
    }
    if (dateFrom) return `${format(new Date(dateFrom), 'M/d', { locale: ja })} 以降`;
    if (dateTo) return `${format(new Date(dateTo), 'M/d', { locale: ja })} まで`;
    return '発行日で絞り込み';
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // ソート変更時は最初のページに戻る
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return null;
    }
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const handleStatusChange = async (invoiceId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (response.ok) {
        // 更新された請求書で一覧を更新
        const updatedInvoice = await response.json();
        setInvoices(prev => 
          prev.map(inv => inv._id === invoiceId ? { ...inv, status: newStatus } : inv)
        );
        
        // 「送信済み」に変更した場合は総収益に計上するための追加処理
        if (newStatus === 'sent' && updatedInvoice.totalAmount) {
          // アクティビティログに記録（APIサーバー側で処理されるが、UIにも反映）
          logger.info(`Invoice ${invoiceId} status changed to sent`);
        }
      } else {
        logger.error('Failed to update invoice status');
      }
    } catch (error) {
      logger.error('Error updating invoice status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(invoices.map(inv => inv._id));
      setSelectedInvoices(allIds);
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSelection = new Set(selectedInvoices);
    if (checked) {
      newSelection.add(invoiceId);
    } else {
      newSelection.delete(invoiceId);
    }
    setSelectedInvoices(newSelection);
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedInvoices.size === 0) return;
    
    setIsUpdating(true);
    try {
      const promises = Array.from(selectedInvoices).map(invoiceId =>
        fetch(`/api/invoices/${invoiceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: bulkStatus }),
        })
      );
      
      await Promise.all(promises);
      
      // 一覧を再取得
      await fetchInvoices();
      
      // 選択をクリア
      setSelectedInvoices(new Set());
      setBulkStatus('');
    } catch (error) {
      logger.error('Error in bulk status update:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={`${getStatusColor(status)} border-0`}>
        {mapEnglishToJapaneseStatus(status)}
      </Badge>
    );
  };

  const handleDelete = async (invoiceId: string) => {
    if (!confirm('この請求書を削除してもよろしいですか？この操作は取り消せません。')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete invoice');
      }
      
      // 請求書リストから削除
      setInvoices(prev => prev.filter(inv => inv._id !== invoiceId));
      // 総数を減らす
      setTotalCount(prev => prev - 1);
      
      logger.info(`Invoice ${invoiceId} deleted successfully`);
    } catch (error) {
      logger.error('Error deleting invoice:', error);
      alert('請求書の削除に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDuplicate = async (invoiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('この請求書を複製しますか？')) {
      return;
    }

    setIsUpdating(true);
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/duplicate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        // リストを再読み込み
        await fetchInvoices();
        alert('請求書を複製しました');
        // 複製された請求書の編集ページに遷移
        router.push(`/invoices/${data._id}/edit`);
      } else {
        throw new Error(data.error || '複製に失敗しました');
      }
    } catch (error) {
      logger.error('Error duplicating invoice:', error);
      alert('請求書の複製に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedInvoices.size === 0) return;
    
    if (!confirm(`選択した${selectedInvoices.size}件の請求書を削除してもよろしいですか？この操作は取り消せません。`)) {
      return;
    }

    setIsUpdating(true);
    try {
      const promises = Array.from(selectedInvoices).map(invoiceId =>
        fetch(`/api/invoices/${invoiceId}`, {
          method: 'DELETE',
        })
      );
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.ok).length;
      
      if (successCount > 0) {
        // 成功した削除を反映
        setInvoices(prev => prev.filter(inv => !selectedInvoices.has(inv._id)));
        setTotalCount(prev => prev - successCount);
        setSelectedInvoices(new Set());
        
        if (successCount === selectedInvoices.size) {
          logger.info(`All ${successCount} invoices deleted successfully`);
        } else {
          logger.warn(`${successCount} out of ${selectedInvoices.size} invoices deleted successfully`);
          alert(`${successCount}件の請求書を削除しました。${selectedInvoices.size - successCount}件の削除に失敗しました。`);
        }
      } else {
        throw new Error('Failed to delete any invoices');
      }
    } catch (error) {
      logger.error('Error in bulk delete:', error);
      alert('請求書の一括削除に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">請求書一覧</h1>
      </div>

      {/* 請求書作成オプション */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-purple-50/50 hover:shadow-lg transition-all cursor-pointer"
              onClick={() => router.push('/invoices/new?mode=ai')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Sparkles className="h-5 w-5" />
              AIアシスタントで作成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              会話形式で簡単に請求書を作成できます。
              顧客名、金額、内容を伝えるだけ。
            </p>
            <div className="flex items-center text-blue-600">
              <span className="text-sm font-medium">始める</span>
              <Plus className="ml-1 h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => router.push('/invoices/new?mode=manual')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <FileText className="h-5 w-5" />
              手動で作成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-3">
              フォームに直接入力して請求書を作成します。
              詳細な設定が可能です。
            </p>
            <div className="flex items-center text-gray-600">
              <span className="text-sm font-medium">フォームを開く</span>
              <Plus className="ml-1 h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 一括操作バー */}
      {selectedInvoices.size > 0 && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium">
                  {selectedInvoices.size}件の請求書を選択中
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="ステータスを選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">下書き</SelectItem>
                    <SelectItem value="sent">送信済み</SelectItem>
                    <SelectItem value="unpaid">未払い</SelectItem>
                    <SelectItem value="paid">支払済み</SelectItem>
                    <SelectItem value="overdue">期限超過</SelectItem>
                    <SelectItem value="cancelled">キャンセル</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleBulkStatusChange}
                  disabled={!bulkStatus || isUpdating}
                  size="sm"
                >
                  {isUpdating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 更新中...</>
                  ) : (
                    '一括変更'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedInvoices(new Set())}
                >
                  選択解除
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 削除中...</>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      一括削除
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* フィルター */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="請求書番号、顧客名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="請求書検索"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="sent">送信済み</SelectItem>
                <SelectItem value="viewed">開封済み</SelectItem>
                <SelectItem value="unpaid">未払い</SelectItem>
                <SelectItem value="paid">支払済み</SelectItem>
                <SelectItem value="partially_paid">一部支払済み</SelectItem>
                <SelectItem value="overdue">期限超過</SelectItem>
                <SelectItem value="cancelled">キャンセル</SelectItem>
              </SelectContent>
            </Select>

            {/* 日付フィルター */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={dateFrom || dateTo ? 'default' : 'outline'}
                  className="w-[180px] justify-start"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {getDateFilterLabel()}
                  {(dateFrom || dateTo) && (
                    <X
                      className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        clearDateFilter();
                      }}
                    />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                  <div className="font-medium text-sm">発行日で絞り込み</div>

                  {/* プリセット選択 */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant={datePreset === 'today' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDatePresetChange('today')}
                    >
                      今日
                    </Button>
                    <Button
                      variant={datePreset === 'last7days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDatePresetChange('last7days')}
                    >
                      過去7日
                    </Button>
                    <Button
                      variant={datePreset === 'last30days' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDatePresetChange('last30days')}
                    >
                      過去30日
                    </Button>
                    <Button
                      variant={datePreset === 'thisMonth' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDatePresetChange('thisMonth')}
                    >
                      今月
                    </Button>
                    <Button
                      variant={datePreset === 'lastMonth' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDatePresetChange('lastMonth')}
                    >
                      先月
                    </Button>
                    <Button
                      variant={datePreset === 'thisYear' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDatePresetChange('thisYear')}
                    >
                      今年
                    </Button>
                  </div>

                  <div className="border-t pt-4">
                    <div className="font-medium text-sm mb-2">カスタム期間</div>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.target.value);
                          setDatePreset('custom');
                        }}
                        className="flex-1"
                      />
                      <span className="text-gray-500">〜</span>
                      <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.target.value);
                          setDatePreset('custom');
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearDateFilter}
                    >
                      クリア
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant={aiOnlyFilter ? 'default' : 'outline'}
              onClick={() => setAiOnlyFilter(!aiOnlyFilter)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI作成のみ
            </Button>
          </div>

          {/* アクティブフィルター表示 */}
          {(statusFilter !== 'all' || dateFrom || dateTo || aiOnlyFilter) && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-gray-500">フィルター:</span>
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  ステータス: {
                    {
                      'draft': '下書き',
                      'sent': '送信済み',
                      'viewed': '開封済み',
                      'unpaid': '未払い',
                      'paid': '支払済み',
                      'partially_paid': '一部支払済み',
                      'overdue': '期限超過',
                      'cancelled': 'キャンセル'
                    }[statusFilter]
                  }
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setStatusFilter('all')}
                  />
                </Badge>
              )}
              {(dateFrom || dateTo) && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  期間: {getDateFilterLabel()}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={clearDateFilter}
                  />
                </Badge>
              )}
              {aiOnlyFilter && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  AI作成のみ
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setAiOnlyFilter(false)}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setStatusFilter('all');
                  clearDateFilter();
                  setAiOnlyFilter(false);
                }}
              >
                すべてクリア
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 請求書リスト */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">請求書がありません</p>
              <Button
                className="mt-4"
                onClick={() => router.push('/invoices/new')}
              >
                最初の請求書を作成
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedInvoices.size === invoices.length && invoices.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="すべて選択"
                      />
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 select-none" 
                      onClick={() => handleSort('invoiceNumber')}
                    >
                      <div className="flex items-center">
                        請求書情報
                        <span className="ml-1 text-xs">{getSortIcon('invoiceNumber')}</span>
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 select-none" 
                      onClick={() => handleSort('title')}
                    >
                      <div className="flex items-center">
                        タイトル
                        <span className="ml-1 text-xs">{getSortIcon('title')}</span>
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 select-none" 
                      onClick={() => handleSort('invoiceDate')}
                    >
                      <div className="flex items-center">
                        発行日
                        <span className="ml-1 text-xs">{getSortIcon('invoiceDate')}</span>
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 select-none" 
                      onClick={() => handleSort('dueDate')}
                    >
                      <div className="flex items-center">
                        支払期限
                        <span className="ml-1 text-xs">{getSortIcon('dueDate')}</span>
                      </div>
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer hover:bg-gray-100 select-none" 
                      onClick={() => handleSort('totalAmount')}
                    >
                      <div className="flex items-center justify-end">
                        金額
                        <span className="ml-1 text-xs">{getSortIcon('totalAmount')}</span>
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 select-none" 
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center">
                        ステータス
                        <span className="ml-1 text-xs">{getSortIcon('status')}</span>
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-100 select-none" 
                      onClick={() => handleSort('isGeneratedByAI')}
                    >
                      <div className="flex items-center">
                        作成方法
                        <span className="ml-1 text-xs">{getSortIcon('isGeneratedByAI')}</span>
                      </div>
                    </TableHead>
                    <TableHead>アクション</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices
                    .filter(invoice => invoice && invoice._id)
                    .map((invoice) => (
                    <TableRow
                      key={invoice._id}
                      className="hover:bg-gray-50"
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedInvoices.has(invoice._id)}
                          onCheckedChange={(checked) => 
                            handleSelectInvoice(invoice._id, checked as boolean)
                          }
                          aria-label={`${invoice.invoiceNumber}を選択`}
                        />
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => router.push(`/invoices/${invoice._id}`)}
                      >
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {invoice.invoiceNumber}
                          </div>
                          <div className="text-sm text-gray-600">
                            {invoice.customer?.companyName || 
                             invoice.customer?.name || 
                             invoice.customer?.company || 
                             invoice.customerSnapshot?.companyName || 
                             '顧客名未設定'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => router.push(`/invoices/${invoice._id}`)}
                      >
                        <div className="text-sm text-gray-700 truncate max-w-[250px]">
                          {invoice.title || '-'}
                        </div>
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => router.push(`/invoices/${invoice._id}`)}
                      >
                        {safeFormatDate(invoice.issueDate || invoice.invoiceDate)}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => router.push(`/invoices/${invoice._id}`)}
                      >
                        {safeFormatDate(invoice.dueDate)}
                      </TableCell>
                      <TableCell 
                        className="text-right cursor-pointer"
                        onClick={() => router.push(`/invoices/${invoice._id}`)}
                      >
                        ¥{(invoice.totalAmount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={invoice.status}
                          onValueChange={(value) => handleStatusChange(invoice._id, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                                下書き
                              </div>
                            </SelectItem>
                            <SelectItem value="sent">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
                                送信済み
                              </div>
                            </SelectItem>
                            <SelectItem value="unpaid">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-orange-400 mr-2" />
                                未払い
                              </div>
                            </SelectItem>
                            <SelectItem value="paid">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                                支払済み
                              </div>
                            </SelectItem>
                            <SelectItem value="partially_paid">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2" />
                                一部支払済み
                              </div>
                            </SelectItem>
                            <SelectItem value="overdue">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-red-400 mr-2" />
                                期限超過
                              </div>
                            </SelectItem>
                            <SelectItem value="cancelled">
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
                                キャンセル
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => router.push(`/invoices/${invoice._id}`)}
                      >
                        {invoice.isGeneratedByAI ? (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-0">
                            <Sparkles className="mr-1 h-3 w-3" />
                            AI
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="border-0">
                            手動
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentDialogInvoice(invoice);
                            }}
                            title="入金記録"
                            className={invoice.status === 'paid' ? 'text-green-600' : ''}
                          >
                            <Coins className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/api/invoices/${invoice._id}/pdf`, '_blank');
                            }}
                            title="PDFダウンロード"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDuplicate(invoice._id, e)}
                            title="複製"
                            disabled={isUpdating}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(invoice._id);
                            }}
                            title="削除"
                            className="hover:bg-red-50 hover:text-red-600"
                            disabled={isUpdating}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 p-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    前へ
                  </Button>
                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    次へ
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 入金記録ダイアログ */}
      {paymentDialogInvoice && (
        <PaymentRecordDialog
          isOpen={!!paymentDialogInvoice}
          onClose={() => setPaymentDialogInvoice(null)}
          invoice={paymentDialogInvoice}
          onSuccess={() => {
            setPaymentDialogInvoice(null);
            fetchInvoices(); // 請求書リストを再読み込み
          }}
        />
      )}
    </div>
  );
}