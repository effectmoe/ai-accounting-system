'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Edit,
  CreditCard,
  Calendar,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { Supplier, SupplierStatus } from '@/types/collections';

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params.id as string;
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/suppliers/${supplierId}`);
        if (response.ok) {
          const data = await response.json();
          setSupplier(data);
        } else {
          console.error('Failed to fetch supplier');
        }
      } catch (error) {
        console.error('Error fetching supplier:', error);
      } finally {
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
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    if (supplierId) {
      fetchSupplier();
      fetchStats();
    }
  }, [supplierId]);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">仕入先が見つかりません</h1>
          <Button onClick={() => router.push('/suppliers')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            仕入先一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/suppliers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
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
        <Button onClick={() => router.push(`/suppliers/${supplierId}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          編集
        </Button>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">基本情報</TabsTrigger>
          <TabsTrigger value="stats">取引統計</TabsTrigger>
          <TabsTrigger value="products">取扱商品</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  会社情報
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">会社名</label>
                  <p className="text-lg">{supplier.companyName}</p>
                </div>
                {supplier.companyNameKana && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">会社名（カナ）</label>
                    <p>{supplier.companyNameKana}</p>
                  </div>
                )}
                {supplier.department && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">部署</label>
                    <p>{supplier.department}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  住所
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {supplier.postalCode && (
                    <p className="text-sm text-muted-foreground">
                      〒{supplier.postalCode}
                    </p>
                  )}
                  {(supplier.prefecture || supplier.city || supplier.address1 || supplier.address2 || (supplier as any).address) ? (
                    <div>
                      {/* addressフィールドが存在する場合（新しいフォーマット） */}
                      {(supplier as any).address && (
                        <p>
                          {(supplier as any).address}
                        </p>
                      )}
                      {/* 都道府県と市区町村が存在する場合（旧フォーマット） */}
                      {!((supplier as any).address) && (supplier.prefecture || supplier.city) && (
                        <p>
                          {supplier.prefecture}
                          {supplier.city}
                        </p>
                      )}
                      {/* 住所1が存在する場合（旧フォーマット） */}
                      {!((supplier as any).address) && supplier.address1 && (
                        <p>
                          {supplier.address1}
                        </p>
                      )}
                      {/* 住所2が存在する場合 */}
                      {supplier.address2 && (
                        <p>
                          {supplier.address2}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">住所情報が登録されていません</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  連絡先
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {supplier.phone ? (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.phone}</span>
                  </div>
                ) : (
                  console.log('[Contact Info] No phone number found:', {
                    supplierPhone: supplier.phone,
                    supplierId: supplier._id,
                    hasPhone: !!supplier.phone,
                    phoneType: typeof supplier.phone,
                    phoneValue: supplier.phone
                  }) || null
                )}
                {supplier.fax && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>FAX: {supplier.fax}</span>
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{supplier.email}</span>
                  </div>
                )}
                {supplier.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={supplier.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {supplier.website}
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  取引条件
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">支払条件</label>
                  <p>{supplier.paymentTerms}日</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">支払方法</label>
                  <p>{supplier.paymentMethod}</p>
                </div>
                {supplier.creditLimit && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">与信限度額</label>
                    <p>{formatCurrency(supplier.creditLimit)}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">現在の買掛金残高</label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(supplier.currentBalance || 0)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {supplier.contacts && supplier.contacts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>担当者情報</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {supplier.contacts.map((contact, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">氏名</label>
                          <p>{contact.name}</p>
                        </div>
                        {contact.title && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">役職</label>
                            <p>{contact.title}</p>
                          </div>
                        )}
                        {contact.phone && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">電話番号</label>
                            <p>{contact.phone}</p>
                          </div>
                        )}
                        {contact.email && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">メール</label>
                            <p>{contact.email}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle>備考</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    発注統計
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {stats?.topProducts && stats.topProducts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>主要取扱商品</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topProducts.map((product: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">取扱商品のデータがありません</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}