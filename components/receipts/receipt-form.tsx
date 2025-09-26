'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Receipt as ReceiptIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Customer {
  _id: string;
  companyName: string;
  name?: string;
  postalCode?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
  phone?: string;
  email?: string;
}

interface ReceiptItem {
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

interface ReceiptFormData {
  customerName: string;
  customerAddress: string;
  issueDate: string;
  paidDate: string;
  subject: string;
  title: string;
  notes: string;
  items: ReceiptItem[];
  taxRate: number;
  issuerStamp: string;
}

interface ReceiptFormProps {
  initialData?: Partial<ReceiptFormData>;
  customers?: Customer[];
  onSubmit: (data: ReceiptFormData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  isEdit?: boolean;
  readonly?: boolean;
}

const defaultFormData: ReceiptFormData = {
  customerName: '',
  customerAddress: '',
  issueDate: format(new Date(), 'yyyy-MM-dd'),
  paidDate: format(new Date(), 'yyyy-MM-dd'),
  subject: '',
  title: '',
  notes: '',
  items: [
    {
      itemName: '',
      description: '',
      quantity: 1,
      unit: '個',
      unitPrice: 0,
      amount: 0
    }
  ],
  taxRate: 0.1,
  issuerStamp: ''
};

export default function ReceiptForm({
  initialData,
  customers = [],
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false,
  readonly = false
}: ReceiptFormProps) {
  const [form, setForm] = useState<ReceiptFormData>(
    initialData ? { ...defaultFormData, ...initialData } : defaultFormData
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (initialData) {
      setForm(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setSelectedCustomer(customer);
      const address = [
        customer.postalCode ? `〒${customer.postalCode}` : '',
        customer.prefecture || '',
        customer.city || '',
        customer.address1 || '',
        customer.address2 || ''
      ].filter(Boolean).join(' ');

      setForm(prev => ({
        ...prev,
        customerName: `${customer.companyName} 御中`,
        customerAddress: address
      }));
    }
  };

  const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };

    // 金額の自動計算
    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].unitPrice || 0);
    }

    setForm(prev => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemName: '',
          description: '',
          quantity: 1,
          unit: '個',
          unitPrice: 0,
          amount: 0
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    if (form.items.length > 1) {
      setForm(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateTotals = () => {
    const subtotalWithTax = form.items.reduce((sum, item) => sum + item.amount, 0);
    const subtotal = Math.round(subtotalWithTax / (1 + form.taxRate));
    const taxAmount = subtotalWithTax - subtotal;

    return {
      subtotal,
      taxAmount,
      totalAmount: subtotalWithTax
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading) {
      await onSubmit(form);
    }
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインフォーム */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="issueDate">発行日</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={form.issueDate}
                    onChange={(e) => setForm(prev => ({ ...prev, issueDate: e.target.value }))}
                    disabled={readonly}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="paidDate">支払日</Label>
                  <Input
                    id="paidDate"
                    type="date"
                    value={form.paidDate}
                    onChange={(e) => setForm(prev => ({ ...prev, paidDate: e.target.value }))}
                    disabled={readonly}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject">但し書き</Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="〇〇代として"
                  disabled={readonly}
                />
              </div>

              <div>
                <Label htmlFor="title">件名（任意）</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="件名を入力"
                  disabled={readonly}
                />
              </div>

              <div>
                <Label htmlFor="notes">備考（任意）</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="備考を入力"
                  rows={3}
                  disabled={readonly}
                />
              </div>
            </CardContent>
          </Card>

          {/* 明細 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>明細</CardTitle>
              {!readonly && (
                <Button type="button" onClick={addItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  明細追加
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {form.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-3">
                        <Label>項目名</Label>
                        <Input
                          value={item.itemName}
                          onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                          placeholder="項目名"
                          disabled={readonly}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>摘要</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="摘要"
                          disabled={readonly}
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>数量</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          min="1"
                          disabled={readonly}
                          required
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>単位</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          disabled={readonly}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>単価</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                          min="0"
                          disabled={readonly}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>金額</Label>
                        <div className="text-right py-2">
                          ¥{item.amount.toLocaleString()}
                        </div>
                      </div>
                      {!readonly && form.items.length > 1 && (
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 合計 */}
              <div className="mt-6 space-y-2 border-t pt-4">
                <div className="flex justify-between">
                  <span>小計</span>
                  <span>¥{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>消費税 ({Math.round(form.taxRate * 100)}%)</span>
                  <span>¥{taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>合計金額</span>
                  <span>¥{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 宛先情報 */}
          <Card>
            <CardHeader>
              <CardTitle>宛先情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isEdit && customers.length > 0 && (
                <div>
                  <Label htmlFor="customer">顧客選択</Label>
                  <Select onValueChange={handleCustomerChange} disabled={readonly}>
                    <SelectTrigger>
                      <SelectValue placeholder="顧客を選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer._id} value={customer._id}>
                          {customer.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="customerName">宛名</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={(e) => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="〇〇 御中"
                  disabled={readonly}
                  required
                />
              </div>

              <div>
                <Label htmlFor="customerAddress">住所</Label>
                <Textarea
                  id="customerAddress"
                  value={form.customerAddress}
                  onChange={(e) => setForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                  placeholder="住所を入力"
                  rows={3}
                  disabled={readonly}
                />
              </div>
            </CardContent>
          </Card>

          {/* 印影設定 */}
          <Card>
            <CardHeader>
              <CardTitle>印影設定</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="issuerStamp">印影データ（Base64）</Label>
                <Textarea
                  id="issuerStamp"
                  value={form.issuerStamp}
                  onChange={(e) => setForm(prev => ({ ...prev, issuerStamp: e.target.value }))}
                  placeholder="印影画像のBase64データ"
                  rows={3}
                  disabled={readonly}
                />
              </div>
            </CardContent>
          </Card>

          {/* アクション */}
          {!readonly && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        保存中...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Save className="h-4 w-4" />
                        {isEdit ? '更新' : '保存'}
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={loading}
                    className="w-full"
                  >
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </form>
  );
}