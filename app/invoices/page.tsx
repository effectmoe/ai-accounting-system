'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, FileText, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  customerSnapshot: {
    companyName: string;
  };
  totalAmount: number;
  status: string;
  paidAmount: number;
  isGeneratedByAI?: boolean;
}

const statusLabels: Record<string, string> = {
  draft: '下書き',
  sent: '送信済み',
  viewed: '開封済み',
  paid: '支払済み',
  partially_paid: '一部支払済み',
  overdue: '期限超過',
  cancelled: 'キャンセル',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [aiOnlyFilter, setAiOnlyFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
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
      console.error('Error fetching invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    // TODO: 検索機能の実装
    console.log('Search:', searchQuery);
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={`${statusColors[status] || 'bg-gray-100 text-gray-800'} border-0`}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">請求書一覧</h1>
        <Button onClick={() => router.push('/invoices/new')}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

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
                    <TableHead>請求書番号</TableHead>
                    <TableHead>顧客名</TableHead>
                    <TableHead>請求日</TableHead>
                    <TableHead>支払期限</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>作成方法</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow
                      key={invoice._id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/invoices/${invoice._id}`)}
                    >
                      <TableCell className="font-medium">
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell>{invoice.customerSnapshot.companyName}</TableCell>
                      <TableCell>
                        {format(new Date(invoice.invoiceDate), 'yyyy/MM/dd', { locale: ja })}
                      </TableCell>
                      <TableCell>
                        {format(new Date(invoice.dueDate), 'yyyy/MM/dd', { locale: ja })}
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{invoice.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>
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
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/api/invoices/${invoice._id}/pdf`, '_blank');
                          }}
                        >
                          PDF
                        </Button>
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