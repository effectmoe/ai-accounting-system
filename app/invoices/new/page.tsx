'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { logger } from '@/lib/logger';
// Selectコンポーネントは使用せず、ネイティブのselect要素を使用
import { Loader2, Plus, Trash2, Sparkles, MessageSquare, ChevronDown, CheckCircle, FileText, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import AIChatDialog from '@/components/ai-chat-dialog';
import { calculateDueDate } from '@/utils/payment-terms';
import { SearchableSelect } from '@/components/ui/SearchableSelect';

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
  company?: string; // 追加: 古いデータ形式に対応
  [key: string]: any; // その他のプロパティに対応
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
  
  // 会社情報
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  
  // 仕入先見積書との関連
  const [sourceSupplierQuoteId, setSourceSupplierQuoteId] = useState<string | null>(null);
  const [sourceSupplierQuote, setSourceSupplierQuote] = useState<any>(null);
  
  // 請求書情報
  const [title, setTitle] = useState(''); // 請求書のタイトル
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
        // 支払期限のデフォルト設定があれば適用
        if (data.companyInfo?.default_payment_terms) {
          const days = data.companyInfo.default_payment_terms;
          const newDueDate = new Date();
          newDueDate.setDate(newDueDate.getDate() + days);
          setDueDate(format(newDueDate, 'yyyy-MM-dd'));
        }
      }
    } catch (error) {
      logger.error('Error fetching company info:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      logger.debug('Fetching customers...');
      const response = await fetch('/api/customers');
      logger.debug('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        logger.debug('Fetched data:', data);
        logger.debug('Data type:', typeof data);
        logger.debug('Is array:', Array.isArray(data));
        logger.debug('Has customers property:', data && typeof data === 'object' && 'customers' in data);
        
        // データ構造に応じて顧客リストを設定
        let rawCustomers: any[] = [];
        
        if (data.customers && Array.isArray(data.customers)) {
          logger.debug('Setting customers from data.customers:', data.customers);
          rawCustomers = data.customers;
        } else if (Array.isArray(data)) {
          logger.debug('Setting customers from array:', data);
          rawCustomers = data;
        } else {
          logger.error('Unexpected customer data format:', data);
          // エラーメッセージは表示しないように修正
          logger.warn('No customers found, but this is not an error');
          setCustomers([]);
          return;
        }
        
        // 有効な顧客データのみをフィルタリング（より厳密なチェック）
        const validCustomers = rawCustomers.filter((c: any) => {
          // nullやundefinedをチェック
          if (!c || typeof c !== 'object') {
            logger.warn('Invalid customer data:', c);
            return false;
          }
          
          // _idプロパティの存在をチェック
          if (!('_id' in c) || !c._id) {
            logger.warn('Customer missing _id:', c);
            return false;
          }
          
          // 少なくとも1つの名前フィールドが存在することを確認
          const hasName = ('companyName' in c && c.companyName) ||
                         ('name' in c && c.name) ||
                         ('company' in c && c.company);
          
          if (!hasName) {
            logger.warn('Customer missing name fields:', c);
          }
          
          return true;
        });
        
        logger.debug('Valid customers count:', validCustomers.length);
        if (validCustomers.length > 0) {
          logger.debug('First valid customer structure:', validCustomers[0]);
        }
        
        setCustomers(validCustomers);
      } else {
        logger.error('Failed to fetch customers:', response.status);
        const errorText = await response.text();
        logger.error('Error response:', errorText);
        // エラーメッセージは表示しないように修正
        logger.warn('Failed to fetch customers, but continuing without error display');
        setCustomers([]);
      }
    } catch (error) {
      logger.error('Failed to fetch customers:', error);
      // エラーメッセージは表示しないように修正
      logger.warn('Error fetching customers, but continuing without error display');
      setCustomers([]);
    }
  };

  // 商品一覧を取得
  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?isActive=true');
      if (response.ok) {
        const data = await response.json();
        logger.debug('Products data:', data);
        // データ構造に応じて商品リストを設定
        let rawProducts: any[] = [];
        
        if (data.products && Array.isArray(data.products)) {
          rawProducts = data.products;
        } else if (Array.isArray(data)) {
          rawProducts = data;
        } else {
          logger.error('Unexpected product data format:', data);
          setProducts([]);
          return;
        }
        
        // 有効な商品データのみをフィルタリング
        const validProducts = rawProducts.filter((p: any) => {
          return p && typeof p === 'object' && '_id' in p && p._id && p.productName;
        });
        
        setProducts(validProducts);
      } else {
        logger.error('Failed to fetch products:', response.status);
      }
    } catch (error) {
      logger.error('Failed to fetch products:', error);
      setProducts([]);
    }
  };

  // デフォルト銀行口座情報と請求書設定を取得
  const fetchDefaultBankInfo = async () => {
    try {
      let defaultNotes = '';
      let hasSetNotes = false;
      let paymentTerms = '';
      
      // 自社情報から請求書設定を取得
      const companyResponse = await fetch('/api/company-info');
      if (companyResponse.ok) {
        const companyData = await companyResponse.json();
        if (companyData.success && companyData.companyInfo) {
          // 支払い条件のデフォルトを設定
          if (companyData.companyInfo.payment_terms) {
            paymentTerms = companyData.companyInfo.payment_terms;
            // payment_termsをnotesにも含める
            defaultNotes = `【支払い条件】\n${paymentTerms}\n\n`;
            
            // 支払い条件に基づいて支払期限を計算
            const calculatedDueDate = calculateDueDate(new Date(), paymentTerms);
            setDueDate(format(calculatedDueDate, 'yyyy-MM-dd'));
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
        logger.debug('Bank data:', bankData);
        
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
      logger.error('Failed to fetch default bank info:', error);
    }
  };

  // 仕入先見積書データを取得
  const fetchSupplierQuote = async (id: string) => {
    try {
      const response = await fetch(`/api/supplier-quotes/${id}`);
      if (!response.ok) throw new Error('Failed to fetch supplier quote');
      
      const supplierQuote = await response.json();
      setSourceSupplierQuote(supplierQuote);
      
      // 仕入先見積書のデータを請求書フォームに反映
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
      logger.error('Error analyzing conversation:', error);
      setError('会話の解析に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // AIチャットダイアログからのデータを適用
  const handleAIChatComplete = async (invoiceData: any) => {
    console.log('🔄 [DEBUG] handleAIChatComplete called');
    console.log('🔄 [DEBUG] Raw invoiceData:', JSON.stringify(invoiceData, null, 2));
    
    logger.debug('[InvoiceNew] Received data from AI chat:', invoiceData);
    logger.debug('[InvoiceNew] Data details:', {
      items: invoiceData.items,
      subtotal: invoiceData.subtotal,
      taxAmount: invoiceData.taxAmount,
      totalAmount: invoiceData.totalAmount,
      customerName: invoiceData.customerName
    });
    
    // 各項目の詳細をログ出力
    if (invoiceData.items && invoiceData.items.length > 0) {
      console.log('✅ [DEBUG] Items found:', invoiceData.items.length);
      console.log('✅ [DEBUG] Items array type check:', Array.isArray(invoiceData.items));
      logger.debug('[InvoiceNew] Items received:');
      invoiceData.items.forEach((item: any, index: number) => {
        console.log(`🔄 [DEBUG] Item ${index}:`, {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxAmount: item.taxAmount,
          total: item.amount + item.taxAmount
        });
        logger.debug(`[InvoiceNew] Item ${index}:`, {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          taxAmount: item.taxAmount,
          total: item.amount + item.taxAmount
        });
      });
    } else {
      console.log('❌ [DEBUG] No items found in invoiceData');
      console.log('❌ [DEBUG] invoiceData.items is:', invoiceData.items);
      console.log('❌ [DEBUG] typeof invoiceData.items:', typeof invoiceData.items);
      console.log('❌ [DEBUG] Is array?', Array.isArray(invoiceData.items));
    }
    
    // notesのデフォルト値を設定
    if (!invoiceData.notes && defaultBankInfo) {
      invoiceData.notes = defaultBankInfo;
      console.log('🔄 [DEBUG] Added default bank info to notes');
    }
    
    // aiConversationIdを確保
    invoiceData.aiConversationId = invoiceData.aiConversationId || Date.now().toString();
    console.log('🔄 [DEBUG] Set aiConversationId:', invoiceData.aiConversationId);
    
    // まずフォームにデータを適用（ユーザーが内容を確認できるように）
    console.log('🔄 [DEBUG] Applying data to form first...');
    applyInvoiceData(invoiceData);
    setAiConversationId(invoiceData.aiConversationId);
    console.log('✅ [DEBUG] Data applied to form successfully');
    
    // 状態更新を待ってからAI適用フラグを設定
    setTimeout(() => {
      console.log('🔄 [DEBUG] Closing AI chat dialog and setting AI data applied flag');
      setShowAIChat(false);
      setAiDataApplied(true);
      setSuccessMessage('AI会話から請求書データを取得しました。内容を確認の上、保存してください。');
    }, 100);
    
    // 自動保存は行わず、ユーザーが手動で保存するようにする
    // これにより、ユーザーが内容を確認・修正してから保存できる
    console.log('✅ [DEBUG] AI chat data has been applied to form. User can now review and save manually.');
  };

  // 請求書データを適用する共通関数
  const applyInvoiceData = (data: any) => {
    console.log('🔄 [DEBUG] applyInvoiceData called with:', JSON.stringify(data, null, 2));
    
    // 顧客情報
    if (data.customerId) {
      console.log('🔄 [DEBUG] Setting selectedCustomerId:', data.customerId);
      setSelectedCustomerId(data.customerId);
    } else if (data.customerName) {
      console.log('🔄 [DEBUG] Processing customerName:', data.customerName);
      
      // 既存の顧客から名前で検索
      const existingCustomer = customers.find(customer => {
        if (!customer) return false;
        
        const customerNameToCheck = data.customerName.toLowerCase().trim();
        
        // 複数のフィールドで検索
        if ('companyName' in customer && customer.companyName) {
          if (customer.companyName.toLowerCase().includes(customerNameToCheck) || customerNameToCheck.includes(customer.companyName.toLowerCase())) {
            return true;
          }
        }
        if ('name' in customer && (customer as any).name) {
          if ((customer as any).name.toLowerCase().includes(customerNameToCheck) || customerNameToCheck.includes((customer as any).name.toLowerCase())) {
            return true;
          }
        }
        if ('company' in customer && (customer as any).company) {
          if ((customer as any).company.toLowerCase().includes(customerNameToCheck) || customerNameToCheck.includes((customer as any).company.toLowerCase())) {
            return true;
          }
        }
        
        return false;
      });
      
      if (existingCustomer) {
        console.log('🔄 [DEBUG] Found existing customer:', existingCustomer._id);
        setSelectedCustomerId(existingCustomer._id);
        setCustomerName(''); // 既存顧客が選択された場合は手入力をクリア
      } else {
        console.log('🔄 [DEBUG] Setting customerName for manual entry:', data.customerName);
        setSelectedCustomerId('');
        setCustomerName(data.customerName);
      }
    }
    
    // タイトル
    if (data.title) {
      console.log('🔄 [DEBUG] Setting title:', data.title);
      setTitle(data.title);
    }
    
    // 日付
    if (data.invoiceDate) {
      const formattedDate = format(new Date(data.invoiceDate), 'yyyy-MM-dd');
      console.log('🔄 [DEBUG] Setting invoiceDate:', formattedDate);
      setInvoiceDate(formattedDate);
    }
    if (data.dueDate) {
      const formattedDate = format(new Date(data.dueDate), 'yyyy-MM-dd');
      console.log('🔄 [DEBUG] Setting dueDate:', formattedDate);
      setDueDate(formattedDate);
    }
    
    // 明細
    if (data.items && data.items.length > 0) {
      console.log('🔄 [DEBUG] Setting items, count:', data.items.length);
      console.log('🔄 [DEBUG] Items data:', data.items);
      
      // 明細データを適切な形式に変換
      const processedItems = data.items.map((item: any, index: number) => {
        console.log(`🔄 [DEBUG] Processing item ${index}:`, item);
        
        const processedItem = {
          description: item.description || '',
          quantity: parseFloat(item.quantity) || 1,
          unitPrice: parseFloat(item.unitPrice) || 0,
          amount: parseFloat(item.amount) || parseFloat(item.unitPrice) * parseFloat(item.quantity) || 0,
          taxRate: parseFloat(item.taxRate) || 0.1,
          taxAmount: parseFloat(item.taxAmount) || 0,
          unit: item.unit || '件',
          productId: item.productId || '',
        };
        
        // taxAmountが設定されていない場合は計算
        if (!item.taxAmount && processedItem.amount > 0) {
          processedItem.taxAmount = Math.round(processedItem.amount * processedItem.taxRate);
        }
        
        console.log(`🔄 [DEBUG] Processed item ${index}:`, processedItem);
        return processedItem;
      });
      
      setItems(processedItems);
      console.log('🔄 [DEBUG] All items processed and set, count:', processedItems.length);
      console.log('🔄 [DEBUG] Processed items array:', processedItems);
    } else {
      console.log('🔄 [DEBUG] No items to process, clearing items list');
      setItems([]);
    }
    
    // その他
    if (data.notes) {
      console.log('🔄 [DEBUG] Setting notes:', data.notes);
      setNotes(data.notes);
    } else if (defaultBankInfo) {
      console.log('🔄 [DEBUG] Setting default bank info as notes:', defaultBankInfo);
      // AI会話で備考が指定されていない場合は、デフォルト銀行口座情報を使用
      setNotes(defaultBankInfo);
    }
    if (data.paymentMethod) {
      console.log('🔄 [DEBUG] Setting paymentMethod:', data.paymentMethod);
      setPaymentMethod(data.paymentMethod);
    }
    
    console.log('✅ [DEBUG] applyInvoiceData completed');
    
    // フォーム状態の最終確認
    setTimeout(() => {
      console.log('🔍 [DEBUG] Final form state check:');
      console.log('  - selectedCustomerId:', selectedCustomerId);
      console.log('  - customerName:', customerName);
      console.log('  - title:', title);
      console.log('  - invoiceDate:', invoiceDate);
      console.log('  - dueDate:', dueDate);
      console.log('  - items count:', items.length);
      console.log('  - notes:', notes);
      console.log('  - paymentMethod:', paymentMethod);
    }, 100);
  };

  // 明細データの変更を監視するuseEffect
  useEffect(() => {
    console.log('🔄 [DEBUG] Items state changed:', items.length, 'items');
    items.forEach((item, index) => {
      console.log(`🔄 [DEBUG] Item ${index}:`, item);
    });
  }, [items]);

  // AIチャット完了後の状態を監視
  useEffect(() => {
    if (aiDataApplied) {
      console.log('🔄 [DEBUG] AI data applied - Form state check:');
      console.log('  - selectedCustomerId:', selectedCustomerId);
      console.log('  - customerName:', customerName);
      console.log('  - title:', title);
      console.log('  - items:', items);
      
      // 明細が空の場合は警告を出す
      if (items.length === 0) {
        console.log('⚠️ [DEBUG] WARNING: AI data applied but no items found!');
      }
    }
  }, [aiDataApplied, selectedCustomerId, customerName, title, items]);

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

  // 商品を商品マスターに登録
  const registerToProductMaster = async (index: number) => {
    const item = items[index];
    if (!item.description || item.unitPrice <= 0) {
      setError('商品名と単価を入力してください');
      return;
    }

    try {
      // 商品コードを自動生成（タイムスタンプベース）
      const productCode = `PROD-${Date.now()}`;
      
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productCode: productCode,  // 必須: 商品コードを追加
          productName: item.description,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          unit: item.unit || '個',
          category: 'その他',
          stockQuantity: 0,  // 必須: 在庫数を追加（デフォルト0）
          isActive: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '商品の登録に失敗しました');
      }

      const newProduct = await response.json();
      
      // 商品リストを再読み込み
      await fetchProducts();
      
      // 登録した商品を選択状態にする
      updateItem(index, 'productId', newProduct._id);
      
      setSuccessMessage(`「${item.description}」を商品マスターに登録しました。右上の「AI会話で修正」ボタンから、引き続き商品の追加や請求書の修正が可能です。`);
      // エラーメッセージをクリア
      setError(null);
    } catch (error) {
      logger.error('Error registering product:', error);
      setError(error instanceof Error ? error.message : '商品の登録に失敗しました');
    }
  };

  // 明細行を更新
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 金額と税額を再計算
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
      const item = newItems[index];
      item.amount = item.quantity * item.unitPrice;
      item.taxAmount = Math.floor(item.amount * item.taxRate);
    }
    
    setItems(newItems);
  };

  // 商品選択時の処理
  const selectProduct = (index: number, productId: string) => {
    const product = products.find(p => p && p._id === productId);
    if (product && product.productName) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        productId: productId,
        description: product.productName,
        unitPrice: product.unitPrice,
        taxRate: product.taxRate,
        unit: product.unit,
        amount: newItems[index].quantity * product.unitPrice,
        taxAmount: Math.floor(newItems[index].quantity * product.unitPrice * product.taxRate),
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
  // データを直接受け取って請求書を保存する関数（AIチャット用）
  const saveInvoiceWithData = async (data: any) => {
    console.log('🔄 [DEBUG] saveInvoiceWithData called');
    console.log('🔄 [DEBUG] Data received:', JSON.stringify(data, null, 2));
    
    logger.debug('[InvoiceNew] saveInvoiceWithData called with:', JSON.stringify(data, null, 2));
    logger.debug('[InvoiceNew] Data breakdown:', {
      hasCustomerId: !!data.customerId,
      hasCustomerName: !!data.customerName,
      customerName: data.customerName,
      itemsCount: data.items?.length || 0,
      items: data.items,
      totalAmount: data.totalAmount,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount
    });
    
    if (!data.customerId && !data.customerName) {
      logger.error('[InvoiceNew] No customer information provided');
      setError('顧客を選択するか、顧客名を入力してください');
      return;
    }

    if (!data.items || data.items.length === 0 || data.items.every((item: any) => !item.description)) {
      logger.error('[InvoiceNew] No valid items provided');
      setError('少なくとも1つの明細を入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 新規顧客の場合は先に作成
      let customerId = data.customerId;
      if (!customerId && data.customerName) {
        logger.debug('Creating new customer:', data.customerName);
        const customerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            companyName: data.customerName
          }),
        });
        
        if (!customerResponse.ok) {
          const errorData = await customerResponse.json();
          logger.error('Customer creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create customer');
        }
        
        const newCustomer = await customerResponse.json();
        customerId = newCustomer._id;
        logger.debug('New customer created:', customerId);
      }

      // 利益計算（仕入先見積書がある場合）
      let costAmount = undefined;
      let profitAmount = undefined;
      let profitMargin = undefined;
      
      if (sourceSupplierQuote) {
        costAmount = sourceSupplierQuote.totalAmount;
        const totalAmount = data.totalAmount || 0;
        profitAmount = totalAmount - costAmount;
        profitMargin = totalAmount > 0 ? (profitAmount / totalAmount) * 100 : 0;
      }

      // 請求書を作成
      const invoiceData = {
        customerId,
        customerName: !customerId ? data.customerName : undefined, // customerIdがない場合はcustomerNameも送る
        title: data.title || '',
        invoiceDate: data.invoiceDate || new Date().toISOString(),
        dueDate: data.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: data.items.filter((item: any) => item.description),
        notes: data.notes || defaultBankInfo || '',
        paymentMethod: data.paymentMethod || '',
        isGeneratedByAI: true,
        aiConversationId: data.aiConversationId || Date.now().toString(),
        sourceSupplierQuoteId,
        costAmount,
        profitAmount,
        profitMargin,
      };

      logger.debug('Creating invoice with data:', JSON.stringify(invoiceData, null, 2));
      logger.debug('Customer info:', { customerId, customerName: data.customerName });
      logger.debug('Items to be created:', invoiceData.items);

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Invoice creation failed:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create invoice');
      }

      const invoice = await response.json();
      
      // 請求書IDの確認
      if (!invoice || !invoice._id) {
        logger.error('Invoice response missing _id:', invoice);
        throw new Error('請求書は作成されましたが、IDが取得できませんでした。請求書一覧から確認してください。');
      }
      
      logger.debug('Invoice created successfully with ID:', invoice._id);
      
      // 仕入先見積書を更新して関連を作成
      if (sourceSupplierQuoteId && invoice._id) {
        try {
          await fetch(`/api/supplier-quotes/${sourceSupplierQuoteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              relatedInvoiceIds: [...(sourceSupplierQuote.relatedInvoiceIds || []), invoice._id]
            }),
          });
        } catch (supplierError) {
          logger.error('Failed to update supplier quote relation:', supplierError);
        }
      }
      
      router.push(`/invoices/${invoice._id}`);
    } catch (error) {
      logger.error('Error saving invoice:', error);
      setError(error instanceof Error ? error.message : '請求書の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

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
        logger.debug('Creating new customer:', customerName);
        const customerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            companyName: customerName
            // メールアドレスは省略（オプショナル）
          }),
        });
        
        if (!customerResponse.ok) {
          const errorData = await customerResponse.json();
          logger.error('Customer creation failed:', errorData);
          throw new Error(errorData.error || 'Failed to create customer');
        }
        
        const newCustomer = await customerResponse.json();
        customerId = newCustomer._id;
        logger.debug('New customer created:', customerId);
      }

      // 利益計算（仕入先見積書がある場合）
      let costAmount = undefined;
      let profitAmount = undefined;
      let profitMargin = undefined;
      
      if (sourceSupplierQuote) {
        costAmount = sourceSupplierQuote.totalAmount;
        const totalAmount = totals.totalAmount;
        profitAmount = totalAmount - costAmount;
        profitMargin = totalAmount > 0 ? (profitAmount / totalAmount) * 100 : 0;
      }

      // 請求書を作成
      const invoiceData = {
        customerId,
        title, // 請求書のタイトル
        invoiceDate: invoiceDate,
        dueDate: dueDate,
        items: items.filter(item => item.description), // 空の明細は除外
        notes,
        paymentMethod,
        isGeneratedByAI: !!aiConversationId,
        aiConversationId,
        sourceSupplierQuoteId,
        costAmount,
        profitAmount,
        profitMargin,
      };

      logger.debug('Creating invoice with data:', invoiceData);

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Invoice creation failed:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to create invoice');
      }

      const invoice = await response.json();
      
      // 請求書IDの確認
      if (!invoice || !invoice._id) {
        logger.error('Invoice response missing _id:', invoice);
        throw new Error('請求書は作成されましたが、IDが取得できませんでした。請求書一覧から確認してください。');
      }
      
      logger.debug('Invoice created successfully with ID:', invoice._id);
      
      // 仕入先見積書を更新して関連を作成
      if (sourceSupplierQuoteId && invoice._id) {
        try {
          await fetch(`/api/supplier-quotes/${sourceSupplierQuoteId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              relatedInvoiceIds: [...(sourceSupplierQuote.relatedInvoiceIds || []), invoice._id]
            }),
          });
        } catch (supplierError) {
          logger.error('Failed to update supplier quote relation:', supplierError);
          // 関連付けの失敗は致命的ではないので続行
        }
      }
      
      router.push(`/invoices/${invoice._id}`);
    } catch (error) {
      logger.error('Error saving invoice:', error);
      setError(error instanceof Error ? error.message : '請求書の作成に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">請求書作成</h1>

      {/* 仕入先見積書との関連情報 */}
      {sourceSupplierQuote && (
        <Card className="mb-6 border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-700">
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
              <div className="mt-4 p-3 bg-white rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-700 mb-1">利益計算</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-600">売価:</span> ¥{totals.totalAmount.toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">利益額:</span> ¥{(totals.totalAmount - sourceSupplierQuote.totalAmount).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">利益率:</span> {totals.totalAmount > 0 ? ((totals.totalAmount - sourceSupplierQuote.totalAmount) / totals.totalAmount * 100).toFixed(1) : 0}%
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
            {/* 顧客情報セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b border-gray-200">顧客情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customer" className="text-sm font-medium text-gray-700 mb-1 block">既存顧客から選択</Label>
                  <SearchableSelect
                    id="customer"
                    value={selectedCustomerId}
                    onChange={(value) => {
                      logger.debug('Selected customer ID:', value);
                      setSelectedCustomerId(value);
                      // 既存顧客を選択した場合、新規顧客名をクリア
                      if (value) {
                        setCustomerName('');
                      }
                    }}
                    options={customers
                      .filter(customer => {
                        // 厳密なチェック: customerが存在し、_idプロパティを持っていることを確認
                        return customer && typeof customer === 'object' && '_id' in customer && customer._id;
                      })
                        .map((customer) => {
                          // 顧客データの存在確認とフィールドの安全な参照
                          let displayName = '名称未設定';
                          
                          // 複数のフィールド名に対応（優先順位順）
                          if (customer && typeof customer === 'object') {
                            if ('companyName' in customer && customer.companyName) {
                              displayName = customer.companyName;
                            } else if ('name' in customer && (customer as any).name) {
                              displayName = (customer as any).name;
                            } else if ('company' in customer && (customer as any).company) {
                              displayName = (customer as any).company;
                            }
                          }
                          
                          return {
                            value: customer._id,
                            label: displayName
                          };
                        })}
                    placeholder="顧客を検索または選択"
                    disabled={!!customerName}
                  />
                </div>
                <div>
                  <Label htmlFor="customerName" className="text-sm font-medium text-gray-700 mb-1 block">または新規顧客名を入力</Label>
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
            </div>

            {/* タイトル */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b border-gray-200">件名</h3>
              <div>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="請求書の件名を入力（例：ウェブサイト制作費用）"
                />
              </div>
            </div>

            {/* 日付情報セクション */}
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
                  />
                </div>
                <div>
                  <Label htmlFor="dueDate" className="text-sm font-medium text-gray-700 mb-1 block">支払期限</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* 明細 */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">請求明細</Label>
                <Button type="button" size="sm" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  明細追加
                </Button>
              </div>
              
              {/* ヘッダー行 */}
              <div className="bg-gray-100 p-3 rounded-t-lg border border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-5">品目・商品</div>
                  <div className="col-span-1 text-center">数量</div>
                  <div className="col-span-1 text-center">単位</div>
                  <div className="col-span-2 text-right">単価</div>
                  <div className="col-span-2 text-right">金額（税込）</div>
                  <div className="col-span-1"></div>
                </div>
              </div>
              
              {/* 明細行 */}
              <div className="space-y-3 border-x border-b border-gray-200 rounded-b-lg p-3">
                {items
                  .filter((item, index) => item !== undefined && item !== null)
                  .map((item, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    {/* メイン行 */}
                    <div className="grid grid-cols-12 gap-4 items-center mb-3">
                      <div className="col-span-5">
                        <div className="flex items-center gap-2">
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
                            className="w-[350px] rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">商品マスターから選択...</option>
                            {products
                              .filter(product => product && product._id)
                              .map((product) => (
                                <option key={product._id} value={product._id}>
                                  {product.productName || '商品名未設定'} (¥{(product.unitPrice || 0).toLocaleString()})
                                </option>
                              ))}
                          </select>
                          <Input
                            placeholder="品目名を入力"
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            className="flex-1 min-w-[350px]"
                          />
                          {/* 商品マスター登録ボタン - AIが作成した新しい商品の場合のみ表示 */}
                          {!item.productId && item.description && item.unitPrice > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => registerToProductMaster(index)}
                              className="whitespace-nowrap"
                              title="この商品を商品マスターに登録"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              登録
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Input
                          type="number"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="text-center"
                        />
                      </div>
                      <div className="col-span-1">
                        <Input
                          placeholder="個"
                          value={item.unit || ''}
                          onChange={(e) => updateItem(index, 'unit', e.target.value)}
                          className="text-center"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">¥</span>
                          <Input
                            type="number"
                            placeholder="0"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="pl-8 text-right"
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-right font-medium text-lg">
                          ¥{(item.amount + item.taxAmount).toLocaleString()}
                        </div>
                      </div>
                      <div className="col-span-1 text-center">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* 詳細行 */}
                    <div className="grid grid-cols-12 gap-4 items-center pt-3 border-t border-gray-100">
                      <div className="col-span-5 flex items-center gap-2 text-sm text-gray-600">
                        <span>消費税率:</span>
                        <select
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value))}
                          className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value={0.10}>10%</option>
                          <option value={0.08}>8%（軽減税率）</option>
                          <option value={0.00}>0%（非課税）</option>
                        </select>
                      </div>
                      <div className="col-span-7 flex justify-end items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">小計:</span>
                          <span className="font-medium">¥{item.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">消費税:</span>
                          <span className="font-medium">¥{item.taxAmount.toLocaleString()}</span>
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
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">小計:</span>
                    <span className="text-lg font-medium">¥{totals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">消費税:</span>
                    <span className="text-lg font-medium">¥{totals.taxAmount.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-gray-900">請求金額合計:</span>
                      <span className="text-2xl font-bold text-blue-600">¥{totals.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* その他情報セクション */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 pb-2 border-b border-gray-200">その他情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod" className="text-sm font-medium text-gray-700 mb-1 block">支払方法</Label>
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
              </div>
              <div>
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-1 block">備考</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="支払い条件、振込先情報、その他の注意事項など"
                  rows={4}
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
        onDataApply={handleAIChatComplete}
        companyId={companyInfo?._id || 'default-company'}
        mode={aiDataApplied ? "edit" : "create"}
        initialInvoiceData={aiDataApplied ? {
          customerId: selectedCustomerId,
          customerName: customerName || (() => {
            const customer = customers.find(c => c && c._id === selectedCustomerId);
            if (!customer) return '';
            
            // 安全にプロパティにアクセス
            if ('companyName' in customer && customer.companyName) {
              return customer.companyName;
            } else if ('name' in customer && (customer as any).name) {
              return (customer as any).name;
            } else if ('company' in customer && (customer as any).company) {
              return (customer as any).company;
            }
            return '';
          })(),
          items: items,
          invoiceDate: invoiceDate,
          dueDate: dueDate,
          notes: notes,
          paymentMethod: paymentMethod,
          subtotal: calculateTotals().subtotal,
          taxAmount: calculateTotals().taxAmount,
          totalAmount: calculateTotals().totalAmount
        } : undefined}
        companyId="default-company"
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