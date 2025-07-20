'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
import { 
  Plus, 
  Search, 
  FileText, 
  Calendar,
  Building2,
  Loader2,
  AlertCircle,
  Eye,
  Edit,
  Package,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { DeliveryNote, DeliveryNoteStatus } from '@/types/collections';
import { safeFormatDate } from '@/lib/date-utils';

const statusLabels: Record<DeliveryNoteStatus, string> = {
  draft: '下書き',
  saved: '保存済み',
  delivered: '納品済み',
  received: '受領済み',
  cancelled: 'キャンセル',
};

const statusColors: Record<DeliveryNoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  saved: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  received: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusIcons: Record<DeliveryNoteStatus, any> = {
  draft: FileText,
  saved: Clock,
  delivered: Package,
  received: CheckCircle,
  cancelled: XCircle,
};

export default function DeliveryNotesPage() {
  const router = useRouter();
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const itemsPerPage = 10;

  useEffect(() => {
    fetchDeliveryNotes();
  }, [currentPage, statusFilter]);

  const fetchDeliveryNotes = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/delivery-notes?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch delivery notes');
      }

      const data = await response.json();
      setDeliveryNotes(data.deliveryNotes);
      setTotalPages(data.pagination.totalPages);
      setTotalCount(data.pagination.total);
    } catch (error) {
      logger.error('Error fetching delivery notes:', error);
      setError('納品書の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchDeliveryNotes();
  };

  const filteredDeliveryNotes = deliveryNotes.filter(deliveryNote => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      deliveryNote.deliveryNoteNumber?.toLowerCase().includes(term) ||
      deliveryNote.customer?.companyName?.toLowerCase().includes(term) ||
      deliveryNote.customerSnapshot?.companyName?.toLowerCase().includes(term)
    );
  });

  const getStatusIcon = (status: DeliveryNoteStatus) => {
    const IconComponent = statusIcons[status];
    return <IconComponent className="h-4 w-4" />;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }

    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">
          {totalCount}件中 {Math.min((currentPage - 1) * itemsPerPage + 1, totalCount)}-{Math.min(currentPage * itemsPerPage, totalCount)}件を表示
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            前へ
          </Button>
          {pages}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            次へ
          </Button>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">納品書管理</h1>
          <p className="text-gray-600 mt-2">納品書の作成・管理・送信を行います</p>
        </div>
        <Button onClick={() => router.push('/delivery-notes/create')}>
          <Plus className="mr-2 h-4 w-4" />
          新規作成
        </Button>
      </div>

      {/* フィルター・検索エリア */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="納品書番号、顧客名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="saved">保存済み</SelectItem>
                  <SelectItem value="delivered">納品済み</SelectItem>
                  <SelectItem value="received">受領済み</SelectItem>
                  <SelectItem value="cancelled">キャンセル</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              検索
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 納品書一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            納品書一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredDeliveryNotes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">納品書がありません</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>納品書番号</TableHead>
                      <TableHead>顧客名</TableHead>
                      <TableHead>発行日</TableHead>
                      <TableHead>納品日</TableHead>
                      <TableHead>金額</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeliveryNotes.map((deliveryNote) => (
                      <TableRow 
                        key={deliveryNote._id?.toString()} 
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/delivery-notes/${deliveryNote._id}`)}
                      >
                        <TableCell className="font-medium">
                          {deliveryNote.deliveryNoteNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Building2 className="mr-2 h-4 w-4 text-gray-400" />
                            {deliveryNote.customer?.companyName || deliveryNote.customerSnapshot?.companyName || '顧客情報なし'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="mr-2 h-4 w-4 text-gray-400" />
                            {safeFormatDate(deliveryNote.issueDate, 'yyyy/MM/dd')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Package className="mr-2 h-4 w-4 text-gray-400" />
                            {safeFormatDate(deliveryNote.deliveryDate, 'yyyy/MM/dd')}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          ¥{(deliveryNote.totalAmount || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[deliveryNote.status]} border-0`}>
                            <span className="flex items-center">
                              {getStatusIcon(deliveryNote.status)}
                              <span className="ml-1">{statusLabels[deliveryNote.status]}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/delivery-notes/${deliveryNote._id}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {deliveryNote.status !== 'received' && deliveryNote.status !== 'cancelled' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/delivery-notes/${deliveryNote._id}/edit`);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {renderPagination()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}