"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SuppliersPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const table_1 = require("@/components/ui/table");
const select_1 = require("@/components/ui/select");
const badge_1 = require("@/components/ui/badge");
const lucide_react_1 = require("lucide-react");
const dialog_1 = require("@/components/ui/dialog");
const tabs_1 = require("@/components/ui/tabs");
function SuppliersPage() {
    const router = (0, navigation_1.useRouter)();
    const [suppliers, setSuppliers] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
    const [totalPages, setTotalPages] = (0, react_1.useState)(1);
    const [selectedSupplier, setSelectedSupplier] = (0, react_1.useState)(null);
    const [showDeleteDialog, setShowDeleteDialog] = (0, react_1.useState)(false);
    const [supplierToDelete, setSupplierToDelete] = (0, react_1.useState)(null);
    const [stats, setStats] = (0, react_1.useState)(null);
    const fetchSuppliers = (0, react_1.useCallback)(async () => {
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
        }
        catch (error) {
            console.error('Error fetching suppliers:', error);
        }
        finally {
            setLoading(false);
        }
    }, [currentPage, searchTerm, statusFilter]);
    const fetchSupplierStats = async (supplierId) => {
        try {
            const response = await fetch(`/api/suppliers/${supplierId}/stats`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        }
        catch (error) {
            console.error('Error fetching supplier stats:', error);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);
    const handleDelete = async () => {
        if (!supplierToDelete)
            return;
        try {
            const response = await fetch(`/api/suppliers/${supplierToDelete.id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                await fetchSuppliers();
                setShowDeleteDialog(false);
                setSupplierToDelete(null);
            }
        }
        catch (error) {
            console.error('Error deleting supplier:', error);
        }
    };
    const getStatusBadge = (status) => {
        const variants = {
            active: 'default',
            inactive: 'secondary',
            suspended: 'destructive',
        };
        const labels = {
            active: 'アクティブ',
            inactive: '非アクティブ',
            suspended: '停止中',
        };
        return (<badge_1.Badge variant={variants[status]}>
        {labels[status]}
      </badge_1.Badge>);
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(amount);
    };
    return (<div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">仕入先管理</h1>
          <p className="text-muted-foreground mt-1">
            仕入先の情報を管理します
          </p>
        </div>
        <button_1.Button onClick={() => router.push('/suppliers/new')}>
          <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
          新規仕入先
        </button_1.Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <input_1.Input type="text" placeholder="会社名、コード、メールアドレスで検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
        </div>
        <select_1.Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
          <select_1.SelectTrigger className="w-[180px]">
            <select_1.SelectValue placeholder="ステータス"/>
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="all">すべて</select_1.SelectItem>
            <select_1.SelectItem value="active">アクティブ</select_1.SelectItem>
            <select_1.SelectItem value="inactive">非アクティブ</select_1.SelectItem>
            <select_1.SelectItem value="suspended">停止中</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
      </div>

      <div className="border rounded-lg">
        <table_1.Table>
          <table_1.TableHeader>
            <table_1.TableRow>
              <table_1.TableHead>仕入先コード</table_1.TableHead>
              <table_1.TableHead>会社名</table_1.TableHead>
              <table_1.TableHead>連絡先</table_1.TableHead>
              <table_1.TableHead>支払条件</table_1.TableHead>
              <table_1.TableHead>買掛金残高</table_1.TableHead>
              <table_1.TableHead>ステータス</table_1.TableHead>
              <table_1.TableHead className="text-right">アクション</table_1.TableHead>
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {loading ? (<table_1.TableRow>
                <table_1.TableCell colSpan={7} className="text-center py-8">
                  読み込み中...
                </table_1.TableCell>
              </table_1.TableRow>) : suppliers.length === 0 ? (<table_1.TableRow>
                <table_1.TableCell colSpan={7} className="text-center py-8">
                  仕入先が見つかりません
                </table_1.TableCell>
              </table_1.TableRow>) : (suppliers.map((supplier) => (<table_1.TableRow key={supplier.id}>
                  <table_1.TableCell className="font-medium">{supplier.supplierCode}</table_1.TableCell>
                  <table_1.TableCell>
                    <div>
                      <div className="font-medium">{supplier.companyName}</div>
                      {supplier.companyNameKana && (<div className="text-sm text-muted-foreground">
                          {supplier.companyNameKana}
                        </div>)}
                    </div>
                  </table_1.TableCell>
                  <table_1.TableCell>
                    <div className="space-y-1">
                      {supplier.email && (<div className="flex items-center gap-1 text-sm">
                          <lucide_react_1.Mail className="h-3 w-3"/>
                          {supplier.email}
                        </div>)}
                      {supplier.phone && (<div className="flex items-center gap-1 text-sm">
                          <lucide_react_1.Phone className="h-3 w-3"/>
                          {supplier.phone}
                        </div>)}
                    </div>
                  </table_1.TableCell>
                  <table_1.TableCell>
                    {supplier.paymentTerms ? `${supplier.paymentTerms}日` : '-'}
                  </table_1.TableCell>
                  <table_1.TableCell>
                    {formatCurrency(supplier.currentBalance || 0)}
                  </table_1.TableCell>
                  <table_1.TableCell>{getStatusBadge(supplier.status)}</table_1.TableCell>
                  <table_1.TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button_1.Button variant="ghost" size="sm" onClick={() => {
                setSelectedSupplier(supplier);
                fetchSupplierStats(supplier.id);
            }}>
                        <lucide_react_1.FileText className="h-4 w-4"/>
                      </button_1.Button>
                      <button_1.Button variant="ghost" size="sm" onClick={() => router.push(`/suppliers/${supplier.id}/edit`)}>
                        <lucide_react_1.Edit className="h-4 w-4"/>
                      </button_1.Button>
                      <button_1.Button variant="ghost" size="sm" onClick={() => {
                setSupplierToDelete(supplier);
                setShowDeleteDialog(true);
            }}>
                        <lucide_react_1.Trash2 className="h-4 w-4"/>
                      </button_1.Button>
                    </div>
                  </table_1.TableCell>
                </table_1.TableRow>)))}
          </table_1.TableBody>
        </table_1.Table>
      </div>

      {totalPages > 1 && (<div className="flex justify-center items-center gap-2">
          <button_1.Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
            <lucide_react_1.ChevronLeft className="h-4 w-4"/>
          </button_1.Button>
          <span className="text-sm">
            {currentPage} / {totalPages}
          </span>
          <button_1.Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
            <lucide_react_1.ChevronRight className="h-4 w-4"/>
          </button_1.Button>
        </div>)}

      {/* 詳細ダイアログ */}
      <dialog_1.Dialog open={!!selectedSupplier} onOpenChange={() => setSelectedSupplier(null)}>
        <dialog_1.DialogContent className="max-w-3xl">
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>{selectedSupplier?.companyName}</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              仕入先コード: {selectedSupplier?.supplierCode}
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          
          <tabs_1.Tabs defaultValue="info" className="mt-4">
            <tabs_1.TabsList>
              <tabs_1.TabsTrigger value="info">基本情報</tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="stats">取引統計</tabs_1.TabsTrigger>
              <tabs_1.TabsTrigger value="products">取扱商品</tabs_1.TabsTrigger>
            </tabs_1.TabsList>
            
            <tabs_1.TabsContent value="info" className="space-y-4">
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
            </tabs_1.TabsContent>
            
            <tabs_1.TabsContent value="stats" className="space-y-4">
              {stats && (<>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <lucide_react_1.Building2 className="h-4 w-4"/>
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
                        <lucide_react_1.TrendingUp className="h-4 w-4"/>
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
                </>)}
            </tabs_1.TabsContent>
            
            <tabs_1.TabsContent value="products" className="space-y-4">
              {stats?.topProducts && stats.topProducts.length > 0 ? (<table_1.Table>
                  <table_1.TableHeader>
                    <table_1.TableRow>
                      <table_1.TableHead>商品名</table_1.TableHead>
                      <table_1.TableHead>総数量</table_1.TableHead>
                      <table_1.TableHead>平均単価</table_1.TableHead>
                      <table_1.TableHead>総額</table_1.TableHead>
                    </table_1.TableRow>
                  </table_1.TableHeader>
                  <table_1.TableBody>
                    {stats.topProducts.map((product) => (<table_1.TableRow key={product._id}>
                        <table_1.TableCell>{product.productName}</table_1.TableCell>
                        <table_1.TableCell>{product.totalQuantity}</table_1.TableCell>
                        <table_1.TableCell>{formatCurrency(product.averagePrice)}</table_1.TableCell>
                        <table_1.TableCell>{formatCurrency(product.totalAmount)}</table_1.TableCell>
                      </table_1.TableRow>))}
                  </table_1.TableBody>
                </table_1.Table>) : (<p className="text-center text-muted-foreground py-8">
                  取扱商品のデータがありません
                </p>)}
            </tabs_1.TabsContent>
          </tabs_1.Tabs>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>

      {/* 削除確認ダイアログ */}
      <dialog_1.Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>仕入先の削除</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              {supplierToDelete?.companyName}を削除してもよろしいですか？
              関連する発注書がある場合は、非アクティブ化されます。
            </dialog_1.DialogDescription>
          </dialog_1.DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button_1.Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              キャンセル
            </button_1.Button>
            <button_1.Button variant="destructive" onClick={handleDelete}>
              削除
            </button_1.Button>
          </div>
        </dialog_1.DialogContent>
      </dialog_1.Dialog>
    </div>);
}
