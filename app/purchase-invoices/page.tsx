'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter, Edit, Trash2, Calendar, Building, FileText, DollarSign, ChevronLeft, ChevronRight, Upload, ScanLine, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { PurchaseInvoice, PurchaseInvoiceStatus, Supplier } from '@/types/collections';

interface PurchaseInvoiceSearchResult {
  invoices: PurchaseInvoice[];
  total: number;
  totalAmount: number;
}

interface FilterState {
  supplierId: string;
  status: PurchaseInvoiceStatus | '';
  paymentStatus: 'pending' | 'partial' | 'paid' | '';
  dateFrom: string;
  dateTo: string;
  isGeneratedByAI: '' | 'true' | 'false';
}

const ITEMS_PER_PAGE = 20;

// ステータス表示用のスタイル
const statusStyles = {
  draft: 'bg-gray-100 text-gray-800 border-gray-200',
  received: 'bg-blue-100 text-blue-800 border-blue-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  paid: 'bg-purple-100 text-purple-800 border-purple-200',
  overdue: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusLabels = {
  draft: '下書き',
  received: '受領済み',
  approved: '承認済み',
  paid: '支払済み',
  overdue: '期限超過',
  cancelled: 'キャンセル',
};

const paymentStatusStyles = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-orange-100 text-orange-800',
  paid: 'bg-green-100 text-green-800',
};

const paymentStatusLabels = {
  pending: '未払い',
  partial: '一部支払い',
  paid: '支払済み',
};

export default function PurchaseInvoicesPage() {
  const router = useRouter();
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    supplierId: '',
    status: '',
    paymentStatus: '',
    dateFrom: '',
    dateTo: '',
    isGeneratedByAI: '',
  });

  // 仕入先データの取得
  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await fetch('/api/suppliers');
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  }, []);

  // 仕入請求書データの取得
  const fetchPurchaseInvoices = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        skip: ((page - 1) * ITEMS_PER_PAGE).toString(),
      });

      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (filters.supplierId) params.append('supplierId', filters.supplierId);
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.isGeneratedByAI) params.append('isGeneratedByAI', filters.isGeneratedByAI);

      const response = await fetch(`/api/purchase-invoices?${params}`);
      if (!response.ok) throw new Error('Failed to fetch purchase invoices');
      
      const data: PurchaseInvoiceSearchResult = await response.json();
      setPurchaseInvoices(data.invoices);
      setTotal(data.total);
      setTotalAmount(data.totalAmount);
    } catch (error) {
      console.error('Error fetching purchase invoices:', error);
      toast.error('仕入請求書の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [filters, debouncedSearchTerm]);

  // 初期データの取得
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // デバウンス処理
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // 検索時はページを1に戻す
    }, 500); // 500ms後に検索実行

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // フィルター変更時もページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    fetchPurchaseInvoices(currentPage);
  }, [fetchPurchaseInvoices, currentPage]);


  // フィルターのリセット
  const handleResetFilters = () => {
    setFilters({
      supplierId: '',
      status: '',
      paymentStatus: '',
      dateFrom: '',
      dateTo: '',
      isGeneratedByAI: '',
    });
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
  };

  // 請求書の削除
  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('この仕入請求書を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/purchase-invoices/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete purchase invoice');

      toast.success('仕入請求書を削除しました');
      fetchPurchaseInvoices(currentPage);
    } catch (error) {
      console.error('Error deleting purchase invoice:', error);
      toast.error('仕入請求書の削除に失敗しました');
    }
  };

  // ステータスの更新
  const handleUpdateStatus = async (id: string, status: PurchaseInvoiceStatus) => {
    try {
      const response = await fetch(`/api/purchase-invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      toast.success('ステータスを更新しました');
      fetchPurchaseInvoices(currentPage);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('ステータスの更新に失敗しました');
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">仕入請求書一覧</h1>
          <p className="mt-2 text-sm text-gray-700">
            仕入先からの請求書を管理します
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/documents/new?type=purchase-invoice"
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
          >
            <ScanLine className="w-5 h-5" />
            <span>OCRスキャン</span>
          </Link>
          <Link
            href="/purchase-invoices/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>新規作成</span>
          </Link>
        </div>
      </div>

      {/* 検索とフィルター */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="請求書番号、仕入先名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center space-x-2"
          >
            <Filter className="w-5 h-5" />
            <span>フィルター</span>
          </button>
        </div>

        {/* フィルターオプション */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                仕入先
              </label>
              <select
                value={filters.supplierId}
                onChange={(e) => setFilters({ ...filters, supplierId: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">全て</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id?.toString()} value={supplier._id?.toString()}>
                    {supplier.companyName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as PurchaseInvoiceStatus | '' })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">全て</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支払状況
              </label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value as any })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">全て</option>
                {Object.entries(paymentStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                発行日（開始）
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                発行日（終了）
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI生成
              </label>
              <select
                value={filters.isGeneratedByAI}
                onChange={(e) => setFilters({ ...filters, isGeneratedByAI: e.target.value as any })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">全て</option>
                <option value="true">AI生成のみ</option>
                <option value="false">手動作成のみ</option>
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end space-x-2">
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                リセット
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総請求書数</p>
              <p className="text-2xl font-semibold text-gray-900">{total}</p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">総請求額</p>
              <p className="text-2xl font-semibold text-gray-900">
                ¥{totalAmount.toLocaleString()}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">未払い請求書</p>
              <p className="text-2xl font-semibold text-gray-900">
                {purchaseInvoices.filter(inv => inv.paymentStatus === 'pending').length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
        </div>
      </div>

      {/* 請求書一覧 */}
      <div className="bg-white shadow rounded-lg">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-500">読み込み中...</p>
          </div>
        ) : purchaseInvoices.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-gray-500">仕入請求書がありません</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      請求書番号
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      仕入先
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      発行日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      支払期限
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      金額
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      支払状況
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      種別
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      作成日時
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseInvoices.map((invoice) => (
                    <tr 
                      key={invoice._id?.toString()} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={(e) => {
                        // アクションボタンがクリックされた場合は行クリックを無効化
                        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
                          return;
                        }
                        router.push(`/purchase-invoices/${invoice._id}`);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.supplier?.companyName || invoice.vendorName || '不明'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.issueDate).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invoice.dueDate).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ¥{invoice.totalAmount?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[invoice.status]}`}>
                          {statusLabels[invoice.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${paymentStatusStyles[invoice.paymentStatus]}`}>
                          {paymentStatusLabels[invoice.paymentStatus]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.isGeneratedByAI ? (
                          <span className="text-blue-600">AI生成</span>
                        ) : (
                          <span className="text-gray-400">手動</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.createdAt ? (
                          <div>
                            <div>{new Date(invoice.createdAt).toLocaleDateString('ja-JP')}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(invoice.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/purchase-invoices/${invoice._id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteInvoice(invoice._id!.toString());
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    前へ
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    次へ
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      全 <span className="font-medium">{total}</span> 件中{' '}
                      <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * ITEMS_PER_PAGE, total)}
                      </span>{' '}
                      件を表示
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i + 1}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            currentPage === i + 1
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}