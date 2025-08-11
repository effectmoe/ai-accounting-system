'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/collections';

import { logger } from '@/lib/logger';
export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [formData, setFormData] = useState<{
    productName: string;
    productCode: string;
    description: string;
    unitPrice: string;
    taxRate: number;
    category: string;
    stockQuantity: string;
    unit: string;
    isActive: boolean;
    notes: string;
    tags: string[];
  }>({
    productName: '',
    productCode: '',
    description: '',
    unitPrice: '',
    taxRate: 0.10,
    category: '',
    stockQuantity: '',
    unit: '',
    isActive: true,
    notes: '',
    tags: []
  });

  // 商品データを取得
  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/products/${params.id}`);
      if (!response.ok) {
        throw new Error('商品の取得に失敗しました');
      }
      
      const product: Product = await response.json();
      setFormData({
        productName: product.productName,
        productCode: product.productCode,
        description: product.description || '',
        unitPrice: String(product.unitPrice),
        taxRate: product.taxRate,
        category: product.category,
        stockQuantity: String(product.stockQuantity),
        unit: product.unit,
        isActive: product.isActive,
        notes: product.notes || '',
        tags: product.tags || []
      });
    } catch (err) {
      logger.error('商品取得エラー:', err);
      setError(err instanceof Error ? err.message : '商品の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // カテゴリ一覧を取得
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/products/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (err) {
      logger.error('カテゴリ一覧取得エラー:', err);
    }
  };

  // フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // 数値フィールドを適切に変換
    const submitData = {
      ...formData,
      unitPrice: parseFloat(formData.unitPrice) || 0,
      stockQuantity: parseFloat(formData.stockQuantity) || 0
    };

    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '商品の更新に失敗しました');
      }

      router.push('/products');
    } catch (err) {
      logger.error('商品更新エラー:', err);
      setError(err instanceof Error ? err.message : '商品の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 入力値変更ハンドラー
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else if (name === 'unitPrice' || name === 'stockQuantity') {
      // 数値フィールドの処理（text型でも数値として扱う）
      // 数字と小数点のみ許可
      const cleanedValue = value.replace(/[^0-9.]/g, '');
      
      // 複数の小数点を防ぐ
      const parts = cleanedValue.split('.');
      const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanedValue;
      
      // 先頭の0を削除（ただし0.xxxの場合は除く）
      let normalizedValue = finalValue;
      if (finalValue.length > 1 && finalValue[0] === '0' && finalValue[1] !== '.') {
        normalizedValue = finalValue.replace(/^0+/, '');
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: normalizedValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // タグ入力ハンドラー
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  useEffect(() => {
    fetchProduct();
    fetchCategories();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">商品編集</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 商品名 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="商品名を入力してください"
              />
            </div>

            {/* 商品コード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品コード <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="productCode"
                value={formData.productCode}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="一意の商品コードを入力"
              />
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                list="categories"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="カテゴリを入力または選択"
              />
              <datalist id="categories">
                {categories.map(category => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>

            {/* 単価 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                単価 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="unitPrice"
                value={formData.unitPrice}
                onChange={handleChange}
                required
                pattern="[0-9]+(\.[0-9]+)?"
                inputMode="decimal"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            {/* 税率 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                税率 <span className="text-red-500">*</span>
              </label>
              <select
                name="taxRate"
                value={formData.taxRate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={0.08}>8%</option>
                <option value={0.10}>10%</option>
                <option value={0.00}>0%（非課税）</option>
              </select>
            </div>

            {/* 在庫数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                在庫数 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                required
                pattern="[0-9]+(\.[0-9]+)?"
                inputMode="numeric"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            {/* 単位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                単位 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
                list="units"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="個、箱、本、台など"
              />
              <datalist id="units">
                <option value="個" />
                <option value="箱" />
                <option value="本" />
                <option value="台" />
                <option value="セット" />
                <option value="式" />
                <option value="時間" />
                <option value="日" />
                <option value="kg" />
                <option value="L" />
              </datalist>
            </div>

            {/* 商品説明 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品説明
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="商品の詳細説明を入力してください"
              />
            </div>

            {/* タグ */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タグ
              </label>
              <input
                type="text"
                value={formData.tags.join(', ')}
                onChange={handleTagsChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="タグをカンマ区切りで入力（例：新商品,人気,季節限定）"
              />
            </div>

            {/* 備考 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="内部向けの備考を入力してください"
              />
            </div>

            {/* 有効フラグ */}
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700">
                  商品を有効にする
                </span>
              </label>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              type="button"
              onClick={() => router.push('/products')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saving ? '更新中...' : '商品を更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}