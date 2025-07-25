"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NewProductPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
function NewProductPage() {
    const router = (0, navigation_1.useRouter)();
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const [formData, setFormData] = (0, react_1.useState)({
        productName: '',
        productCode: '',
        description: '',
        unitPrice: 0,
        taxRate: 0.10,
        category: '',
        stockQuantity: 0,
        unit: '',
        isActive: true,
        notes: '',
        tags: []
    });
    // カテゴリ一覧を取得
    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/products/categories');
            if (response.ok) {
                const data = await response.json();
                setCategories(data);
            }
        }
        catch (err) {
            console.error('カテゴリ一覧取得エラー:', err);
        }
    };
    // フォーム送信
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '商品の作成に失敗しました');
            }
            router.push('/products');
        }
        catch (err) {
            console.error('商品作成エラー:', err);
            setError(err instanceof Error ? err.message : '商品の作成に失敗しました');
        }
        finally {
            setLoading(false);
        }
    };
    // 入力値変更ハンドラー
    const handleChange = (e) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = e.target.checked;
            setFormData(prev => ({
                ...prev,
                [name]: checked
            }));
        }
        else if (type === 'number') {
            setFormData(prev => ({
                ...prev,
                [name]: parseFloat(value) || 0
            }));
        }
        else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };
    // タグ入力ハンドラー
    const handleTagsChange = (e) => {
        const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
        setFormData(prev => ({
            ...prev,
            tags
        }));
    };
    (0, react_1.useEffect)(() => {
        fetchCategories();
    }, []);
    return (<div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">新規商品登録</h1>
          
          {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>)}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 商品名 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品名 <span className="text-red-500">*</span>
              </label>
              <input type="text" name="productName" value={formData.productName} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="商品名を入力してください"/>
            </div>

            {/* 商品コード */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品コード <span className="text-red-500">*</span>
              </label>
              <input type="text" name="productCode" value={formData.productCode} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="一意の商品コードを入力"/>
            </div>

            {/* カテゴリ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリ <span className="text-red-500">*</span>
              </label>
              <input type="text" name="category" value={formData.category} onChange={handleChange} required list="categories" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="カテゴリを入力または選択"/>
              <datalist id="categories">
                {categories.map(category => (<option key={category} value={category}/>))}
              </datalist>
            </div>

            {/* 単価 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                単価 <span className="text-red-500">*</span>
              </label>
              <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleChange} required min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0"/>
            </div>

            {/* 税率 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                税率 <span className="text-red-500">*</span>
              </label>
              <select name="taxRate" value={formData.taxRate} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
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
              <input type="number" name="stockQuantity" value={formData.stockQuantity} onChange={handleChange} required min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0"/>
            </div>

            {/* 単位 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                単位 <span className="text-red-500">*</span>
              </label>
              <input type="text" name="unit" value={formData.unit} onChange={handleChange} required list="units" className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="個、箱、本、台など"/>
              <datalist id="units">
                <option value="個"/>
                <option value="箱"/>
                <option value="本"/>
                <option value="台"/>
                <option value="セット"/>
                <option value="式"/>
                <option value="時間"/>
                <option value="日"/>
                <option value="kg"/>
                <option value="L"/>
              </datalist>
            </div>

            {/* 商品説明 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                商品説明
              </label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="商品の詳細説明を入力してください"/>
            </div>

            {/* タグ */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                タグ
              </label>
              <input type="text" onChange={handleTagsChange} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="タグをカンマ区切りで入力（例：新商品,人気,季節限定）"/>
            </div>

            {/* 備考 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="内部向けの備考を入力してください"/>
            </div>

            {/* 有効フラグ */}
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} className="mr-2"/>
                <span className="text-sm font-medium text-gray-700">
                  商品を有効にする
                </span>
              </label>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-4 mt-8">
            <button type="button" onClick={() => router.push('/products')} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
              キャンセル
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50">
              {loading ? '作成中...' : '商品を作成'}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
