"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NewQuotePage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const textarea_1 = require("@/components/ui/textarea");
const label_1 = require("@/components/ui/label");
const alert_1 = require("@/components/ui/alert");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
const ai_chat_dialog_1 = __importDefault(require("@/components/ai-chat-dialog"));
const logger_1 = require("@/lib/logger");
function NewQuoteContent() {
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [isAnalyzing, setIsAnalyzing] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [successMessage, setSuccessMessage] = (0, react_1.useState)(null);
    // AI会話入力
    const [conversation, setConversation] = (0, react_1.useState)('');
    const [showTextInput, setShowTextInput] = (0, react_1.useState)(false);
    const [aiConversationId, setAiConversationId] = (0, react_1.useState)(null);
    const [showAIChat, setShowAIChat] = (0, react_1.useState)(false);
    const [aiDataApplied, setAiDataApplied] = (0, react_1.useState)(false);
    // 顧客情報
    const [customers, setCustomers] = (0, react_1.useState)([]);
    const [selectedCustomerId, setSelectedCustomerId] = (0, react_1.useState)('');
    const [customerName, setCustomerName] = (0, react_1.useState)('');
    // 商品情報
    const [products, setProducts] = (0, react_1.useState)([]);
    // 会社情報
    const [companyInfo, setCompanyInfo] = (0, react_1.useState)(null);
    // 見積書情報
    const [quoteDate, setQuoteDate] = (0, react_1.useState)((0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'));
    const [validityDate, setValidityDate] = (0, react_1.useState)((0, date_fns_1.format)(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'));
    const [items, setItems] = (0, react_1.useState)([{
            description: '',
            quantity: 1,
            unitPrice: 0,
            amount: 0,
            taxRate: 0.1,
            taxAmount: 0,
            unit: '',
            productId: '',
        }]);
    const [notes, setNotes] = (0, react_1.useState)('');
    const [defaultBankInfo, setDefaultBankInfo] = (0, react_1.useState)('');
    const [paymentMethod, setPaymentMethod] = (0, react_1.useState)('bank_transfer');
    // 顧客・商品・会社情報を取得
    (0, react_1.useEffect)(() => {
        fetchCompanyInfo();
        fetchCustomers();
        fetchProducts();
        fetchDefaultBankInfo();
    }, []);
    // URLパラメータに基づいてAIチャットを自動的に開く
    (0, react_1.useEffect)(() => {
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
                    setValidityDate((0, date_fns_1.format)(newValidityDate, 'yyyy-MM-dd'));
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching company info:', error);
        }
    };
    const fetchCustomers = async () => {
        try {
            const response = await fetch('/api/customers');
            if (response.ok) {
                const data = await response.json();
                setCustomers(data.customers || []);
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching customers:', error);
        }
    };
    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products');
            if (response.ok) {
                const data = await response.json();
                setProducts(data.products || []);
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching products:', error);
        }
    };
    const fetchDefaultBankInfo = async () => {
        try {
            const response = await fetch('/api/bank-accounts');
            if (response.ok) {
                const data = await response.json();
                const defaultBank = data.bankAccounts?.find((bank) => bank.isDefault);
                if (defaultBank) {
                    setDefaultBankInfo(`${defaultBank.bankName} ${defaultBank.branchName} ${defaultBank.accountNumber}`);
                }
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching bank accounts:', error);
        }
    };
    const calculateItemAmount = (item) => {
        const amount = item.quantity * item.unitPrice;
        const taxAmount = amount * item.taxRate;
        return {
            amount,
            taxAmount,
        };
    };
    const updateItem = (index, field, value) => {
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
    const removeItem = (index) => {
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
    const handleCustomerChange = (customerId) => {
        setSelectedCustomerId(customerId);
        const customer = customers.find(c => c._id === customerId);
        if (customer) {
            setCustomerName(customer.companyName || customer.name || customer.company || '');
            // 支払条件がある場合は有効期限を自動計算
            if (customer.paymentTerms) {
                const newValidityDate = new Date();
                newValidityDate.setDate(newValidityDate.getDate() + customer.paymentTerms);
                setValidityDate((0, date_fns_1.format)(newValidityDate, 'yyyy-MM-dd'));
            }
        }
    };
    const handleSubmit = async (status = 'draft') => {
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
        const quoteData = {
            customerId: selectedCustomerId,
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
        };
        logger_1.logger.debug('Submitting quote data:', quoteData);
        logger_1.logger.debug('aiConversationId value:', aiConversationId);
        logger_1.logger.debug('isGeneratedByAI value:', aiDataApplied);
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
                setSuccessMessage('見積書が正常に作成されました！');
                setTimeout(() => {
                    router.push(`/quotes/${data._id}`);
                }, 1500);
            }
            else {
                throw new Error(data.details || data.error || '見積書の作成に失敗しました');
            }
        }
        catch (error) {
            logger_1.logger.error('Error creating quote:', error);
            setError(error instanceof Error ? error.message : '見積書の作成に失敗しました');
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleAIDataApply = (data) => {
        logger_1.logger.debug('=== AI Data Apply Debug ===');
        logger_1.logger.debug('AI data received:', data);
        logger_1.logger.debug('AI conversation ID from data:', data.aiConversationId);
        logger_1.logger.debug('Data keys:', Object.keys(data));
        logger_1.logger.debug('conversationId (alternative):', data.conversationId);
        if (data.customerId) {
            setSelectedCustomerId(data.customerId);
            handleCustomerChange(data.customerId);
        }
        if (data.customerName && !data.customerId) {
            setCustomerName(data.customerName);
        }
        if (data.items && Array.isArray(data.items)) {
            setItems(data.items.map((item) => ({
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
        logger_1.logger.debug('Final conversation ID to set:', conversationId);
        logger_1.logger.debug('Setting AI conversation ID to:', conversationId);
        setAiConversationId(conversationId || null);
        setAiDataApplied(true);
        setShowAIChat(false);
        logger_1.logger.debug('=== End AI Data Apply Debug ===');
    };
    const totals = getTotalAmount();
    return (<div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">新規見積書作成</h1>
        <button_1.Button variant="outline" onClick={() => router.push('/quotes')}>
          一覧に戻る
        </button_1.Button>
      </div>

      {error && (<alert_1.Alert className="mb-6 border-red-200 bg-red-50">
          <alert_1.AlertDescription className="text-red-800">
            {error}
          </alert_1.AlertDescription>
        </alert_1.Alert>)}

      {successMessage && (<alert_1.Alert className="mb-6 border-green-200 bg-green-50">
          <lucide_react_1.CheckCircle className="h-4 w-4 text-green-600"/>
          <alert_1.AlertDescription className="text-green-800">
            {successMessage}
          </alert_1.AlertDescription>
        </alert_1.Alert>)}

      {/* 作成方法の選択 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <card_1.Card className={`border-2 transition-all cursor-pointer ${showAIChat ? 'border-blue-300 shadow-lg bg-blue-50/20' : 'border-blue-100 hover:shadow-md'}`} onClick={() => !showAIChat && setShowAIChat(true)}>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2 text-blue-700">
              <lucide_react_1.Sparkles className="h-5 w-5"/>
              AIアシスタントで作成
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="text-sm text-gray-600">
              会話形式で簡単に見積書を作成。
              顧客名、金額、内容を伝えるだけ。
            </p>
            {showAIChat && (<div className="mt-3 flex items-center gap-2 text-blue-600 text-sm">
                <lucide_react_1.CheckCircle className="h-4 w-4"/>
                <span>選択中</span>
              </div>)}
          </card_1.CardContent>
        </card_1.Card>

        <card_1.Card className={`border-2 transition-all cursor-pointer ${!showAIChat ? 'border-gray-300 shadow-lg bg-gray-50/20' : 'border-gray-200 hover:shadow-md'}`} onClick={() => showAIChat && setShowAIChat(false)}>
          <card_1.CardHeader>
            <card_1.CardTitle className="flex items-center gap-2 text-gray-700">
              <lucide_react_1.FileText className="h-5 w-5"/>
              フォームで手動作成
            </card_1.CardTitle>
          </card_1.CardHeader>
          <card_1.CardContent>
            <p className="text-sm text-gray-600">
              下のフォームに直接入力。
              詳細な設定が可能です。
            </p>
            {!showAIChat && (<div className="mt-3 flex items-center gap-2 text-gray-600 text-sm">
                <lucide_react_1.CheckCircle className="h-4 w-4"/>
                <span>選択中</span>
              </div>)}
          </card_1.CardContent>
        </card_1.Card>
      </div>

      {/* AIデータ適用のお知らせ */}
      {aiDataApplied && !showAIChat && (<alert_1.Alert className="mb-6 border-blue-200 bg-blue-50">
          <lucide_react_1.CheckCircle className="h-4 w-4 text-blue-600"/>
          <alert_1.AlertDescription className="text-blue-800">
            AIアシスタントのデータが適用されました。下のフォームで詳細を確認・編集できます。
          </alert_1.AlertDescription>
        </alert_1.Alert>)}

      {/* Quote Form */}
      <card_1.Card className="mb-6">
        <card_1.CardHeader>
          <card_1.CardTitle>見積書情報</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-6">
          {/* 顧客選択 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label_1.Label htmlFor="customer">顧客 *</label_1.Label>
              <select id="customer" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={selectedCustomerId} onChange={(e) => handleCustomerChange(e.target.value)}>
                <option value="">顧客を選択してください</option>
                {customers.map((customer) => (<option key={customer._id} value={customer._id}>
                    {customer.companyName || customer.name || customer.company || '名前未設定'}
                  </option>))}
              </select>
            </div>
            <div>
              <label_1.Label htmlFor="customerName">顧客名（表示用）</label_1.Label>
              <input_1.Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="顧客名を入力"/>
            </div>
          </div>

          {/* 日付 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label_1.Label htmlFor="quoteDate">発行日 *</label_1.Label>
              <input_1.Input id="quoteDate" type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)}/>
            </div>
            <div>
              <label_1.Label htmlFor="validityDate">有効期限 *</label_1.Label>
              <input_1.Input id="validityDate" type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)}/>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* Items */}
      <card_1.Card className="mb-6">
        <card_1.CardHeader>
          <card_1.CardTitle className="flex justify-between items-center">
            見積項目
            <button_1.Button onClick={addItem} size="sm">
              <lucide_react_1.Plus className="h-4 w-4 mr-2"/>
              項目を追加
            </button_1.Button>
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-4">
            {items.map((item, index) => (<div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">項目 {index + 1}</h4>
                  {items.length > 1 && (<button_1.Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-700">
                      <lucide_react_1.Trash2 className="h-4 w-4"/>
                    </button_1.Button>)}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label_1.Label>商品選択（任意）</label_1.Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={item.productId || ''} onChange={(e) => updateItem(index, 'productId', e.target.value)}>
                      <option value="">商品を選択（任意）</option>
                      {products.filter(p => p.isActive).map((product) => (<option key={product._id} value={product._id}>
                          {product.productName} - ¥{product.unitPrice.toLocaleString()}
                        </option>))}
                    </select>
                  </div>
                  <div>
                    <label_1.Label>項目名 *</label_1.Label>
                    <input_1.Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="項目名を入力"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label_1.Label>数量</label_1.Label>
                    <input_1.Input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}/>
                  </div>
                  <div>
                    <label_1.Label>単価</label_1.Label>
                    <input_1.Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}/>
                  </div>
                  <div>
                    <label_1.Label>小計</label_1.Label>
                    <input_1.Input value={`¥${item.amount.toLocaleString()}`} readOnly className="bg-gray-50"/>
                  </div>
                  <div>
                    <label_1.Label>税率</label_1.Label>
                    <input_1.Input type="number" min="0" max="1" step="0.01" value={item.taxRate} onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}/>
                  </div>
                  <div>
                    <label_1.Label>税額</label_1.Label>
                    <input_1.Input value={`¥${item.taxAmount.toLocaleString()}`} readOnly className="bg-gray-50"/>
                  </div>
                </div>
              </div>))}
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
        </card_1.CardContent>
      </card_1.Card>

      {/* Notes */}
      <card_1.Card className="mb-6">
        <card_1.CardHeader>
          <card_1.CardTitle>備考</card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent>
          <textarea_1.Textarea placeholder="備考・特記事項があれば入力してください" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}/>
        </card_1.CardContent>
      </card_1.Card>

      {/* Submit Buttons */}
      <div className="flex gap-4 justify-end">
        <button_1.Button variant="outline" onClick={() => handleSubmit('draft')} disabled={isLoading}>
          {isLoading ? (<lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>) : (<lucide_react_1.Edit className="mr-2 h-4 w-4"/>)}
          下書き保存
        </button_1.Button>
        <button_1.Button onClick={() => handleSubmit('sent')} disabled={isLoading}>
          {isLoading ? (<lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>) : (<lucide_react_1.FileText className="mr-2 h-4 w-4"/>)}
          見積書を作成
        </button_1.Button>
      </div>

      {/* AI Chat Dialog */}
      {showAIChat && (<ai_chat_dialog_1.default isOpen={showAIChat} onClose={() => setShowAIChat(false)} onDataApply={handleAIDataApply} companyId={companyInfo?._id || 'default-company'} documentType="quote" title="見積書作成アシスタント" placeholder="見積書を作成したいです。顧客は○○社で、△△の見積もりをお願いします..."/>)}
    </div>);
}
function NewQuotePage() {
    return (<react_1.Suspense fallback={<div>Loading...</div>}>
      <NewQuoteContent />
    </react_1.Suspense>);
}
