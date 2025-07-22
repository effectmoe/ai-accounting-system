'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DocumentService, SavedDocument } from '@/services/document-service';
import { FileText, Download, Send, CheckCircle, Filter, Plus, Paperclip, Bell, Edit, FileCheck, Archive, Grid3X3, List, Trash2, Image, CheckSquare, Square, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { documentTypeLabels, statusLabels, statusColors, getDocumentTypeLabel, getStatusLabel, getStatusColor } from '@/components/common/constants';
import StatusBadge from '@/components/common/StatusBadge';

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
  document_type?: string;
}

export default function DocumentsContent() {
  console.log('🔴🔴🔴 DocumentsContent コンポーネントがマウントされました！');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'ocr');
  const [debugInfo, setDebugInfo] = useState<string[]>(['DocumentsContent mounted at ' + new Date().toISOString()]);
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
  const [totalOcrPages, setTotalOcrPages] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [ocrSortBy, setOcrSortBy] = useState<'date' | 'vendor' | 'amount'>('date');
  const [ocrSortOrder, setOcrSortOrder] = useState<'asc' | 'desc'>('desc');
  const [ocrFilters, setOcrFilters] = useState({
    vendor: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
    documentType: ''
  });
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
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
      // URLパラメータを構築
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: documentsPerPage.toString(),
        sortBy: ocrSortBy,
        sortOrder: ocrSortOrder
      });
      
      // フィルターパラメータを追加
      if (ocrFilters.vendor) {
        params.append('vendor', ocrFilters.vendor);
      }
      if (ocrFilters.minAmount) {
        params.append('minAmount', ocrFilters.minAmount);
      }
      if (ocrFilters.maxAmount) {
        params.append('maxAmount', ocrFilters.maxAmount);
      }
      if (ocrFilters.dateFrom) {
        params.append('startDate', ocrFilters.dateFrom);
      }
      if (ocrFilters.dateTo) {
        params.append('endDate', ocrFilters.dateTo);
      }
      if (ocrFilters.documentType) {
        params.append('documentType', ocrFilters.documentType);
      }
      
      const apiUrl = `/api/ocr-results?${params.toString()}`;
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
        error: data.error,
        debugInfo: data.debugInfo
      });
      
      if (data.debugInfo) {
        console.log('🔍 [OCR-Results] デバッグ情報:', data.debugInfo);
      }
      
      if (data.success) {
        console.log('✅ OCR結果取得成功:', data.data?.length, '件');
        if (data.data && data.data.length > 0) {
          console.log('🔍 最初のOCR結果詳細:', JSON.stringify(data.data[0], null, 2));
        } else {
          console.warn('⚠️ OCR結果は0件です。MongoDBにデータが存在するか確認してください。');
        }
        setOcrResults(data.data || []);
        setTotalOcrPages(Math.ceil((data.total || 0) / documentsPerPage));
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
  }, [currentPage, documentsPerPage, ocrSortBy, ocrSortOrder, ocrFilters]);

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

  // 選択モードの切り替え
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedItems(new Set());
  };

  // アイテムの選択・解除
  const toggleItemSelection = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  // 全選択・全解除
  const toggleSelectAll = () => {
    if (activeTab === 'ocr') {
      if (selectedItems.size === ocrResults.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(ocrResults.map(doc => doc.id)));
      }
    } else {
      if (selectedItems.size === documents.length) {
        setSelectedItems(new Set());
      } else {
        setSelectedItems(new Set(documents.map(doc => doc.id)));
      }
    }
  };

  // 選択したアイテムの削除
  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    if (!confirm(`選択した${selectedItems.size}件のデータを削除しますか？`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedItems).map(id => {
        if (activeTab === 'ocr') {
          return fetch(`/api/ocr-results/${id}`, { method: 'DELETE' });
        } else {
          return fetch(`/api/documents/${id}`, { method: 'DELETE' });
        }
      });

      await Promise.all(deletePromises);
      
      toast.success(`${selectedItems.size}件のデータを削除しました`);
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      
      // リストを更新
      if (activeTab === 'ocr') {
        fetchOcrResults();
      } else {
        fetchDocuments();
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('削除中にエラーが発生しました');
    }
  };

  // URLパラメータの変更を監視
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      console.log('📌 URLパラメータからタブを変更:', tabFromUrl);
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // 初回ロードのみ
  useEffect(() => {
    console.log('🚀 [DocumentsContent] 初回ロード開始');
    console.log('🔍 [DocumentsContent] 現在のタブ:', activeTab);
    setLoading(true);
    
    // 初回ロード時のみ実行
    console.log('📋 [DocumentsContent] OCR結果とドキュメント取得開始');
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
  }, [fetchOcrResults, fetchDocuments]); // 関数を依存配列に追加
  
  // ページ、フィルター、ソート変更時の処理
  useEffect(() => {
    console.log('📄 ページ/フィルター/ソート変更:', {
      page: currentPage, 
      tab: activeTab,
      sortBy: ocrSortBy,
      sortOrder: ocrSortOrder,
      filters: ocrFilters
    });
    
    if (activeTab === 'ocr') {
      fetchOcrResults();
    } else if (activeTab === 'documents') {
      fetchDocuments();
    }
  }, [currentPage, activeTab, ocrSortBy, ocrSortOrder, ocrFilters, fetchOcrResults, fetchDocuments]);

  // フィルター変更時に文書を再取得
  useEffect(() => {
    console.log('🔍 フィルター変更:', filters);
    if (activeTab === 'documents') {
      setCurrentPage(1);
      fetchDocuments();
    }
  }, [filters]);

  // サーバーサイドでフィルター・ソートが適用されるため、クライアント側では結果をそのまま返す
  const filteredAndSortedOcrResults = useCallback(() => {
    return ocrResults;
  }, [ocrResults]);

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
            {/* デバッグ情報 */}
            <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 rounded">
              <div className="flex justify-between items-center mb-2">
                <p className="font-bold">デバッグ情報:</p>
                <button
                  onClick={() => {
                    console.log('🔄 手動リフレッシュ実行');
                    fetchOcrResults();
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                >
                  リフレッシュ
                </button>
                <button
                  onClick={async () => {
                    console.log('🔍 最新OCRデータをチェック');
                    const response = await fetch('/api/debug/check-ocr');
                    const data = await response.json();
                    console.log('📊 最新OCRデータ:', data);
                    alert(`総数: ${data.total}件\n表示中: ${data.showing}件\n最新のID: ${data.documents?.[0]?._id || 'なし'}`);
                  }}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm ml-2"
                >
                  OCRデータ確認
                </button>
                <button
                  onClick={async () => {
                    const id = prompt('確認したいドキュメントIDを入力してください（例: 687e3501d18421a3ce4e7f53）');
                    if (id) {
                      console.log('🔍 特定ドキュメントをチェック:', id);
                      const response = await fetch(`/api/debug/check-ocr?id=${id}`);
                      const data = await response.json();
                      console.log('📊 ドキュメント詳細:', data);
                      if (data.found) {
                        alert(`ドキュメントが見つかりました！\n\nID: ${data.document._id}\n作成日時: ${data.document.createdAt}\n店舗名: ${data.document.vendor_name || data.document.vendorName}\n金額: ¥${data.document.total_amount || data.document.totalAmount}`);
                      } else {
                        alert('ドキュメントが見つかりませんでした。');
                      }
                    }
                  }}
                  className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm ml-2"
                >
                  ID確認
                </button>
              </div>
              <p>OCR結果数: {ocrResults.length}件</p>
              <p>フィルター後の結果数: {filteredAndSortedOcrResults().length}件</p>
              <p>ローディング: {loading ? 'はい' : 'いいえ'}</p>
              <p>アクティブタブ: {activeTab}</p>
              <p>表示モード: {viewMode}</p>
              <p>総ページ数: {totalPages}</p>
              <p>ソート: {ocrSortBy} ({ocrSortOrder})</p>
              {ocrResults.length > 0 && (
                <>
                  <p>最初のOCR結果: {ocrResults[0].vendor_name} - ¥{ocrResults[0].total_amount}</p>
                  <p>displayResults件数: {filteredAndSortedOcrResults().length}件</p>
                  <p className="mt-2 font-semibold">現在のページ: {currentPage} / {totalPages}</p>
                  <div className="flex gap-2 mt-2">
                    {Array.from({length: Math.min(3, totalPages)}, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded ${
                          currentPage === page 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                        disabled={loading}
                      >
                        ページ{page}
                      </button>
                    ))}
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">OCRデータ詳細（クリックで展開）</summary>
                    <div className="mt-2 text-xs max-h-40 overflow-auto">
                      {filteredAndSortedOcrResults().slice(0, 3).map((result, index) => (
                        <div key={index} className="mb-2 p-2 bg-white rounded">
                          <p>#{index + 1}: {result.vendor_name || result.store_name || '店舗名なし'}</p>
                          <p>金額: ¥{result.total_amount || 0}</p>
                          <p>日付: {result.receipt_date || 'なし'}</p>
                          <p>ID: {result.id}</p>
                          <p>作成日時: {result.created_at ? new Date(result.created_at).toLocaleString('ja-JP') : 'なし'}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              )}
            </div>
            
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
                {/* 選択モードボタン */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    {!isSelectionMode ? (
                      <button
                        onClick={toggleSelectionMode}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                        <CheckSquare className="h-4 w-4 inline mr-1" />
                        選択モード
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={toggleSelectAll}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                          {selectedItems.size === documents.length ? '全解除' : '全選択'}
                        </button>
                        <button
                          onClick={handleDeleteSelected}
                          disabled={selectedItems.size === 0}
                          className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                          <Trash2 className="h-4 w-4 inline mr-1" />
                          選択した{selectedItems.size}件を削除
                        </button>
                        <button
                          onClick={toggleSelectionMode}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                          <X className="h-4 w-4 inline mr-1" />
                          キャンセル
                        </button>
                      </>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <span className="text-sm text-gray-500">
                      ページ {currentPage} / {totalPages}
                    </span>
                  )}
                </div>
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
                {/* 選択モードボタン */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    {!isSelectionMode ? (
                      <button
                        onClick={toggleSelectionMode}
                        className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                        <CheckSquare className="h-4 w-4 inline mr-1" />
                        選択モード
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={toggleSelectAll}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                          {selectedItems.size === ocrResults.length ? '全解除' : '全選択'}
                        </button>
                        <button
                          onClick={handleDeleteSelected}
                          disabled={selectedItems.size === 0}
                          className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
                          <Trash2 className="h-4 w-4 inline mr-1" />
                          選択した{selectedItems.size}件を削除
                        </button>
                        <button
                          onClick={toggleSelectionMode}
                          className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
                          <X className="h-4 w-4 inline mr-1" />
                          キャンセル
                        </button>
                      </>
                    )}
                  </div>
                  {totalOcrPages > 1 && (
                    <span className="text-sm text-gray-500">
                      ページ {currentPage} / {totalOcrPages}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">ソート・フィルター:</span>
                    </div>
                    
                    <select
                      value={ocrSortBy}
                      onChange={(e) => {
                        setOcrSortBy(e.target.value as 'date' | 'vendor' | 'amount');
                        setCurrentPage(1); // ソート変更時はページを1に戻す
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="date">日付順</option>
                      <option value="vendor">取引先順</option>
                      <option value="amount">金額順</option>
                    </select>

                    <select
                      value={ocrSortOrder}
                      onChange={(e) => {
                        setOcrSortOrder(e.target.value as 'asc' | 'desc');
                        setCurrentPage(1); // ソート変更時はページを1に戻す
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="desc">降順</option>
                      <option value="asc">昇順</option>
                    </select>

                    <select
                      value={ocrFilters.documentType || ''}
                      onChange={(e) => {
                        setOcrFilters({ ...ocrFilters, documentType: e.target.value });
                        setCurrentPage(1); // フィルター変更時はページを1に戻す
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">すべての種類</option>
                      <option value="receipt">領収書</option>
                      <option value="invoice">請求書</option>
                      <option value="quotation">見積書</option>
                      <option value="delivery_note">納品書</option>
                      <option value="purchase_order">発注書</option>
                    </select>

                    <input
                      type="text"
                      value={ocrFilters.vendor}
                      onChange={(e) => {
                        setOcrFilters({ ...ocrFilters, vendor: e.target.value });
                        setCurrentPage(1); // フィルター変更時はページを1に戻す
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="取引先で検索"
                    />

                    <input
                      type="date"
                      value={ocrFilters.dateFrom}
                      onChange={(e) => {
                        setOcrFilters({ ...ocrFilters, dateFrom: e.target.value });
                        setCurrentPage(1); // フィルター変更時はページを1に戻す
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="開始日"
                    />

                    <input
                      type="date"
                      value={ocrFilters.dateTo}
                      onChange={(e) => {
                        setOcrFilters({ ...ocrFilters, dateTo: e.target.value });
                        setCurrentPage(1); // フィルター変更時はページを1に戻す
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                      placeholder="終了日"
                    />

                    <button
                      onClick={() => {
                        setOcrFilters({ vendor: '', dateFrom: '', dateTo: '', minAmount: '', maxAmount: '', documentType: '' });
                        setCurrentPage(1); // フィルター変更時はページを1に戻す
                      }}
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
                  console.log('🎯 レンダリング時のdisplayResults:', displayResults.length, '件');
                  console.log('🎯 viewMode:', viewMode);
                  
                  // デバッグ用：最初の3件のデータを確認
                  if (displayResults.length > 0) {
                    console.log('🎯 最初の3件のOCRデータ:');
                    displayResults.slice(0, 3).forEach((result, index) => {
                      console.log(`  ${index + 1}:`, {
                        id: result.id,
                        vendor: result.vendor_name || result.store_name || '不明',
                        amount: result.total_amount,
                        date: result.receipt_date
                      });
                    });
                  }
                  
                  return displayResults.length === 0 ? (
                    <div className="p-8 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-gray-600">
                        {ocrResults.length === 0 ? 'OCR処理済みの書類がありません' : 'フィルター条件に一致する書類がありません'}
                      </p>
                    </div>
                  ) : viewMode === 'card' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6">
                      {displayResults.map((result, index) => (
                      <div key={result.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 min-h-[200px] relative">
                        {/* 選択チェックボックス */}
                        {isSelectionMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemSelection(result.id);
                              }}
                              className="p-1 hover:bg-gray-100 rounded">
                              {selectedItems.has(result.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                        )}
                        <div className="p-4">
                          {/* デバッグ情報 */}
                          <details className="mb-3 text-xs text-gray-500">
                            <summary className="cursor-pointer">デバッグ: 生データを表示</summary>
                            <pre className="mt-1 p-2 bg-gray-100 rounded overflow-auto max-h-40">
                              {JSON.stringify(result, null, 2)}
                            </pre>
                          </details>
                          
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
                            <div className="flex items-center gap-2 text-xs">
                              <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                                未分類
                              </span>
                              {result.document_type && (
                                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {documentTypeLabels[result.document_type as keyof typeof documentTypeLabels] || result.document_type}
                                </span>
                              )}
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

                          {/* 勘定科目情報 */}
                          {result.category && (
                            <div className="mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-700">勘定科目:</span>
                                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                  {result.category}
                                </span>
                                {result.aiPrediction?.confidence && (
                                  <span className="text-xs text-gray-500">
                                    (AI推測: {Math.round(result.aiPrediction.confidence * 100)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

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
                            {isSelectionMode && (
                              <th className="px-6 py-3 text-center">
                                <button
                                  onClick={toggleSelectAll}
                                  className="p-1 hover:bg-gray-200 rounded">
                                  {selectedItems.size === displayResults.length ? (
                                    <CheckSquare className="h-4 w-4 text-blue-600" />
                                  ) : (
                                    <Square className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                              </th>
                            )}
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
                              {isSelectionMode && (
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => toggleItemSelection(result.id)}
                                    className="p-1 hover:bg-gray-100 rounded">
                                    {selectedItems.has(result.id) ? (
                                      <CheckSquare className="h-4 w-4 text-blue-600" />
                                    ) : (
                                      <Square className="h-4 w-4 text-gray-400" />
                                    )}
                                  </button>
                                </td>
                              )}
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
                                    disabled={isSelectionMode}
                                  >
                                    文書化
                                  </button>
                                )}
                                {!isSelectionMode && (
                                  <button
                                    onClick={() => handleDeleteOcrResult(result)}
                                    className="text-red-600 hover:text-red-900 ml-3"
                                  >
                                    削除
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
              ) : activeTab === 'documents' ? (
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
                      <div key={doc.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 relative">
                        {/* 選択チェックボックス */}
                        {isSelectionMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemSelection(doc.id);
                              }}
                              className="p-1 hover:bg-gray-100 rounded">
                              {selectedItems.has(doc.id) ? (
                                <CheckSquare className="h-5 w-5 text-blue-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                        )}
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

                          {/* 勘定科目情報 */}
                          {doc.category && (
                            <div className="mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-gray-700">勘定科目:</span>
                                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                  {doc.category}
                                </span>
                                {doc.aiPrediction?.confidence && (
                                  <span className="text-xs text-gray-500">
                                    (AI推測: {Math.round(doc.aiPrediction.confidence * 100)}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

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
                            勘定科目
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
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {doc.category ? (
                                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                  {doc.category}
                                </span>
                              ) : (
                                <span className="text-gray-400">未設定</span>
                              )}
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
              ) : null}
            </div>

            {/* ページネーション */}
            {(activeTab === 'ocr' ? totalOcrPages : totalPages) > 1 && (
              <div className="mt-6 flex justify-center">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    前へ
                  </button>
                  
                  {[...Array(activeTab === 'ocr' ? totalOcrPages : totalPages)].map((_, i) => (
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
                    onClick={() => setCurrentPage(Math.min(activeTab === 'ocr' ? totalOcrPages : totalPages, currentPage + 1))}
                    disabled={currentPage === (activeTab === 'ocr' ? totalOcrPages : totalPages)}
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