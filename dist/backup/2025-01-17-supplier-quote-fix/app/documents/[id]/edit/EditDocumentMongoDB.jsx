"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EditDocumentMongoDB;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = require("react-hot-toast");
const documentTypeLabels = {
    estimate: '見積書',
    invoice: '請求書',
    delivery_note: '納品書',
    receipt: '領収書',
    journal_entry: '仕訳伝票'
};
function EditDocumentMongoDB() {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const documentId = params.id;
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [saving, setSaving] = (0, react_1.useState)(false);
    const [document, setDocument] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        fetchDocument();
    }, [documentId]);
    const fetchDocument = async () => {
        try {
            console.log('Fetching document with ID:', documentId);
            // 単一ドキュメントを取得するためのAPIエンドポイントを使用
            const response = await fetch(`/api/documents/${documentId}`);
            const data = await response.json();
            console.log('Single document response:', data);
            if (data.success) {
                console.log('Found document:', data.document);
                setDocument(data.document);
            }
            else {
                throw new Error(data.error || 'Failed to fetch document');
            }
        }
        catch (error) {
            console.error('Error fetching document:', error);
            react_hot_toast_1.toast.error('ドキュメントの読み込みに失敗しました');
            router.push('/documents');
        }
        finally {
            setLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!document)
            return;
        setSaving(true);
        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    partner_name: document.partner_name,
                    vendor_name: document.vendor_name,
                    partner_address: document.partner_address,
                    total_amount: document.total_amount,
                    tax_amount: document.tax_amount,
                    subtotal: document.subtotal,
                    notes: document.notes,
                    category: document.category
                })
            });
            if (!response.ok) {
                throw new Error('Failed to update document');
            }
            react_hot_toast_1.toast.success('ドキュメントを更新しました');
            router.push('/documents');
        }
        catch (error) {
            console.error('Error updating document:', error);
            react_hot_toast_1.toast.error('更新に失敗しました');
        }
        finally {
            setSaving(false);
        }
    };
    const handleCancel = () => {
        router.push('/documents');
    };
    if (loading) {
        return (<div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>);
    }
    if (!document) {
        return (<div className="container mx-auto px-4 py-8">
        <p>ドキュメントが見つかりません</p>
      </div>);
    }
    return (<div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <link_1.default href="/documents" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <lucide_react_1.ArrowLeft className="w-4 h-4"/>
            戻る
          </link_1.default>
          <h1 className="text-2xl font-bold">
            {documentTypeLabels[document.document_type] || document.document_type}を編集
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                書類番号
              </label>
              <input type="text" value={document.document_number || ''} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" disabled/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                発行日
              </label>
              <input type="date" value={document.receipt_date || document.issue_date?.split('T')[0] || ''} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" disabled/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              取引先名 / 店舗名
            </label>
            <input type="text" value={document.vendor_name || document.partner_name || ''} onChange={(e) => setDocument({
            ...document,
            vendor_name: e.target.value,
            partner_name: e.target.value
        })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required/>
          </div>

          {document.document_type !== 'journal_entry' && (<div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                勘定科目
              </label>
              <select value={document.category || '未分類'} onChange={(e) => setDocument({ ...document, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="未分類">未分類</option>
                <option value="旅費交通費">旅費交通費</option>
                <option value="会議費">会議費</option>
                <option value="接待交際費">接待交際費</option>
                <option value="消耗品費">消耗品費</option>
                <option value="車両費">車両費</option>
                <option value="新聞図書費">新聞図書費</option>
                <option value="通信費">通信費</option>
                <option value="水道光熱費">水道光熱費</option>
                <option value="地代家賃">地代家賃</option>
                <option value="雑費">雑費</option>
              </select>
            </div>)}

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                小計
              </label>
              <input type="number" value={document.subtotal || 0} onChange={(e) => {
            const subtotal = parseFloat(e.target.value) || 0;
            const taxAmount = document.tax_amount || 0;
            setDocument({
                ...document,
                subtotal,
                total_amount: subtotal + taxAmount
            });
        }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                消費税
              </label>
              <input type="number" value={document.tax_amount || 0} onChange={(e) => {
            const taxAmount = parseFloat(e.target.value) || 0;
            const subtotal = document.subtotal || 0;
            setDocument({
                ...document,
                tax_amount: taxAmount,
                total_amount: subtotal + taxAmount
            });
        }} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required/>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                合計
              </label>
              <input type="number" value={document.total_amount || 0} className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100" disabled/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              備考
            </label>
            <textarea value={document.notes || ''} onChange={(e) => setDocument({ ...document, notes: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={handleCancel} className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2">
              <lucide_react_1.X className="w-4 h-4"/>
              キャンセル
            </button>
            <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              <lucide_react_1.Save className="w-4 h-4"/>
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </form>
    </div>);
}
