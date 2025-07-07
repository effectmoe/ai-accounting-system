'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, X } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase-singleton';
import { toast } from 'react-hot-toast';

interface Document {
  id: string;
  company_id: string;
  document_type: string;
  document_number: string;
  issue_date: string;
  partner_name: string;
  partner_address: string;
  partner_phone: string;
  partner_email: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  notes: string;
}

interface DocumentItem {
  id?: string;
  document_id: string;
  item_order: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  amount: number;
}

const documentTypeLabels = {
  estimate: '見積書',
  invoice: '請求書',
  delivery_note: '納品書',
  receipt: '領収書'
};

export default function DocumentEditPage() {
  const params = useParams();
  const router = useRouter();
  const [document, setDocument] = useState<Document | null>(null);
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (params.id) {
      loadDocument(params.id as string);
    }
  }, [params.id]);

  const loadDocument = async (documentId: string) => {
    try {
      setLoading(true);
      const supabase = getSupabaseClient();

      // 文書の詳細を取得
      const { data: documentData, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (docError) throw docError;
      setDocument(documentData);

      // 文書の明細を取得
      const { data: itemsData, error: itemsError } = await supabase
        .from('document_items')
        .select('*')
        .eq('document_id', documentId)
        .order('item_order');

      if (itemsError) {
        console.error('Items fetch error:', itemsError);
        setItems([]);
      } else {
        setItems(itemsData || []);
      }

    } catch (error) {
      console.error('Document load error:', error);
      toast.error('文書の読み込みに失敗しました');
      router.push('/documents');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentChange = (field: keyof Document, value: string | number) => {
    if (!document) return;
    setDocument({ ...document, [field]: value });
  };

  const handleItemChange = (index: number, field: keyof DocumentItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // 金額の自動計算
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = Number(newItems[index].quantity);
      const unitPrice = Number(newItems[index].unit_price);
      newItems[index].amount = quantity * unitPrice;
    }
    
    setItems(newItems);
    calculateTotals(newItems);
  };

  const addItem = () => {
    const newItem: DocumentItem = {
      document_id: document?.id || '',
      item_order: items.length + 1,
      item_name: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0.1,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    // 順序を再調整
    newItems.forEach((item, i) => {
      item.item_order = i + 1;
    });
    setItems(newItems);
    calculateTotals(newItems);
  };

  const calculateTotals = (itemList: DocumentItem[]) => {
    if (!document) return;
    
    const subtotal = itemList.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = Math.floor(subtotal * 0.1); // 10%消費税
    const total = subtotal + taxAmount;
    
    setDocument({
      ...document,
      subtotal,
      tax_amount: taxAmount,
      total_amount: total
    });
  };

  const handleSave = async () => {
    if (!document) return;

    try {
      setSaving(true);
      const supabase = getSupabaseClient();

      // 文書を更新
      const { error: docError } = await supabase
        .from('documents')
        .update({
          document_number: document.document_number,
          issue_date: document.issue_date,
          partner_name: document.partner_name,
          partner_address: document.partner_address,
          partner_phone: document.partner_phone,
          partner_email: document.partner_email,
          subtotal: document.subtotal,
          tax_amount: document.tax_amount,
          total_amount: document.total_amount,
          notes: document.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (docError) throw docError;

      // 既存の明細を削除
      await supabase
        .from('document_items')
        .delete()
        .eq('document_id', document.id);

      // 新しい明細を挿入
      if (items.length > 0) {
        const itemsToInsert = items.map(item => ({
          document_id: document.id,
          item_order: item.item_order,
          item_name: item.item_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: item.amount
        }));

        const { error: itemsError } = await supabase
          .from('document_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast.success('文書を更新しました');
      router.push(`/documents/${document.id}`);

    } catch (error) {
      console.error('Save error:', error);
      toast.error('文書の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4">
          <div className="text-center py-8">
            <p className="text-gray-600">文書が見つかりません</p>
            <Link
              href="/documents?tab=documents"
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              作成済み文書に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href={`/documents/${document.id}`}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            詳細に戻る
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {documentTypeLabels[document.document_type as keyof typeof documentTypeLabels]} 編集
              </h1>
              <p className="text-sm text-gray-500">文書番号: {document.document_number}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <Link
                href={`/documents/${document.id}`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <X className="mr-2 h-4 w-4" />
                キャンセル
              </Link>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* メインフォーム */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">文書番号</label>
                  <input
                    type="text"
                    value={document.document_number}
                    onChange={(e) => handleDocumentChange('document_number', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">発行日</label>
                  <input
                    type="date"
                    value={document.issue_date}
                    onChange={(e) => handleDocumentChange('issue_date', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 取引先情報 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">取引先情報</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">取引先名</label>
                  <input
                    type="text"
                    value={document.partner_name}
                    onChange={(e) => handleDocumentChange('partner_name', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">電話番号</label>
                  <input
                    type="text"
                    value={document.partner_phone}
                    onChange={(e) => handleDocumentChange('partner_phone', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">住所</label>
                  <input
                    type="text"
                    value={document.partner_address}
                    onChange={(e) => handleDocumentChange('partner_address', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">メールアドレス</label>
                  <input
                    type="email"
                    value={document.partner_email}
                    onChange={(e) => handleDocumentChange('partner_email', e.target.value)}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* 明細 */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">明細</h2>
                <button
                  onClick={addItem}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  明細を追加
                </button>
              </div>
              
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 gap-4 sm:grid-cols-5 items-end p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">項目名</label>
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">数量</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">単価</label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', Number(e.target.value))}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">金額</label>
                      <div className="mt-1 text-sm text-gray-900 py-2">
                        ¥{item.amount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => removeItem(index)}
                        className="inline-flex items-center px-2 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 備考 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">備考</h2>
              <textarea
                value={document.notes}
                onChange={(e) => handleDocumentChange('notes', e.target.value)}
                rows={4}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="備考を入力してください..."
              />
            </div>
          </div>

          {/* サイドバー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">金額情報</h2>
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">小計</dt>
                  <dd className="text-sm text-gray-900">¥{document.subtotal.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">消費税</dt>
                  <dd className="text-sm text-gray-900">¥{document.tax_amount.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <dt className="text-base font-medium text-gray-900">合計</dt>
                  <dd className="text-base font-medium text-gray-900">¥{document.total_amount.toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}