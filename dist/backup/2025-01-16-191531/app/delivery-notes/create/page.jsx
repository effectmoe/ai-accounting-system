"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CreateDeliveryNotePage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const label_1 = require("@/components/ui/label");
const textarea_1 = require("@/components/ui/textarea");
const select_1 = require("@/components/ui/select");
const alert_1 = require("@/components/ui/alert");
const lucide_react_1 = require("lucide-react");
const date_fns_1 = require("date-fns");
function CreateDeliveryNotePage() {
    const router = (0, navigation_1.useRouter)();
    const [customers, setCustomers] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [formData, setFormData] = (0, react_1.useState)({
        customerId: '',
        issueDate: (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
        deliveryDate: (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
        deliveryLocation: '',
        deliveryMethod: '',
        items: [
            {
                itemName: '',
                description: '',
                quantity: 1,
                unitPrice: 0,
                amount: 0,
                taxRate: 0.1,
                taxAmount: 0,
                deliveredQuantity: 1
            }
        ],
        notes: '',
        internalNotes: ''
    });
    (0, react_1.useEffect)(() => {
        fetchCustomers();
    }, []);
    const fetchCustomers = async () => {
        try {
            const response = await fetch('/api/customers');
            if (!response.ok)
                throw new Error('Failed to fetch customers');
            const data = await response.json();
            setCustomers(data.customers || []);
        }
        catch (error) {
            console.error('Error fetching customers:', error);
            setError('顧客データの取得に失敗しました');
        }
    };
    const handleSubmit = async (status) => {
        try {
            setIsLoading(true);
            setError(null);
            // バリデーション
            if (!formData.customerId) {
                setError('顧客を選択してください');
                return;
            }
            if (formData.items.length === 0 || !formData.items[0].itemName) {
                setError('少なくとも1つの項目を入力してください');
                return;
            }
            // 金額計算
            const calculatedItems = formData.items.map(item => {
                const amount = item.quantity * item.unitPrice;
                const taxAmount = amount * (item.taxRate || 0.1);
                return {
                    ...item,
                    amount,
                    taxAmount
                };
            });
            const subtotal = calculatedItems.reduce((sum, item) => sum + item.amount, 0);
            const taxAmount = calculatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
            const totalAmount = subtotal + taxAmount;
            const deliveryNoteData = {
                ...formData,
                items: calculatedItems,
                subtotal,
                taxAmount,
                totalAmount,
                status
            };
            const response = await fetch('/api/delivery-notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(deliveryNoteData),
            });
            if (!response.ok) {
                throw new Error('Failed to create delivery note');
            }
            const createdDeliveryNote = await response.json();
            router.push(`/delivery-notes/${createdDeliveryNote._id}`);
        }
        catch (error) {
            console.error('Error creating delivery note:', error);
            setError('納品書の作成に失敗しました');
        }
        finally {
            setIsLoading(false);
        }
    };
    const addItem = () => {
        setFormData({
            ...formData,
            items: [
                ...formData.items,
                {
                    itemName: '',
                    description: '',
                    quantity: 1,
                    unitPrice: 0,
                    amount: 0,
                    taxRate: 0.1,
                    taxAmount: 0,
                    deliveredQuantity: 1
                }
            ]
        });
    };
    const removeItem = (index) => {
        if (formData.items.length > 1) {
            setFormData({
                ...formData,
                items: formData.items.filter((_, i) => i !== index)
            });
        }
    };
    const updateItem = (index, field, value) => {
        const updatedItems = formData.items.map((item, i) => {
            if (i === index) {
                const updatedItem = { ...item, [field]: value };
                // 金額を自動計算
                if (field === 'quantity' || field === 'unitPrice') {
                    updatedItem.amount = updatedItem.quantity * updatedItem.unitPrice;
                    updatedItem.taxAmount = updatedItem.amount * (updatedItem.taxRate || 0.1);
                }
                // 実納品数量のデフォルト設定
                if (field === 'quantity' && !updatedItem.deliveredQuantity) {
                    updatedItem.deliveredQuantity = updatedItem.quantity;
                }
                return updatedItem;
            }
            return item;
        });
        setFormData({
            ...formData,
            items: updatedItems
        });
    };
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.taxRate || 0.1)), 0);
    const totalAmount = subtotal + totalTax;
    return (<div className="container mx-auto p-6 max-w-5xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button_1.Button variant="ghost" size="sm" onClick={() => router.push('/delivery-notes')} className="mr-4">
            <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/>
            納品書一覧
          </button_1.Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <lucide_react_1.Package className="mr-3 h-8 w-8"/>
              納品書作成
            </h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button_1.Button variant="outline" onClick={() => handleSubmit('draft')} disabled={isLoading}>
            下書き保存
          </button_1.Button>
          <button_1.Button onClick={() => handleSubmit('saved')} disabled={isLoading}>
            <lucide_react_1.Save className="mr-2 h-4 w-4"/>
            保存
          </button_1.Button>
        </div>
      </div>

      {error && (<alert_1.Alert variant="destructive" className="mb-6">
          <lucide_react_1.AlertCircle className="h-4 w-4"/>
          <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
        </alert_1.Alert>)}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインフォーム */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle className="flex items-center">
                <lucide_react_1.Building2 className="mr-2 h-5 w-5"/>
                基本情報
              </card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              <div>
                <label_1.Label htmlFor="customer">顧客 *</label_1.Label>
                <select_1.Select value={formData.customerId} onValueChange={(value) => setFormData({ ...formData, customerId: value })}>
                  <select_1.SelectTrigger>
                    <select_1.SelectValue placeholder="顧客を選択してください"/>
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    {customers.map((customer) => (<select_1.SelectItem key={customer._id?.toString()} value={customer._id?.toString() || ''}>
                        {customer.companyName}
                      </select_1.SelectItem>))}
                  </select_1.SelectContent>
                </select_1.Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label_1.Label htmlFor="issueDate">発行日 *</label_1.Label>
                  <input_1.Input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}/>
                </div>
                <div>
                  <label_1.Label htmlFor="deliveryDate">納品日 *</label_1.Label>
                  <input_1.Input type="date" value={formData.deliveryDate} onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}/>
                </div>
              </div>

              <div>
                <label_1.Label htmlFor="deliveryLocation">納品先</label_1.Label>
                <input_1.Input placeholder="納品先住所・場所" value={formData.deliveryLocation} onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}/>
              </div>

              <div>
                <label_1.Label htmlFor="deliveryMethod">納品方法</label_1.Label>
                <select_1.Select value={formData.deliveryMethod} onValueChange={(value) => setFormData({ ...formData, deliveryMethod: value })}>
                  <select_1.SelectTrigger>
                    <select_1.SelectValue placeholder="納品方法を選択"/>
                  </select_1.SelectTrigger>
                  <select_1.SelectContent>
                    <select_1.SelectItem value="direct">直接納品</select_1.SelectItem>
                    <select_1.SelectItem value="shipping">配送</select_1.SelectItem>
                    <select_1.SelectItem value="pickup">引き取り</select_1.SelectItem>
                    <select_1.SelectItem value="email">メール送信</select_1.SelectItem>
                    <select_1.SelectItem value="other">その他</select_1.SelectItem>
                  </select_1.SelectContent>
                </select_1.Select>
              </div>
            </card_1.CardContent>
          </card_1.Card>

          {/* 項目 */}
          <card_1.Card>
            <card_1.CardHeader>
              <div className="flex items-center justify-between">
                <card_1.CardTitle>納品項目</card_1.CardTitle>
                <button_1.Button variant="outline" size="sm" onClick={addItem}>
                  <lucide_react_1.Plus className="mr-2 h-4 w-4"/>
                  項目追加
                </button_1.Button>
              </div>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-4">
                {formData.items.map((item, index) => (<div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">項目 {index + 1}</h4>
                      {formData.items.length > 1 && (<button_1.Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <lucide_react_1.Trash2 className="h-4 w-4"/>
                        </button_1.Button>)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label_1.Label htmlFor={`itemName-${index}`}>品目名 *</label_1.Label>
                        <input_1.Input placeholder="品目名" value={item.itemName} onChange={(e) => updateItem(index, 'itemName', e.target.value)}/>
                      </div>
                      <div>
                        <label_1.Label htmlFor={`description-${index}`}>仕様・説明</label_1.Label>
                        <input_1.Input placeholder="仕様・説明" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)}/>
                      </div>
                      <div>
                        <label_1.Label htmlFor={`quantity-${index}`}>数量</label_1.Label>
                        <input_1.Input type="number" min="0" step="1" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}/>
                      </div>
                      <div>
                        <label_1.Label htmlFor={`deliveredQuantity-${index}`}>実納品数量</label_1.Label>
                        <input_1.Input type="number" min="0" step="1" value={item.deliveredQuantity} onChange={(e) => updateItem(index, 'deliveredQuantity', parseInt(e.target.value) || 0)}/>
                      </div>
                      <div>
                        <label_1.Label htmlFor={`unitPrice-${index}`}>単価</label_1.Label>
                        <input_1.Input type="number" min="0" step="1" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)}/>
                      </div>
                      <div>
                        <label_1.Label htmlFor={`amount-${index}`}>金額</label_1.Label>
                        <input_1.Input type="number" value={item.quantity * item.unitPrice} readOnly className="bg-gray-50"/>
                      </div>
                    </div>
                  </div>))}
              </div>
            </card_1.CardContent>
          </card_1.Card>

          {/* 備考 */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>備考・特記事項</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent className="space-y-4">
              <div>
                <label_1.Label htmlFor="notes">外部向け備考</label_1.Label>
                <textarea_1.Textarea placeholder="顧客向けの備考・特記事項" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}/>
              </div>
              <div>
                <label_1.Label htmlFor="internalNotes">内部メモ</label_1.Label>
                <textarea_1.Textarea placeholder="社内向けのメモ（顧客には表示されません）" value={formData.internalNotes} onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}/>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 金額サマリー */}
          <card_1.Card>
            <card_1.CardHeader>
              <card_1.CardTitle>金額サマリー</card_1.CardTitle>
            </card_1.CardHeader>
            <card_1.CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>小計:</span>
                  <span className="font-mono">¥{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>消費税:</span>
                  <span className="font-mono">¥{totalTax.toLocaleString()}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>合計:</span>
                    <span className="font-mono text-blue-600">¥{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </card_1.CardContent>
          </card_1.Card>
        </div>
      </div>
    </div>);
}
