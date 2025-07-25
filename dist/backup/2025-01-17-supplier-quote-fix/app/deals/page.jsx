"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DealsPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const table_1 = require("@/components/ui/table");
const select_1 = require("@/components/ui/select");
const badge_1 = require("@/components/ui/badge");
const card_1 = require("@/components/ui/card");
const lucide_react_1 = require("lucide-react");
const dialog_1 = require("@/components/ui/dialog");
function DealsPage() {
    const router = (0, navigation_1.useRouter)();
    const [deals, setDeals] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [searchTerm, setSearchTerm] = (0, react_1.useState)('');
    const [statusFilter, setStatusFilter] = (0, react_1.useState)('all');
    const [dealTypeFilter, setDealTypeFilter] = (0, react_1.useState)('all');
    const [currentPage, setCurrentPage] = (0, react_1.useState)(1);
    const [totalPages, setTotalPages] = (0, react_1.useState)(1);
    const [showDeleteDialog, setShowDeleteDialog] = (0, react_1.useState)(false);
    const [dealToDelete, setDealToDelete] = (0, react_1.useState)(null);
    const [stats, setStats] = (0, react_1.useState)(null);
    const fetchDeals = (0, react_1.useCallback)(async () => {
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
        }
        catch (error) {
            console.error('Error fetching deals:', error);
        }
        finally {
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
        }
        catch (error) {
            console.error('Error fetching deal stats:', error);
        }
    };
    (0, react_1.useEffect)(() => {
        fetchDeals();
        fetchStats();
    }, [fetchDeals]);
    const handleDelete = async () => {
        if (!dealToDelete)
            return;
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
        }
        catch (error) {
            console.error('Error deleting deal:', error);
        }
    };
    const getStatusBadge = (status) => {
        const variants = {
            lead: 'outline',
            negotiation: 'secondary',
            quote_sent: 'secondary',
            won: 'default',
            lost: 'destructive',
            on_hold: 'outline',
        };
        const labels = {
            lead: 'リード',
            negotiation: '交渉中',
            quote_sent: '見積送付済',
            won: '成約',
            lost: '失注',
            on_hold: '保留',
        };
        return (<badge_1.Badge variant={variants[status]}>
        {labels[status]}
      </badge_1.Badge>);
    };
    const getDealTypeBadge = (type) => {
        const labels = {
            sale: '販売',
            purchase: '仕入',
            both: '販売・仕入',
        };
        const variants = {
            sale: 'default',
            purchase: 'secondary',
            both: 'outline',
        };
        return (<badge_1.Badge variant={variants[type]}>
        {labels[type]}
      </badge_1.Badge>);
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ja-JP', {
            style: 'currency',
            currency: 'JPY',
        }).format(amount);
    };
    const formatDate = (date) => {
        return new Intl.DateTimeFormat('ja-JP').format(new Date(date));
    };
    return (<div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">案件管理</h1>
          <p className="text-muted-foreground mt-1">
            販売・仕入案件を一元管理します
          </p>
        </div>
        <button_1.Button onClick={() => router.push('/deals/new')}>
          <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
          新規案件
        </button_1.Button>
      </div>

      {/* 統計カード */}
      {stats && (<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <card_1.Card>
            <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <card_1.CardTitle className="text-sm font-medium">総案件数</card_1.CardTitle>
              <lucide_react_1.Briefcase className="h-4 w-4 text-muted-foreground"/>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                進行中: {stats.inProgress}件
              </p>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <card_1.CardTitle className="text-sm font-medium">成約率</card_1.CardTitle>
              <lucide_react_1.TrendingUp className="h-4 w-4 text-muted-foreground"/>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">{stats.winRate?.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                成約: {stats.won}件 / 失注: {stats.lost}件
              </p>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <card_1.CardTitle className="text-sm font-medium">総売上</card_1.CardTitle>
              <lucide_react_1.DollarSign className="h-4 w-4 text-muted-foreground"/>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalValue || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                平均: {formatCurrency(stats.averageDealSize || 0)}
              </p>
            </card_1.CardContent>
          </card_1.Card>

          <card_1.Card>
            <card_1.CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <card_1.CardTitle className="text-sm font-medium">総利益</card_1.CardTitle>
              <lucide_react_1.TrendingUp className="h-4 w-4 text-muted-foreground"/>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalProfit || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                利益率: {((stats.totalProfit / stats.totalValue) * 100 || 0).toFixed(1)}%
              </p>
            </card_1.CardContent>
          </card_1.Card>
        </div>)}

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <lucide_react_1.Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <input_1.Input type="text" placeholder="案件名、案件番号で検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
        </div>
        <select_1.Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
          <select_1.SelectTrigger className="w-[180px]">
            <select_1.SelectValue placeholder="ステータス"/>
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="all">すべて</select_1.SelectItem>
            <select_1.SelectItem value="lead">リード</select_1.SelectItem>
            <select_1.SelectItem value="negotiation">交渉中</select_1.SelectItem>
            <select_1.SelectItem value="quote_sent">見積送付済</select_1.SelectItem>
            <select_1.SelectItem value="won">成約</select_1.SelectItem>
            <select_1.SelectItem value="lost">失注</select_1.SelectItem>
            <select_1.SelectItem value="on_hold">保留</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
        <select_1.Select value={dealTypeFilter} onValueChange={(value) => setDealTypeFilter(value)}>
          <select_1.SelectTrigger className="w-[150px]">
            <select_1.SelectValue placeholder="案件種別"/>
          </select_1.SelectTrigger>
          <select_1.SelectContent>
            <select_1.SelectItem value="all">すべて</select_1.SelectItem>
            <select_1.SelectItem value="sale">販売</select_1.SelectItem>
            <select_1.SelectItem value="purchase">仕入</select_1.SelectItem>
            <select_1.SelectItem value="both">販売・仕入</select_1.SelectItem>
          </select_1.SelectContent>
        </select_1.Select>
      </div>

      <div className="border rounded-lg">
        <table_1.Table>
          <table_1.TableHeader>
            <table_1.TableRow>
              <table_1.TableHead>案件番号</table_1.TableHead>
              <table_1.TableHead>案件名</table_1.TableHead>
              <table_1.TableHead>顧客</table_1.TableHead>
              <table_1.TableHead>種別</table_1.TableHead>
              <table_1.TableHead>金額</table_1.TableHead>
              <table_1.TableHead>利益率</table_1.TableHead>
              <table_1.TableHead>開始日</table_1.TableHead>
              <table_1.TableHead>ステータス</table_1.TableHead>
              <table_1.TableHead className="text-right">アクション</table_1.TableHead>
            </table_1.TableRow>
          </table_1.TableHeader>
          <table_1.TableBody>
            {loading ? (<table_1.TableRow>
                <table_1.TableCell colSpan={9} className="text-center py-8">
                  読み込み中...
                </table_1.TableCell>
              </table_1.TableRow>) : deals.length === 0 ? (<table_1.TableRow>
                <table_1.TableCell colSpan={9} className="text-center py-8">
                  案件が見つかりません
                </table_1.TableCell>
              </table_1.TableRow>) : (deals.map((deal) => (<table_1.TableRow key={deal.id}>
                  <table_1.TableCell className="font-medium">{deal.dealNumber}</table_1.TableCell>
                  <table_1.TableCell>
                    <div>
                      <div className="font-medium">{deal.dealName}</div>
                      {deal.description && (<div className="text-sm text-muted-foreground truncate max-w-xs">
                          {deal.description}
                        </div>)}
                    </div>
                  </table_1.TableCell>
                  <table_1.TableCell>
                    {deal.customer?.companyName || '-'}
                  </table_1.TableCell>
                  <table_1.TableCell>
                    {getDealTypeBadge(deal.dealType)}
                  </table_1.TableCell>
                  <table_1.TableCell>
                    <div>
                      <div className="font-medium">
                        {formatCurrency(deal.actualValue || deal.estimatedValue || 0)}
                      </div>
                      {deal.actualValue && deal.estimatedValue && deal.actualValue !== deal.estimatedValue && (<div className="text-sm text-muted-foreground">
                          予想: {formatCurrency(deal.estimatedValue)}
                        </div>)}
                    </div>
                  </table_1.TableCell>
                  <table_1.TableCell>
                    {deal.profitMargin ? (<div className="flex items-center gap-1">
                        {deal.profitMargin > 0 ? (<lucide_react_1.TrendingUp className="h-3 w-3 text-green-600"/>) : (<lucide_react_1.TrendingDown className="h-3 w-3 text-red-600"/>)}
                        <span className={deal.profitMargin > 0 ? 'text-green-600' : 'text-red-600'}>
                          {deal.profitMargin.toFixed(1)}%
                        </span>
                      </div>) : ('-')}
                  </table_1.TableCell>
                  <table_1.TableCell>{formatDate(deal.startDate)}</table_1.TableCell>
                  <table_1.TableCell>{getStatusBadge(deal.status)}</table_1.TableCell>
                  <table_1.TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button_1.Button variant="ghost" size="sm" onClick={() => router.push(`/deals/${deal.id}`)}>
                        詳細
                      </button_1.Button>
                      <button_1.Button variant="ghost" size="sm" onClick={() => router.push(`/deals/${deal.id}/edit`)}>
                        <lucide_react_1.Edit className="h-4 w-4"/>
                      </button_1.Button>
                      <button_1.Button variant="ghost" size="sm" onClick={() => {
                setDealToDelete(deal);
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

      {/* 削除確認ダイアログ */}
      <dialog_1.Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <dialog_1.DialogContent>
          <dialog_1.DialogHeader>
            <dialog_1.DialogTitle>案件の削除</dialog_1.DialogTitle>
            <dialog_1.DialogDescription>
              {dealToDelete?.dealName}を削除してもよろしいですか？
              この操作は取り消すことができません。
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
