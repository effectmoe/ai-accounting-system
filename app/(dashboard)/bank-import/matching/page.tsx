'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  TrendingUp,
  Calendar,
  DollarSign,
  Link2,
  RefreshCw,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface ImportedTransaction {
  _id: string;
  date: string;
  content: string;
  amount: number;
  type: 'deposit' | 'withdrawal';
  customerName?: string;
  referenceNumber?: string;
  isConfirmed: boolean;
  matchedInvoiceId?: string;
  matchConfidence?: 'high' | 'medium' | 'low' | 'none';
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  title?: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  customerSnapshot?: {
    companyName?: string;
    contactName?: string;
  };
  dueDate?: string;
  issueDate?: string;
}

export default function ManualMatchingPage() {
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<ImportedTransaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('deposit');
  const [confirmedFilter, setConfirmedFilter] = useState<string>('false');

  // 取引を取得
  const fetchTransactions = useCallback(async () => {
    setIsLoadingTransactions(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        type: typeFilter,
        isConfirmed: confirmedFilter,
      });

      const response = await fetch(`/api/bank-import/transactions?${params}`);
      const data = await response.json();

      if (data.success) {
        setTransactions(data.items);
      }
    } catch (error) {
      logger.error('Failed to fetch transactions', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [typeFilter, confirmedFilter]);

  // 請求書を検索
  const searchInvoices = async (query: string) => {
    if (!query) {
      setInvoices([]);
      return;
    }

    setIsLoadingInvoices(true);
    try {
      const params = new URLSearchParams({
        search: query,
        status: 'sent,partial',
        limit: '10',
      });

      const response = await fetch(`/api/invoices?${params}`);
      const data = await response.json();

      if (data.invoices) {
        setInvoices(data.invoices);
      }
    } catch (error) {
      logger.error('Failed to search invoices', error);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  // マッチングを実行
  const handleMatch = async (invoiceId: string) => {
    if (!selectedTransaction) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/bank-import/transactions/${selectedTransaction._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchedInvoiceId: invoiceId,
          matchConfidence: 'high',
          matchReason: '手動マッチング',
          confirm: true,
        }),
      });

      if (response.ok) {
        setIsMatchDialogOpen(false);
        setSelectedTransaction(null);
        setSearchQuery('');
        setInvoices([]);
        fetchTransactions();
      }
    } catch (error) {
      logger.error('Failed to match transaction', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // マッチなしで確認
  const handleConfirmWithoutMatch = async (transactionId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/bank-import/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchConfidence: 'none',
          matchReason: 'マッチなしで確認',
          confirm: true,
        }),
      });

      if (response.ok) {
        fetchTransactions();
      }
    } catch (error) {
      logger.error('Failed to confirm transaction', error);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchInvoices(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const openMatchDialog = (transaction: ImportedTransaction) => {
    setSelectedTransaction(transaction);
    setSearchQuery(transaction.customerName || transaction.content.slice(0, 20));
    setIsMatchDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/bank-import">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              インポートに戻る
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Link2 className="h-8 w-8" />
          手動マッチング
        </h1>
        <p className="text-gray-600 mt-2">
          インポートした入金取引と請求書を手動でマッチングします
        </p>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">種別:</span>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">入金</SelectItem>
                  <SelectItem value="withdrawal">出金</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">確認状況:</span>
              <Select value={confirmedFilter} onValueChange={setConfirmedFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">未確認</SelectItem>
                  <SelectItem value="true">確認済み</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCw className="h-4 w-4 mr-1" />
              更新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 取引一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>取引一覧</CardTitle>
          <CardDescription>
            {confirmedFilter === 'false' ? '未確認の' : '確認済みの'}
            {typeFilter === 'deposit' ? '入金' : '出金'}取引
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              取引がありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>取引内容</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>マッチング</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction._id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {format(new Date(transaction.date), 'yyyy/MM/dd', { locale: ja })}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={transaction.content}>
                      {transaction.content}
                    </TableCell>
                    <TableCell>
                      {transaction.customerName || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <div className="flex items-center justify-end gap-1">
                        <TrendingUp className="h-4 w-4" />
                        ¥{transaction.amount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.matchedInvoiceId ? (
                        <Badge className="bg-green-100 text-green-800">マッチ済み</Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">未マッチ</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {!transaction.isConfirmed && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openMatchDialog(transaction)}
                            >
                              <Link2 className="h-4 w-4 mr-1" />
                              マッチング
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleConfirmWithoutMatch(transaction._id)}
                              disabled={isProcessing}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              確認
                            </Button>
                          </>
                        )}
                        {transaction.isConfirmed && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* マッチングダイアログ */}
      <Dialog open={isMatchDialogOpen} onOpenChange={setIsMatchDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>請求書とマッチング</DialogTitle>
            <DialogDescription>
              取引に対応する請求書を検索して選択してください
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-gray-600 mb-1">選択中の取引</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedTransaction.content}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(selectedTransaction.date), 'yyyy/MM/dd', { locale: ja })}
                  </p>
                </div>
                <p className="text-xl font-bold text-green-600">
                  ¥{selectedTransaction.amount.toLocaleString()}
                </p>
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="請求書番号、顧客名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {isLoadingInvoices ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? '請求書が見つかりません' : '請求書を検索してください'}
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleMatch(invoice._id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{invoice.invoiceNumber}</span>
                          <Badge variant="outline" className="text-xs">
                            {invoice.status === 'sent' ? '未入金' : '一部入金'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {invoice.customerSnapshot?.companyName || invoice.customerSnapshot?.contactName}
                        </p>
                        {invoice.title && (
                          <p className="text-sm text-gray-500">{invoice.title}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">¥{invoice.totalAmount.toLocaleString()}</p>
                        {invoice.remainingAmount !== invoice.totalAmount && (
                          <p className="text-sm text-orange-600">
                            残額: ¥{invoice.remainingAmount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsMatchDialogOpen(false);
                setSelectedTransaction(null);
                setSearchQuery('');
                setInvoices([]);
              }}
            >
              キャンセル
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
