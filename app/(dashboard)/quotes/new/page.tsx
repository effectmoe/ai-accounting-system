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
import { Loader2, Plus, Trash2, Sparkles, MessageSquare, ChevronDown, CheckCircle, FileText, Edit, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import AIChatDialog from '@/components/ai-chat-dialog';
import { calculateDueDate } from '@/utils/payment-terms';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

import { logger } from '@/lib/logger';
interface QuoteItem {
  description: string;
  itemType?: 'product' | 'discount';
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  unit?: string;
  productId?: string;
  discountReason?: string;
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
  console.log('[NewQuoteContent] Component mounting...');
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
  
  // 商品説明表示/非表示
  const [showItemDescriptions, setShowItemDescriptions] = useState(true);
  
  // おすすめオプション選択
  const [suggestedOptions, setSuggestedOptions] = useState<any[]>([]);
  const [selectedSuggestedOptionIds, setSelectedSuggestedOptionIds] = useState<string[]>([]);
  const [loadingSuggestedOptions, setLoadingSuggestedOptions] = useState(false);
  
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
    taxRate: 10,
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

  // 金額変更時におすすめオプションを更新
  useEffect(() => {
    const total = getTotalAmount().total;
    if (total > 0) {
      fetchSuggestedOptions(total);
    }
  }, [items]);

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
          itemName: item.itemName,
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice * 1.3, // デフォルトで30%のマージンを追加
          amount: item.quantity * (item.unitPrice * 1.3),
          taxRate: item.taxRate || 10,
          taxAmount: Math.floor(item.quantity * (item.unitPrice * 1.3) * ((item.taxRate || 10) / 100)),
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
      const taxAmount = amount * (item.taxRate / 100);
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
        newItems[index].description = product.productName;
        newItems[index].unitPrice = product.unitPrice;
        newItems[index].taxRate = product.taxRate || 10;
        newItems[index].unit = product.unit;
      }
    }
    
    // 金額の再計算
    const calculated = calculateItemAmount(newItems[index]);
    newItems[index].amount = calculated.amount;
    newItems[index].taxAmount = calculated.taxAmount;
    
    setItems(newItems);
  };

  const addItem = (itemType: 'product' | 'discount' = 'product') => {
    setItems([...items, {
      description: itemType === 'discount' ? '値引き' : '',
      itemType: itemType,
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxRate: 10,
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

  const handleSuggestedOptionToggle = (optionId: string) => {
    setSelectedSuggestedOptionIds(prev => {
      if (prev.includes(optionId)) {
        return prev.filter(id => id !== optionId);
      } else {
        return [...prev, optionId];
      }
    });
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
    console.log('[handleSubmit] Called with status:', status);
    console.log('[handleSubmit] selectedCustomerId:', selectedCustomerId);
    console.log('[handleSubmit] items:', items);
    
    if (!selectedCustomerId) {
      console.error('[handleSubmit] No customer selected');
      setError('顧客を選択してください');
      return;
    }

    if (items.length === 0 || !items[0].description) {
      console.error('[handleSubmit] No items or empty description');
      setError('最低1つの項目を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);
    console.log('[handleSubmit] Validation passed, starting submission...');

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
      taxRate: 10,
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
      selectedSuggestedOptionIds,
    };

    logger.debug('Submitting quote data:', quoteData);
    logger.debug('aiConversationId value:', aiConversationId);
    logger.debug('isGeneratedByAI value:', aiDataApplied);

    try {
      console.log('[handleSubmit] Sending request to /api/quotes with data:', quoteData);
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteData),
      });

      console.log('[handleSubmit] Response status:', response.status);
      const data = await response.json();
      console.log('[handleSubmit] Response data:', data);

      if (response.ok) {
        console.log('[handleSubmit] Quote created successfully, ID:', data._id);
        // 仕入先見積書を更新して関連を作成
        if (sourceSupplierQuoteId) {
          console.log('[handleSubmit] Updating supplier quote relation...');
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
          console.log('[handleSubmit] Redirecting to:', `/quotes/${data._id}`);
          router.push(`/quotes/${data._id}`);
        }, 1500);
      } else {
        console.error('[handleSubmit] Server returned error:', data);
        throw new Error(data.details || data.error || '見積書の作成に失敗しました');
      }
    } catch (error) {
      console.error('[handleSubmit] Error occurred:', error);
      logger.error('Error creating quote:', error);
      setError(error instanceof Error ? error.message : '見積書の作成に失敗しました');
    } finally {
      console.log('[handleSubmit] Finished, setting isLoading to false');
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
        itemName: item.itemName || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        amount: item.amount || (item.quantity || 1) * (item.unitPrice || 0),
        taxRate: item.taxRate || 10,
        taxAmount: item.taxAmount || ((item.amount || (item.quantity || 1) * (item.unitPrice || 0)) * ((item.taxRate || 10) / 100)),
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
              <Button onClick={() => addItem('product')} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                項目を追加
              </Button>
              <Button onClick={() => addItem('discount')} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                値引きを追加
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className={`border rounded-lg p-4 space-y-4 ${item.itemType === 'discount' ? 'bg-red-50 border-red-200' : ''}`}>
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">
                    {item.itemType === 'discount' ? (
                      <span className="text-red-600">値引き {index + 1}</span>
                    ) : (
                      <>項目 {index + 1}</>
                    )}
                  </h4>
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
                  {item.itemType !== 'discount' && (
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
                  )}
                  <div className={item.itemType === 'discount' ? 'md:col-span-2' : ''}>
                    <Label>{item.itemType === 'discount' ? '値引き名 *' : '項目名 *'}</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder={item.itemType === 'discount' ? '値引き名を入力（例：期間限定割引）' : '項目名を入力'}
                    />
                  </div>
                </div>
                
                {item.itemType === 'discount' && (
                  <div>
                    <Label>値引き理由（任意）</Label>
                    <Input
                      value={item.discountReason || ''}
                      onChange={(e) => updateItem(index, 'discountReason', e.target.value)}
                      placeholder="値引きの理由を入力（例：新規顧客割引、キャンペーン等）"
                    />
                  </div>
                )}

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
                    <Label>{item.itemType === 'discount' ? '値引き額' : '単価'}</Label>
                    <Input
                      type="number"
                      {...(item.itemType === 'discount' ? {} : { min: "0" })}
                      step="0.01"
                      value={item.itemType === 'discount' ? Math.abs(item.unitPrice) : item.unitPrice}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateItem(index, 'unitPrice', item.itemType === 'discount' ? -Math.abs(value) : value);
                      }}
                      className={item.itemType === 'discount' ? 'text-red-600' : ''}
                    />
                  </div>
                  <div>
                    <Label>小計</Label>
                    <Input
                      value={item.itemType === 'discount' ? `-¥${Math.abs(item.amount).toLocaleString()}` : `¥${item.amount.toLocaleString()}`}
                      readOnly
                      className={`bg-gray-50 ${item.itemType === 'discount' ? 'text-red-600' : ''}`}
                    />
                  </div>
                  <div>
                    <Label>税率</Label>
                    <select
                      value={String(item.taxRate || 10)}
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
                      value={`¥${item.taxAmount.toLocaleString()}`}
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
          <Textarea
            placeholder="備考・特記事項があれば入力してください"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
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

      {/* Submit Buttons */}
      <div className="flex gap-4 justify-end">
        <Button
          variant="outline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Button] Draft save button clicked');
            console.log('[Button] Current state - isLoading:', isLoading);
            console.log('[Button] Current state - selectedCustomerId:', selectedCustomerId);
            console.log('[Button] Current state - items:', items);
            handleSubmit('draft');
          }}
          disabled={isLoading}
          type="button"
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Edit className="mr-2 h-4 w-4" />
          )}
          下書き保存
        </Button>
        <Button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Button] Create quote button clicked');
            console.log('[Button] Current state - isLoading:', isLoading);
            console.log('[Button] Current state - selectedCustomerId:', selectedCustomerId);
            console.log('[Button] Current state - items:', items);
            handleSubmit('sent');
          }}
          disabled={isLoading}
          type="button"
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