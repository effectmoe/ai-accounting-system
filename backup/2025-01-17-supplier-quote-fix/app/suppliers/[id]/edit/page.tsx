'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import { SupplierStatus, PaymentMethod } from '@/types/collections';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { toast } from 'react-hot-toast';

interface SupplierFormData {
  supplierCode: string;
  companyName: string;
  companyNameKana: string;
  department: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  paymentTerms: number;
  paymentMethod: PaymentMethod;
  status: SupplierStatus;
  creditLimit: number;
  notes: string;
  contacts: {
    name: string;
    nameKana: string;
    title: string;
    email: string;
    phone: string;
    isPrimary: boolean;
  }[];
}

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const supplierId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<SupplierFormData>({
    supplierCode: '',
    companyName: '',
    companyNameKana: '',
    department: '',
    postalCode: '',
    prefecture: '',
    city: '',
    address1: '',
    address2: '',
    phone: '',
    fax: '',
    email: '',
    website: '',
    paymentTerms: 30,
    paymentMethod: 'bank_transfer',
    status: 'active',
    creditLimit: 0,
    notes: '',
    contacts: [{
      name: '',
      nameKana: '',
      title: '',
      email: '',
      phone: '',
      isPrimary: true,
    }],
  });

  // 仕入先データを取得
  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/suppliers/${supplierId}`);
        
        if (!response.ok) {
          throw new Error('仕入先データの取得に失敗しました');
        }
        
        const supplier = await response.json();
        console.log('Fetched supplier:', supplier);
        
        setFormData({
          supplierCode: supplier.supplierCode || '',
          companyName: supplier.companyName || '',
          companyNameKana: supplier.companyNameKana || '',
          department: supplier.department || '',
          postalCode: supplier.postalCode || '',
          prefecture: supplier.prefecture || '',
          city: supplier.city || '',
          address1: supplier.address1 || '',
          address2: supplier.address2 || '',
          phone: supplier.phone || '',
          fax: supplier.fax || '',
          email: supplier.email || '',
          website: supplier.website || '',
          paymentTerms: supplier.paymentTerms || 30,
          paymentMethod: supplier.paymentMethod || 'bank_transfer',
          status: supplier.status || 'active',
          creditLimit: supplier.creditLimit || 0,
          notes: supplier.notes || '',
          contacts: supplier.contacts && supplier.contacts.length > 0 ? supplier.contacts : [{
            name: '',
            nameKana: '',
            title: '',
            email: '',
            phone: '',
            isPrimary: true,
          }],
        });
      } catch (error) {
        console.error('Error loading supplier:', error);
        alert('仕入先データの読み込みに失敗しました');
        router.push('/suppliers');
      } finally {
        setLoading(false);
      }
    };

    if (supplierId) {
      fetchSupplier();
    }
  }, [supplierId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('仕入先情報を更新しました');
        router.push('/suppliers');
      } else {
        const error = await response.json();
        alert(error.error || '仕入先の更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating supplier:', error);
      alert('仕入先の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleContactChange = (index: number, field: string, value: any) => {
    const newContacts = [...formData.contacts];
    newContacts[index] = {
      ...newContacts[index],
      [field]: value,
    };
    setFormData(prev => ({
      ...prev,
      contacts: newContacts,
    }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/suppliers')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">仕入先情報編集</h1>
          <p className="text-muted-foreground">仕入先の情報を更新してください</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
            <CardDescription>仕入先の基本的な情報を入力してください</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="supplierCode">仕入先コード</Label>
                <Input
                  id="supplierCode"
                  value={formData.supplierCode}
                  onChange={(e) => handleChange('supplierCode', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div>
                <Label htmlFor="status">ステータス</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange('status', value)}
                  disabled={loading || saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">アクティブ</SelectItem>
                    <SelectItem value="inactive">非アクティブ</SelectItem>
                    <SelectItem value="suspended">停止中</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="companyName">会社名 *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                required
                disabled={loading || saving}
              />
            </div>

            <div>
              <Label htmlFor="companyNameKana">会社名（カナ）</Label>
              <Input
                id="companyNameKana"
                value={formData.companyNameKana}
                onChange={(e) => handleChange('companyNameKana', e.target.value)}
                disabled={loading || saving}
              />
            </div>

            <div>
              <Label htmlFor="department">部署</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                disabled={loading || saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>住所・連絡先</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="postalCode">郵便番号</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleChange('postalCode', e.target.value)}
                  placeholder="123-4567"
                  disabled={loading || saving}
                />
              </div>
              <div>
                <Label htmlFor="prefecture">都道府県</Label>
                <Input
                  id="prefecture"
                  value={formData.prefecture}
                  onChange={(e) => handleChange('prefecture', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="city">市区町村</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                disabled={loading || saving}
              />
            </div>

            <div>
              <Label htmlFor="address1">住所1</Label>
              <Input
                id="address1"
                value={formData.address1}
                onChange={(e) => handleChange('address1', e.target.value)}
                disabled={loading || saving}
              />
            </div>

            <div>
              <Label htmlFor="address2">住所2（建物名等）</Label>
              <Input
                id="address2"
                value={formData.address2}
                onChange={(e) => handleChange('address2', e.target.value)}
                disabled={loading || saving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div>
                <Label htmlFor="fax">FAX番号</Label>
                <Input
                  id="fax"
                  type="tel"
                  value={formData.fax}
                  onChange={(e) => handleChange('fax', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div>
                <Label htmlFor="website">ウェブサイト</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  placeholder="https://example.com"
                  disabled={loading || saving}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>取引条件</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="paymentTerms">支払条件（日）</Label>
                <Input
                  id="paymentTerms"
                  type="number"
                  value={formData.paymentTerms}
                  onChange={(e) => handleChange('paymentTerms', parseInt(e.target.value) || 0)}
                  disabled={loading || saving}
                />
              </div>
              <div>
                <Label htmlFor="paymentMethod">支払方法</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleChange('paymentMethod', value)}
                  disabled={loading || saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">現金</SelectItem>
                    <SelectItem value="credit_card">クレジットカード</SelectItem>
                    <SelectItem value="bank_transfer">銀行振込</SelectItem>
                    <SelectItem value="invoice">請求書払い</SelectItem>
                    <SelectItem value="other">その他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="creditLimit">与信限度額</Label>
              <Input
                id="creditLimit"
                type="number"
                value={formData.creditLimit}
                onChange={(e) => handleChange('creditLimit', parseInt(e.target.value) || 0)}
                disabled={loading || saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>担当者情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contactName">担当者名</Label>
              <Input
                id="contactName"
                value={formData.contacts[0].name}
                onChange={(e) => handleContactChange(0, 'name', e.target.value)}
                disabled={loading || saving}
              />
            </div>

            <div>
              <Label htmlFor="contactNameKana">担当者名（カナ）</Label>
              <Input
                id="contactNameKana"
                value={formData.contacts[0].nameKana}
                onChange={(e) => handleContactChange(0, 'nameKana', e.target.value)}
                disabled={loading || saving}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactTitle">役職</Label>
                <Input
                  id="contactTitle"
                  value={formData.contacts[0].title}
                  onChange={(e) => handleContactChange(0, 'title', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">電話番号</Label>
                <Input
                  id="contactPhone"
                  type="tel"
                  value={formData.contacts[0].phone}
                  onChange={(e) => handleContactChange(0, 'phone', e.target.value)}
                  disabled={loading || saving}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="contactEmail">メールアドレス</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contacts[0].email}
                onChange={(e) => handleContactChange(0, 'email', e.target.value)}
                disabled={loading || saving}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>備考</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={4}
              placeholder="取引に関する注意事項など"
              disabled={loading || saving}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/suppliers')}
            disabled={loading || saving}
          >
            キャンセル
          </Button>
          <Button type="submit" disabled={loading || saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '更新中...' : '更新'}
          </Button>
        </div>
      </form>
    </div>
  );
}