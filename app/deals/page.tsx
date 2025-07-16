'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  User,
} from 'lucide-react';
import { Deal, DealStatus } from '@/types/collections';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DealStatus | 'all'>('all');
  const [dealTypeFilter, setDealTypeFilter] = useState<'sale' | 'purchase' | 'both' | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);
  const [stats, setStats] = useState<any>(null);

  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(dealTypeFilter !== 'all' && { dealType: dealTypeFilter }),
      });

      const response = await fetch(`/api/deals?${params}`);
      const data = await response.json();

      if (response.ok) {
        setDeals(data.deals);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, dealTypeFilter]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/deals/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching deal stats:', error);
    }
  };

  useEffect(() => {
    fetchDeals();
    fetchStats();
  }, [fetchDeals]);

  const handleDelete = async () => {
    if (!dealToDelete) return;

    try {
      const response = await fetch(`/api/deals/${dealToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchDeals();
        await fetchStats();
        setShowDeleteDialog(false);
        setDealToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting deal:', error);
    }
  };

  const getStatusBadge = (status: DealStatus) => {
    const variants: Record<DealStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      lead: 'outline',
      negotiation: 'secondary',
      quote_sent: 'secondary',
      won: 'default',
      lost: 'destructive',
      on_hold: 'outline',
    };

    const labels: Record<DealStatus, string> = {
      lead: 'リード',
      negotiation: '交渉中',
      quote_sent: '見積送付済',
      won: '成約',
      lost: '失注',
      on_hold: '保留',
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const getDealTypeBadge = (type: 'sale' | 'purchase' | 'both') => {
    const labels = {
      sale: '販売',
      purchase: '仕入',
      both: '販売・仕入',
    };

    const variants = {
      sale: 'default' as const,
      purchase: 'secondary' as const,
      both: 'outline' as const,
    };

    return (
      <Badge variant={variants[type]}>
        {labels[type]}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('ja-JP').format(new Date(date));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">案件管理</h1>
          <p className="text-muted-foreground mt-1">
            販売・仕入案件を一元管理します
          </p>
        </div>
        <Button onClick={() => router.push('/deals/new')}>
          <Plus className="h-4 w-4 mr-2" />
          新規案件
        </Button>
      </div>

      {/* 統計カード */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総案件数</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                進行中: {stats.inProgress}件
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">成約率</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.winRate?.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                成約: {stats.won}件 / 失注: {stats.lost}件
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総売上</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                平均: {formatCurrency(stats.averageDealSize || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">総利益</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                利益率: {((stats.totalProfit / stats.totalValue) * 100 || 0).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="案件名、案件番号で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="lead">リード</SelectItem>
            <SelectItem value="negotiation">交渉中</SelectItem>
            <SelectItem value="quote_sent">見積送付済</SelectItem>
            <SelectItem value="won">成約</SelectItem>
            <SelectItem value="lost">失注</SelectItem>
            <SelectItem value="on_hold">保留</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dealTypeFilter} onValueChange={(value: any) => setDealTypeFilter(value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="案件種別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="sale">販売</SelectItem>
            <SelectItem value="purchase">仕入</SelectItem>
            <SelectItem value="both">販売・仕入</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>案件番号</TableHead>
              <TableHead>案件名</TableHead>
              <TableHead>顧客</TableHead>
              <TableHead>種別</TableHead>
              <TableHead>金額</TableHead>
              <TableHead>利益率</TableHead>
              <TableHead>開始日</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : deals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  案件が見つかりません
                </TableCell>
              </TableRow>
            ) : (
              deals.map((deal) => (
                <TableRow key={deal.id}>
                  <TableCell className="font-medium">{deal.dealNumber}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{deal.dealName}</div>
                      {deal.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {deal.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {deal.customer?.companyName || '-'}
                  </TableCell>
                  <TableCell>
                    {getDealTypeBadge(deal.dealType)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {formatCurrency(deal.actualValue || deal.estimatedValue || 0)}
                      </div>
                      {deal.actualValue && deal.estimatedValue && deal.actualValue !== deal.estimatedValue && (
                        <div className="text-sm text-muted-foreground">
                          予想: {formatCurrency(deal.estimatedValue)}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {deal.profitMargin ? (
                      <div className="flex items-center gap-1">
                        {deal.profitMargin > 0 ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className={deal.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}>
                          {deal.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{formatDate(deal.startDate)}</TableCell>
                  <TableCell>{getStatusBadge(deal.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/deals/${deal.id}`)}
                      >
                        詳細
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/deals/${deal.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDealToDelete(deal);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>案件の削除</DialogTitle>
            <DialogDescription>
              {dealToDelete?.dealName}を削除してもよろしいですか？
              この操作は取り消すことができません。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}