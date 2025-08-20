'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  FileText, 
  Loader2, 
  Mail, 
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';

interface Receipt {
  _id: string;
  receiptNumber: string;
  invoiceNumber?: string;
  issueDate: string;
  customerName: string;
  totalAmount: number;
  status: 'draft' | 'issued' | 'sent' | 'cancelled';
  emailSentAt?: string;
  emailSentTo?: string[];
}

const RECEIPT_STATUS_LABELS = {
  draft: '下書き',
  issued: '発行済み',
  sent: '送信済み',
  cancelled: 'キャンセル',
};

const RECEIPT_STATUS_COLORS = {
  draft: 'default',
  issued: 'secondary',
  sent: 'success',
  cancelled: 'destructive',
};

export default function ReceiptsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<string>('issueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const itemsPerPage = 20;

  useEffect(() => {
    fetchReceipts();
  }, [statusFilter, currentPage, sortBy, sortOrder]);

  const fetchReceipts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        skip: ((currentPage - 1) * itemsPerPage).toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/receipts?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setReceipts(data.receipts || []);
        setTotalCount(data.total || 0);
      } else {
        logger.error('領収書の取得に失敗:', data.error);
        toast({
          title: 'エラー',
          description: '領収書の取得に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('領収書の取得エラー:', error);
      toast({
        title: 'エラー',
        description: '領収書の取得中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchReceipts();
      return;
    }
    
    // 検索機能の実装（将来的に）
    fetchReceipts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('この領収書を削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/receipts/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: '成功',
          description: '領収書を削除しました',
        });
        fetchReceipts();
      } else {
        const data = await response.json();
        toast({
          title: 'エラー',
          description: data.error || '領収書の削除に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('領収書削除エラー:', error);
      toast({
        title: 'エラー',
        description: '領収書の削除中にエラーが発生しました',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = async (receipt: Receipt) => {
    const email = prompt('送信先メールアドレスを入力してください:');
    if (!email) return;

    try {
      const response = await fetch(`/api/receipts/${receipt._id}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          attachPdf: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: '成功',
          description: `領収書を${email}に送信しました`,
        });
        fetchReceipts();
      } else {
        toast({
          title: 'エラー',
          description: data.error || 'メール送信に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('メール送信エラー:', error);
      toast({
        title: 'エラー',
        description: 'メール送信中にエラーが発生しました',
        variant: 'destructive',
      });
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">領収書管理</h1>
        <Button onClick={() => router.push('/invoices')} variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          請求書から領収書を作成
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>領収書一覧</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="領収書番号、顧客名で検索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">すべて</SelectItem>
                <SelectItem value="draft">下書き</SelectItem>
                <SelectItem value="issued">発行済み</SelectItem>
                <SelectItem value="sent">送信済み</SelectItem>
                <SelectItem value="cancelled">キャンセル</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="mr-2 h-4 w-4" />
              検索
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">領収書がありません</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => {
                        if (sortBy === 'receiptNumber') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('receiptNumber');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      領収書番号
                      {sortBy === 'receiptNumber' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </TableHead>
                    <TableHead>関連請求書</TableHead>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => {
                        if (sortBy === 'issueDate') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('issueDate');
                          setSortOrder('desc');
                        }
                      }}
                    >
                      領収日
                      {sortBy === 'issueDate' && (
                        <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </TableHead>
                    <TableHead>顧客名</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>メール送信</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => (
                    <TableRow key={receipt._id}>
                      <TableCell className="font-medium">
                        {receipt.receiptNumber}
                      </TableCell>
                      <TableCell>
                        {receipt.invoiceNumber || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(receipt.issueDate), 'yyyy年MM月dd日', { locale: ja })}
                      </TableCell>
                      <TableCell>{receipt.customerName}</TableCell>
                      <TableCell className="text-right">
                        ¥{receipt.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={RECEIPT_STATUS_COLORS[receipt.status] as any}>
                          {RECEIPT_STATUS_LABELS[receipt.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {receipt.emailSentAt ? (
                          <span className="text-sm text-gray-500">
                            {format(new Date(receipt.emailSentAt), 'MM/dd HH:mm')}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/receipts/${receipt._id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const printWindow = window.open(`/api/receipts/${receipt._id}/pdf?print=true`, '_blank', 'width=800,height=600');
                              if (printWindow) {
                                printWindow.focus();
                              }
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendEmail(receipt)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(receipt._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    前へ
                  </Button>
                  <span className="py-2 px-4">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(currentPage + 1)}
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