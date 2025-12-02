'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  History,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Eye,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Landmark,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { logger } from '@/lib/logger';

interface ImportHistory {
  _id: string;
  importId: string;
  fileName: string;
  fileSize: number;
  fileType: 'csv' | 'ofx';
  bankType?: string;
  bankName?: string;
  totalCount: number;
  depositCount: number;
  withdrawalCount: number;
  totalDepositAmount: number;
  totalWithdrawalAmount: number;
  matchedCount: number;
  highConfidenceCount: number;
  autoConfirmedCount: number;
  duplicateCount: number;
  newTransactionCount: number;
  status: 'processing' | 'completed' | 'failed' | 'partial';
  errors: string[];
  createdAt: string;
}

export default function BankImportHistoryPage() {
  const [histories, setHistories] = useState<ImportHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const limit = 10;

  const fetchHistories = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((currentPage - 1) * limit).toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/bank-import/history?${params}`);
      const data = await response.json();

      if (data.success) {
        setHistories(data.items);
        setTotal(data.total);
      }
    } catch (error) {
      logger.error('Failed to fetch import history', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistories();
  }, [currentPage, statusFilter]);

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      completed: {
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <CheckCircle2 className="h-3 w-3" />,
        label: '完了',
      },
      processing: {
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <Clock className="h-3 w-3" />,
        label: '処理中',
      },
      failed: {
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <AlertCircle className="h-3 w-3" />,
        label: '失敗',
      },
      partial: {
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <AlertCircle className="h-3 w-3" />,
        label: '一部完了',
      },
    };

    const config = configs[status] || configs.failed;
    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const totalPages = Math.ceil(total / limit);

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
          <History className="h-8 w-8" />
          インポート履歴
        </h1>
        <p className="text-gray-600 mt-2">
          銀行取引ファイルのインポート履歴を確認できます
        </p>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">ステータス:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="すべて" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="completed">完了</SelectItem>
                  <SelectItem value="processing">処理中</SelectItem>
                  <SelectItem value="partial">一部完了</SelectItem>
                  <SelectItem value="failed">失敗</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={fetchHistories}>
              <RefreshCw className="h-4 w-4 mr-1" />
              更新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 履歴一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>履歴一覧</CardTitle>
          <CardDescription>
            全 {total} 件のインポート履歴
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : histories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              インポート履歴がありません
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日時</TableHead>
                    <TableHead>ファイル名</TableHead>
                    <TableHead>形式</TableHead>
                    <TableHead>銀行</TableHead>
                    <TableHead className="text-center">取引件数</TableHead>
                    <TableHead className="text-center">入金</TableHead>
                    <TableHead className="text-center">出金</TableHead>
                    <TableHead className="text-center">重複</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {histories.map((history) => (
                    <TableRow key={history._id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(history.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={history.fileName}>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4 text-gray-400" />
                          {history.fileName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {history.fileType?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {history.bankName ? (
                          <div className="flex items-center gap-1">
                            <Landmark className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{history.bankName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {history.totalCount}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600">
                          <TrendingUp className="h-4 w-4" />
                          {history.depositCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-red-600">
                          <TrendingDown className="h-4 w-4" />
                          {history.withdrawalCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {history.duplicateCount > 0 ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                            {history.duplicateCount}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(history.status)}
                      </TableCell>
                      <TableCell>
                        <Link href={`/bank-import/history/${history.importId}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-gray-600">
                    {((currentPage - 1) * limit) + 1} - {Math.min(currentPage * limit, total)} / {total} 件
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      前へ
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      次へ
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
