"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QuoteEditPage;
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
const ai_conversation_history_dialog_1 = __importDefault(require("@/components/ai-conversation-history-dialog"));
const logger_1 = require("@/lib/logger");
function QuoteEditPageContent({ params }) {
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [quote, setQuote] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [successMessage, setSuccessMessage] = (0, react_1.useState)(null);
    // 顧客・商品情報
    const [customers, setCustomers] = (0, react_1.useState)([]);
    const [products, setProducts] = (0, react_1.useState)([]);
    // フォームデータ
    const [selectedCustomerId, setSelectedCustomerId] = (0, react_1.useState)('');
    const [customerName, setCustomerName] = (0, react_1.useState)('');
    const [quoteDate, setQuoteDate] = (0, react_1.useState)('');
    const [validityDate, setValidityDate] = (0, react_1.useState)('');
    const [items, setItems] = (0, react_1.useState)([]);
    const [notes, setNotes] = (0, react_1.useState)('');
    // AI機能関連の状態
    const [showAIChat, setShowAIChat] = (0, react_1.useState)(false);
    const [showAIHistory, setShowAIHistory] = (0, react_1.useState)(false);
    const [aiDataApplied, setAiDataApplied] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        fetchQuote();
        fetchCustomers();
        fetchProducts();
        // URLパラメータでAIモードかどうかチェック
        if (searchParams.get('mode') === 'ai') {
            setShowAIChat(true);
        }
    }, [params.id, searchParams]);
    const fetchQuote = async () => {
        try {
            const response = await fetch(`/api/quotes/${params.id}`);
            if (response.ok) {
                const quoteData = await response.json();
                setQuote(quoteData);
                // フォームデータを設定
                setSelectedCustomerId(quoteData.customerId?.toString() || '');
                setCustomerName(quoteData.customer?.companyName || '');
                setQuoteDate((0, date_fns_1.format)(new Date(quoteData.issueDate), 'yyyy-MM-dd'));
                setValidityDate((0, date_fns_1.format)(new Date(quoteData.validityDate), 'yyyy-MM-dd'));
                // アイテムデータの安全な処理
                const safeItems = (quoteData.items || []).map((item) => ({
                    ...item,
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    amount: item.amount || 0,
                    taxRate: item.taxRate || 0.1,
                    taxAmount: item.taxAmount || 0,
                    itemName: item.itemName || '',
                    description: item.description || '',
                }));
                setItems(safeItems);
                setNotes(quoteData.notes || '');
            }
            else {
                setError('見積書が見つかりません');
                router.push('/quotes');
            }
        }
        catch (error) {
            logger_1.logger.error('Error fetching quote:', error);
            setError('見積書の取得に失敗しました');
        }
        finally {
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
                newItems[index].itemName = product.productName;
                newItems[index].unitPrice = product.unitPrice;
                newItems[index].taxRate = product.taxRate || 0.1;
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
                taxRate: 0.1,
                taxAmount: 0,
                sortOrder: items.length,
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
            setCustomerName(customer.companyName || customer.name || '');
        }
    };
    // AI会話からデータを適用する関数
    const handleAIDataApply = (data) => {
        logger_1.logger.debug('AI chat data received:', data);
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
            setItems(data.items.map((item) => ({
                ...item,
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                amount: item.amount || 0,
                taxRate: item.taxRate || 0.1,
                taxAmount: item.taxAmount || 0,
                itemName: item.itemName || item.description || '',
                description: item.description || item.itemName || '',
            })));
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
            quoteDate,
            validityDate,
            items,
            subtotal: totals.subtotal,
            taxAmount: totals.totalTax,
            taxRate: 0.1,
            totalAmount: totals.total,
            notes,
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
            }
            else {
                throw new Error(data.details || data.error || '見積書の更新に失敗しました');
            }
        }
        catch (error) {
            logger_1.logger.error('Error updating quote:', error);
            setError(error instanceof Error ? error.message : '見積書の更新に失敗しました');
        }
        finally {
            setIsSaving(false);
        }
    };
    if (isLoading) {
        return (<div className="container mx-auto p-6">
        <div className="flex justify-center items-center h-64">
          <lucide_react_1.Loader2 className="h-8 w-8 animate-spin"/>
        </div>
      </div>);
    }
    if (!quote) {
        return (<div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">見積書が見つかりません</h1>
          <button_1.Button onClick={() => router.push('/quotes')}>
            見積書一覧に戻る
          </button_1.Button>
        </div>
      </div>);
    }
    const totals = getTotalAmount();
    return (<div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button_1.Button variant="ghost" onClick={() => router.push(`/quotes/${params.id}`)}>
            <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/>
            戻る
          </button_1.Button>
          <div>
            <h1 className="text-3xl font-bold">見積書編集</h1>
            <p className="text-gray-600">#{quote.quoteNumber}</p>
          </div>
        </div>
      </div>

      {error && (<alert_1.Alert className="mb-6 border-red-200 bg-red-50">
          <alert_1.AlertDescription className="text-red-800">
            {error}
          </alert_1.AlertDescription>
        </alert_1.Alert>)}

      {successMessage && (<alert_1.Alert className="mb-6 border-green-200 bg-green-50">
          <lucide_react_1.CheckCircle className="h-4 w-4 text-green-600"/>
          <alert_1.AlertDescription className="space-y-3">
            <p className="text-green-800">{successMessage}</p>
            {aiDataApplied && (<div className="mt-3">
                <p className="text-sm text-gray-600">
                  右上の「AI会話で修正」ボタンから、引き続き商品の追加や見積書の修正が可能です。
                </p>
              </div>)}
          </alert_1.AlertDescription>
        </alert_1.Alert>)}

      {/* Quote Form */}
      <card_1.Card className="mb-6">
        <card_1.CardHeader>
          <div className="flex justify-between items-center">
            <card_1.CardTitle>見積書情報</card_1.CardTitle>
            <button_1.Button type="button" variant="outline" size="sm" onClick={() => setShowAIChat(true)} className="flex items-center gap-2">
              <lucide_react_1.MessageSquare className="h-4 w-4"/>
              AI会話で修正
            </button_1.Button>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-6">
          {/* 顧客選択 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label_1.Label htmlFor="customer">顧客 *</label_1.Label>
              <select id="customer" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={selectedCustomerId} onChange={(e) => handleCustomerChange(e.target.value)}>
                <option value="">顧客を選択してください</option>
                {customers.map((customer) => (<option key={customer._id} value={customer._id}>
                    {customer.companyName || customer.name || '名前未設定'}
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
                    <input_1.Input value={item.itemName} onChange={(e) => updateItem(index, 'itemName', e.target.value)} placeholder="項目名を入力"/>
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
                    <input_1.Input value={`¥${(item.amount || 0).toLocaleString()}`} readOnly className="bg-gray-50"/>
                  </div>
                  <div>
                    <label_1.Label>税率</label_1.Label>
                    <input_1.Input type="number" min="0" max="1" step="0.01" value={item.taxRate} onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}/>
                  </div>
                  <div>
                    <label_1.Label>税額</label_1.Label>
                    <input_1.Input value={`¥${(item.taxAmount || 0).toLocaleString()}`} readOnly className="bg-gray-50"/>
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
          <div className="space-y-4">
            <div>
              <textarea_1.Textarea placeholder="備考・特記事項があれば入力してください" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="bg-white"/>
            </div>
            {/* AI会話履歴ボタン */}
            <div className="flex justify-start">
              <button_1.Button type="button" variant={quote?.aiConversationId ? "outline" : "ghost"} onClick={() => setShowAIHistory(true)} disabled={!quote?.aiConversationId} className={quote?.aiConversationId ? "" : "opacity-50 cursor-not-allowed"}>
                <lucide_react_1.History className="mr-2 h-4 w-4"/>
                AI会話履歴
                {quote?.aiConversationId && (<span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    あり
                  </span>)}
              </button_1.Button>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* Submit Button */}
      <div className="flex gap-4 justify-end">
        <button_1.Button variant="outline" onClick={() => router.push(`/quotes/${params.id}`)}>
          キャンセル
        </button_1.Button>
        <button_1.Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (<lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>) : (<lucide_react_1.Save className="mr-2 h-4 w-4"/>)}
          保存
        </button_1.Button>
      </div>
      
      {/* AI会話ダイアログ */}
      <ai_chat_dialog_1.default isOpen={showAIChat} onClose={() => setShowAIChat(false)} onDataApply={handleAIDataApply} documentType="quote" companyId="default-company" existingConversationId={quote?.aiConversationId} invoiceId={quote?._id} initialInvoiceData={{
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
        }} mode="edit"/>
      
      {/* AI会話履歴ダイアログ */}
      <ai_conversation_history_dialog_1.default isOpen={showAIHistory} onClose={() => setShowAIHistory(false)} conversationId={quote?.aiConversationId} invoiceId={quote?._id}/>
    </div>);
}
// Suspenseラッパーを使用
function QuoteEditPage({ params }) {
    return (<react_1.Suspense fallback={<div className="container mx-auto p-6 flex justify-center items-center h-screen">
          <lucide_react_1.Loader2 className="h-8 w-8 animate-spin"/>
        </div>}>
      <QuoteEditPageContent params={params}/>
    </react_1.Suspense>);
}
