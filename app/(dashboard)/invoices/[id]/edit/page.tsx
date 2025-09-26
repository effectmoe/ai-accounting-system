'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Trash2, MessageSquare, ChevronDown, CheckCircle, FileText, Edit, ArrowLeft, History } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { safeFormatDate, safeCreateDate } from '@/lib/date-utils';
import AIChatDialog from '@/components/ai-chat-dialog';
import AIConversationHistoryDialog from '@/components/ai-conversation-history-dialog';
import { calculateDueDate } from '@/utils/payment-terms';

import { logger } from '@/lib/logger';
interface InvoiceItem {
  description: string;
  itemName?: string;  // 商品名（品目名）
  notes?: string;     // 商品説明・備考
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
  title?: string;
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
  const [showAIHistory, setShowAIHistory] = useState(false);
  const [aiDataApplied, setAiDataApplied] = useState(false);
  
  // 顧客情報
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  
  // 商品情報
  const [products, setProducts] = useState<Product[]>([]);
  
  // 請求書情報
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [title, setTitle] = useState(''); // 請求書のタイトル
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
      logger.debug('[EditPage] fetchInvoice called with ID:', params.id);
      logger.debug('[EditPage] ID type:', typeof params.id, 'Length:', params.id?.length);
      
      const response = await fetch(`/api/invoices/${params.id}`);
      if (!response.ok) {
        logger.error('[EditPage] Failed to fetch invoice. Status:', response.status);
        logger.error('[EditPage] Response:', await response.text());
        throw new Error('Failed to fetch invoice');
      }
      const data = await response.json();
      
      logger.debug('[EditPage] Invoice data received:', {
        id: data._id,
        hasAiConversationId: !!data.aiConversationId,
        aiConversationId: data.aiConversationId
      });
      
      // 請求書データをフォームに設定
      setInvoice(data);
      setSelectedCustomerId(data.customerId || '');
      setTitle(data.title || ''); // タイトルを設定
      
      // 顧客名の設定 - 既存顧客の場合は顧客名も設定
      if (data.customer) {
        setCustomerName(data.customer.companyName || data.customer.name || '');
      } else if (data.customerSnapshot) {
        setCustomerName(data.customerSnapshot.companyName || '');
      }
      
      const issueDateValue = safeCreateDate(data.issueDate || data.invoiceDate);
      const dueDateValue = safeCreateDate(data.dueDate);
      
      setInvoiceDate(issueDateValue ? format(issueDateValue, 'yyyy-MM-dd') : '');
      setDueDate(dueDateValue ? format(dueDateValue, 'yyyy-MM-dd') : '');

      // デバッグ: アイテムデータの確認
      console.log('[DEBUG] Loading invoice items:', (data.items || []).map((item, index) => ({
        index,
        itemName: item.itemName,
        description: item.description,
        unitPrice: item.unitPrice,
        productId: item.productId,
        hasProductId: !!item.productId
      })));

      setItems(data.items || []);
      setNotes(data.notes || '');
      setPaymentMethod(data.paymentMethod || 'bank_transfer');
      setAiDataApplied(data.isGeneratedByAI || false);
    } catch (error) {
      logger.error('Error fetching invoice:', error);
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
      logger.error('Error fetching customers:', error);
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
      logger.error('Error fetching products:', error);
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

    if (items.length === 0 || items.every(item => !item.description && !item.itemName)) {
      setError('少なくとも1つの明細を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.debug('[EditPage] Saving invoice with:', {
        selectedCustomerId,
        customerName,
        invoiceDate,
        dueDate,
        items: items.length,
        originalInvoice: {
          customerId: invoice?.customerId,
          customerName: invoice?.customer?.companyName || invoice?.customerSnapshot?.companyName
        }
      });
      
      // 顧客IDの決定ロジック
      let customerId = selectedCustomerId;
      
      // AIチャットで顧客名が変更された場合の処理
      if (customerName && !selectedCustomerId) {
        // 元の請求書の顧客名と比較
        const originalCustomerName = invoice?.customer?.companyName || invoice?.customer?.name || invoice?.customerSnapshot?.companyName;
        
        logger.debug('[EditPage] Customer name comparison:', {
          current: customerName,
          original: originalCustomerName,
          isSame: customerName === originalCustomerName,
          originalCustomerId: invoice?.customerId
        });
        
        // 顧客名が変更されていない場合は元の顧客IDを使用
        if (customerName === originalCustomerName && invoice?.customerId) {
          customerId = invoice.customerId;
          logger.debug('[EditPage] Using original customer ID:', customerId);
        } else {
          // 既存顧客リストから検索
          const existingCustomer = customers.find(c => 
            c.companyName === customerName || c.name === customerName
          );
          
          if (existingCustomer) {
            logger.debug('[EditPage] Found existing customer:', existingCustomer._id);
            customerId = existingCustomer._id;
          } else {
            // 新規顧客として作成
            logger.debug('[EditPage] Creating new customer:', customerName);
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
            logger.debug('[EditPage] New customer created with ID:', customerId);
          }
        }
      }

      // 請求書を更新
      const invoiceData = {
        customerId,
        title, // タイトルを追加
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        items: items.filter(item => item.description || item.itemName),
        notes,
        paymentMethod,
        aiConversationId: invoice?.aiConversationId || undefined,
      };
      
      logger.debug('[EditPage] Sending invoice update:', JSON.stringify(invoiceData, null, 2));

      logger.debug('[EditPage] Making PUT request to:', `/api/invoices/${params.id}`);
      logger.debug('[EditPage] Params ID:', params.id);
      
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
      logger.error('Error updating invoice:', error);
      setError(error instanceof Error ? error.message : '請求書の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 明細行を更新
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    logger.debug('[EditPage] updateItem called:', { index, field, value, currentItems: items.length });
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    logger.debug('[EditPage] Updated item:', { index, field, oldValue: items[index]?.[field], newValue: value });

    // 金額と税額を自動計算
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
      const quantity = field === 'quantity' ? Number(value) || 0 : newItems[index].quantity || 0;
      const unitPrice = field === 'unitPrice' ? Number(value) || 0 : newItems[index].unitPrice || 0;
      const taxRate = field === 'taxRate' ? Number(value) || 0 : newItems[index].taxRate || 0;

      const amount = Math.floor(quantity * unitPrice);
      const taxAmount = Math.floor(amount * taxRate);

      newItems[index].amount = amount;
      newItems[index].taxAmount = taxAmount;
    }

    setItems(newItems);
    logger.debug('[EditPage] Items state updated, new length:', newItems.length);
  };

  // 商品を選択した際の処理
  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      // 商品選択をクリアした場合
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        productId: undefined,
      };
      setItems(newItems);
      return;
    }

    const selectedProduct = products.find(p => p._id === productId);
    if (selectedProduct) {
      const newItems = [...items];
      const quantity = newItems[index].quantity || 1;
      const amount = Math.floor(quantity * selectedProduct.unitPrice);
      const taxAmount = Math.floor(amount * selectedProduct.taxRate);
      
      newItems[index] = {
        ...newItems[index],
        productId: selectedProduct._id,
        itemName: selectedProduct.productName,
        description: selectedProduct.productName, // 後方互換性のため
        unitPrice: selectedProduct.unitPrice,
        taxRate: selectedProduct.taxRate,
        unit: selectedProduct.unit,
        amount: amount,
        taxAmount: taxAmount,
      };
      setItems(newItems);
    }
  };

  // 商品として登録する処理
  const handleRegisterAsProduct = async (index: number) => {
    const item = items[index];
    const productName = item.itemName || item.description;
    if (!productName) {
      setError('商品名を入力してください');
      return;
    }

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productName,
          productCode: `PROD-${Date.now()}`, // 仮の商品コード
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          unit: item.unit || '個',
          isActive: true,
          notes: item.notes || '', // 商品説明も保存
        }),
      });

      if (!response.ok) {
        throw new Error('商品の登録に失敗しました');
      }

      const newProduct = await response.json();
      
      // 商品リストを再取得
      await fetchProducts();
      
      // 明細行に商品IDを設定
      const newItems = [...items];
      newItems[index].productId = newProduct._id;
      setItems(newItems);
      
      setSuccessMessage('商品を登録しました');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      logger.error('Error registering product:', error);
      setError('商品の登録に失敗しました');
    }
  };

  // 明細行を追加
  const addItem = () => {
    setItems([...items, {
      description: '',
      itemName: '',
      notes: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxRate: 0.1,
      taxAmount: 0,
      unit: '個',
    }]);
  };

  // 明細行を削除
  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // AI会話からのデータを適用
  const handleAIComplete = (data: any) => {
    logger.debug('[EditPage] AI Complete data received:', data);
    logger.debug('[EditPage] Current customer name state:', customerName);
    logger.debug('[EditPage] Current selected customer ID:', selectedCustomerId);
    
    // itemsデータの詳細をログ出力
    if (data.items && Array.isArray(data.items)) {
      logger.debug('[EditPage] Items received from AI:', data.items.length);
      logger.debug('[EditPage] Raw items data:', JSON.stringify(data.items, null, 2));
      data.items.forEach((item, index) => {
        logger.debug(`[EditPage] Item ${index}:`, JSON.stringify({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount
        }, null, 2));
      });
    } else {
      logger.debug('[EditPage] No items data received from AI');
    }
    
    // 顧客名は明示的に変更された場合のみ更新（Unknown Customerは無視）
    if (data.customerName && data.customerName !== 'Unknown Customer' && data.customerName !== '未設定顧客') {
      logger.debug('[EditPage] Updating customer name to:', data.customerName);
      logger.debug('[EditPage] Previous customer name was:', customerName);
      
      // まず既存顧客リストから該当する顧客を探す
      const existingCustomer = customers.find(c => 
        c.companyName === data.customerName || c.name === data.customerName
      );
      
      if (existingCustomer) {
        logger.debug('[EditPage] Found existing customer:', existingCustomer._id, existingCustomer.companyName || existingCustomer.name);
        // 既存顧客として選択
        setSelectedCustomerId(existingCustomer._id);
        setCustomerName(''); // 新規顧客名はクリア
        logger.debug('[EditPage] Selected existing customer ID:', existingCustomer._id);
      } else {
        logger.debug('[EditPage] Customer not found in existing list, setting as new customer');
        // 新規顧客として設定
        setCustomerName(data.customerName);
        setSelectedCustomerId('');
        logger.debug('[EditPage] Set as new customer name:', data.customerName);
      }
    } else {
      logger.debug('[EditPage] Customer name not updated. Current:', data.customerName);
      logger.debug('[EditPage] Reason: either null/empty, Unknown Customer, or 未設定顧客');
      // 顧客名が空の場合、既存の顧客情報を保持
      if (!data.customerName && invoice) {
        if (invoice.customerId && !selectedCustomerId) {
          setSelectedCustomerId(invoice.customerId);
        } else if (invoice.customer?.companyName && !customerName) {
          setCustomerName(invoice.customer.companyName);
        }
      }
    }
    
    // タイトルの更新
    if (data.title) {
      logger.debug('[EditPage] Updating title to:', data.title);
      setTitle(data.title);
    }
    
    // 日付は有効な値の場合のみ更新（1970-01-01は無視）
    if (data.invoiceDate && data.invoiceDate !== '1970-01-01' && new Date(data.invoiceDate).getFullYear() > 2000) {
      logger.debug('[EditPage] Updating invoice date to:', data.invoiceDate);
      // 日付フォーマットを統一（yyyy-MM-dd形式）
      const invoiceDateFormatted = data.invoiceDate.includes('T') 
        ? format(new Date(data.invoiceDate), 'yyyy-MM-dd')
        : data.invoiceDate;
      setInvoiceDate(invoiceDateFormatted);
    } else {
      logger.debug('[EditPage] Invoice date not updated. Current:', data.invoiceDate);
    }
    
    if (data.dueDate && data.dueDate !== '1970-01-01' && new Date(data.dueDate).getFullYear() > 2000) {
      logger.debug('[EditPage] Updating due date to:', data.dueDate);
      // 日付フォーマットを統一（yyyy-MM-dd形式）
      const dueDateFormatted = data.dueDate.includes('T') 
        ? format(new Date(data.dueDate), 'yyyy-MM-dd')
        : data.dueDate;
      setDueDate(dueDateFormatted);
    } else {
      logger.debug('[EditPage] Due date not updated. Current:', data.dueDate);
    }
    
    // itemsは常に更新（AIが明示的に変更したもの） - 重複回避のため完全置換
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      logger.debug('[EditPage] Updating items from AI (replacing all existing items):', JSON.stringify(data.items, null, 2));
      logger.debug('[EditPage] Current items before replacement:', items.length);
      logger.debug('[EditPage] New items detail:');
      data.items.forEach((item, index) => {
        logger.debug(`[EditPage] Item ${index}:`, JSON.stringify({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxAmount: item.taxAmount,
          total: item.amount + item.taxAmount
        }, null, 2));
      });

      // 重複を避けるため、既存のitemsを完全にクリアしてから設定
      logger.debug('[EditPage] Clearing existing items to prevent duplication');
      setItems([]); // 一旦クリア

      // フレームの次のタイミングで新しいアイテムを設定
      setTimeout(() => {
        logger.debug('[EditPage] Setting new items after clearing');
        setItems(data.items);
      }, 0);
    } else {
      logger.debug('[EditPage] No items to update from AI data');
    }
    
    // 備考は内容がある場合のみ更新
    if (data.notes && data.notes.trim() !== '') {
      setNotes(data.notes);
    }
    
    // 支払方法は有効な値の場合のみ更新
    if (data.paymentMethod && ['bank_transfer', 'credit_card', 'cash', 'other'].includes(data.paymentMethod)) {
      setPaymentMethod(data.paymentMethod);
    }
    
    // AI会話IDを更新
    if (data.aiConversationId) {
      logger.debug('[EditPage] Updating aiConversationId to:', data.aiConversationId);
      setInvoice(prev => prev ? { ...prev, aiConversationId: data.aiConversationId } : prev);
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

            {/* タイトル */}
            <div>
              <Label htmlFor="title" className="text-sm font-medium text-gray-700 mb-1 block">件名</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="請求書の件名を入力（例：ウェブサイト制作費用請求書）"
                className="bg-white"
              />
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
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-sm font-medium text-gray-700">明細 {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* 上段：品目情報 */}
                    <div className="mb-4 space-y-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">品目・商品</div>
                      
                      {/* 商品選択ドロップダウン */}
                      <select
                        value={item.productId || ''}
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      >
                        <option value="">既存商品から選択...</option>
                        {products.map(product => (
                          <option key={product._id} value={product._id}>
                            {product.productName} - ¥{product.unitPrice.toLocaleString()}
                          </option>
                        ))}
                      </select>
                      
                      {/* 商品名入力フィールド */}
                      <Input
                        type="text"
                        value={item.itemName || item.description || ''}
                        onChange={(e) => {
                          // 商品名を変更したら、productIdをクリア（カスタム商品として扱う）
                          updateItem(index, 'productId', undefined);
                          updateItem(index, 'itemName', e.target.value);
                          updateItem(index, 'description', e.target.value); // 後方互換性
                        }}
                        placeholder="品目名を入力"
                        className="bg-white"
                      />
                      {/* 選択された商品情報の表示 */}
                      {item.productId && (
                        <div className="text-xs text-gray-500 mt-1">
                          元の商品: {products.find(p => p._id === item.productId)?.productName || '不明'}
                          <button
                            type="button"
                            onClick={() => {
                              updateItem(index, 'productId', undefined);
                            }}
                            className="ml-2 text-blue-500 hover:text-blue-700"
                          >
                            [商品選択を解除]
                          </button>
                        </div>
                      )}

                      {/* 商品説明・備考フィールド（常に表示） */}
                      <div className="mt-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">商品説明・備考</label>
                        <Textarea
                          value={item.notes || ''}
                          onChange={(e) => {
                            logger.debug('[EditPage] Textarea onChange triggered:', { index, value: e.target.value, currentNotes: item.notes });
                            updateItem(index, 'notes', e.target.value);
                          }}
                          placeholder="商品の詳細説明や備考を入力..."
                          rows={2}
                          className="bg-white text-sm"
                        />
                      </div>
                      
                      {/* 商品として登録ボタン */}
                      {!item.productId && (item.itemName || item.description) && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRegisterAsProduct(index)}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          商品として登録
                        </Button>
                      )}
                    </div>
                    
                    {/* 下段：数値情報 */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {/* 数量 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">数量</label>
                        <Input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => {
                            updateItem(index, 'quantity', parseInt(e.target.value) || 0);
                          }}
                          min="0"
                          className="text-center bg-white"
                        />
                      </div>
                      
                      {/* 単位 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">単位</label>
                        <Input
                          value={item.unit || '個'}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="text-center bg-white"
                        />
                      </div>
                      
                      {/* 単価 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">単価</label>
                        <Input
                          type="number"
                          value={item.unitPrice || 0}
                          onChange={(e) => {
                            updateItem(index, 'unitPrice', parseInt(e.target.value) || 0);
                          }}
                          min="0"
                          className="text-right bg-white"
                        />
                      </div>
                      
                      {/* 税率 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">税率</label>
                        <select
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value))}
                          className="w-full px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center"
                        >
                          <option value="0">0%</option>
                          <option value="0.08">8%</option>
                          <option value="0.1">10%</option>
                        </select>
                      </div>
                      
                      {/* 小計（税抜） */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">小計（税抜）</label>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-right text-sm font-medium">
                          ¥{item.amount.toLocaleString()}
                        </div>
                      </div>
                      
                      {/* 金額（税込） */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">金額（税込）</label>
                        <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-right text-sm font-semibold text-blue-700">
                          ¥{(item.amount + item.taxAmount).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                {/* AI会話履歴ボタン */}
                <div className="flex justify-start">
                  <Button
                    type="button"
                    variant={invoice?.aiConversationId ? "outline" : "ghost"}
                    onClick={() => setShowAIHistory(true)}
                    disabled={!invoice?.aiConversationId}
                    className={invoice?.aiConversationId ? "" : "opacity-50 cursor-not-allowed"}
                  >
                    <History className="mr-2 h-4 w-4" />
                    AI会話履歴
                    {invoice?.aiConversationId && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        あり
                      </span>
                    )}
                  </Button>
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
      
      {/* AI会話ダイアログ */}
      <AIChatDialog
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        onComplete={handleAIComplete}
        companyId={invoice?.companyId || 'default-company'}
        initialInvoiceData={{
          ...invoice,
          // 現在の編集フォームの状態を含める
          customerName: customerName || customers.find(c => c._id === selectedCustomerId)?.companyName || invoice?.customer?.companyName || '',
          customerId: selectedCustomerId || invoice?.customerId,
          invoiceDate: invoiceDate,
          dueDate: dueDate,
          items: items,
          notes: notes,
          paymentMethod: paymentMethod,
          subtotal: subtotal,
          taxAmount: taxAmount,
          totalAmount: totalAmount
        }}
        mode="edit"
        companyId="default-company"
        existingConversationId={invoice?.aiConversationId}
        invoiceId={invoice?._id}
      />
      
      {/* AI会話履歴ダイアログ */}
      <AIConversationHistoryDialog
        isOpen={showAIHistory}
        onClose={() => setShowAIHistory(false)}
        conversationId={invoice?.aiConversationId}
        invoiceId={invoice?._id}
      />
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