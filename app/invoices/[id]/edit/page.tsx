'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, MessageSquare, ChevronDown, CheckCircle, FileText, Edit, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import AIChatDialog from '@/components/ai-chat-dialog';
import { calculateDueDate } from '@/utils/payment-terms';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  unit?: string;
  productId?: string;
}

interface Customer {
  _id: string;
  companyName?: string;
  name?: string;
  company?: string;
  [key: string]: any;
}

interface Product {
  _id: string;
  productName: string;
  productCode: string;
  unitPrice: number;
  taxRate: number;
  unit: string;
  isActive: boolean;
}

interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: Customer;
  issueDate: string | Date;
  dueDate: string;
  items: InvoiceItem[];
  notes?: string;
  paymentMethod: string;
  status: string;
  isGeneratedByAI?: boolean;
  aiConversationId?: string;
}

function EditInvoiceContent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // AI会話
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiDataApplied, setAiDataApplied] = useState(false);
  
  // 顧客情報
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // 商品情報
  const [products, setProducts] = useState<Product[]>([]);
  
  // 請求書情報
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');

  // 初期データ読み込み
  useEffect(() => {
    fetchInvoice();
    fetchCustomers();
    fetchProducts();
  }, [params.id]);

  // URLパラメータに基づいてAIチャットを自動的に開く
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'ai') {
      setShowAIChat(true);
    }
  }, [searchParams]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }
      const data = await response.json();
      
      // 請求書データをフォームに設定
      setInvoice(data);
      setSelectedCustomerId(data.customerId || '');
      setInvoiceDate(format(new Date(data.issueDate || data.invoiceDate), 'yyyy-MM-dd'));
      setDueDate(format(new Date(data.dueDate), 'yyyy-MM-dd'));
      setItems(data.items || []);
      setNotes(data.notes || '');
      setPaymentMethod(data.paymentMethod || 'bank_transfer');
      setAiDataApplied(data.isGeneratedByAI || false);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('請求書の取得に失敗しました');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers?limit=1000');
      const data = await response.json();
      if (data.customers && Array.isArray(data.customers)) {
        const validCustomers = data.customers.filter((customer: any) => 
          customer && customer._id && (customer.companyName || customer.name)
        );
        setCustomers(validCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      if (data.products && Array.isArray(data.products)) {
        setProducts(data.products.filter((p: Product) => p.isActive !== false));
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const getDisplayName = (customer: Customer): string => {
    return customer.companyName || customer.name || customer.company || 'Unknown Customer';
  };

  const updateInvoice = async () => {
    if (!invoice) return;

    if (!selectedCustomerId && !customerName) {
      setError('顧客を選択するか、顧客名を入力してください');
      return;
    }

    if (items.length === 0 || items.every(item => !item.description)) {
      setError('少なくとも1つの明細を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 新規顧客の場合は先に作成
      let customerId = selectedCustomerId;
      if (!customerId && customerName) {
        const customerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            companyName: customerName
          }),
        });
        
        if (!customerResponse.ok) {
          const errorData = await customerResponse.json();
          throw new Error(errorData.error || 'Failed to create customer');
        }
        
        const newCustomer = await customerResponse.json();
        customerId = newCustomer._id;
      }

      // 請求書を更新
      const invoiceData = {
        customerId,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        items: items.filter(item => item.description),
        notes,
        paymentMethod,
      };

      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update invoice');
      }

      const updatedInvoice = await response.json();
      router.push(`/invoices/${updatedInvoice._id}`);
    } catch (error) {
      console.error('Error updating invoice:', error);
      setError(error instanceof Error ? error.message : '請求書の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 明細行を更新
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // 金額と税額を自動計算
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
      const quantity = field === 'quantity' ? value : newItems[index].quantity;
      const unitPrice = field === 'unitPrice' ? value : newItems[index].unitPrice;
      const taxRate = field === 'taxRate' ? value : newItems[index].taxRate;
      
      const amount = quantity * unitPrice;
      const taxAmount = Math.floor(amount * taxRate);
      
      newItems[index].amount = amount;
      newItems[index].taxAmount = taxAmount;
    }

    setItems(newItems);
  };

  // 明細行を追加
  const addItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxRate: 0.1,
      taxAmount: 0,
    }]);
  };

  // 明細行を削除
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // AI会話からのデータを適用
  const handleAIComplete = (data: any) => {
    if (data.customerName) {
      setCustomerName(data.customerName);
      setSelectedCustomerId('');
    }
    if (data.invoiceDate) {
      setInvoiceDate(data.invoiceDate);
    }
    if (data.dueDate) {
      setDueDate(data.dueDate);
    }
    if (data.items) {
      setItems(data.items);
    }
    if (data.notes) {
      setNotes(data.notes);
    }
    if (data.paymentMethod) {
      setPaymentMethod(data.paymentMethod);
    }
    
    setAiDataApplied(true);
    setShowAIChat(false);
    setSuccessMessage('AI会話からのデータを適用しました。内容を確認して、必要に応じて修正してください。');
  };

  // 合計金額の計算
  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const taxAmount = items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const totalAmount = subtotal + taxAmount;

  if (!invoice) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* AI会話ダイアログ */}
      {showAIChat && (
        <AIChatDialog
          isOpen={showAIChat}
          onClose={() => setShowAIChat(false)}
          onComplete={handleAIComplete}
          mode="edit"
          initialData={{
            customerName: customerName || getDisplayName(customers.find(c => c._id === selectedCustomerId) || {} as Customer),
            invoiceDate,
            dueDate,
            items,
            notes,
            paymentMethod,
          }}
        />
      )}

      {/* ヘッダー */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/invoices/${invoice._id}`)}
          className="mb-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          詳細に戻る
        </Button>
        <h1 className="text-3xl font-bold">請求書編集</h1>
        <p className="text-gray-600 mt-2">請求書番号: {invoice.invoiceNumber}</p>
      </div>

      {/* エラーとメッセージ */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="mb-4">
          <AlertDescription className="space-y-3">
            <p>{successMessage}</p>
            {aiDataApplied && (
              <div className="mt-3">
                <p className="text-sm text-gray-600">
                  右上の「AI会話で修正」ボタンから、引き続き商品の追加や請求書の修正が可能です。
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 請求書フォーム */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>請求書情報</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIChat(true)}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              AI会話で修正
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 顧客情報セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b border-gray-200">顧客情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer" className="text-sm font-medium text-gray-700 mb-1 block">既存顧客から選択</Label>
                  <select
                    id="customer"
                    value={selectedCustomerId}
                    onChange={(e) => {
                      setSelectedCustomerId(e.target.value);
                      if (e.target.value) {
                        setCustomerName('');
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">既存顧客から選択...</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {getDisplayName(customer)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="customerName" className="text-sm font-medium text-gray-700 mb-1 block">または新規顧客名を入力</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (e.target.value) {
                        setSelectedCustomerId('');
                      }
                    }}
                    placeholder="新規顧客名"
                    disabled={!!selectedCustomerId}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 請求日・支払期限セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b border-gray-200">請求日・支払期限</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceDate" className="text-sm font-medium text-gray-700 mb-1 block">請求日</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700 mb-1 block">支払期限</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 請求明細セクション */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">請求明細</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  明細追加
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="text-left text-sm font-medium text-gray-700 border-b">
                      <th className="pb-2 pr-4">品目・商品</th>
                      <th className="pb-2 px-4 text-center w-24">数量</th>
                      <th className="pb-2 px-4 text-right w-32">単価</th>
                      <th className="pb-2 px-4 text-right w-32">金額（税込）</th>
                      <th className="pb-2 pl-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, index) => (
                      <tr key={index} className="group">
                        <td className="py-3 pr-4">
                          <div className="space-y-2">
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="品目名を入力"
                              className="bg-white"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="0"
                            className="text-center bg-white"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">¥</span>
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)}
                              min="0"
                              className="text-right bg-white"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          ¥{(item.amount + item.taxAmount).toLocaleString()}
                        </td>
                        <td className="py-3 pl-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 合計金額セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b border-gray-200">合計金額</h3>
              <div className="bg-gray-50 p-6 rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">小計:</span>
                  <span className="text-lg font-medium">¥{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">消費税:</span>
                  <span className="text-lg font-medium">¥{taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                  <span className="text-xl font-bold text-gray-900">請求金額合計:</span>
                  <span className="text-2xl font-bold text-blue-600">¥{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* その他情報セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b border-gray-200">その他情報</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700 mb-1 block">支払方法</Label>
                  <select
                    id="paymentMethod"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank_transfer">銀行振込</option>
                    <option value="credit_card">クレジットカード</option>
                    <option value="cash">現金</option>
                    <option value="other">その他</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-1 block">備考</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="備考を入力"
                    rows={4}
                    className="bg-white"
                  />
                </div>
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end gap-4 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => router.push(`/invoices/${invoice._id}`)}
              >
                キャンセル
              </Button>
              <Button
                onClick={updateInvoice}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                請求書を更新
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditInvoicePage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <EditInvoiceContent params={params} />
    </Suspense>
  );
}