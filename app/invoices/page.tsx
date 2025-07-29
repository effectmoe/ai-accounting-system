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
import { Plus, Search, FileText, Loader2, Sparkles, FileDown, CheckCircle2, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date-utils';

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
  const itemsPerPage = 20;

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, aiOnlyFilter, currentPage]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        skip: ((currentPage - 1) * itemsPerPage).toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (aiOnlyFilter) {
        params.append('isGeneratedByAI', 'true');
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

  const handleSearch = () => {
    // TODO: 検索機能の実装
    logger.debug('Search:', searchQuery);
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* フィルター */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                placeholder="請求書番号、顧客名で検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
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
            <Button
              variant={aiOnlyFilter ? 'default' : 'outline'}
              onClick={() => setAiOnlyFilter(!aiOnlyFilter)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              AI作成のみ
            </Button>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              検索
            </Button>
          </div>
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
                    <TableHead>請求書番号</TableHead>
                    <TableHead>顧客名</TableHead>
                    <TableHead>発行日</TableHead>
                    <TableHead>支払期限</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成方法</TableHead>
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
                        className="font-medium cursor-pointer"
                        onClick={() => router.push(`/invoices/${invoice._id}`)}
                      >
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell
                        className="cursor-pointer"
                        onClick={() => router.push(`/invoices/${invoice._id}`)}
                      >
                        {invoice.customer?.companyName || 
                         invoice.customer?.name || 
                         invoice.customer?.company || 
                         invoice.customerSnapshot?.companyName || 
                         '顧客名未設定'}
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
                              window.open(`/api/invoices/${invoice._id}/pdf`, '_blank');
                            }}
                            title="PDFダウンロード"
                          >
                            <FileDown className="h-4 w-4" />
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
    </div>
  );
}