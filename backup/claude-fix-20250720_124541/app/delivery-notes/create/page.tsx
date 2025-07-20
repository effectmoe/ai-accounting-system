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
import { logger } from '@/lib/logger';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Package,
  Building2,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { DeliveryNote, DeliveryNoteItem, Customer } from '@/types/collections';

interface DeliveryNoteFormData {
  customerId: string;
  issueDate: string;
  deliveryDate: string;
  deliveryLocation?: string;
  deliveryMethod?: string;
  items: DeliveryNoteItem[];
  notes?: string;
  internalNotes?: string;
}

export default function CreateDeliveryNotePage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<DeliveryNoteFormData>({
    customerId: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryDate: format(new Date(), 'yyyy-MM-dd'),
    deliveryLocation: '',
    deliveryMethod: '',
    items: [
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
    ],
    notes: '',
    internalNotes: ''
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      logger.error('Error fetching customers:', error);
      setError('顧客データの取得に失敗しました');
    }
  };

  const handleSubmit = async (status: 'draft' | 'saved') => {
    try {
      setIsLoading(true);
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

      const deliveryNoteData = {
        ...formData,
        items: calculatedItems,
        subtotal,
        taxAmount,
        totalAmount,
        status
      };

      const response = await fetch('/api/delivery-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deliveryNoteData),
      });

      if (!response.ok) {
        throw new Error('Failed to create delivery note');
      }

      const createdDeliveryNote = await response.json();
      router.push(`/delivery-notes/${createdDeliveryNote._id}`);
    } catch (error) {
      logger.error('Error creating delivery note:', error);
      setError('納品書の作成に失敗しました');
    } finally {
      setIsLoading(false);
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

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/delivery-notes')}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            納品書一覧
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Package className="mr-3 h-8 w-8" />
              納品書作成
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSubmit('draft')}
            disabled={isLoading}
          >
            下書き保存
          </Button>
          <Button
            onClick={() => handleSubmit('saved')}
            disabled={isLoading}
          >
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインフォーム */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer">顧客 *</Label>
                <Select value={formData.customerId} onValueChange={(value) => setFormData({...formData, customerId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="顧客を選択してください" />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">発行日 *</Label>
                  <Input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({...formData, issueDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryDate">納品日 *</Label>
                  <Input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="deliveryLocation">納品先</Label>
                <Input
                  placeholder="納品先住所・場所"
                  value={formData.deliveryLocation}
                  onChange={(e) => setFormData({...formData, deliveryLocation: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="deliveryMethod">納品方法</Label>
                <Select value={formData.deliveryMethod} onValueChange={(value) => setFormData({...formData, deliveryMethod: value})}>
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
            </CardContent>
          </Card>

          {/* 項目 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>納品項目</CardTitle>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-2 h-4 w-4" />
                  項目追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">項目 {index + 1}</h4>
                      {formData.items.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`itemName-${index}`}>品目名 *</Label>
                        <Input
                          placeholder="品目名"
                          value={item.itemName}
                          onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`description-${index}`}>仕様・説明</Label>
                        <Input
                          placeholder="仕様・説明"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`quantity-${index}`}>数量</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`deliveredQuantity-${index}`}>実納品数量</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.deliveredQuantity}
                          onChange={(e) => updateItem(index, 'deliveredQuantity', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`unitPrice-${index}`}>単価</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`amount-${index}`}>金額</Label>
                        <Input
                          type="number"
                          value={item.quantity * item.unitPrice}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 備考 */}
          <Card>
            <CardHeader>
              <CardTitle>備考・特記事項</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="notes">外部向け備考</Label>
                <Textarea
                  placeholder="顧客向けの備考・特記事項"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="internalNotes">内部メモ</Label>
                <Textarea
                  placeholder="社内向けのメモ（顧客には表示されません）"
                  value={formData.internalNotes}
                  onChange={(e) => setFormData({...formData, internalNotes: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 金額サマリー */}
          <Card>
            <CardHeader>
              <CardTitle>金額サマリー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>小計:</span>
                  <span className="font-mono">¥{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>消費税:</span>
                  <span className="font-mono">¥{totalTax.toLocaleString()}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>合計:</span>
                    <span className="font-mono text-blue-600">¥{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}