"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SupplierDetailPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const badge_1 = require("@/components/ui/badge");
const tabs_1 = require("@/components/ui/tabs");
const lucide_react_1 = require("lucide-react");
function SupplierDetailPage() {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const supplierId = params.id;
    const [supplier, setSupplier] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [stats, setStats] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        const fetchSupplier = async () => {
            try {
                const response = await fetch(`/api/suppliers/${supplierId}`);
                if (response.ok) {
                    const data = await response.json();
                    setSupplier(data);
                }
                else {
                    console.error('Failed to fetch supplier');
                }
            }
            catch (error) {
                console.error('Error fetching supplier:', error);
            }
            finally {
                setLoading(false);
            }
        };
        const fetchStats = async () => {
            try {
                const response = await fetch(`/api/suppliers/${supplierId}/stats`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            }
            catch (error) {
                console.error('Error fetching stats:', error);
            }
        };
        if (supplierId) {
            fetchSupplier();
            fetchStats();
        }
    }, [supplierId]);
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
    if (loading) {
        return (<div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>);
    }
    if (!supplier) {
        return (<div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">仕入先が見つかりません</h1>
          <button_1.Button onClick={() => router.push('/suppliers')}>
            <lucide_react_1.ArrowLeft className="h-4 w-4 mr-2"/>
            仕入先一覧に戻る
          </button_1.Button>
        </div>
      </div>);
    }
    return (<div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button_1.Button variant="ghost" size="icon" onClick={() => router.push('/suppliers')}>
            <lucide_react_1.ArrowLeft className="h-4 w-4"/>
          </button_1.Button>
          <div>
            <h1 className="text-3xl font-bold">{supplier.companyName}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">
                仕入先コード: {supplier.supplierCode}
              </span>
              {getStatusBadge(supplier.status)}
            </div>
          </div>
        </div>
        <button_1.Button onClick={() => router.push(`/suppliers/${supplierId}/edit`)}>
          <lucide_react_1.Edit className="h-4 w-4 mr-2"/>
          編集
        </button_1.Button>
      </div>

      <tabs_1.Tabs defaultValue="info" className="space-y-4">
        <tabs_1.TabsList>
          <tabs_1.TabsTrigger value="info">基本情報</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="stats">取引統計</tabs_1.TabsTrigger>
          <tabs_1.TabsTrigger value="products">取扱商品</tabs_1.TabsTrigger>
        </tabs_1.TabsList>

        <tabs_1.TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="flex items-center gap-2">
                  <lucide_react_1.Building2 className="h-5 w-5"/>
                  会社情報
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">会社名</label>
                  <p className="text-lg">{supplier.companyName}</p>
                </div>
                {supplier.companyNameKana && (<div>
                    <label className="text-sm font-medium text-muted-foreground">会社名（カナ）</label>
                    <p>{supplier.companyNameKana}</p>
                  </div>)}
                {supplier.department && (<div>
                    <label className="text-sm font-medium text-muted-foreground">部署</label>
                    <p>{supplier.department}</p>
                  </div>)}
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="flex items-center gap-2">
                  <lucide_react_1.MapPin className="h-5 w-5"/>
                  住所
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-2">
                  {supplier.postalCode && (<p className="text-sm text-muted-foreground">
                      〒{supplier.postalCode}
                    </p>)}
                  <p>
                    {supplier.prefecture}
                    {supplier.city}
                    {supplier.address1}
                    {supplier.address2}
                  </p>
                </div>
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="flex items-center gap-2">
                  <lucide_react_1.Phone className="h-5 w-5"/>
                  連絡先
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-4">
                {supplier.phone && (<div className="flex items-center gap-2">
                    <lucide_react_1.Phone className="h-4 w-4 text-muted-foreground"/>
                    <span>{supplier.phone}</span>
                  </div>)}
                {supplier.fax && (<div className="flex items-center gap-2">
                    <lucide_react_1.FileText className="h-4 w-4 text-muted-foreground"/>
                    <span>FAX: {supplier.fax}</span>
                  </div>)}
                {supplier.email && (<div className="flex items-center gap-2">
                    <lucide_react_1.Mail className="h-4 w-4 text-muted-foreground"/>
                    <span>{supplier.email}</span>
                  </div>)}
                {supplier.website && (<div className="flex items-center gap-2">
                    <lucide_react_1.Globe className="h-4 w-4 text-muted-foreground"/>
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {supplier.website}
                    </a>
                  </div>)}
              </card_1.CardContent>
            </card_1.Card>

            <card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle className="flex items-center gap-2">
                  <lucide_react_1.CreditCard className="h-5 w-5"/>
                  取引条件
                </card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">支払条件</label>
                  <p>{supplier.paymentTerms}日</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">支払方法</label>
                  <p>{supplier.paymentMethod}</p>
                </div>
                {supplier.creditLimit && (<div>
                    <label className="text-sm font-medium text-muted-foreground">与信限度額</label>
                    <p>{formatCurrency(supplier.creditLimit)}</p>
                  </div>)}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">現在の買掛金残高</label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(supplier.currentBalance || 0)}
                  </p>
                </div>
              </card_1.CardContent>
            </card_1.Card>
          </div>

          {supplier.contacts && supplier.contacts.length > 0 && (<card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>担当者情報</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-4">
                  {supplier.contacts.map((contact, index) => (<div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">氏名</label>
                          <p>{contact.name}</p>
                        </div>
                        {contact.title && (<div>
                            <label className="text-sm font-medium text-muted-foreground">役職</label>
                            <p>{contact.title}</p>
                          </div>)}
                        {contact.phone && (<div>
                            <label className="text-sm font-medium text-muted-foreground">電話番号</label>
                            <p>{contact.phone}</p>
                          </div>)}
                        {contact.email && (<div>
                            <label className="text-sm font-medium text-muted-foreground">メール</label>
                            <p>{contact.email}</p>
                          </div>)}
                      </div>
                    </div>))}
                </div>
              </card_1.CardContent>
            </card_1.Card>)}

          {supplier.notes && (<card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>備考</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <p className="whitespace-pre-wrap">{supplier.notes}</p>
              </card_1.CardContent>
            </card_1.Card>)}
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="stats" className="space-y-4">
          {stats && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <card_1.Card>
                <card_1.CardHeader>
                  <card_1.CardTitle className="flex items-center gap-2">
                    <lucide_react_1.TrendingUp className="h-5 w-5"/>
                    発注統計
                  </card_1.CardTitle>
                </card_1.CardHeader>
                <card_1.CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">総発注数</label>
                    <p className="text-2xl font-bold">{stats.purchaseOrders.totalOrders}件</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">総発注額</label>
                    <p className="text-xl font-semibold">
                      {formatCurrency(stats.purchaseOrders.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">完了件数</label>
                    <p>{stats.purchaseOrders.completedOrders}件</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">未完了発注額</label>
                    <p className="text-lg font-semibold">
                      {formatCurrency(stats.purchaseOrders.pendingAmount)}
                    </p>
                  </div>
                </card_1.CardContent>
              </card_1.Card>
            </div>)}
        </tabs_1.TabsContent>

        <tabs_1.TabsContent value="products" className="space-y-4">
          {stats?.topProducts && stats.topProducts.length > 0 ? (<card_1.Card>
              <card_1.CardHeader>
                <card_1.CardTitle>主要取扱商品</card_1.CardTitle>
              </card_1.CardHeader>
              <card_1.CardContent>
                <div className="space-y-4">
                  {stats.topProducts.map((product, index) => (<div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">商品名</label>
                          <p className="font-medium">{product.productName}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">総数量</label>
                          <p>{product.totalQuantity}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">平均単価</label>
                          <p>{formatCurrency(product.averagePrice)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">総額</label>
                          <p className="font-semibold">{formatCurrency(product.totalAmount)}</p>
                        </div>
                      </div>
                    </div>))}
                </div>
              </card_1.CardContent>
            </card_1.Card>) : (<card_1.Card>
              <card_1.CardContent className="text-center py-8">
                <p className="text-muted-foreground">取扱商品のデータがありません</p>
              </card_1.CardContent>
            </card_1.Card>)}
        </tabs_1.TabsContent>
      </tabs_1.Tabs>
    </div>);
}
