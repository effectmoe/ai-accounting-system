'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SupplierQuote, SupplierQuoteItem, SupplierQuoteStatus, Supplier } from '@/types/collections';

import { logger } from '@/lib/logger';
export default function NewSupplierQuotePage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<SupplierQuote>>({
    quoteNumber: '',
    supplierId: undefined,
    issueDate: new Date().toISOString().split('T')[0],
    validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30日後
    items: [
      {
        itemName: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        amount: 0,
        taxRate: 10,
        taxAmount: 0,
      }
    ],
    subtotal: 0,
    taxAmount: 0,
    taxRate: 10,
    totalAmount: 0,
    status: 'pending' as SupplierQuoteStatus,
    notes: '',
  });

  // 仕入先データの取得
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers');
        if (!response.ok) throw new Error('Failed to fetch suppliers');
        const data = await response.json();
        setSuppliers(data.suppliers || []);
      } catch (error) {
        logger.error('Error fetching suppliers:', error);
        toast.error('仕入先の取得に失敗しました');
      }
    };

    fetchSuppliers();
  }, []);

  // 見積書番号の自動生成
  useEffect(() => {
    const generateQuoteNumber = async () => {
      try {
        const response = await fetch('/api/supplier-quotes/generate-number', {
          method: 'POST',
        });
        if (!response.ok) throw new Error('Failed to generate quote number');
        const data = await response.json();
        setFormData(prev => ({ ...prev, quoteNumber: data.quoteNumber }));
      } catch (error) {
        logger.error('Error generating quote number:', error);
        // エラーの場合はタイムスタンプベースの番号を生成
        const timestamp = new Date().getTime();
        setFormData(prev => ({ ...prev, quoteNumber: `SQ-${timestamp}` }));
      }
    };

    generateQuoteNumber();
  }, []);

  // 項目の計算
  const calculateItemAmount = (item: SupplierQuoteItem) => {
    const amount = item.quantity * item.unitPrice;
    const taxAmount = amount * (item.taxRate / 100);
    return { amount, taxAmount };
  };

  // 項目の更新
  const updateItem = (index: number, field: keyof SupplierQuoteItem, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };

    // 金額の再計算
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
      const { amount, taxAmount } = calculateItemAmount(newItems[index]);
      newItems[index].amount = amount;
      newItems[index].taxAmount = taxAmount;
    }
    
    // 金額から単価を逆算（金額÷数量）
    if (field === 'amount' && newItems[index].quantity > 0) {
      const item = newItems[index];
      // 小数点第2位まで保持
      item.unitPrice = Math.round((value / item.quantity) * 100) / 100;
      item.taxAmount = Math.round(item.amount * (item.taxRate / 100));
    }

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // 項目の追加
  const addItem = () => {
    const newItem: SupplierQuoteItem = {
      itemName: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      amount: 0,
      taxRate: 10,
      taxAmount: 0,
    };

    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  // 項目の削除
  const removeItem = (index: number) => {
    if (formData.items && formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  // 合計の計算
  useEffect(() => {
    if (formData.items) {
      const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
      const taxAmount = formData.items.reduce((sum, item) => sum + item.taxAmount, 0);
      const totalAmount = subtotal + taxAmount;

      setFormData(prev => ({
        ...prev,
        subtotal,
        taxAmount,
        totalAmount,
      }));
    }
  }, [formData.items]);

  // フォームの送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // バリデーション
      if (!formData.quoteNumber) {
        toast.error('見積書番号を入力してください');
        return;
      }

      if (!formData.supplierId) {
        toast.error('仕入先を選択してください');
        return;
      }

      if (!formData.items || formData.items.length === 0) {
        toast.error('項目を追加してください');
        return;
      }

      // 項目のバリデーション
      for (const item of formData.items) {
        if (!item.itemName.trim()) {
          toast.error('項目名を入力してください');
          return;
        }
      }

      // データの送信
      const response = await fetch('/api/supplier-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create supplier quote');
      }

      const createdQuote = await response.json();
      toast.success('見積書を作成しました');
      router.push(`/supplier-quotes/${createdQuote._id}`);
    } catch (error) {
      logger.error('Error creating supplier quote:', error);
      toast.error(error instanceof Error ? error.message : '見積書の作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/supplier-quotes"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">仕入先見積書作成</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本情報 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                見積書番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.quoteNumber || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, quoteNumber: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                仕入先 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplierId?.toString() || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, supplierId: e.target.value ? e.target.value : undefined }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">選択してください</option>
                {suppliers.map(supplier => (
                  <option key={supplier._id?.toString()} value={supplier._id?.toString()}>
                    {supplier.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                発行日
              </label>
              <input
                type="date"
                value={formData.issueDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                有効期限
              </label>
              <input
                type="date"
                value={formData.validityDate || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, validityDate: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                value={formData.status || 'pending'}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as SupplierQuoteStatus }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="pending">保留</option>
                <option value="received">受信</option>
                <option value="accepted">承認</option>
                <option value="rejected">拒否</option>
              </select>
            </div>
          </div>
        </div>

        {/* 見積項目 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">見積項目</h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Plus size={16} />
              項目追加
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    項目名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    単価
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    税率
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    税額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items?.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                          placeholder="項目名"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="説明（任意）"
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        min="1"
                        className="w-20 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                        min="0"
                        step="0.01"
                        className="w-24 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateItem(index, 'amount', Number(e.target.value))}
                          min="0"
                          className="w-28 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.taxRate}
                        onChange={(e) => updateItem(index, 'taxRate', Number(e.target.value))}
                        min="0"
                        max="100"
                        className="w-16 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-500 ml-1">%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{(item.taxAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={formData.items?.length === 1}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 合計 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">小計:</span>
                  <span className="text-sm text-gray-900">¥{(formData.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">税額:</span>
                  <span className="text-sm text-gray-900">¥{(formData.taxAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-medium border-t pt-2">
                  <span className="text-sm text-gray-900">合計:</span>
                  <span className="text-sm text-gray-900">¥{(formData.totalAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 備考 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">備考</h2>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="備考がある場合は記入してください"
          />
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-end gap-4 pb-20">
          <Link
            href="/supplier-quotes"
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}