"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EditDeliveryNotePage;
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
function EditDeliveryNotePage({ params }) {
    const router = (0, navigation_1.useRouter)();
    const [customers, setCustomers] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [deliveryNote, setDeliveryNote] = (0, react_1.useState)(null);
    const [formData, setFormData] = (0, react_1.useState)({
        customerId: '',
        issueDate: (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
        deliveryDate: (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
        deliveryLocation: '',
        deliveryMethod: '',
        items: [],
        notes: '',
        internalNotes: '',
        status: 'draft'
    });
    (0, react_1.useEffect)(() => {
        fetchDeliveryNote();
        fetchCustomers();
    }, [params.id]);
    const fetchDeliveryNote = async () => {
        try {
            const response = await fetch(`/api/delivery-notes/${params.id}`);
            if (!response.ok)
                throw new Error('Failed to fetch delivery note');
            const data = await response.json();
            setDeliveryNote(data);
            setFormData({
                customerId: data.customerId || '',
                issueDate: data.issueDate ? (0, date_fns_1.format)(new Date(data.issueDate), 'yyyy-MM-dd') : (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
                deliveryDate: data.deliveryDate ? (0, date_fns_1.format)(new Date(data.deliveryDate), 'yyyy-MM-dd') : (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd'),
                deliveryLocation: data.deliveryLocation || '',
                deliveryMethod: data.deliveryMethod || '',
                items: data.items || [],
                notes: data.notes || '',
                internalNotes: data.internalNotes || '',
                status: data.status || 'draft'
            });
        }
        catch (error) {
            console.error('Error fetching delivery note:', error);
            setError('納品書の取得に失敗しました');
        }
        finally {
            setIsLoading(false);
        }
    };
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
        }
    };
    const handleSubmit = async (status) => {
        try {
            setIsSaving(true);
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
            const updateData = {
                ...formData,
                items: calculatedItems,
                subtotal,
                taxAmount,
                totalAmount,
                status: status || formData.status
            };
            const response = await fetch(`/api/delivery-notes/${params.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });
            if (!response.ok) {
                throw new Error('Failed to update delivery note');
            }
            router.push(`/delivery-notes/${params.id}`);
        }
        catch (error) {
            console.error('Error updating delivery note:', error);
            setError('納品書の更新に失敗しました');
        }
        finally {
            setIsSaving(false);
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
    if (isLoading) {
        return (<div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <lucide_react_1.Loader2 className="h-8 w-8 animate-spin"/>
      </div>);
    }
    if (error && !deliveryNote) {
        return (<div className="container mx-auto p-6">
        <alert_1.Alert variant="destructive">
          <lucide_react_1.AlertCircle className="h-4 w-4"/>
          <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
        </alert_1.Alert>
        <button_1.Button className="mt-4" onClick={() => router.push('/delivery-notes')}>
          納品書一覧に戻る
        </button_1.Button>
      </div>);
    }
    return (<div className="container mx-auto p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <button_1.Button variant="ghost" size="sm" onClick={() => router.push(`/delivery-notes/${params.id}`)} className="mb-2">
            <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/>
            納品書詳細に戻る
          </button_1.Button>
          <h1 className="text-3xl font-bold">納品書編集</h1>
        </div>
        <div className="flex gap-2">
          <button_1.Button variant="outline" onClick={() => handleSubmit()} disabled={isSaving}>
            <lucide_react_1.Save className="mr-2 h-4 w-4"/>
            保存
          </button_1.Button>
          <button_1.Button onClick={() => handleSubmit('saved')} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {isSaving ? (<>
                <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                保存中...
              </>) : (<>
                <lucide_react_1.Package className="mr-2 h-4 w-4"/>
                保存済みにする
              </>)}
          </button_1.Button>
        </div>
      </div>

      {error && (<alert_1.Alert variant="destructive" className="mb-6">
          <lucide_react_1.AlertCircle className="h-4 w-4"/>
          <alert_1.AlertDescription>{error}</alert_1.AlertDescription>
        </alert_1.Alert>)}

      {/* 基本情報 */}
      <card_1.Card className="mb-6">
        <card_1.CardHeader>
          <card_1.CardTitle className="flex items-center gap-2">
            <lucide_react_1.Building2 className="h-5 w-5"/>
            基本情報
          </card_1.CardTitle>
        </card_1.CardHeader>
        <card_1.CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label_1.Label htmlFor="customer">顧客</label_1.Label>
              <select_1.Select value={formData.customerId} onValueChange={(value) => setFormData({ ...formData, customerId: value })}>
                <select_1.SelectTrigger>
                  <select_1.SelectValue placeholder="顧客を選択"/>
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  {customers.map((customer) => (<select_1.SelectItem key={customer._id?.toString()} value={customer._id?.toString() || ''}>
                      {customer.companyName}
                    </select_1.SelectItem>))}
                </select_1.SelectContent>
              </select_1.Select>
            </div>
            <div>
              <label_1.Label htmlFor="status">ステータス</label_1.Label>
              <select_1.Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <select_1.SelectTrigger>
                  <select_1.SelectValue />
                </select_1.SelectTrigger>
                <select_1.SelectContent>
                  <select_1.SelectItem value="draft">下書き</select_1.SelectItem>
                  <select_1.SelectItem value="saved">保存済み</select_1.SelectItem>
                  <select_1.SelectItem value="delivered">納品済み</select_1.SelectItem>
                  <select_1.SelectItem value="received">受領済み</select_1.SelectItem>
                </select_1.SelectContent>
              </select_1.Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label_1.Label htmlFor="issueDate">発行日</label_1.Label>
              <input_1.Input type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}/>
            </div>
            <div>
              <label_1.Label htmlFor="deliveryDate">納品日</label_1.Label>
              <input_1.Input type="date" value={formData.deliveryDate} onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label_1.Label htmlFor="deliveryLocation">納品場所</label_1.Label>
              <input_1.Input value={formData.deliveryLocation} onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })} placeholder="納品場所を入力"/>
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
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* 明細 */}
      <card_1.Card className="mb-6">
        <card_1.CardHeader>
          <div className="flex justify-between items-center">
            <card_1.CardTitle>納品明細</card_1.CardTitle>
            <button_1.Button onClick={addItem} size="sm">
              <lucide_react_1.Plus className="mr-2 h-4 w-4"/>
              項目を追加
            </button_1.Button>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="space-y-4">
            {formData.items.map((item, index) => (<div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-medium">項目 {index + 1}</h4>
                  {formData.items.length > 1 && (<button_1.Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-600 hover:text-red-800">
                      <lucide_react_1.Trash2 className="h-4 w-4"/>
                    </button_1.Button>)}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label_1.Label>品目名</label_1.Label>
                    <input_1.Input value={item.itemName} onChange={(e) => updateItem(index, 'itemName', e.target.value)} placeholder="品目名を入力"/>
                  </div>
                  <div>
                    <label_1.Label>説明</label_1.Label>
                    <input_1.Input value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} placeholder="説明を入力"/>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div>
                    <label_1.Label>数量</label_1.Label>
                    <input_1.Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)} min="0"/>
                  </div>
                  <div>
                    <label_1.Label>単価</label_1.Label>
                    <input_1.Input type="number" value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', parseInt(e.target.value) || 0)} min="0"/>
                  </div>
                  <div>
                    <label_1.Label>実納品数量</label_1.Label>
                    <input_1.Input type="number" value={item.deliveredQuantity} onChange={(e) => updateItem(index, 'deliveredQuantity', parseInt(e.target.value) || 0)} min="0"/>
                  </div>
                  <div>
                    <label_1.Label>金額</label_1.Label>
                    <div className="text-lg font-semibold pt-2">
                      ¥{(item.quantity * item.unitPrice).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>))}
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* 合計 */}
      <card_1.Card className="mb-6">
        <card_1.CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 min-w-[300px]">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">小計:</span>
                  <span className="text-lg font-mono">¥{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">消費税:</span>
                  <span className="text-lg font-mono">¥{totalTax.toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">合計金額:</span>
                    <span className="text-2xl font-bold text-blue-600">¥{totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* 備考 */}
      <card_1.Card className="mb-6">
        <card_1.CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label_1.Label htmlFor="notes">備考</label_1.Label>
              <textarea_1.Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="備考を入力" rows={4}/>
            </div>
            <div>
              <label_1.Label htmlFor="internalNotes">内部メモ</label_1.Label>
              <textarea_1.Textarea value={formData.internalNotes} onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })} placeholder="内部メモを入力" rows={4}/>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
