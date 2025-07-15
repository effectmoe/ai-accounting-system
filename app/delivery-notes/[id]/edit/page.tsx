'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Package,
  Building2,
  Calendar,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { DeliveryNote, DeliveryNoteItem, Customer } from '@/types/collections';
import { safeFormatDate } from '@/lib/date-utils';

interface DeliveryNoteFormData {
  customerId: string;
  issueDate: string;
  deliveryDate: string;
  deliveryLocation?: string;
  deliveryMethod?: string;
  items: DeliveryNoteItem[];
  notes?: string;
  internalNotes?: string;
  status: string;
}

export default function EditDeliveryNotePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    customerId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryLocation: '',
    deliveryMethod: '',
    items: [],
    notes: '',
    internalNotes: '',
    status: 'draft'
  });

  useEffect(() => {
    fetchDeliveryNote();
    fetchCustomers();
  }, [params.id]);

  const fetchDeliveryNote = async () => {
    try {
      const response = await fetch(`/api/delivery-notes/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch delivery note');
      
      const data = await response.json();
      setDeliveryNote(data);
      
      setFormData({
        customerId: data.customerId || '',
        issueDate: data.issueDate ? format(new Date(data.issueDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        deliveryDate: data.deliveryDate ? format(new Date(data.deliveryDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        deliveryLocation: data.deliveryLocation || '',
        deliveryMethod: data.deliveryMethod || '',
        items: data.items || [],
        notes: data.notes || '',
        internalNotes: data.internalNotes || '',
        status: data.status || 'draft'
      });
    } catch (error) {
      console.error('Error fetching delivery note:', error);
      setError('納品書の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleSubmit = async (status?: string) => {
    try {
      setIsSaving(true);
      setError(null);

      // バリデーション
      if (!formData.customerId) {
        setError('顧客を選択してください');
        return;
      }

      if (formData.items.length === 0 || !formData.items[0].itemName) {
        setError('少なくとも1つの項目を入力してください');
        return;
      }

      // 金額計算
      const calculatedItems = formData.items.map(item => {
        const amount = item.quantity * item.unitPrice;
        const taxAmount = amount * (item.taxRate || 0.1);
        return {
          ...item,
          amount,
          taxAmount
        };
      });

      const subtotal = calculatedItems.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const totalAmount = subtotal + taxAmount;

      const updateData = {
        ...formData,
        items: calculatedItems,
        subtotal,
        taxAmount,
        totalAmount,
        status: status || formData.status
      };

      const response = await fetch(`/api/delivery-notes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update delivery note');
      }

      router.push(`/delivery-notes/${params.id}`);
    } catch (error) {
      console.error('Error updating delivery note:', error);
      setError('納品書の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          itemName: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          amount: 0,
          taxRate: 0.1,
          taxAmount: 0,
          deliveredQuantity: 1
        }
      ]
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== index)
      });
    }
  };

  const updateItem = (index: number, field: keyof DeliveryNoteItem, value: any) => {
    const updatedItems = formData.items.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        // 金額を自動計算
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
          updatedItem.taxAmount = updatedItem.amount * (updatedItem.taxRate || 0.1);
        }
        
        // 実納品数量のデフォルト設定
        if (field === 'quantity' && !updatedItem.deliveredQuantity) {
          updatedItem.deliveredQuantity = updatedItem.quantity;
        }
        
        return updatedItem;
      }
      return item;
    });

    setFormData({
      ...formData,
      items: updatedItems
    });
  };

  const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const totalTax = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate || 0.1)), 0);
  const totalAmount = subtotal + totalTax;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error && !deliveryNote) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/delivery-notes')}>
          納品書一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/delivery-notes/${params.id}`)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            納品書詳細に戻る
          </Button>
          <h1 className="text-3xl font-bold">納品書編集</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit()}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
          <Button
            onClick={() => handleSubmit('saved')}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                保存済みにする
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 基本情報 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            基本情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">顧客</Label>
              <Select value={formData.customerId} onValueChange={(value) => setFormData({ ...formData, customerId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="顧客を選択" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer._id?.toString()} value={customer._id?.toString() || ''}>
                      {customer.companyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">ステータス</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="saved">保存済み</SelectItem>
                  <SelectItem value="delivered">納品済み</SelectItem>
                  <SelectItem value="received">受領済み</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issueDate">発行日</Label>
              <Input
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="deliveryDate">納品日</Label>
              <Input
                type="date"
                value={formData.deliveryDate}
                onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveryLocation">納品場所</Label>
              <Input
                value={formData.deliveryLocation}
                onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
                placeholder="納品場所を入力"
              />
            </div>
            <div>
              <Label htmlFor="deliveryMethod">納品方法</Label>
              <Select value={formData.deliveryMethod} onValueChange={(value) => setFormData({ ...formData, deliveryMethod: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="納品方法を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">直接納品</SelectItem>
                  <SelectItem value="shipping">配送</SelectItem>
                  <SelectItem value="pickup">引き取り</SelectItem>
                  <SelectItem value="email">メール送信</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 明細 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>納品明細</CardTitle>
            <Button onClick={addItem} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              項目を追加
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {formData.items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium">項目 {index + 1}</h4>
                  {formData.items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>品目名</Label>
                    <Input
                      value={item.itemName}
                      onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                      placeholder="品目名を入力"
                    />
                  </div>
                  <div>
                    <Label>説明</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="説明を入力"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div>
                    <Label>数量</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>単価</Label>
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>実納品数量</Label>
                    <Input
                      type="number"
                      value={item.deliveredQuantity}
                      onChange={(e) => updateItem(index, 'deliveredQuantity', parseInt(e.target.value) || 0)}
                      min="0"
                    />
                  </div>
                  <div>
                    <Label>金額</Label>
                    <div className="text-lg font-semibold pt-2">
                      ¥{(item.quantity * item.unitPrice).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 合計 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 min-w-[300px]">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">小計:</span>
                  <span className="text-lg font-mono">¥{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">消費税:</span>
                  <span className="text-lg font-mono">¥{totalTax.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">合計金額:</span>
                    <span className="text-2xl font-bold text-blue-600">¥{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 備考 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="notes">備考</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="備考を入力"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="internalNotes">内部メモ</Label>
              <Textarea
                value={formData.internalNotes}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                placeholder="内部メモを入力"
                rows={4}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}