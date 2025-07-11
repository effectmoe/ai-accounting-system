'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Selectコンポーネントは使用せず、ネイティブのselect要素を使用
import { Loader2, Plus, Trash2, Sparkles, MessageSquare, ChevronDown, CheckCircle, FileText, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import AIChatDialog from '@/components/ai-chat-dialog';

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

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // AI会話入力
  const [conversation, setConversation] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [aiConversationId, setAiConversationId] = useState<string | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiDataApplied, setAiDataApplied] = useState(false); // AI会話からデータが適用されたかどうか
  
  // 顧客情報
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // 商品情報
  const [products, setProducts] = useState<Product[]>([]);
  
  // 請求書情報
  const [invoiceDate, setInvoiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [items, setItems] = useState<InvoiceItem[]>([{
    description: '',
    quantity: 1,
    unitPrice: 0,
    amount: 0,
    taxRate: 0.1,
    taxAmount: 0,
    unit: '',
    productId: '',
  }]);
  const [notes, setNotes] = useState('');
  const [defaultBankInfo, setDefaultBankInfo] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');

  // 顧客・商品一覧を取得
  useEffect(() => {
    fetchCustomers();
    fetchProducts();
    fetchDefaultBankInfo();
  }, []);

  // URLパラメータに基づいてAIチャットを自動的に開く
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'ai') {
      setShowAIChat(true);
    }
  }, [searchParams]);

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers...');
      const response = await fetch('/api/customers');
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched data:', data);
        console.log('Data type:', typeof data);
        console.log('Is array:', Array.isArray(data));
        console.log('Has customers property:', data.hasOwnProperty('customers'));
        
        // データ構造に応じて顧客リストを設定
        if (data.customers && Array.isArray(data.customers)) {
          console.log('Setting customers from data.customers:', data.customers);
          setCustomers(data.customers);
        } else if (Array.isArray(data)) {
          console.log('Setting customers from array:', data);
          setCustomers(data);
        } else {
          console.error('Unexpected customer data format:', data);
          setError('顧客データの取得に失敗しました');
        }
      } else {
        console.error('Failed to fetch customers:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        setError('顧客データの取得に失敗しました');
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setError('顧客データの取得に失敗しました');
    }
  };

  // 商品一覧を取得
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?isActive=true');
      if (response.ok) {
        const data = await response.json();
        console.log('Products data:', data);
        // データ構造に応じて商品リストを設定
        if (data.products && Array.isArray(data.products)) {
          setProducts(data.products);
        } else if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.error('Unexpected product data format:', data);
          setProducts([]);
        }
      } else {
        console.error('Failed to fetch products:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      setProducts([]);
    }
  };

  // デフォルト銀行口座情報と請求書設定を取得
  const fetchDefaultBankInfo = async () => {
    try {
      let defaultNotes = '';
      let hasSetNotes = false;
      
      // 自社情報から請求書設定を取得
      const companyResponse = await fetch('/api/company-info');
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        if (companyData.success && companyData.companyInfo) {
          // 支払い条件のデフォルトを設定
          if (companyData.companyInfo.payment_terms) {
            // payment_termsをnotesにも含める
            defaultNotes = companyData.companyInfo.payment_terms + '\n\n';
          }
          
          // 請求書備考のデフォルトを追加
          if (companyData.companyInfo.invoice_notes) {
            defaultNotes += companyData.companyInfo.invoice_notes;
            hasSetNotes = true;
          }
        }
      }
      
      // 銀行口座情報を取得
      const bankResponse = await fetch('/api/bank-accounts');
      if (bankResponse.ok) {
        const bankData = await bankResponse.json();
        console.log('Bank data:', bankData);
        
        if (bankData.success && bankData.accounts && Array.isArray(bankData.accounts)) {
          const defaultAccount = bankData.accounts.find(account => account.is_default);
          
          if (defaultAccount) {
            // デフォルト銀行口座情報を備考に追加
            const bankInfo = `【振込先】\n${defaultAccount.bank_name} ${defaultAccount.branch_name}\n${defaultAccount.account_type}口座 ${defaultAccount.account_number}\n口座名義: ${defaultAccount.account_holder}`;
            setDefaultBankInfo(bankInfo);
            
            // 既存の備考に銀行情報を追加
            if (defaultNotes) {
              setNotes(defaultNotes + '\n\n' + bankInfo);
            } else {
              setNotes(bankInfo);
            }
            hasSetNotes = true;
          }
        }
      }
      
      // まだ備考が設定されていない場合は、収集したデフォルト値を設定
      if (!hasSetNotes && defaultNotes) {
        setNotes(defaultNotes);
      }
    } catch (error) {
      console.error('Failed to fetch default bank info:', error);
    }
  };

  // AI会話を解析（旧バージョン - 互換性のため残す）
  const analyzeConversation = async () => {
    if (!conversation.trim()) {
      setError('会話内容を入力してください');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/invoices/analyze-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze conversation');
      }

      const result = await response.json();
      
      // 解析結果を反映
      if (result.data) {
        applyInvoiceData(result.data);
        setAiConversationId(result.aiConversationId);
        setSuccessMessage('会話から請求内容を抽出しました。内容を確認してください。');
      }
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      setError('会話の解析に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AIチャットダイアログからのデータを適用
  const handleAIChatComplete = (invoiceData: any) => {
    console.log('[InvoiceNew] Received data from AI chat:', invoiceData);
    console.log('[InvoiceNew] Data details:', {
      items: invoiceData.items,
      subtotal: invoiceData.subtotal,
      taxAmount: invoiceData.taxAmount,
      totalAmount: invoiceData.totalAmount
    });
    applyInvoiceData(invoiceData);
    setAiConversationId(Date.now().toString());
    setShowAIChat(false);
    setAiDataApplied(true);
    setSuccessMessage('AI会話から請求書データを作成しました。内容を確認してください。');
  };

  // 請求書データを適用する共通関数
  const applyInvoiceData = (data: any) => {
    // 顧客情報
    if (data.customerId) {
      setSelectedCustomerId(data.customerId);
    } else if (data.customerName) {
      setCustomerName(data.customerName);
    }
    
    // 日付
    if (data.invoiceDate) {
      setInvoiceDate(format(new Date(data.invoiceDate), 'yyyy-MM-dd'));
    }
    if (data.dueDate) {
      setDueDate(format(new Date(data.dueDate), 'yyyy-MM-dd'));
    }
    
    // 明細
    if (data.items && data.items.length > 0) {
      setItems(data.items);
    }
    
    // その他
    if (data.notes) {
      setNotes(data.notes);
    } else if (defaultBankInfo) {
      // AI会話で備考が指定されていない場合は、デフォルト銀行口座情報を使用
      setNotes(defaultBankInfo);
    }
    if (data.paymentMethod) {
      setPaymentMethod(data.paymentMethod);
    }
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
      unit: '',
      productId: '',
    }]);
  };

  // 明細行を削除
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // 明細行を更新
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 金額と税額を再計算
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
      const item = newItems[index];
      item.amount = item.quantity * item.unitPrice;
      item.taxAmount = Math.round(item.amount * item.taxRate);
    }
    
    setItems(newItems);
  };

  // 商品選択時の処理
  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        productId: productId,
        description: product.productName,
        unitPrice: product.unitPrice,
        taxRate: product.taxRate,
        unit: product.unit,
        amount: newItems[index].quantity * product.unitPrice,
        taxAmount: Math.round(newItems[index].quantity * product.unitPrice * product.taxRate),
      };
      setItems(newItems);
    }
  };

  // 合計金額を計算
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + taxAmount;
    
    return { subtotal, taxAmount, totalAmount };
  };

  // 請求書を保存
  const saveInvoice = async () => {
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
        console.log('Creating new customer:', customerName);
        const customerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            companyName: customerName,
            email: 'contact@example.com' // 仮のメールアドレス
          }),
        });
        
        if (!customerResponse.ok) {
          const errorData = await customerResponse.json();
          console.error('Customer creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create customer');
        }
        
        const newCustomer = await customerResponse.json();
        customerId = newCustomer._id;
        console.log('New customer created:', customerId);
      }

      // 請求書を作成
      const invoiceData = {
        customerId,
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        items: items.filter(item => item.description), // 空の明細は除外
        notes,
        paymentMethod,
        isGeneratedByAI: !!aiConversationId,
        aiConversationId,
      };

      console.log('Creating invoice with data:', invoiceData);

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Invoice creation failed:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create invoice');
      }

      const invoice = await response.json();
      console.log('Invoice created successfully:', invoice);
      router.push(`/invoices/${invoice._id}`);
    } catch (error) {
      console.error('Error saving invoice:', error);
      setError(error instanceof Error ? error.message : '請求書の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">請求書作成</h1>

      {/* 作成方法の選択 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className={`border-2 transition-all cursor-pointer ${
          showAIChat ? 'border-blue-300 shadow-lg bg-blue-50/20' : 'border-blue-100 hover:shadow-md'
        }`}
          onClick={() => !showAIChat && setShowAIChat(true)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Sparkles className="h-5 w-5" />
              AIアシスタントで作成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              会話形式で簡単に請求書を作成。
              顧客名、金額、内容を伝えるだけ。
            </p>
            {showAIChat && (
              <div className="mt-3 flex items-center gap-2 text-blue-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>選択中</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={`border-2 transition-all cursor-pointer ${
          !showAIChat ? 'border-gray-300 shadow-lg bg-gray-50/20' : 'border-gray-200 hover:shadow-md'
        }`}
          onClick={() => showAIChat && setShowAIChat(false)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-700">
              <FileText className="h-5 w-5" />
              フォームで手動作成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              下のフォームに直接入力。
              詳細な設定が可能です。
            </p>
            {!showAIChat && (
              <div className="mt-3 flex items-center gap-2 text-gray-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>選択中</span>
              </div>
            )}
          </CardContent>
        </Card>
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
              <div className="flex gap-3 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAIChat(true)}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  AI会話で修正
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSuccessMessage('下のフォームで直接編集できます。');
                    // フォーカスを最初の入力フィールドに移動
                    setTimeout(() => {
                      document.getElementById('customer')?.focus();
                    }, 100);
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="h-4 w-4" />
                  手動で修正
                </Button>
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
            {aiDataApplied && (
              <div className="flex gap-2">
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
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* 顧客情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer">顧客選択</Label>
                <select
                  id="customer"
                  value={selectedCustomerId}
                  onChange={(e) => {
                    console.log('Selected customer ID:', e.target.value);
                    setSelectedCustomerId(e.target.value);
                    // 既存顧客を選択した場合、新規顧客名をクリア
                    if (e.target.value) {
                      setCustomerName('');
                    }
                  }}
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">既存顧客から選択...</option>
                  {customers.length === 0 ? (
                    <option value="" disabled>
                      顧客が登録されていません
                    </option>
                  ) : (
                    customers.map((customer) => (
                      <option key={customer._id} value={customer._id}>
                        {customer.companyName || customer.name || '名称未設定'}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <Label htmlFor="customerName">新規顧客名</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    // 新規顧客名を入力した場合、既存顧客選択をクリア
                    if (e.target.value) {
                      setSelectedCustomerId('');
                    }
                  }}
                  placeholder="新規顧客の場合は入力"
                  disabled={!!selectedCustomerId}
                />
              </div>
            </div>

            {/* 日付情報 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="invoiceDate">請求日</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dueDate">支払期限</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {/* 明細 */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>明細</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  明細追加
                </Button>
              </div>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="space-y-2">
                    {/* 商品選択行 */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-4">
                        <select
                          value={item.productId || ''}
                          onChange={(e) => {
                            const productId = e.target.value;
                            if (productId) {
                              selectProduct(index, productId);
                            } else {
                              updateItem(index, 'productId', '');
                            }
                          }}
                          className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">商品を選択...</option>
                          {products.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.productName} (¥{product.unitPrice.toLocaleString()})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          placeholder="品目（または上記から選択）"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="数量"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          placeholder="単位"
                          value={item.unit || ''}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* 価格設定行 */}
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="単価"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value))}
                          className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-3 py-1 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value={0.10}>10%</option>
                          <option value={0.08}>8%</option>
                          <option value={0.00}>0%（非課税）</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="小計"
                          value={item.amount}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="税額"
                          value={item.taxAmount}
                          readOnly
                          className="bg-gray-50"
                        />
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="合計"
                          value={item.amount + item.taxAmount}
                          readOnly
                          className="bg-gray-50 font-medium"
                        />
                      </div>
                      <div className="col-span-2"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 合計金額 */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="space-y-2 text-right">
                <div className="flex justify-end items-center gap-4">
                  <span>小計:</span>
                  <span className="font-medium">¥{totals.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-end items-center gap-4">
                  <span>消費税:</span>
                  <span className="font-medium">¥{totals.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-end items-center gap-4 text-lg font-bold">
                  <span>合計:</span>
                  <span>¥{totals.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* その他 */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">支払方法</Label>
                <select
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="bank_transfer">銀行振込</option>
                  <option value="credit_card">クレジットカード</option>
                  <option value="cash">現金</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <Label htmlFor="notes">備考</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="備考やメモを入力"
                />
              </div>
            </div>

            {/* アクションボタン */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/invoices')}
              >
                キャンセル
              </Button>
              <Button
                onClick={saveInvoice}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '請求書を作成'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AIチャットダイアログ */}
      <AIChatDialog
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        onComplete={handleAIChatComplete}
        mode={aiDataApplied ? "edit" : "create"}
        initialInvoiceData={aiDataApplied ? {
          customerId: selectedCustomerId,
          customerName: customerName || customers.find(c => c._id === selectedCustomerId)?.companyName,
          items: items,
          invoiceDate: invoiceDate,
          dueDate: dueDate,
          notes: notes,
          paymentMethod: paymentMethod,
          subtotal: calculateTotals().subtotal,
          taxAmount: calculateTotals().taxAmount,
          totalAmount: calculateTotals().totalAmount
        } : undefined}
      />
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6 max-w-6xl"><div className="text-center">読み込み中...</div></div>}>
      <NewInvoiceContent />
    </Suspense>
  );
}