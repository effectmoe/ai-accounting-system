'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Receipt as ReceiptIcon,
  Plus,
  Trash2,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';
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

interface Invoice {
  _id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  customerName?: string;
  customer?: Customer;
}

interface ReceiptItem {
  itemName: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}

interface ReceiptForm {
  customerName: string;
  customerAddress: string;
  issueDate: string;
  paidDate: string;
  subject: string;
  title: string;
  notes: string;
  items: ReceiptItem[];
  taxRate: number;
}

export default function NewReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [creationMethod, setCreationMethod] = useState<'manual' | 'from-invoice'>('manual');

  const [form, setForm] = useState<ReceiptForm>({
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
    taxRate: 0.1
  });

  useEffect(() => {
    if (invoiceId) {
      setCreationMethod('from-invoice');
      fetchInvoice(invoiceId);
    } else {
      fetchCustomers();
    }
  }, [invoiceId]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (!response.ok) throw new Error('Failed to fetch customers');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      logger.error('Error fetching customers:', error);
    }
  };

  const fetchInvoice = async (invoiceId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/invoices/${invoiceId}`);
      if (!response.ok) throw new Error('Failed to fetch invoice');
      const data = await response.json();
      setInvoice(data);

      // 請求書データから領収書フォームを設定
      setForm(prev => ({
        ...prev,
        customerName: `${data.customerSnapshot?.companyName || data.customer?.companyName || '不明な顧客'} 御中`,
        customerAddress: data.customerSnapshot?.address || '',
        subject: `${data.invoiceNumber}の代金として`,
        title: data.title || '',
        notes: data.notes || '',
        items: data.items.map((item: any) => ({
          itemName: item.itemName || '',
          description: item.description || item.itemName || '',
          quantity: item.quantity || 1,
          unit: item.unit || '個',
          unitPrice: item.unitPrice || 0,
          amount: item.amount || 0
        }))
      }));
    } catch (error) {
      logger.error('Error fetching invoice:', error);
      alert('請求書の取得に失敗しました');
      router.push('/receipts');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (status: 'draft' | 'issued' = 'draft') => {
    try {
      setSaving(true);

      const { subtotal, taxAmount, totalAmount } = calculateTotals();

      const receiptData = {
        ...form,
        issueDate: new Date(form.issueDate).toISOString(),
        paidDate: form.paidDate ? new Date(form.paidDate).toISOString() : undefined,
        customerId: selectedCustomer?._id,
        invoiceId: invoice?._id,
        subtotal,
        taxAmount,
        totalAmount,
        status
      };

      const response = await fetch('/api/receipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create receipt');
      }

      const receipt = await response.json();
      logger.info('Receipt created successfully:', receipt.receiptNumber);

      router.push(`/receipts/${receipt._id}`);
    } catch (error) {
      logger.error('Error creating receipt:', error);
      alert(error instanceof Error ? error.message : '領収書の作成に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/receipts')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            領収書一覧に戻る
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ReceiptIcon className="h-8 w-8" />
              新しい領収書
            </h1>
            <p className="text-muted-foreground">
              {creationMethod === 'from-invoice' ? '請求書から領収書を作成' : '領収書を新規作成'}
            </p>
          </div>
        </div>
      </div>

      {/* 請求書情報の表示 */}
      {invoice && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            請求書 <strong>{invoice.invoiceNumber}</strong> から領収書を作成しています。
            (金額: ¥{invoice.totalAmount.toLocaleString()})
          </AlertDescription>
        </Alert>
      )}

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
                  />
                </div>
                <div>
                  <Label htmlFor="paidDate">支払日</Label>
                  <Input
                    id="paidDate"
                    type="date"
                    value={form.paidDate}
                    onChange={(e) => setForm(prev => ({ ...prev, paidDate: e.target.value }))}
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
                />
              </div>

              <div>
                <Label htmlFor="title">件名（任意）</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="件名を入力"
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
                />
              </div>
            </CardContent>
          </Card>

          {/* 明細 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>明細</CardTitle>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                明細追加
              </Button>
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
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>摘要</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="摘要"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>数量</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>単位</Label>
                        <Input
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>単価</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                          min="0"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>金額</Label>
                        <div className="text-right py-2">
                          ¥{item.amount.toLocaleString()}
                        </div>
                      </div>
                      {form.items.length > 1 && (
                        <div className="col-span-1">
                          <Button
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
              {creationMethod === 'manual' && (
                <div>
                  <Label htmlFor="customer">顧客選択</Label>
                  <Select onValueChange={handleCustomerChange}>
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
                />
              </div>
            </CardContent>
          </Card>

          {/* アクション */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <Button
                  onClick={() => handleSubmit('draft')}
                  disabled={saving}
                  className="w-full"
                  variant="outline"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  下書き保存
                </Button>
                <Button
                  onClick={() => handleSubmit('issued')}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ReceiptIcon className="h-4 w-4 mr-2" />}
                  発行
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}