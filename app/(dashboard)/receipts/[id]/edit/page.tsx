'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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

interface ReceiptItem {
  itemName?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  amount: number;
  taxType?: 'taxable' | 'non-taxable' | 'tax-exempt';
}

interface Receipt {
  _id: string;
  receiptNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  title?: string;
  issueDate: string | Date;
  paidDate?: string | Date;
  customerId: string;
  customerName: string;
  customerAddress?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  status: 'draft' | 'issued' | 'sent' | 'cancelled';
  subject?: string;
  notes?: string;
  issuerStamp?: string;
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
  issuerStamp: string;
}

const statusLabels: Record<string, string> = {
  draft: '下書き',
  issued: '発行済み',
  sent: '送信済み',
  cancelled: 'キャンセル',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function EditReceiptPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<ReceiptForm>({
    customerName: '',
    customerAddress: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    paidDate: format(new Date(), 'yyyy-MM-dd'),
    subject: '',
    title: '',
    notes: '',
    items: [],
    taxRate: 0.1,
    issuerStamp: ''
  });

  useEffect(() => {
    fetchReceipt();
  }, [params.id]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/receipts/${params.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/receipts');
          return;
        }
        throw new Error('Failed to fetch receipt');
      }

      const data = await response.json();
      setReceipt(data);

      // フォームにデータを設定
      setForm({
        customerName: data.customerName || '',
        customerAddress: data.customerAddress || '',
        issueDate: format(new Date(data.issueDate), 'yyyy-MM-dd'),
        paidDate: data.paidDate ? format(new Date(data.paidDate), 'yyyy-MM-dd') : '',
        subject: data.subject || '',
        title: data.title || '',
        notes: data.notes || '',
        items: data.items || [
          {
            itemName: '',
            description: '',
            quantity: 1,
            unit: '個',
            unitPrice: 0,
            amount: 0
          }
        ],
        taxRate: data.taxRate || 0.1,
        issuerStamp: data.issuerStamp || ''
      });
    } catch (error) {
      logger.error('Error fetching receipt:', error);
      alert('領収書の取得に失敗しました');
      router.push('/receipts');
    } finally {
      setLoading(false);
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

  const handleSubmit = async () => {
    if (!receipt) return;

    try {
      setSaving(true);

      const { subtotal, taxAmount, totalAmount } = calculateTotals();

      const updateData = {
        ...form,
        issueDate: new Date(form.issueDate).toISOString(),
        paidDate: form.paidDate ? new Date(form.paidDate).toISOString() : undefined,
        subtotal,
        taxAmount,
        totalAmount
      };

      const response = await fetch(`/api/receipts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to update receipt');
      }

      const updatedReceipt = await response.json();
      logger.info('Receipt updated successfully:', updatedReceipt.receiptNumber);

      router.push(`/receipts/${params.id}`);
    } catch (error) {
      logger.error('Error updating receipt:', error);
      alert(error instanceof Error ? error.message : '領収書の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">領収書が見つかりません</h2>
          <Button onClick={() => router.push('/receipts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            領収書一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  const { subtotal, taxAmount, totalAmount } = calculateTotals();

  const getStatusBadge = (status: string) => (
    <Badge className={`${statusColors[status]} border-0`}>
      {statusLabels[status]}
    </Badge>
  );

  // 発行済み以降は編集不可
  const isReadOnly = receipt.status !== 'draft';

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/receipts/${params.id}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            領収書に戻る
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ReceiptIcon className="h-8 w-8" />
              領収書編集: {receipt.receiptNumber}
            </h1>
            <p className="text-muted-foreground">
              領収書の情報を編集できます
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(receipt.status)}
        </div>
      </div>

      {/* 読み取り専用の警告 */}
      {isReadOnly && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            この領収書は{statusLabels[receipt.status]}のため、編集できません。編集するには下書き状態に戻してください。
          </AlertDescription>
        </Alert>
      )}

      {/* 関連請求書 */}
      {receipt.invoiceNumber && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            この領収書は請求書
            <Button
              variant="link"
              className="h-auto p-1 text-blue-600"
              onClick={() => router.push(`/invoices/${receipt.invoiceId}`)}
            >
              {receipt.invoiceNumber}
            </Button>
            から作成されました
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
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label htmlFor="paidDate">支払日</Label>
                  <Input
                    id="paidDate"
                    type="date"
                    value={form.paidDate}
                    onChange={(e) => setForm(prev => ({ ...prev, paidDate: e.target.value }))}
                    disabled={isReadOnly}
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
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <Label htmlFor="title">件名（任意）</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="件名を入力"
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>

          {/* 明細 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>明細</CardTitle>
              {!isReadOnly && (
                <Button onClick={addItem} size="sm">
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
                          value={item.itemName || ''}
                          onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                          placeholder="項目名"
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>摘要</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          placeholder="摘要"
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>数量</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          min="1"
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="col-span-1">
                        <Label>単位</Label>
                        <Input
                          value={item.unit || '個'}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>単価</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                          min="0"
                          disabled={isReadOnly}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>金額</Label>
                        <div className="text-right py-2">
                          ¥{item.amount.toLocaleString()}
                        </div>
                      </div>
                      {!isReadOnly && form.items.length > 1 && (
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
              <div>
                <Label htmlFor="customerName">宛名</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={(e) => setForm(prev => ({ ...prev, customerName: e.target.value }))}
                  placeholder="〇〇 御中"
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
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
                  disabled={isReadOnly}
                />
              </div>
            </CardContent>
          </Card>

          {/* アクション */}
          {!isReadOnly && (
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  保存
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}