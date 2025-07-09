'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '@/types/collections';

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // 商品一覧を取得
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.append('q', searchQuery);
      } else {
        if (!showInactive) {
          params.append('isActive', 'true');
        }
        if (selectedCategory) {
          params.append('category', selectedCategory);
        }
      }

      const response = await fetch(`/api/products?${params}`);
      if (!response.ok) {
        throw new Error('商品一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      console.error('商品一覧取得エラー:', err);
      setError(err instanceof Error ? err.message : '商品一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // カテゴリ一覧を取得
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/products/categories');
      if (!response.ok) {
        throw new Error('カテゴリ一覧の取得に失敗しました');
      }
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('カテゴリ一覧取得エラー:', err);
    }
  };

  // 商品削除
  const handleDelete = async (id: string, productName: string) => {
    if (!window.confirm(`商品「${productName}」を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('商品の削除に失敗しました');
      }

      await fetchProducts();
    } catch (err) {
      console.error('商品削除エラー:', err);
      setError(err instanceof Error ? err.message : '商品の削除に失敗しました');
    }
  };

  // 有効/無効切り替え
  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (!response.ok) {
        throw new Error('商品の更新に失敗しました');
      }

      await fetchProducts();
    } catch (err) {
      console.error('商品更新エラー:', err);
      setError(err instanceof Error ? err.message : '商品の更新に失敗しました');
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory, showInactive]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">商品管理</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* 検索・フィルタエリア */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                検索
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="商品名、商品コード、説明で検索"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                カテゴリ
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">すべて</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="mr-2"
                />
                無効な商品も表示
              </label>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {products.length}件の商品が見つかりました
            </div>
            <button
              onClick={() => router.push('/products/new')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              新規商品登録
            </button>
          </div>
        </div>

        {/* 商品一覧テーブル */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    商品情報
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カテゴリ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    単価
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    在庫
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状態
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product._id?.toString()} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {product.productName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {product.productCode}
                        </div>
                        {product.description && (
                          <div className="text-sm text-gray-400 mt-1">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{product.unitPrice.toLocaleString()}
                      <div className="text-xs text-gray-500">
                        税率: {(product.taxRate * 100).toFixed(0)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.stockQuantity} {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                          product.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                        onClick={() => toggleActive(product._id!.toString(), product.isActive)}
                      >
                        {product.isActive ? '有効' : '無効'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => router.push(`/products/${product._id}/edit`)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(product._id!.toString(), product.productName)}
                        className="text-red-600 hover:text-red-900"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {products.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500">商品が見つかりません</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}