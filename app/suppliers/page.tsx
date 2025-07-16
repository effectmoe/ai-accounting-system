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
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { Supplier, SupplierStatus } from '@/types/collections';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [stats, setStats] = useState<any>(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/suppliers?${params}`);
      const data = await response.json();

      if (response.ok) {
        setSuppliers(data.suppliers);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  const fetchSupplierStats = async (supplierId: string) => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching supplier stats:', error);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleDelete = async () => {
    if (!supplierToDelete) return;

    try {
      const response = await fetch(`/api/suppliers/${supplierToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchSuppliers();
        setShowDeleteDialog(false);
        setSupplierToDelete(null);
      }
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const getStatusBadge = (status: SupplierStatus) => {
    const variants: Record<SupplierStatus, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive',
    };

    const labels: Record<SupplierStatus, string> = {
      active: 'アクティブ',
      inactive: '非アクティブ',
      suspended: '停止中',
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">仕入先管理</h1>
          <p className="text-muted-foreground mt-1">
            仕入先の情報を管理します
          </p>
        </div>
        <Button onClick={() => router.push('/suppliers/new')}>
          <Plus className="h-4 w-4 mr-2" />
          新規仕入先
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="会社名、コード、メールアドレスで検索..."
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
            <SelectItem value="active">アクティブ</SelectItem>
            <SelectItem value="inactive">非アクティブ</SelectItem>
            <SelectItem value="suspended">停止中</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>仕入先コード</TableHead>
              <TableHead>会社名</TableHead>
              <TableHead>連絡先</TableHead>
              <TableHead>支払条件</TableHead>
              <TableHead>買掛金残高</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  読み込み中...
                </TableCell>
              </TableRow>
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  仕入先が見つかりません
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.supplierCode}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{supplier.companyName}</div>
                      {supplier.companyNameKana && (
                        <div className="text-sm text-muted-foreground">
                          {supplier.companyNameKana}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {supplier.email && (
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3" />
                          {supplier.email}
                        </div>
                      )}
                      {supplier.phone && (
                        <div className="flex items-center gap-1 text-sm">
                          <Phone className="h-3 w-3" />
                          {supplier.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {supplier.paymentTerms ? `${supplier.paymentTerms}日` : '-'}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(supplier.currentBalance || 0)}
                  </TableCell>
                  <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          fetchSupplierStats(supplier.id!);
                        }}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSupplierToDelete(supplier);
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

      {/* 詳細ダイアログ */}
      <Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedSupplier?.companyName}</DialogTitle>
            <DialogDescription>
              仕入先コード: {selectedSupplier?.supplierCode}
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="info" className="mt-4">
            <TabsList>
              <TabsTrigger value="info">基本情報</TabsTrigger>
              <TabsTrigger value="stats">取引統計</TabsTrigger>
              <TabsTrigger value="products">取扱商品</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">連絡先情報</h3>
                  <dl className="space-y-1 text-sm">
                    <div>
                      <dt className="inline-block w-20 text-muted-foreground">電話:</dt>
                      <dd className="inline">{selectedSupplier?.phone || '-'}</dd>
                    </div>
                    <div>
                      <dt className="inline-block w-20 text-muted-foreground">FAX:</dt>
                      <dd className="inline">{selectedSupplier?.fax || '-'}</dd>
                    </div>
                    <div>
                      <dt className="inline-block w-20 text-muted-foreground">メール:</dt>
                      <dd className="inline">{selectedSupplier?.email || '-'}</dd>
                    </div>
                  </dl>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">住所</h3>
                  <p className="text-sm">
                    〒{selectedSupplier?.postalCode || ''}
                    <br />
                    {selectedSupplier?.prefecture}{selectedSupplier?.city}
                    {selectedSupplier?.address1}
                    {selectedSupplier?.address2}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">取引条件</h3>
                <dl className="space-y-1 text-sm">
                  <div>
                    <dt className="inline-block w-32 text-muted-foreground">支払条件:</dt>
                    <dd className="inline">
                      {selectedSupplier?.paymentTerms ? `${selectedSupplier.paymentTerms}日` : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline-block w-32 text-muted-foreground">与信限度額:</dt>
                    <dd className="inline">
                      {selectedSupplier?.creditLimit ? formatCurrency(selectedSupplier.creditLimit) : '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline-block w-32 text-muted-foreground">評価スコア:</dt>
                    <dd className="inline">
                      {selectedSupplier?.evaluationScore ? `${selectedSupplier.evaluationScore}/5` : '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </TabsContent>
            
            <TabsContent value="stats" className="space-y-4">
              {stats && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        発注統計
                      </h3>
                      <dl className="space-y-1 text-sm">
                        <div>
                          <dt className="text-muted-foreground">総発注数:</dt>
                          <dd className="text-2xl font-bold">{stats.purchaseOrders.totalOrders}件</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">総発注額:</dt>
                          <dd className="text-xl font-semibold">
                            {formatCurrency(stats.purchaseOrders.totalAmount)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        未払金額
                      </h3>
                      <dl className="space-y-1 text-sm">
                        <div>
                          <dt className="text-muted-foreground">現在の買掛金:</dt>
                          <dd className="text-2xl font-bold">
                            {formatCurrency(selectedSupplier?.currentBalance || 0)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">未完了発注:</dt>
                          <dd className="text-xl font-semibold">
                            {formatCurrency(stats.purchaseOrders.pendingAmount)}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
            
            <TabsContent value="products" className="space-y-4">
              {stats?.topProducts && stats.topProducts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>商品名</TableHead>
                      <TableHead>総数量</TableHead>
                      <TableHead>平均単価</TableHead>
                      <TableHead>総額</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topProducts.map((product: any) => (
                      <TableRow key={product._id}>
                        <TableCell>{product.productName}</TableCell>
                        <TableCell>{product.totalQuantity}</TableCell>
                        <TableCell>{formatCurrency(product.averagePrice)}</TableCell>
                        <TableCell>{formatCurrency(product.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  取扱商品のデータがありません
                </p>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>仕入先の削除</DialogTitle>
            <DialogDescription>
              {supplierToDelete?.companyName}を削除してもよろしいですか？
              関連する発注書がある場合は、非アクティブ化されます。
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