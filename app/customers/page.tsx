'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Edit, Trash2, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const ITEMS_PER_PAGE = 10;

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());

  // 顧客一覧を取得
  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        search: searchTerm,
      });
      
      const response = await fetch(`/api/customers?${params}`);
      
      if (!response.ok) {
        throw new Error('顧客データの取得に失敗しました');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setCustomers(data.customers);
        setTotalPages(Math.ceil(data.total / ITEMS_PER_PAGE));
      } else {
        throw new Error(data.error || '顧客データの取得に失敗しました');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('顧客データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // 顧客削除
  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('この顧客を削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('顧客の削除に失敗しました');
      }

      toast.success('顧客を削除しました');
      fetchCustomers();
    } catch (error) {
      console.error('削除エラー:', error);
      toast.error('顧客の削除に失敗しました');
    }
  };

  // 複数選択
  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  const selectAllCustomers = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(customer => customer.id)));
    }
  };

  // 一括削除
  const deleteSelectedCustomers = async () => {
    if (selectedCustomers.size === 0) return;
    
    if (!confirm(`選択した${selectedCustomers.size}件の顧客を削除しますか？`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedCustomers).map(customerId => 
        fetch(`/api/customers/${customerId}`, { method: 'DELETE' })
      );
      
      const results = await Promise.all(deletePromises);
      const failedDeletions = results.filter(r => !r.ok).length;
      
      if (failedDeletions > 0) {
        toast.error(`${failedDeletions}件の削除に失敗しました`);
      } else {
        toast.success(`${selectedCustomers.size}件の顧客を削除しました`);
      }
      
      setSelectedCustomers(new Set());
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customers:', error);
      toast.error('削除に失敗しました');
    }
  };

  // 検索処理
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCustomers();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">顧客管理</h1>
        <Link 
          href="/customers/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新規顧客登録
        </Link>
      </div>

      {/* 検索バー */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="顧客名、メールアドレス、会社名で検索..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            検索
          </button>
        </form>
      </div>

      {/* 顧客一覧 */}
      <div className="bg-white rounded-lg shadow">
        {selectedCustomers.size > 0 && (
          <div className="flex gap-2 items-center p-4 bg-blue-50 border-b">
            <input
              type="checkbox"
              checked={selectedCustomers.size === customers.length}
              onChange={selectAllCustomers}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm">{selectedCustomers.size}件選択中</span>
            <button
              onClick={deleteSelectedCustomers}
              className="ml-auto text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              一括削除
            </button>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.size === customers.length && customers.length > 0}
                    onChange={selectAllCustomers}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">顧客名</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">メールアドレス</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">電話番号</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">会社名</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">登録日</th>
                <th className="p-4 text-left text-sm font-medium text-gray-700">操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    顧客データがありません
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.id)}
                        onChange={() => toggleCustomerSelection(customer.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="p-4 text-sm font-medium">{customer.name}</td>
                    <td className="p-4 text-sm text-gray-600">{customer.email}</td>
                    <td className="p-4 text-sm text-gray-600">{customer.phone || '-'}</td>
                    <td className="p-4 text-sm text-gray-600">{customer.company || '-'}</td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(customer.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/customers/${customer.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-600">
              {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, customers.length)} 件を表示
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`p-2 rounded ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`p-2 rounded ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}