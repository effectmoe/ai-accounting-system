'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, Sparkles, MessageSquare, ChevronDown, CheckCircle, FileText, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import AIChatDialog from '@/components/ai-chat-dialog';
import { calculateDueDate } from '@/utils/payment-terms';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

import { logger } from '@/lib/logger';
interface QuoteItem {
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
  paymentTerms?: number;
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

function NewQuoteContent() {
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
  const [aiDataApplied, setAiDataApplied] = useState(false);
  
  // 顧客情報
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // 商品情報
  const [products, setProducts] = useState<Product[]>([]);
  
  // 会社情報
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
  // 仕入先見積書との関連
  const [sourceSupplierQuoteId, setSourceSupplierQuoteId] = useState<string | null>(null);
  const [sourceSupplierQuote, setSourceSupplierQuote] = useState<any>(null);
  
  // 見積書情報
  const [title, setTitle] = useState(''); // 見積書のタイトル
  const [quoteDate, setQuoteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [validityDate, setValidityDate] = useState(format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
  const [items, setItems] = useState<QuoteItem[]>([{
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

  // 顧客・商品・会社情報を取得
  useEffect(() => {
    fetchCompanyInfo();
    fetchCustomers();
    fetchProducts();
    fetchDefaultBankInfo();
    
    // URLパラメータから仕入先見積書IDを取得
    const supplierQuoteId = searchParams.get('sourceSupplierQuoteId');
    if (supplierQuoteId) {
      setSourceSupplierQuoteId(supplierQuoteId);
      fetchSupplierQuote(supplierQuoteId);
    }
  }, [searchParams]);

  // URLパラメータに基づいてAIチャットを自動的に開く
  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'ai') {
      setShowAIChat(true);
    }
  }, [searchParams]);

  const fetchCompanyInfo = async () => {
    try {
      const response = await fetch('/api/company-info');
      if (response.ok) {
        const data = await response.json();
        setCompanyInfo(data.companyInfo);
        if (data.companyInfo?.quote_validity_days) {
          const days = data.companyInfo.quote_validity_days;
          const newValidityDate = new Date();
          newValidityDate.setDate(newValidityDate.getDate() + days);
          setValidityDate(format(newValidityDate, 'yyyy-MM-dd'));
        }
      }
    } catch (error) {
      logger.error('Error fetching company info:', error);
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

  const fetchDefaultBankInfo = async () => {
    try {
      const response = await fetch('/api/bank-accounts');
      if (response.ok) {
        const data = await response.json();
        const defaultBank = data.bankAccounts?.find((bank: any) => bank.isDefault);
        if (defaultBank) {
          setDefaultBankInfo(`${defaultBank.bankName} ${defaultBank.branchName} ${defaultBank.accountNumber}`);
        }
      }
    } catch (error) {
      logger.error('Error fetching bank accounts:', error);
    }
  };

  // 仕入先見積書データを取得
  const fetchSupplierQuote = async (id: string) => {
    try {
      const response = await fetch(`/api/supplier-quotes/${id}`);
      if (!response.ok) throw new Error('Failed to fetch supplier quote');
      
      const supplierQuote = await response.json();
      setSourceSupplierQuote(supplierQuote);
      
      // 仕入先見積書のデータを見積書フォームに反映
      if (supplierQuote.subject) {
        setTitle(supplierQuote.subject);
      }
      
      // 明細項目を変換（金額は手動で調整可能）
      if (supplierQuote.items && supplierQuote.items.length > 0) {
        const convertedItems = supplierQuote.items.map((item: any) => ({
          description: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice * 1.3, // デフォルトで30%のマージンを追加
          amount: item.quantity * (item.unitPrice * 1.3),
          taxRate: item.taxRate || 0.1,
          taxAmount: Math.floor(item.quantity * (item.unitPrice * 1.3) * (item.taxRate || 0.1)),
          unit: item.unit || '',
          productId: item.productId || '',
        }));
        setItems(convertedItems);
      }
      
      setSuccessMessage('仕入先見積書のデータを読み込みました。金額を確認して調整してください。');
    } catch (error) {
      logger.error('Error fetching supplier quote:', error);
      setError('仕入先見積書の取得に失敗しました');
    }
  };

  const calculateItemAmount = (item: QuoteItem) => {
    const amount = item.quantity * item.unitPrice;
    const taxAmount = amount * item.taxRate;
    return {
      amount,
      taxAmount,
    };
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 商品選択時の自動入力
    if (field === 'productId' && value) {
      const product = products.find(p => p._id === value);
      if (product) {
        newItems[index].description = product.productName;
        newItems[index].unitPrice = product.unitPrice;
        newItems[index].taxRate = product.taxRate || 0.1;
        newItems[index].unit = product.unit;
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
      setCustomerName(customer.companyName || customer.name || customer.company || '');
      // 支払条件がある場合は有効期限を自動計算
      if (customer.paymentTerms) {
        const newValidityDate = new Date();
        newValidityDate.setDate(newValidityDate.getDate() + customer.paymentTerms);
        setValidityDate(format(newValidityDate, 'yyyy-MM-dd'));
      }
    }
  };

  const handleSubmit = async (status: 'draft' | 'sent' = 'draft') => {
    if (!selectedCustomerId) {
      setError('顧客を選択してください');
      return;
    }

    if (items.length === 0 || !items[0].description) {
      setError('最低1つの項目を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    const totals = getTotalAmount();

    // 利益計算（仕入先見積書がある場合）
    let costAmount = undefined;
    let profitAmount = undefined;
    let profitMargin = undefined;
    
    if (sourceSupplierQuote) {
      costAmount = sourceSupplierQuote.totalAmount;
      const totalAmount = totals.total;
      profitAmount = totalAmount - costAmount;
      profitMargin = totalAmount > 0 ? (profitAmount / totalAmount) * 100 : 0;
    }

    const quoteData = {
      customerId: selectedCustomerId,
      title, // 見積書のタイトル
      quoteDate, // フロントエンド用
      validityDate,
      items,
      subtotal: totals.subtotal,
      taxAmount: totals.totalTax,
      taxRate: 0.1,
      totalAmount: totals.total,
      notes,
      paymentMethod,
      status,
      isGeneratedByAI: aiDataApplied,
      aiConversationId: aiConversationId,
      sourceSupplierQuoteId,
      costAmount,
      profitAmount,
      profitMargin,
    };

    logger.debug('Submitting quote data:', quoteData);
    logger.debug('aiConversationId value:', aiConversationId);
    logger.debug('isGeneratedByAI value:', aiDataApplied);

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      });

      const data = await response.json();

      if (response.ok) {
        // 仕入先見積書を更新して関連を作成
        if (sourceSupplierQuoteId) {
          await fetch(`/api/supplier-quotes/${sourceSupplierQuoteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              relatedQuoteIds: [...(sourceSupplierQuote.relatedQuoteIds || []), data._id]
            }),
          });
        }
        
        setSuccessMessage('見積書が正常に作成されました！');
        setTimeout(() => {
          router.push(`/quotes/${data._id}`);
        }, 1500);
      } else {
        throw new Error(data.details || data.error || '見積書の作成に失敗しました');
      }
    } catch (error) {
      logger.error('Error creating quote:', error);
      setError(error instanceof Error ? error.message : '見積書の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAIDataApply = (data: any) => {
    logger.debug('=== AI Data Apply Debug ===');
    logger.debug('AI data received:', data);
    logger.debug('AI conversation ID from data:', data.aiConversationId);
    logger.debug('Data keys:', Object.keys(data));
    logger.debug('conversationId (alternative):', data.conversationId);
    
    if (data.customerId) {
      setSelectedCustomerId(data.customerId);
      handleCustomerChange(data.customerId);
    }
    
    if (data.customerName && !data.customerId) {
      setCustomerName(data.customerName);
    }
    
    if (data.title) {
      setTitle(data.title);
    }
    
    if (data.items && Array.isArray(data.items)) {
      setItems(data.items.map((item: any) => ({
        description: item.description || item.itemName || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        amount: item.amount || (item.quantity || 1) * (item.unitPrice || 0),
        taxRate: item.taxRate || 0.1,
        taxAmount: item.taxAmount || ((item.amount || (item.quantity || 1) * (item.unitPrice || 0)) * (item.taxRate || 0.1)),
        unit: item.unit || '',
        productId: item.productId || '',
      })));
    }
    
    if (data.notes) {
      setNotes(data.notes);
    }
    
    if (data.quoteDate) {
      setQuoteDate(data.quoteDate);
    }
    
    if (data.validityDate) {
      setValidityDate(data.validityDate);
    }
    
    // Try both possible conversation ID fields
    const conversationId = data.aiConversationId || data.conversationId;
    logger.debug('Final conversation ID to set:', conversationId);
    logger.debug('Setting AI conversation ID to:', conversationId);
    setAiConversationId(conversationId || null);
    setAiDataApplied(true);
    setShowAIChat(false);
    logger.debug('=== End AI Data Apply Debug ===');
  };

  const totals = getTotalAmount();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">新規見積書作成</h1>
        <Button
          variant="outline"
          onClick={() => router.push('/quotes')}
        >
          一覧に戻る
        </Button>
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
          <AlertDescription className="text-green-800">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* 仕入先見積書との関連情報 */}
      {sourceSupplierQuote && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <FileText className="h-5 w-5" />
              仕入先見積書から作成中
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">見積書番号:</span> {sourceSupplierQuote.quoteNumber}
              </p>
              <p className="text-sm">
                <span className="font-medium">仕入先:</span> {sourceSupplierQuote.supplier?.companyName || sourceSupplierQuote.vendorName || '未設定'}
              </p>
              <p className="text-sm">
                <span className="font-medium">原価:</span> ¥{sourceSupplierQuote.totalAmount.toLocaleString()}
              </p>
              <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-1">利益計算</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-600">売価:</span> ¥{getTotalAmount().total.toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">利益額:</span> ¥{(getTotalAmount().total - sourceSupplierQuote.totalAmount).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">利益率:</span> {getTotalAmount().total > 0 ? ((getTotalAmount().total - sourceSupplierQuote.totalAmount) / getTotalAmount().total * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
              会話形式で簡単に見積書を作成。
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

      {/* AIデータ適用のお知らせ */}
      {aiDataApplied && !showAIChat && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            AIアシスタントのデータが適用されました。下のフォームで詳細を確認・編集できます。
          </AlertDescription>
        </Alert>
      )}

      {/* Quote Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>見積書情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 顧客選択 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer">顧客 *</Label>
              <SearchableSelect
                id="customer"
                value={selectedCustomerId}
                onChange={handleCustomerChange}
                options={customers.map((customer) => ({
                  value: customer._id,
                  label: customer.companyName || customer.name || customer.company || '名前未設定'
                }))}
                placeholder="顧客を検索または選択"
                required
              />
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
          <CardTitle className="flex justify-between items-center">
            見積項目
            <Button onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              項目を追加
            </Button>
          </CardTitle>
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
                      onChange={(e) => updateItem(index, 'productId', e.target.value)}
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
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
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
                      value={`¥${item.amount.toLocaleString()}`}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label>税率</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={item.taxRate}
                      onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>税額</Label>
                    <Input
                      value={`¥${item.taxAmount.toLocaleString()}`}
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>
                </div>
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
          <Textarea
            placeholder="備考・特記事項があれば入力してください"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Submit Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={() => handleSubmit('draft')}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Edit className="mr-2 h-4 w-4" />
          )}
          下書き保存
        </Button>
        <Button
          onClick={() => handleSubmit('sent')}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          見積書を作成
        </Button>
      </div>

      {/* AI Chat Dialog */}
      {showAIChat && (
        <AIChatDialog
          isOpen={showAIChat}
          onClose={() => setShowAIChat(false)}
          onDataApply={handleAIDataApply}
          companyId={companyInfo?._id || 'default-company'}
          documentType="quote"
          title="見積書作成アシスタント"
          placeholder="見積書を作成したいです。顧客は○○社で、△△の見積もりをお願いします..."
        />
      )}
    </div>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NewQuoteContent />
    </Suspense>
  );
}