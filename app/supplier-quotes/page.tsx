'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter, Edit, Trash2, Calendar, Building, FileText, TrendingUp, ChevronLeft, ChevronRight, Upload, ScanLine, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SupplierQuote, SupplierQuoteStatus, Supplier } from '@/types/collections';

import { logger } from '@/lib/logger';
interface SupplierQuoteSearchResult {
  supplierQuotes: SupplierQuote[];
  total: number;
  hasMore: boolean;
}

interface FilterState {
  supplierId: string;
  status: SupplierQuoteStatus | '';
  dateFrom: string;
  dateTo: string;
  isGeneratedByAI: '' | 'true' | 'false';
}

const ITEMS_PER_PAGE = 20;

// ステータス表示用のスタイル
const statusStyles = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  received: 'bg-blue-100 text-blue-800 border-blue-200',
  accepted: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  expired: 'bg-gray-100 text-gray-800 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
  converted: 'bg-purple-100 text-purple-800 border-purple-200',
};

const statusLabels = {
  pending: '保留',
  received: '受信',
  accepted: '承認',
  rejected: '拒否',
  expired: '期限切れ',
  cancelled: 'キャンセル',
  converted: '発注書に変換',
};

export default function SupplierQuotesPage() {
  const router = useRouter();
  const [supplierQuotes, setSupplierQuotes] = useState<SupplierQuote[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuotes, setSelectedQuotes] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<FilterState>({
    supplierId: '',
    status: '',
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
      logger.error('Error fetching suppliers:', error);
    }
  }, []);

  // 仕入先見積書データの取得
  const fetchSupplierQuotes = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: ITEMS_PER_PAGE.toString(),
        skip: ((page - 1) * ITEMS_PER_PAGE).toString(),
      });

      if (filters.supplierId) params.append('supplierId', filters.supplierId);
      if (filters.status) params.append('status', filters.status);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.isGeneratedByAI) params.append('isGeneratedByAI', filters.isGeneratedByAI);

      const response = await fetch(`/api/supplier-quotes?${params}`);
      if (!response.ok) throw new Error('Failed to fetch supplier quotes');
      
      const data: SupplierQuoteSearchResult = await response.json();
      setSupplierQuotes(data.supplierQuotes);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (error) {
      logger.error('Error fetching supplier quotes:', error);
      toast.error('仕入先見積書の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // 初期データの取得
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchSupplierQuotes(currentPage);
  }, [fetchSupplierQuotes, currentPage]);

  // 検索の実行
  const handleSearch = () => {
    setCurrentPage(1);
    fetchSupplierQuotes(1);
  };

  // フィルターのリセット
  const handleResetFilters = () => {
    setFilters({
      supplierId: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      isGeneratedByAI: '',
    });
    setSearchTerm('');
    setCurrentPage(1);
  };

  // 全選択/解除
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredQuotes.map(quote => quote._id?.toString() || ''));
      setSelectedQuotes(allIds);
    } else {
      setSelectedQuotes(new Set());
    }
  };

  // 個別選択
  const handleSelectQuote = (quoteId: string, checked: boolean) => {
    const newSelection = new Set(selectedQuotes);
    if (checked) {
      newSelection.add(quoteId);
    } else {
      newSelection.delete(quoteId);
    }
    setSelectedQuotes(newSelection);
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedQuotes.size === 0) return;
    
    if (!confirm(`選択した${selectedQuotes.size}件の仕入先見積書を削除してもよろしいですか？この操作は取り消せません。`)) {
      return;
    }

    setLoading(true);
    try {
      logger.debug('Starting bulk delete for supplier quotes:', Array.from(selectedQuotes));
      
      const results = await Promise.allSettled(
        Array.from(selectedQuotes).map(async (id) => {
          const response = await fetch(`/api/supplier-quotes/${id}`, { 
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to delete supplier quote ${id}: ${errorData.error || response.statusText}`);
          }
          
          return { id, success: true };
        })
      );
      
      const failures = results.filter(result => result.status === 'rejected');
      const successes = results.filter(result => result.status === 'fulfilled');
      
      logger.debug('Bulk delete results:', { 
        total: results.length, 
        successes: successes.length, 
        failures: failures.length
      });
      
      if (failures.length > 0) {
        logger.error('Some supplier quotes failed to delete:', failures);
        toast.error(`${failures.length}件の削除に失敗しました。${successes.length}件は削除されました。`);
      } else {
        logger.info(`Successfully deleted ${successes.length} supplier quotes`);
        toast.success(`${successes.length}件の仕入先見積書を削除しました`);
      }
      
      // リフレッシュ
      await fetchSupplierQuotes(currentPage);
      setSelectedQuotes(new Set());
    } catch (error) {
      logger.error('Error bulk deleting supplier quotes:', error);
      toast.error('一括削除に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // 見積書の削除
  const handleDeleteQuote = async (id: string) => {
    if (!confirm('この仕入先見積書を削除してもよろしいですか？')) return;

    try {
      const response = await fetch(`/api/supplier-quotes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete supplier quote');

      toast.success('仕入先見積書を削除しました');
      fetchSupplierQuotes(currentPage);
    } catch (error) {
      logger.error('Error deleting supplier quote:', error);
      toast.error('仕入先見積書の削除に失敗しました');
    }
  };

  // 見積書の複製
  const handleDuplicateQuote = async (id: string) => {
    if (!confirm('この仕入先見積書を複製しますか？')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/supplier-quotes/${id}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to duplicate supplier quote');
      }

      const newQuote = await response.json();
      toast.success(`仕入先見積書を複製しました: ${newQuote.quoteNumber}`);
      
      // 新しい見積書の編集画面に遷移
      router.push(`/supplier-quotes/${newQuote._id}/edit`);
    } catch (error) {
      logger.error('Error duplicating supplier quote:', error);
      toast.error('仕入先見積書の複製に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 複数の見積書を一括複製
  const handleBulkDuplicate = async () => {
    if (selectedQuotes.size === 0) return;
    
    if (!confirm(`選択した${selectedQuotes.size}件の仕入先見積書を複製しますか？`)) {
      return;
    }

    setLoading(true);
    try {
      logger.debug('Starting bulk duplicate for supplier quotes:', Array.from(selectedQuotes));
      
      const results = await Promise.allSettled(
        Array.from(selectedQuotes).map(async (id) => {
          const response = await fetch(`/api/supplier-quotes/${id}/duplicate`, { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to duplicate supplier quote ${id}: ${errorData.error || response.statusText}`);
          }
          
          const newQuote = await response.json();
          return { id, newQuote, success: true };
        })
      );
      
      const failures = results.filter(result => result.status === 'rejected');
      const successes = results.filter(result => result.status === 'fulfilled');
      
      logger.debug('Bulk duplicate results:', { 
        total: results.length, 
        successes: successes.length, 
        failures: failures.length
      });
      
      if (failures.length > 0) {
        logger.error('Some supplier quotes failed to duplicate:', failures);
        toast.error(`${failures.length}件の複製に失敗しました。${successes.length}件は複製されました。`);
      } else {
        logger.info(`Successfully duplicated ${successes.length} supplier quotes`);
        toast.success(`${successes.length}件の仕入先見積書を複製しました`);
      }
      
      // リフレッシュ
      await fetchSupplierQuotes(currentPage);
      setSelectedQuotes(new Set());
    } catch (error) {
      logger.error('Error bulk duplicating supplier quotes:', error);
      toast.error('一括複製に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };


  // ページネーション
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // フィルター処理されたデータ
  const filteredQuotes = supplierQuotes.filter(quote => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      quote.quoteNumber.toLowerCase().includes(searchLower) ||
      quote.supplier?.companyName?.toLowerCase().includes(searchLower) ||
      quote.vendorName?.toLowerCase().includes(searchLower) ||
      quote.items?.some(item => 
        item.itemName?.toLowerCase().includes(searchLower)
      )
    );
  });

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">仕入先見積書管理</h1>
        <div className="flex gap-2">
          <Link
            href="/documents/new?type=supplier-quote"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <ScanLine size={20} />
            OCRスキャン
          </Link>
          <Link
            href="/supplier-quotes/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            <Plus size={20} />
            新規作成
          </Link>
        </div>
      </div>

      {/* OCR機能の説明 */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <ScanLine className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">OCR自動処理</h3>
            <p className="text-sm text-gray-600">
              仕入先からの見積書PDF/画像をアップロードすると、自動で項目・金額・仕入先情報を抽出し、見積書データを作成します。
              「OCRスキャン」ボタンから統合されたOCR処理ページでアップロードできます。
            </p>
          </div>
        </div>
      </div>

      {/* 一括操作バー */}
      {selectedQuotes.size > 0 && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">
                {selectedQuotes.size}件の仕入先見積書を選択中
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedQuotes(new Set())}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                選択解除
              </button>
              <button
                onClick={handleBulkDuplicate}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
              >
                <Copy size={16} />
                一括複製
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-md text-sm flex items-center gap-2"
              >
                <Trash2 size={16} />
                一括削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 検索とフィルター */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="見積書番号、仕入先名、商品名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-md flex items-center gap-2"
            >
              <Filter size={20} />
              フィルター
            </button>
            <button
              onClick={handleSearch}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              検索
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    仕入先
                  </label>
                  <select
                    value={filters.supplierId}
                    onChange={(e) => setFilters(prev => ({ ...prev, supplierId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">すべて</option>
                    {suppliers.map(supplier => (
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
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as SupplierQuoteStatus | '' }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">すべて</option>
                    <option value="pending">保留</option>
                    <option value="received">受信</option>
                    <option value="accepted">承認</option>
                    <option value="rejected">拒否</option>
                    <option value="expired">期限切れ</option>
                    <option value="cancelled">キャンセル</option>
                    <option value="converted">発注書に変換</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    開始日
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    終了日
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    AI生成
                  </label>
                  <select
                    value={filters.isGeneratedByAI}
                    onChange={(e) => setFilters(prev => ({ ...prev, isGeneratedByAI: e.target.value as '' | 'true' | 'false' }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">すべて</option>
                    <option value="true">AI生成</option>
                    <option value="false">手動作成</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  リセット
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 見積書一覧 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">
              見積書一覧 ({total}件)
            </h2>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            読み込み中...
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            見積書が見つかりません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredQuotes.length > 0 && selectedQuotes.size === filteredQuotes.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                      aria-label="すべて選択"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    見積書番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    仕入先
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    発行日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    有効期限
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成者
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuotes.map((quote) => (
                  <tr 
                    key={quote._id?.toString()} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      // 操作ボタンのクリックは除外
                      const target = e.target as HTMLElement;
                      if (target.closest('a') || target.closest('button') || target.closest('input')) {
                        return;
                      }
                      router.push(`/supplier-quotes/${quote._id?.toString()}`);
                    }}
                  >
                    <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedQuotes.has(quote._id?.toString() || '')}
                        onChange={(e) => handleSelectQuote(quote._id?.toString() || '', e.target.checked)}
                        className="rounded border-gray-300"
                        aria-label={`${quote.quoteNumber}を選択`}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-2" />
                        <Link
                          href={`/supplier-quotes/${quote._id?.toString()}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {quote.quoteNumber}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {quote.supplier?.companyName || quote.vendorName || '未設定'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(quote.issueDate).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(quote.validityDate).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{(quote.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${statusStyles[quote.status]}`}>
                        {statusLabels[quote.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {quote.isGeneratedByAI ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                          AI生成
                        </span>
                      ) : (
                        <span className="text-gray-500">手動作成</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleDuplicateQuote(quote._id?.toString()!)}
                          className="text-gray-600 hover:text-gray-800"
                          title="複製"
                        >
                          <Copy size={16} />
                        </button>
                        <Link
                          href={`/supplier-quotes/${quote._id?.toString()}/edit`}
                          className="text-blue-600 hover:text-blue-800"
                          title="編集"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDeleteQuote(quote._id?.toString()!)}
                          className="text-red-600 hover:text-red-800"
                          title="削除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                {total}件中 {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, total)}件を表示
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}