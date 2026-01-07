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
import { Plus, Search, FileText, Loader2, Receipt as ReceiptIcon, FileDown, CheckCircle2, Trash2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date-utils';

import { logger } from '@/lib/logger';

// 領収書ステータスのマッピング
const RECEIPT_STATUS_LABELS = {
  draft: '下書き',
  issued: '発行済み',
  sent: '送信済み',
  cancelled: 'キャンセル'
} as const;

const RECEIPT_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
} as const;

interface Receipt {
  _id: string;
  receiptNumber: string;
  title?: string;
  issueDate: string;
  paidDate?: string;
  customerName: string;
  customer?: {
    companyName?: string;
    name?: string;
  };
  totalAmount: number;
  status: keyof typeof RECEIPT_STATUS_LABELS;
  invoiceNumber?: string;
  invoiceId?: string;
}

export default function ReceiptsPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('');
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  useEffect(() => {
    fetchReceipts();
  }, [currentPage, searchTerm, statusFilter, customerFilter]);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        skip: ((currentPage - 1) * itemsPerPage).toString(),
        sortBy: 'issueDate',
        sortOrder: 'desc',
      });

      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);

      const response = await fetch(`/api/receipts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch receipts');
      }

      const data = await response.json();
      setReceipts(data.receipts || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      logger.error('Error fetching receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (receiptId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // 領収書リストを更新
        setReceipts(prev =>
          prev.map(receipt =>
            receipt._id === receiptId
              ? { ...receipt, status: newStatus as keyof typeof RECEIPT_STATUS_LABELS }
              : receipt
          )
        );
        logger.info(`Receipt ${receiptId} status changed to ${newStatus}`);
      } else {
        logger.error('Failed to update receipt status');
      }
    } catch (error) {
      logger.error('Error updating receipt status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(receipts.map(receipt => receipt._id));
      setSelectedReceipts(allIds);
    } else {
      setSelectedReceipts(new Set());
    }
  };

  const handleSelectReceipt = (receiptId: string, checked: boolean) => {
    const newSelection = new Set(selectedReceipts);
    if (checked) {
      newSelection.add(receiptId);
    } else {
      newSelection.delete(receiptId);
    }
    setSelectedReceipts(newSelection);
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedReceipts.size === 0) return;

    setIsUpdating(true);
    try {
      const promises = Array.from(selectedReceipts).map(receiptId =>
        fetch(`/api/receipts/${receiptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: bulkStatus }),
        })
      );

      await Promise.all(promises);

      // 一覧を再取得
      await fetchReceipts();

      // 選択をクリア
      setSelectedReceipts(new Set());
      setBulkStatus('');
    } catch (error) {
      logger.error('Error in bulk status update:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: keyof typeof RECEIPT_STATUS_LABELS) => {
    return (
      <Badge className={`${RECEIPT_STATUS_COLORS[status]} border-0`}>
        {RECEIPT_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const handleDelete = async (receiptId: string) => {
    if (!confirm('この領収書を削除してもよろしいですか？この操作は取り消せません。')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete receipt');
      }

      // 領収書リストから削除
      setReceipts(prev => prev.filter(receipt => receipt._id !== receiptId));
      // 総数を減らす
      setTotalCount(prev => prev - 1);

      logger.info(`Receipt ${receiptId} deleted successfully`);
    } catch (error) {
      logger.error('Error deleting receipt:', error);
      alert('領収書の削除に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = !searchTerm ||
      receipt.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (receipt.invoiceNumber && receipt.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCustomer = !customerFilter ||
      receipt.customerName.toLowerCase().includes(customerFilter.toLowerCase());

    return matchesSearch && matchesCustomer;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">領収書管理</h1>
          <p className="text-muted-foreground">
            発行済み領収書の管理とステータス追跡
          </p>
        </div>
        <Button
          onClick={() => router.push('/receipts/new')}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          新しい領収書
        </Button>
      </div>

      {/* フィルターバー */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="領収書番号、顧客名、請求書番号で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全て</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="issued">発行済み</SelectItem>
                <SelectItem value="sent">送信済み</SelectItem>
                <SelectItem value="cancelled">キャンセル</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1">
              <Input
                placeholder="顧客名で絞り込み"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 一括操作 */}
      {selectedReceipts.size > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedReceipts.size}件選択中
              </span>

              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ステータス変更" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="issued">発行済み</SelectItem>
                  <SelectItem value="sent">送信済み</SelectItem>
                  <SelectItem value="cancelled">キャンセル</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleBulkStatusChange}
                disabled={!bulkStatus || isUpdating}
                size="sm"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '一括更新'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総領収書数</CardTitle>
            <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">発行済み</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {receipts.filter(r => r.status === 'issued').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">送信済み</CardTitle>
            <FileDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {receipts.filter(r => r.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総金額</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 領収書一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5" />
            領収書一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              領収書が見つかりません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedReceipts.size === filteredReceipts.length && filteredReceipts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>領収書番号</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead>請求書番号</TableHead>
                  <TableHead>発行日</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedReceipts.has(receipt._id)}
                        onCheckedChange={(checked) =>
                          handleSelectReceipt(receipt._id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell
                      className="font-medium"
                      onClick={() => router.push(`/receipts/${receipt._id}`)}
                    >
                      {receipt.receiptNumber}
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      {receipt.customerName}
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      {receipt.invoiceNumber && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 font-normal"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (receipt.invoiceId) {
                              router.push(`/invoices/${receipt.invoiceId}`);
                            }
                          }}
                        >
                          {receipt.invoiceNumber}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      {safeFormatDate(receipt.issueDate, 'yyyy/MM/dd', ja)}
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      ¥{receipt.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      <Select
                        value={receipt.status}
                        onValueChange={(value) => handleStatusChange(receipt._id, value)}
                      >
                        <SelectTrigger
                          className="w-28 h-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getStatusBadge(receipt.status)}
                        </SelectTrigger>
                        <SelectContent onClick={(e) => e.stopPropagation()}>
                          <SelectItem value="draft">下書き</SelectItem>
                          <SelectItem value="issued">発行済み</SelectItem>
                          <SelectItem value="sent">送信済み</SelectItem>
                          <SelectItem value="cancelled">キャンセル</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/receipts/${receipt._id}/edit`)}
                        >
                          編集
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(receipt._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                {totalCount}件中 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)}件を表示
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <div className="text-sm">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}