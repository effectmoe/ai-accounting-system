'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Calendar,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface ImportedTransaction {
  _id: string;
  transactionHash: string;
  date: string;
  content: string;
  amount: number;
  balance?: number;
  type: 'deposit' | 'withdrawal';
  customerName?: string;
  referenceNumber?: string;
  isConfirmed: boolean;
  matchConfidence?: 'high' | 'medium' | 'low' | 'none';
  createdAt: string;
}

export default function ImportHistoryDetailPage({
  params,
}: {
  params: Promise<{ importId: string }>;
}) {
  const resolvedParams = use(params);
  const { importId } = resolvedParams;

  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/bank-import/history/${importId}`);
        const data = await response.json();

        if (data.success) {
          setTransactions(data.transactions);
          setTotal(data.total);
        }
      } catch (error) {
        logger.error('Failed to fetch transactions', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [importId]);

  const getTypeBadge = (type: string) => {
    if (type === 'deposit') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 border">
          <TrendingUp className="h-3 w-3 mr-1" />
          入金
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 border">
        <TrendingDown className="h-3 w-3 mr-1" />
        出金
      </Badge>
    );
  };

  const getConfidenceBadge = (confidence?: string) => {
    if (!confidence || confidence === 'none') return null;

    const configs: Record<string, { color: string; label: string }> = {
      high: { color: 'bg-green-100 text-green-800', label: '高' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: '中' },
      low: { color: 'bg-orange-100 text-orange-800', label: '低' },
    };

    const config = configs[confidence];
    if (!config) return null;

    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // 統計を計算
  const stats = {
    totalCount: transactions.length,
    depositCount: transactions.filter((t) => t.type === 'deposit').length,
    withdrawalCount: transactions.filter((t) => t.type === 'withdrawal').length,
    totalDeposit: transactions
      .filter((t) => t.type === 'deposit')
      .reduce((sum, t) => sum + t.amount, 0),
    totalWithdrawal: transactions
      .filter((t) => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0),
    confirmedCount: transactions.filter((t) => t.isConfirmed).length,
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link href="/bank-import/history">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              履歴一覧に戻る
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">インポート詳細</h1>
        <p className="text-gray-600 mt-2">
          インポートID: {importId}
        </p>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">取引件数</span>
              <FileText className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">入金</span>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-green-600">
              {stats.depositCount}
            </p>
            <p className="text-sm text-gray-600">
              ¥{stats.totalDeposit.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">出金</span>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-red-600">
              {stats.withdrawalCount}
            </p>
            <p className="text-sm text-gray-600">
              ¥{stats.totalWithdrawal.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">確認済み</span>
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-2 text-blue-600">
              {stats.confirmedCount}
            </p>
            <p className="text-sm text-gray-600">
              / {stats.totalCount} 件
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 取引一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>取引一覧</CardTitle>
          <CardDescription>
            このインポートに含まれる全 {total} 件の取引
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              取引データがありません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日付</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>取引内容</TableHead>
                  <TableHead>顧客名</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead className="text-right">残高</TableHead>
                  <TableHead>マッチング</TableHead>
                  <TableHead>確認</TableHead>
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
                    <TableCell>
                      {getTypeBadge(transaction.type)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={transaction.content}>
                      {transaction.content}
                    </TableCell>
                    <TableCell className="text-sm">
                      {transaction.customerName || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="h-4 w-4" />
                        {transaction.type === 'deposit' ? '+' : '-'}
                        ¥{Math.abs(transaction.amount).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      {transaction.balance !== undefined
                        ? `¥${transaction.balance.toLocaleString()}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(transaction.matchConfidence) || (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {transaction.isConfirmed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-gray-300" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
