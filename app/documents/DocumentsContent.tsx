'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DocumentService, SavedDocument } from '@/services/document-service';
import { FileText, Download, Send, CheckCircle, Filter, Plus, Paperclip, Bell, Edit, FileCheck, Archive, Grid3X3, List, Trash2, Image } from 'lucide-react';
import { toast } from 'react-hot-toast';

const documentTypeLabels = {
  estimate: '見積書',
  invoice: '請求書',
  delivery_note: '納品書',
  receipt: '領収書'
};

const statusLabels = {
  draft: '下書き',
  confirmed: '確定済み',
  viewed: '閲覧済み',
  accepted: '承認済み',
  paid: '支払済み',
  cancelled: 'キャンセル'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  paid: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800'
};

interface OcrResult {
  id: string;
  file_name: string;
  vendor_name: string;
  receipt_date: string;
  subtotal_amount?: number;
  tax_amount: number;
  total_amount: number;
  payment_amount?: number;
  change_amount?: number;
  receipt_number?: string;
  store_name?: string;
  store_phone?: string;
  company_name?: string;
  notes?: string;
  extracted_text: string;
  created_at: string;
  status: string;
  linked_document_id?: string;
}

export default function DocumentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'ocr');
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    documentType: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [ocrSortBy, setOcrSortBy] = useState<'date' | 'vendor' | 'amount'>('date');
  const [ocrSortOrder, setOcrSortOrder] = useState<'asc' | 'desc'>('desc');
  const [ocrFilters, setOcrFilters] = useState({
    vendor: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: ''
  });
  const documentsPerPage = 20;

  // タブ変更時にURLパラメータを更新
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/documents?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // OCR結果を取得
  const fetchOcrResults = useCallback(async () => {
    console.log('🔍 OCR結果取得開始 - ページ:', currentPage, 'リミット:', documentsPerPage);
    
    try {
      const apiUrl = `/api/ocr-results?page=${currentPage}&limit=${documentsPerPage}`;
      console.log('🌐 API URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      console.log('📡 レスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const data = await response.json();
      console.log('📊 レスポンスデータ:', {
        success: data.success,
        dataLength: data.data?.length,
        total: data.total,
        page: data.page,
        limit: data.limit,
        error: data.error
      });
      
      if (data.success) {
        console.log('✅ OCR結果取得成功:', data.data?.length, '件');
        setOcrResults(data.data || []);
        setTotalPages(Math.ceil((data.total || 0) / documentsPerPage));
        console.log('📈 総ページ数設定:', Math.ceil((data.total || 0) / documentsPerPage));
      } else {
        console.error('❌ OCR結果取得失敗:', data.error);
        toast.error('OCR結果の取得に失敗しました');
      }
    } catch (error) {
      console.error('🚨 OCR結果取得エラー:', error);
      console.error('🚨 エラースタック:', error.stack);
      toast.error('OCR結果の取得中にエラーが発生しました');
    }
  }, [currentPage]);

  // 文書一覧を取得
  const fetchDocuments = useCallback(async () => {
    try {
      const companyId = '11111111-1111-1111-1111-111111111111';
      const skip = (currentPage - 1) * documentsPerPage;
      
      // クエリパラメータを構築
      const params = new URLSearchParams({
        companyId,
        limit: documentsPerPage.toString(),
        skip: skip.toString()
      });

      // フィルター適用
      if (filters.documentType) {
        params.append('documentType', filters.documentType);
      }
      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.dateFrom) {
        params.append('dateFrom', filters.dateFrom);
      }
      if (filters.dateTo) {
        params.append('dateTo', filters.dateTo);
      }

      const response = await fetch(`/api/documents/list?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
        setTotalPages(data.totalPages || 1);
      } else {
        console.error('Error fetching documents:', data.error);
        toast.error('文書の取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('文書の取得中にエラーが発生しました');
    }
  }, [filters, currentPage]);

  // 文書化
  const handleCreateDocument = async (ocrResult: OcrResult, documentType: string = 'receipt') => {
    try {
      // API経由で文書作成（シンプル版）
      const response = await fetch('/api/documents/create-from-ocr-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ocrResultId: ocrResult.id,
          document_type: documentType,
          vendor_name: ocrResult.vendor_name,
          receipt_date: ocrResult.receipt_date,
          subtotal_amount: ocrResult.subtotal_amount || 0,
          tax_amount: ocrResult.tax_amount,
          total_amount: ocrResult.total_amount,
          payment_amount: ocrResult.payment_amount || 0,
          change_amount: ocrResult.change_amount || 0,
          receipt_number: ocrResult.receipt_number || '',
          store_name: ocrResult.store_name || '',
          store_phone: ocrResult.store_phone || '',
          company_name: ocrResult.company_name || '',
          notes: ocrResult.notes || '',
          file_name: ocrResult.file_name,
          extracted_text: ocrResult.extracted_text
        })
      });

      const result = await response.json();
      console.log('Document creation response:', result);
      
      if (response.ok) {
        toast.success(`${result.message || '領収書を作成しました'}`);
        // ローカルステートを即座に更新
        setOcrResults(prev => prev.map(ocr => 
          ocr.id === ocrResult.id 
            ? { ...ocr, linked_document_id: result.id, status: 'processed' }
            : ocr
        ));
        // 文書一覧のみ更新（OCR結果はローカルステートを維持）
        await fetchDocuments();
        
      } else {
        console.error('Document creation error:', result);
        toast.error(result.error || '文書の作成に失敗しました');
      }
    } catch (error) {
      console.error('Document creation error:', error);
      toast.error('文書の作成中にエラーが発生しました');
    }
  };

  // ステータス更新
  const handleStatusUpdate = async (documentId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        toast.success('ステータスを更新しました');
        await fetchDocuments();
      } else {
        const error = await response.json();
        toast.error(error.error || 'ステータスの更新に失敗しました');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('ステータスの更新中にエラーが発生しました');
    }
  };

  // OCR結果を削除
  const handleDeleteOcrResult = async (ocrResult: OcrResult) => {
    if (!confirm('このOCR結果を削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/ocr-results/${ocrResult.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }

      toast.success('OCR結果を削除しました');
      await fetchOcrResults();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : '削除に失敗しました');
    }
  };

  // 初回ロードのみ
  useEffect(() => {
    console.log('🚀 初回ロード開始');
    setLoading(true);
    
    // 初回ロード時のみ実行
    console.log('📋 OCR結果とドキュメント取得開始');
    Promise.all([
      fetchOcrResults(),
      fetchDocuments()
    ]).then(() => {
      console.log('✅ 初回データ取得完了');
    }).catch((error) => {
      console.error('❌ 初回データ取得エラー:', error);
    }).finally(() => {
      console.log('🏁 ローディング終了');
      setLoading(false);
    });
  }, []); // 依存配列を空にして初回のみ実行
  
  // ページ変更時の処理（初回ロード以外）
  useEffect(() => {
    console.log('📄 ページ変更:', currentPage, 'アクティブタブ:', activeTab);
    // 初回ロード（currentPage=1）は既に初回useEffectで処理済みなのでスキップ
    if (currentPage > 1) {
      if (activeTab === 'ocr') {
        fetchOcrResults();
      } else {
        fetchDocuments();
      }
    }
  }, [currentPage]); // activeTabとcallback関数は依存配列から除去

  // フィルター変更時に文書を再取得
  useEffect(() => {
    console.log('🔍 フィルター変更:', filters);
    if (activeTab === 'documents') {
      setCurrentPage(1);
      fetchDocuments();
    }
  }, [filters]);

  // OCR結果をソート・フィルタリング
  const filteredAndSortedOcrResults = useCallback(() => {
    let filtered = [...ocrResults];

    // フィルタリング
    if (ocrFilters.vendor) {
      const vendorQuery = ocrFilters.vendor.toLowerCase();
      filtered = filtered.filter(result => 
        (result.vendor_name?.toLowerCase().includes(vendorQuery)) ||
        (result.store_name?.toLowerCase().includes(vendorQuery)) ||
        (result.company_name?.toLowerCase().includes(vendorQuery))
      );
    }

    if (ocrFilters.dateFrom) {
      filtered = filtered.filter(result => {
        const resultDate = new Date(result.receipt_date);
        const fromDate = new Date(ocrFilters.dateFrom);
        return resultDate >= fromDate;
      });
    }

    if (ocrFilters.dateTo) {
      filtered = filtered.filter(result => {
        const resultDate = new Date(result.receipt_date);
        const toDate = new Date(ocrFilters.dateTo);
        return resultDate <= toDate;
      });
    }

    // ソート
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (ocrSortBy) {
        case 'date':
          comparison = new Date(a.receipt_date).getTime() - new Date(b.receipt_date).getTime();
          break;
        case 'vendor':
          const vendorA = a.vendor_name || a.store_name || a.company_name || '';
          const vendorB = b.vendor_name || b.store_name || b.company_name || '';
          comparison = vendorA.localeCompare(vendorB, 'ja');
          break;
        case 'amount':
          comparison = (a.total_amount || 0) - (b.total_amount || 0);
          break;
      }

      return ocrSortOrder === 'desc' ? -comparison : comparison;
    });

    console.log('🔄 フィルタ・ソート結果:', {
      original: ocrResults.length,
      filtered: filtered.length,
      sortBy: ocrSortBy,
      sortOrder: ocrSortOrder,
      filters: ocrFilters
    });

    return filtered;
  }, [ocrResults, ocrSortBy, ocrSortOrder, ocrFilters]);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <h1 className="text-2xl font-bold text-gray-900">書類管理</h1>
              <div className="flex items-center space-x-4">
                <Link
                  href="/documents/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新規作成
                </Link>
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Bell className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            {/* タブ */}
            <div className="mb-6">
              <nav className="flex space-x-4">
                <button
                  onClick={() => handleTabChange('ocr')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'ocr'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  OCR結果
                </button>
                <button
                  onClick={() => handleTabChange('documents')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    activeTab === 'documents'
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  作成済み文書
                </button>
              </nav>
            </div>

            {/* フィルター（作成済み文書タブ） */}
            {activeTab === 'documents' && (
              <div className="bg-white rounded-lg shadow mb-6 p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">フィルター:</span>
                    </div>
                    
                    <select
                      value={filters.documentType}
                      onChange={(e) => setFilters({ ...filters, documentType: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">すべての種類</option>
                      <option value="estimate">見積書</option>
                      <option value="invoice">請求書</option>
                      <option value="delivery_note">納品書</option>
                      <option value="receipt">領収書</option>
                    </select>

                    <select
                      value={filters.status}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">すべてのステータス</option>
                      <option value="draft">下書き</option>
                      <option value="confirmed">確定済み</option>
                      <option value="viewed">閲覧済み</option>
                      <option value="accepted">承認済み</option>
                      <option value="paid">支払済み</option>
                      <option value="cancelled">キャンセル</option>
                    </select>

                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="開始日"
                    />

                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="終了日"
                    />

                    <button
                      onClick={() => setFilters({ documentType: '', status: '', dateFrom: '', dateTo: '' })}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      クリア
                    </button>
                  </div>
                  
                  {/* ビューモード切り替え */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'card' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="カード表示"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'table' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="テーブル表示"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* フィルター（OCRタブ） */}
            {activeTab === 'ocr' && (
              <div className="bg-white rounded-lg shadow mb-6 p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">ソート・フィルター:</span>
                    </div>
                    
                    <select
                      value={ocrSortBy}
                      onChange={(e) => setOcrSortBy(e.target.value as 'date' | 'vendor' | 'amount')}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="date">日付順</option>
                      <option value="vendor">取引先順</option>
                      <option value="amount">金額順</option>
                    </select>

                    <select
                      value={ocrSortOrder}
                      onChange={(e) => setOcrSortOrder(e.target.value as 'asc' | 'desc')}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="desc">降順</option>
                      <option value="asc">昇順</option>
                    </select>

                    <input
                      type="text"
                      value={ocrFilters.vendor}
                      onChange={(e) => setOcrFilters({ ...ocrFilters, vendor: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="取引先で検索"
                    />

                    <input
                      type="date"
                      value={ocrFilters.dateFrom}
                      onChange={(e) => setOcrFilters({ ...ocrFilters, dateFrom: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="開始日"
                    />

                    <input
                      type="date"
                      value={ocrFilters.dateTo}
                      onChange={(e) => setOcrFilters({ ...ocrFilters, dateTo: e.target.value })}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="終了日"
                    />

                    <button
                      onClick={() => setOcrFilters({ vendor: '', dateFrom: '', dateTo: '', minAmount: '', maxAmount: '' })}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
                    >
                      クリア
                    </button>
                  </div>
                  
                  {/* ビューモード切り替え */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode('card')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'card' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="カード表示"
                    >
                      <Grid3X3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-2 rounded-md transition-colors ${
                        viewMode === 'table' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      title="テーブル表示"
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* コンテンツ */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-flex items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">読み込み中...</span>
                  </div>
                </div>
              ) : activeTab === 'ocr' ? (
                // OCR結果（カード形式）
                (() => {
                  const displayResults = filteredAndSortedOcrResults();
                  return displayResults.length === 0 ? (
                    <div className="p-8 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-gray-600">
                        {ocrResults.length === 0 ? 'OCR処理済みの書類がありません' : 'フィルター条件に一致する書類がありません'}
                      </p>
                    </div>
                  ) : viewMode === 'card' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6">
                      {displayResults.map((result) => (
                      <div key={result.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200">
                        <div className="p-4">
                          {/* ヘッダー */}
                          <div className="mb-3">
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-gray-900 truncate">
                                {result.receipt_number || result.file_name?.split('.')[0] || '領収書'}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {result.receipt_date ? new Date(result.receipt_date).toLocaleDateString('ja-JP') : '-'}
                              </p>
                            </div>
                          </div>

                          {/* 取引先情報 */}
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-900">
                              {result.vendor_name || result.store_name || result.company_name || '店舗名なし'}
                            </div>
                            {result.store_phone && (
                              <div className="text-xs text-gray-500 mt-0.5">TEL: {result.store_phone}</div>
                            )}
                          </div>

                          {/* 金額情報 */}
                          <div className="bg-gray-50 rounded-md p-3 mb-3">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">小計</span>
                                <span className="text-gray-900">
                                  ¥{((result.subtotal_amount !== undefined && result.subtotal_amount >= 0) 
                                    ? result.subtotal_amount 
                                    : Math.max(0, (result.total_amount || 0) - (result.tax_amount || 0))
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">税額</span>
                                <span className="text-gray-900">¥{(result.tax_amount || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
                                <span>合計</span>
                                <span className="text-blue-600">¥{(result.total_amount || 0).toLocaleString()}</span>
                              </div>
                              <div className="pt-1.5 border-t border-gray-200 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">お預かり</span>
                                  <span className="text-gray-900">
                                    {(result.payment_amount !== undefined && result.payment_amount > 0) 
                                      ? `¥${result.payment_amount.toLocaleString()}`
                                      : '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">お釣り</span>
                                  <span className="text-gray-900">
                                    {(result.change_amount !== undefined && result.change_amount > 0)
                                      ? `¥${result.change_amount.toLocaleString()}`
                                      : '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* その他情報 */}
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center text-xs">
                              <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                未分類
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              処理: {result.created_at ? new Date(result.created_at).toLocaleString('ja-JP', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}
                            </div>
                          </div>

                          {/* 備考 */}
                          {result.notes && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-600 italic truncate" title={result.notes}>
                                {result.notes}
                              </p>
                            </div>
                          )}

                          {/* 詳細情報を表示する展開セクション */}
                          <details className="mb-3">
                            <summary className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer">
                              詳細情報を表示
                            </summary>
                            <div className="mt-2 space-y-1 text-xs text-gray-600">
                              <div>ファイル: {result.file_name}</div>
                              {result.extracted_text && (
                                <div className="mt-2">
                                  <div className="font-medium">OCRテキスト:</div>
                                  <div className="mt-1 p-2 bg-gray-50 rounded text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                                    {result.extracted_text}
                                  </div>
                                </div>
                              )}
                            </div>
                          </details>


                          {/* アクション */}
                          <div className="pt-3 border-t border-gray-200">
                            {result.linked_document_id ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-0.5" />
                                    文書化済
                                  </span>
                                  {result.linked_document_id && (
                                    <Link
                                      href={`/documents/${result.linked_document_id}`}
                                      className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                    >
                                      詳細を見る
                                    </Link>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleDeleteOcrResult(result)}
                                  className="block w-full px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="inline-block h-4 w-4 mr-1" />
                                  削除
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    未処理
                                  </span>
                                  <select
                                    id={`doc-type-${result.id}`}
                                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    defaultValue="receipt"
                                  >
                                    <option value="receipt">領収書</option>
                                    <option value="invoice">請求書</option>
                                    <option value="estimate">見積書</option>
                                    <option value="delivery_note">納品書</option>
                                  </select>
                                </div>
                                <button
                                  onClick={() => {
                                    const select = document.getElementById(`doc-type-${result.id}`) as HTMLSelectElement;
                                    handleCreateDocument(result, select.value);
                                  }}
                                  className="block w-full px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                                >
                                  文書化する
                                </button>
                                <button
                                  onClick={() => handleDeleteOcrResult(result)}
                                  className="block w-full px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50 transition-colors"
                                >
                                  <Trash2 className="inline-block h-4 w-4 mr-1" />
                                  削除
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  ) : (
                    // OCRテーブル表示
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ファイル名
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              取引先
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              日付
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              金額
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ステータス
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {displayResults.map((result) => (
                            <tr key={result.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {result.receipt_number || result.file_name?.split('.')[0] || '領収書'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {result.vendor_name || result.store_name || result.company_name || '店舗名なし'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.receipt_date ? new Date(result.receipt_date).toLocaleDateString('ja-JP') : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                ¥{(result.total_amount || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                {result.linked_document_id ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    文書化済
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    未処理
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                {result.linked_document_id ? (
                                  <Link
                                    href={`/documents/${result.linked_document_id}`}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    詳細を見る
                                  </Link>
                                ) : (
                                  <button
                                    onClick={() => {
                                      handleCreateDocument(result, 'receipt');
                                    }}
                                    className="text-blue-600 hover:text-blue-900"
                                  >
                                    文書化
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              ) : (
                // 作成済み文書
                documents.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-600">作成済みの文書がありません</p>
                  </div>
                ) : viewMode === 'card' ? (
                  // カード形式
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200">
                        <div className="p-4">
                          {/* ヘッダー */}
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {doc.documentNumber || doc.document_number || doc.receipt_number || doc.id.slice(0, 8)}
                              </h3>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {documentTypeLabels[(doc.documentType || doc.document_type || doc.type) as keyof typeof documentTypeLabels] || '領収書'}
                              </p>
                            </div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                              {statusLabels[doc.status as keyof typeof statusLabels] || doc.status || '下書き'}
                            </span>
                          </div>

                          {/* 取引先情報 */}
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-900">
                              {doc.partnerName || doc.partner_name || doc.vendor_name || doc.store_name || '-'}
                            </div>
                            {doc.company_name && (
                              <div className="text-xs text-gray-600">{doc.company_name}</div>
                            )}
                            {doc.store_phone && (
                              <div className="text-xs text-gray-500">TEL: {doc.store_phone}</div>
                            )}
                          </div>

                          {/* 金額情報 */}
                          <div className="bg-gray-50 rounded-md p-3 mb-3">
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">小計</span>
                                <span className="text-gray-900">
                                  ¥{((doc.subtotal || doc.subtotal_amount) || 
                                    Math.max(0, (doc.totalAmount || doc.total_amount || 0) - (doc.tax_amount || 0))
                                  ).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-600">税額</span>
                                <span className="text-gray-900">¥{(doc.tax_amount || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-sm font-bold pt-1 border-t border-gray-200">
                                <span>合計</span>
                                <span className="text-blue-600">¥{(doc.totalAmount || doc.total_amount || 0).toLocaleString()}</span>
                              </div>
                              <div className="pt-1.5 border-t border-gray-200 space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">預り</span>
                                  <span className="text-gray-900">
                                    {(doc.payment_amount !== undefined && doc.payment_amount > 0) 
                                      ? `¥${doc.payment_amount.toLocaleString()}`
                                      : '-'}
                                  </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">お釣り</span>
                                  <span className="text-gray-900">
                                    {(doc.change_amount !== undefined && doc.change_amount > 0)
                                      ? `¥${doc.change_amount.toLocaleString()}`
                                      : '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 日付情報 */}
                          <div className="mb-3">
                            <div className="text-xs text-gray-600">
                              <div>発行日: {(doc.issueDate || doc.issue_date || doc.receipt_date) ? 
                                new Date(doc.issueDate || doc.issue_date || doc.receipt_date).toLocaleDateString('ja-JP') : '-'}</div>
                              <div>作成: {doc.created_at ? new Date(doc.created_at).toLocaleString('ja-JP', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '-'}</div>
                            </div>
                          </div>

                          {/* アクション */}
                          <div className="pt-3 border-t border-gray-200">
                            <Link
                              href={`/documents/${doc.id}`}
                              className="block w-full text-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                            >
                              詳細を見る
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // テーブル形式
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            文書番号
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            種類
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            取引先
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            発行日
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            金額
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ステータス
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {documents.map((doc: any) => (
                          <tr key={doc.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {doc.documentNumber || doc.document_number || doc.receipt_number || doc.id.slice(0, 8)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {documentTypeLabels[(doc.documentType || doc.document_type || doc.type) as keyof typeof documentTypeLabels] || '領収書'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {doc.partnerName || doc.partner_name || doc.vendor_name || doc.store_name || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(doc.issueDate || doc.issue_date || doc.receipt_date) ? 
                                new Date(doc.issueDate || doc.issue_date || doc.receipt_date).toLocaleDateString('ja-JP') : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                              ¥{(doc.totalAmount || doc.total_amount || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
                                {statusLabels[doc.status as keyof typeof statusLabels] || doc.status || '下書き'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Link
                                href={`/documents/${doc.id}`}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                詳細を見る
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="mt-6 flex justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    前へ
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
                    次へ
                  </button>
                </nav>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}