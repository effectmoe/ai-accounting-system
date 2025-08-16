'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, ArrowLeft, Save, CheckCircle, MessageSquare, History, Eye, EyeOff, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Quote, QuoteItem, Customer } from '@/types/collections';
import AIChatDialog from '@/components/ai-chat-dialog';
import AIConversationHistoryDialog from '@/components/ai-conversation-history-dialog';

import { logger } from '@/lib/logger';
interface QuoteEditPageProps {
  params: { id: string };
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

function QuoteEditPageContent({ params }: QuoteEditPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 顧客・商品情報
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // フォームデータ
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState(''); // 見積書のタイトル
  const [quoteDate, setQuoteDate] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState('');
  
  // AI機能関連の状態
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAIHistory, setShowAIHistory] = useState(false);
  const [aiDataApplied, setAiDataApplied] = useState(false);
  
  // 商品説明表示/非表示
  const [showItemDescriptions, setShowItemDescriptions] = useState(true);
  
  // おすすめオプション選択
  const [suggestedOptions, setSuggestedOptions] = useState<any[]>([]);
  const [selectedSuggestedOptionIds, setSelectedSuggestedOptionIds] = useState<string[]>([]);
  const [loadingSuggestedOptions, setLoadingSuggestedOptions] = useState(false);

  useEffect(() => {
    fetchQuote();
    fetchCustomers();
    fetchProducts();
    
    // URLパラメータでAIモードかどうかチェック
    if (searchParams.get('mode') === 'ai') {
      setShowAIChat(true);
    }
  }, [params.id, searchParams]);

  // 金額変更時におすすめオプションを更新
  useEffect(() => {
    const total = getTotalAmount().total;
    if (total > 0) {
      fetchSuggestedOptions(total);
    }
  }, [items]);

  const fetchSuggestedOptions = async (amount: number) => {
    try {
      setLoadingSuggestedOptions(true);
      const response = await fetch(`/api/suggested-options/for-quote?amount=${amount}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedOptions(data.suggestedOptions || []);
      }
    } catch (error) {
      logger.error('Error fetching suggested options:', error);
    } finally {
      setLoadingSuggestedOptions(false);
    }
  };

  const handleSuggestedOptionToggle = (optionId: string) => {
    setSelectedSuggestedOptionIds(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(id => id !== optionId);
      } else {
        return [...prev, optionId];
      }
    });
  };

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`);
      if (response.ok) {
        const quoteData = await response.json();
        setQuote(quoteData);
        
        // フォームデータを設定
        setSelectedCustomerId(quoteData.customerId?.toString() || '');
        setCustomerName(quoteData.customer?.companyName || '');
        setTitle(quoteData.title || ''); // タイトルをセット
        setQuoteDate(format(new Date(quoteData.issueDate), 'yyyy-MM-dd'));
        setValidityDate(format(new Date(quoteData.validityDate), 'yyyy-MM-dd'));
        
        // アイテムデータの安全な処理
        const safeItems = (quoteData.items || []).map((item: any) => ({
          ...item,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          amount: item.amount || 0,
          taxRate: item.taxRate !== undefined ? item.taxRate : 10,
          taxAmount: item.taxAmount || 0,
          itemName: item.itemName || '',
          description: item.description || '',
        }));
        setItems(safeItems);
        
        setNotes(quoteData.notes || '');
        
        // 選択されたおすすめオプションを設定
        if (quoteData.selectedSuggestedOptionIds) {
          setSelectedSuggestedOptionIds(quoteData.selectedSuggestedOptionIds);
        }
      } else {
        setError('見積書が見つかりません');
        router.push('/quotes');
      }
    } catch (error) {
      logger.error('Error fetching quote:', error);
      setError('見積書の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.customers || []);
      }
    } catch (error) {
      logger.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      logger.error('Error fetching products:', error);
    }
  };

  const calculateItemAmount = (item: QuoteItem) => {
    if (item.taxRate === -1) {
      // 内税の場合：税込価格から税額を逆算
      const taxIncludedAmount = item.quantity * item.unitPrice;
      const taxAmount = taxIncludedAmount - (taxIncludedAmount / 1.1); // デフォルト10%で計算
      const amount = taxIncludedAmount - taxAmount;
      return {
        amount,
        taxAmount,
      };
    } else {
      // 通常の外税計算
      const amount = item.quantity * item.unitPrice;
      const taxRate = item.taxRate !== undefined ? item.taxRate : 10;
      const taxAmount = amount * (taxRate / 100);
      return {
        amount,
        taxAmount,
      };
    }
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 商品選択時の自動入力
    if (field === 'productId' && value) {
      const product = products.find(p => p._id === value);
      if (product) {
        newItems[index].itemName = product.productName;
        newItems[index].unitPrice = product.unitPrice;
        newItems[index].taxRate = product.taxRate !== undefined ? product.taxRate : 10;
      }
    }
    
    // 金額の再計算
    const calculated = calculateItemAmount(newItems[index]);
    newItems[index].amount = calculated.amount;
    newItems[index].taxAmount = calculated.taxAmount;
    
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      itemName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxRate: 10,
      taxAmount: 0,
      sortOrder: items.length,
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const getTotalAmount = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    return {
      subtotal,
      totalTax,
      total: subtotal + totalTax,
    };
  };

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setCustomerName(customer.companyName || customer.name || '');
    }
  };

  // AI会話からデータを適用する関数
  const handleAIDataApply = (data: any) => {
    logger.debug('AI chat data received:', data);
    
    // 顧客情報の更新
    if (data.customerId && data.customerId !== selectedCustomerId) {
      setSelectedCustomerId(data.customerId);
      const customer = customers.find(c => c._id === data.customerId);
      if (customer) {
        setCustomerName(customer.companyName || customer.name || '');
      }
    }
    
    // 見積項目の更新
    if (data.items && Array.isArray(data.items)) {
      setItems(data.items.map((item: any) => ({
        ...item,
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        amount: item.amount || 0,
        taxRate: item.taxRate || 10,
        taxAmount: item.taxAmount || 0,
        itemName: item.itemName || '',
        description: item.description || '',
      })));
    }
    
    // タイトルの更新
    if (data.title) {
      setTitle(data.title);
    }
    
    // 備考の更新
    if (data.notes) {
      setNotes(data.notes);
    }
    
    // 日付の更新
    if (data.quoteDate) {
      setQuoteDate(data.quoteDate);
    }
    if (data.validityDate) {
      setValidityDate(data.validityDate);
    }
    
    // AI会話IDをセット
    if (data.aiConversationId && quote) {
      setQuote(prev => prev ? { ...prev, aiConversationId: data.aiConversationId } : prev);
    }
    
    setAiDataApplied(true);
    setShowAIChat(false);
    setSuccessMessage('AI会話からのデータを適用しました。内容を確認して、必要に応じて修正してください。');
  };

  const handleSave = async () => {
    if (!selectedCustomerId) {
      setError('顧客を選択してください');
      return;
    }

    if (items.length === 0 || !items[0].itemName) {
      setError('最低1つの項目を入力してください');
      return;
    }

    setIsSaving(true);
    setError(null);

    const totals = getTotalAmount();

    const updateData = {
      customerId: selectedCustomerId,
      title, // タイトルを追加
      quoteDate,
      validityDate,
      items,
      subtotal: totals.subtotal,
      taxAmount: totals.totalTax,
      taxRate: 10,
      totalAmount: totals.total,
      notes,
      selectedSuggestedOptionIds,
    };

    try {
      const response = await fetch(`/api/quotes/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('見積書が正常に更新されました！');
        setTimeout(() => {
          router.push(`/quotes/${params.id}`);
        }, 1500);
      } else {
        throw new Error(data.details || data.error || '見積書の更新に失敗しました');
      }
    } catch (error) {
      logger.error('Error updating quote:', error);
      setError(error instanceof Error ? error.message : '見積書の更新に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">見積書が見つかりません</h1>
          <Button onClick={() => router.push('/quotes')}>
            見積書一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  const totals = getTotalAmount();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/quotes/${params.id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
          <div>
            <h1 className="text-3xl font-bold">見積書編集</h1>
            <p className="text-gray-600">#{quote.quoteNumber}</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="space-y-3">
            <p className="text-green-800">{successMessage}</p>
            {aiDataApplied && (
              <div className="mt-3">
                <p className="text-sm text-gray-600">
                  右上の「AI会話で修正」ボタンから、引き続き商品の追加や見積書の修正が可能です。
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Quote Form */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>見積書情報</CardTitle>
            <Button
              type="button"
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
        <CardContent className="space-y-6">
          {/* 顧客選択 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">顧客 *</Label>
              <select
                id="customer"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                <option value="">顧客を選択してください</option>
                {customers.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.companyName || customer.name || '名前未設定'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="customerName">顧客名（表示用）</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="顧客名を入力"
              />
            </div>
          </div>

          {/* タイトル */}
          <div>
            <Label htmlFor="title">件名</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="見積書の件名を入力（例：ウェブサイト制作費用見積書）"
            />
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quoteDate">発行日 *</Label>
              <Input
                id="quoteDate"
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="validityDate">有効期限 *</Label>
              <Input
                id="validityDate"
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">見積明細</h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowItemDescriptions(!showItemDescriptions)}
              >
                {showItemDescriptions ? (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" />
                    備考欄を非表示
                  </>
                ) : (
                  <>
                    <Eye className="mr-1 h-3 w-3" />
                    備考欄を表示
                  </>
                )}
              </Button>
              <Button onClick={addItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                項目を追加
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">項目 {index + 1}</h4>
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>商品選択（任意）</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={item.productId || ''}
                      onChange={(e) => updateItem(index, 'productId' as keyof QuoteItem, e.target.value)}
                    >
                      <option value="">商品を選択（任意）</option>
                      {products.filter(p => p.isActive).map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.productName} - ¥{product.unitPrice.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>項目名 *</Label>
                    <Input
                      value={item.itemName}
                      onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                      placeholder="項目名を入力"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <Label>数量</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>単価</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>小計</Label>
                    <Input
                      value={`¥${(item.amount || 0).toLocaleString()}`}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label>税率</Label>
                    <select
                      value={String(item.taxRate !== undefined ? item.taxRate : 10)}
                      onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value))}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={false}
                    >
                      <option value="10">10%（標準税率）</option>
                      <option value="8">8%（軽減税率）</option>
                      <option value="0">0%（非課税）</option>
                      <option value="-1">内税（税込価格から逆算）</option>
                    </select>
                  </div>
                  <div>
                    <Label>税額</Label>
                    <Input
                      value={`¥${(item.taxAmount || 0).toLocaleString()}`}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>

                {showItemDescriptions && (
                  <div className="col-span-2">
                    <Label>備考</Label>
                    <Input
                      placeholder="商品の詳細説明や備考を入力"
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-6 border-t pt-4">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>小計:</span>
                  <span>¥{totals.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>税額:</span>
                  <span>¥{totals.totalTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>合計:</span>
                  <span>¥{totals.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>備考</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Textarea
                placeholder="備考・特記事項があれば入力してください"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="bg-white"
              />
            </div>
            {/* AI会話履歴ボタン */}
            <div className="flex justify-start">
              <Button
                type="button"
                variant={quote?.aiConversationId ? "outline" : "ghost"}
                onClick={() => setShowAIHistory(true)}
                disabled={!quote?.aiConversationId}
                className={quote?.aiConversationId ? "" : "opacity-50 cursor-not-allowed"}
              >
                <History className="mr-2 h-4 w-4" />
                AI会話履歴
                {quote?.aiConversationId && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    あり
                  </span>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Options */}
      {suggestedOptions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              おすすめオプション選択
            </CardTitle>
            <p className="text-sm text-gray-600">
              見積書メールに追加表示するおすすめオプションを選択してください（見積金額: ¥{getTotalAmount().total.toLocaleString()}）
            </p>
          </CardHeader>
          <CardContent>
            {loadingSuggestedOptions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">おすすめオプションを読み込み中...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {suggestedOptions.map((option) => (
                  <div key={option._id} className="border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center h-5">
                        <input
                          id={`suggested-option-${option._id}`}
                          type="checkbox"
                          checked={selectedSuggestedOptionIds.includes(option._id.toString())}
                          onChange={() => handleSuggestedOptionToggle(option._id.toString())}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="flex-1">
                        <label 
                          htmlFor={`suggested-option-${option._id}`}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-lg font-semibold text-gray-900">{option.title}</h4>
                            <span className="text-lg font-bold text-blue-600">{option.price}</span>
                          </div>
                          <p className="text-gray-600 mb-2">{option.description}</p>
                          {option.features && option.features.length > 0 && (
                            <div className="mb-2">
                              <span className="text-sm font-medium text-gray-700">特徴:</span>
                              <ul className="text-sm text-gray-600 mt-1 space-y-1">
                                {option.features.map((feature: string, index: number) => (
                                  <li key={index} className="flex items-start gap-2">
                                    <span className="text-blue-600 mt-1">•</span>
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>
                              表示条件: {option.minAmount ? `¥${option.minAmount.toLocaleString()}以上` : '制限なし'}
                              {option.maxAmount ? ` - ¥${option.maxAmount.toLocaleString()}以下` : ''}
                            </span>
                            <span className="text-blue-600 hover:text-blue-800 font-medium">
                              {option.ctaText}
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    ✓ 選択したオプション ({selectedSuggestedOptionIds.length}件) が見積書メールに自動で追加されます
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={() => router.push(`/quotes/${params.id}`)}
        >
          キャンセル
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          保存
        </Button>
      </div>
      
      {/* AI会話ダイアログ */}
      <AIChatDialog
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        onDataApply={handleAIDataApply}
        documentType="quote"
        companyId="default-company"
        existingConversationId={quote?.aiConversationId}
        invoiceId={quote?._id}
        initialInvoiceData={{
          ...quote,
          // 現在の編集フォームの状態を含める
          customerName: customerName || customers.find(c => c._id === selectedCustomerId)?.companyName || quote?.customer?.companyName || '',
          customerId: selectedCustomerId || quote?.customerId,
          quoteDate: quoteDate,
          validityDate: validityDate,
          items: items,
          notes: notes,
          subtotal: totals.subtotal,
          taxAmount: totals.totalTax,
          totalAmount: totals.total
        }}
        mode="edit"
      />
      
      {/* AI会話履歴ダイアログ */}
      <AIConversationHistoryDialog
        isOpen={showAIHistory}
        onClose={() => setShowAIHistory(false)}
        conversationId={quote?.aiConversationId}
        invoiceId={quote?._id}
      />
    </div>
  );
}

// Suspenseラッパーを使用
export default function QuoteEditPage({ params }: QuoteEditPageProps) {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto p-6 flex justify-center items-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <QuoteEditPageContent params={params} />
    </Suspense>
  );
}