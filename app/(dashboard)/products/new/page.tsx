'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/collections';

import { logger } from '@/lib/logger';
export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);
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
    unitPrice: '',  // 空文字列で初期化
    taxRate: 0.10,
    category: '',
    stockQuantity: '',  // 空文字列で初期化
    unit: '個',  // デフォルト単位を設定
    isActive: true,
    notes: '',
    tags: []
  });

  // 商品コードを自動生成する関数（英数字のみ使用）
  const generateProductCode = (productName: string, category: string) => {
    if (!productName) return '';
    
    // カテゴリから英数字のみ抽出（最大3文字）
    let categoryPrefix = 'GEN'; // デフォルトカテゴリ
    if (category) {
      const extracted = category.replace(/[^A-Za-z0-9]/gi, '').substring(0, 3).toUpperCase();
      if (extracted) {
        categoryPrefix = extracted;
      }
    }
    
    // 商品名から英数字のみ抽出
    const nameAlphanumeric = productName.replace(/[^A-Za-z0-9\s]/gi, '');
    const nameWords = nameAlphanumeric.split(/\s+/).filter(word => word);
    
    let namePrefix = '';
    
    if (nameWords.length > 0 && nameWords[0]) {
      // 英数字が含まれる場合は最初の単語から4文字まで使用
      namePrefix = nameWords[0].substring(0, 4).toUpperCase();
    }
    
    // 英数字がない場合は「PRD」を使用
    if (!namePrefix) {
      namePrefix = 'PRD';
    }
    
    // 現在時刻をベースにした一意な識別子（YYMMDD形式）
    const now = new Date();
    const timeCode = 
      now.getFullYear().toString().slice(-2) +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0');
    
    // ランダムな3文字を追加（英数字のみ）
    const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    // フォーマット: カテゴリ-名前-日付-ランダム
    return `${categoryPrefix}-${namePrefix}-${timeCode}-${randomChars}`;
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
    setLoading(true);
    setError('');
    
    // 詳細なデバッグ情報を出力
    console.log('=== 商品登録開始 ===');
    console.log('Current formData:', formData);
    console.log('formData keys:', Object.keys(formData));
    Object.keys(formData).forEach(key => {
      const value = (formData as any)[key];
      console.log(`formData.${key}:`, value, 'type:', typeof value, 'empty?', !value);
    });

    // 単価の検証
    if (!formData.unitPrice || formData.unitPrice.trim() === '') {
      setError('単価を入力してください');
      setLoading(false);
      return;
    }
    
    const unitPriceNum = parseFloat(formData.unitPrice);
    if (isNaN(unitPriceNum) || unitPriceNum <= 0) {
      setError('単価は0より大きい値を入力してください');
      setLoading(false);
      return;
    }

    // 自動生成が有効で商品コードが空の場合、自動生成
    let productCode = formData.productCode;
    if (autoGenerateCode && !productCode) {
      productCode = generateProductCode(formData.productName, formData.category);
    }

    // 必須フィールドのチェック
    console.log('=== 必須フィールドチェック開始 ===');
    console.log('productName check:', formData.productName, 'trimmed:', formData.productName.trim(), 'valid:', !!formData.productName.trim());
    if (!formData.productName.trim()) {
      console.error('商品名が空です');
      setError('商品名を入力してください');
      setLoading(false);
      return;
    }
    
    console.log('category check:', formData.category, 'trimmed:', formData.category.trim(), 'valid:', !!formData.category.trim());
    if (!formData.category.trim()) {
      console.error('カテゴリが空です');
      setError('カテゴリを入力してください');
      setLoading(false);
      return;
    }
    
    console.log('unit check:', formData.unit, 'trimmed:', formData.unit.trim(), 'valid:', !!formData.unit.trim());
    if (!formData.unit.trim()) {
      console.error('単位が空です');
      setError('単位を入力してください');
      setLoading(false);
      return;
    }
    console.log('=== 必須フィールドチェック完了 ===');

    const submitData = {
      ...formData,
      productCode: productCode.trim(),
      unitPrice: unitPriceNum,
      stockQuantity: formData.stockQuantity ? parseFloat(formData.stockQuantity) || 0 : 0,
      taxRate: formData.taxRate, // 明示的にtaxRateを含める
      productName: formData.productName.trim(),
      category: formData.category.trim(),
      unit: formData.unit.trim(),
      description: formData.description.trim(),
      notes: formData.notes.trim()
    };

    // デバッグ: 送信データを確認
    console.log('送信データ:', submitData);
    console.log('formData.unitPrice:', formData.unitPrice, 'type:', typeof formData.unitPrice);
    console.log('unitPriceNum:', unitPriceNum, 'type:', typeof unitPriceNum);
    console.log('formData.stockQuantity:', formData.stockQuantity, 'type:', typeof formData.stockQuantity);
    console.log('formData.taxRate:', formData.taxRate, 'type:', typeof formData.taxRate);
    console.log('submitData.taxRate:', submitData.taxRate, 'type:', typeof submitData.taxRate);
    
    console.log('=== API送信直前 ===');
    console.log('Final submitData:', JSON.stringify(submitData, null, 2));
    console.log('submitData size:', JSON.stringify(submitData).length, 'characters');

    try {
      console.log('=== API送信開始 ===');
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      
      console.log('=== API応答受信 ===');
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || `商品の作成に失敗しました (${response.status})`;
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorMessage);
      }

      router.push('/products');
    } catch (err) {
      logger.error('商品作成エラー:', err);
      setError(err instanceof Error ? err.message : '商品の作成に失敗しました');
    } finally {
      setLoading(false);
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
    } else if (name === 'taxRate') {
      // 税率フィールドの処理（数値として保持）
      const numericValue = parseFloat(value);
      console.log('taxRate selected:', value, '-> parsed:', numericValue);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
    } else {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        
        // 自動生成が有効で、商品名またはカテゴリが変更された場合、商品コードを自動更新
        if (autoGenerateCode && (name === 'productName' || name === 'category')) {
          const productName = name === 'productName' ? value : prev.productName;
          const category = name === 'category' ? value : prev.category;
          if (productName) {  // 商品名だけでも生成する
            newData.productCode = generateProductCode(productName, category);
          }
        }
        
        return newData;
      });
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
    fetchCategories();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">新規商品登録</h1>
          
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  商品コード <span className="text-red-500">*</span>
                </label>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={autoGenerateCode}
                    onChange={(e) => {
                      setAutoGenerateCode(e.target.checked);
                      if (e.target.checked && formData.productName) {  // 商品名があれば生成
                        setFormData(prev => ({
                          ...prev,
                          productCode: generateProductCode(formData.productName, formData.category)
                        }));
                      }
                    }}
                    className="mr-1"
                  />
                  <span className="text-gray-600">自動生成</span>
                </label>
              </div>
              <input
                type="text"
                name="productCode"
                value={formData.productCode}
                onChange={(e) => {
                  // 手動で入力した場合は自動生成を無効化
                  if (autoGenerateCode) {
                    setAutoGenerateCode(false);
                  }
                  handleChange(e);
                }}
                required
                disabled={autoGenerateCode && (!formData.productName || !formData.category)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder={autoGenerateCode ? "商品名とカテゴリを入力すると自動生成されます" : "商品コードを入力"}
              />
              {autoGenerateCode && formData.productCode && (
                <p className="mt-1 text-xs text-gray-500">
                  自動生成されたコード: {formData.productCode}
                </p>
              )}
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
                placeholder="価格を入力"
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
                <option value={0.10}>10%（標準税率）</option>
                <option value={0.08}>8%（軽減税率）</option>
                <option value={0.00}>0%（非課税・税込価格）</option>
                <option value={-1}>内税（税込価格から逆算）</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                ※税込価格の商品は「0%（非課税・税込価格）」を選択してください
              </p>
            </div>

            {/* 在庫数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                在庫数
              </label>
              <input
                type="text"
                name="stockQuantity"
                value={formData.stockQuantity}
                onChange={handleChange}
                pattern="[0-9]+(\.[0-9]+)?"
                inputMode="numeric"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="数量を入力（空の場合は0として登録されます）"
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
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? '作成中...' : '商品を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}