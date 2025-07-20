'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DocumentService, SavedDocument } from '@/services/document-service';
import { FileText, Download, Send, CheckCircle, Filter, Plus, Paperclip, Bell, Edit, FileCheck, Archive, Grid3X3, List, Trash2, Image } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { logger } from '@/lib/logger';
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
  const [sortField, setSortField] = useState<'createdAt' | 'issueDate' | 'fileName' | 'accountTitle'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const documentsPerPage = viewMode === 'card' ? 12 : 20;
  
  // ビューモード変更時の処理
  const handleViewModeChange = useCallback((mode: 'card' | 'table') => {
    setViewMode(mode);
    setCurrentPage(1);
    // ページ数を再計算
    if (activeTab === 'ocr') {
      setTotalPages(Math.ceil(ocrResults.length / (mode === 'card' ? 12 : 20)));
    } else {
      setTotalPages(Math.ceil(documents.length / (mode === 'card' ? 12 : 20)));
    }
  }, [activeTab, ocrResults.length, documents.length]);

  // タブ変更時にURLパラメータを更新
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // ページをリセット
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/documents?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // ソート関数
  const sortOcrResults = useCallback((results: OcrResult[]) => {
    return [...results].sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'createdAt':
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
        case 'issueDate':
          aValue = a.receipt_date ? new Date(a.receipt_date).getTime() : 0;
          bValue = b.receipt_date ? new Date(b.receipt_date).getTime() : 0;
          break;
        case 'fileName':
          aValue = a.file_name || '';
          bValue = b.file_name || '';
          break;
        case 'accountTitle':
          // 現在は全て未分類なので、ファイル名でソート
          aValue = a.file_name || '';
          bValue = b.file_name || '';
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [sortField, sortOrder]);

  // OCR結果を取得（ページングとソートを考慮）
  const fetchOcrResults = useCallback(async () => {
    try {
      // まず全件数を取得するため、1ページ目を取得
      const countResponse = await fetch(`/api/ocr-results?page=1&limit=1`);
      const countData = await countResponse.json();
      
      if (countData.success) {
        const total = countData.total || 0;
        
        // 全件取得（ソートのため）
        const response = await fetch(`/api/ocr-results?page=1&limit=${total || 100}`);
        const data = await response.json();
        
        if (data.success) {
          const results = data.data || [];
          logger.info(`Fetched OCR results: ${results.length} items, documentsPerPage: ${documentsPerPage}`);
          setOcrResults(results);
          // 取得したデータ数に基づいてページ数を計算
          const calculatedPages = Math.ceil(results.length / documentsPerPage);
          logger.info(`Calculated total pages: ${calculatedPages}`);
          setTotalPages(calculatedPages);
        }
      } else {
        logger.error('Failed to fetch OCR results:', countData.error);
        toast.error('OCR結果の取得に失敗しました');
      }
    } catch (error) {
      logger.error('Error fetching OCR results:', error);
      toast.error('OCR結果の取得中にエラーが発生しました');
    }
  }, [documentsPerPage]);

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
        logger.error('Error fetching documents:', data.error);
        toast.error('文書の取得に失敗しました');
      }
    } catch (error) {
      logger.error('Error fetching documents:', error);
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
      logger.debug('Document creation response:', result);
      
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
        logger.error('Document creation error:', result);
        toast.error(result.error || '文書の作成に失敗しました');
      }
    } catch (error) {
      logger.error('Document creation error:', error);
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
      logger.error('Status update error:', error);
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
      logger.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : '削除に失敗しました');
    }
  };

  // 初回ロードのみ
  useEffect(() => {
    setLoading(true);
    
    // 初回ロード時のみ実行
    fetchOcrResults();
    fetchDocuments().finally(() => setLoading(false));
  }, []); // 依存配列を空にして初回のみ実行
  
  // タブ切り替え時の処理（データの再取得はしない）
  useEffect(() => {
    // タブが変わってもデータは再取得しない
    // すでに取得済みのデータを表示するだけ
  }, [activeTab]);

  // フィルター変更時
  useEffect(() => {
    setCurrentPage(1); // フィルター変更時はページを1に戻す
  }, [filters]);

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

            {/* フィルターとビューモード切り替え */}
            {(activeTab === 'documents' || activeTab === 'ocr') && (
              <div className="bg-white rounded-lg shadow mb-6 p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {activeTab === 'documents' ? (
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
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        {ocrResults.length}件のOCR結果
                      </span>
                    </div>
                  )}
                  
                  {/* ビューモード切り替え */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewModeChange('card')}
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
                      onClick={() => handleViewModeChange('table')}
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
                // OCR結果
                ocrResults.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-600">OCR処理済みの書類がありません</p>
                  </div>
                ) : viewMode === 'card' ? (
                  // カード形式
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 md:p-6">
                    {sortOcrResults(ocrResults)
                      .slice((currentPage - 1) * documentsPerPage, currentPage * documentsPerPage)
                      .map((result) => (
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
                  // リスト形式
                  <div>
                    {/* ソートボタン */}
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">並び替え:</span>
                        <button
                          onClick={() => {
                            if (sortField === 'createdAt') {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('createdAt');
                              setSortOrder('desc');
                            }
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1 text-sm rounded-md ${
                            sortField === 'createdAt' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          取込日付 {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                          onClick={() => {
                            if (sortField === 'issueDate') {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('issueDate');
                              setSortOrder('desc');
                            }
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1 text-sm rounded-md ${
                            sortField === 'issueDate' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          領収書発行日 {sortField === 'issueDate' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                          onClick={() => {
                            if (sortField === 'fileName') {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('fileName');
                              setSortOrder('asc');
                            }
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1 text-sm rounded-md ${
                            sortField === 'fileName' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          ファイル名 {sortField === 'fileName' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                        <button
                          onClick={() => {
                            if (sortField === 'accountTitle') {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortField('accountTitle');
                              setSortOrder('asc');
                            }
                            setCurrentPage(1);
                          }}
                          className={`px-3 py-1 text-sm rounded-md ${
                            sortField === 'accountTitle' 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          勘定科目 {sortField === 'accountTitle' && (sortOrder === 'asc' ? '↑' : '↓')}
                        </button>
                      </div>
                    </div>
                    {/* テーブル */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              取込日時
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              領収書番号/ファイル名
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              店舗名
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              発行日
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              金額
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              勘定科目
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              状態
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              アクション
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {sortOcrResults(ocrResults)
                            .slice((currentPage - 1) * documentsPerPage, currentPage * documentsPerPage)
                            .map((result) => (
                            <tr key={result.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.created_at ? new Date(result.created_at).toLocaleString('ja-JP', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div>
                                  <div className="font-medium">{result.receipt_number || result.file_name?.split('.')[0] || '領収書'}</div>
                                  <div className="text-xs text-gray-500">{result.file_name}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {result.vendor_name || result.store_name || result.company_name || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {result.receipt_date ? new Date(result.receipt_date).toLocaleDateString('ja-JP') : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ¥{(result.total_amount || 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                未分類
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {result.linked_document_id ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 mr-0.5" />
                                    文書化済
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                    未処理
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                  {result.linked_document_id ? (
                                    <>
                                      <Link
                                        href={`/documents/${result.linked_document_id}`}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        詳細
                                      </Link>
                                      <button
                                        onClick={() => handleDeleteOcrResult(result)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        削除
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <select
                                        id={`doc-type-list-${result.id}`}
                                        className="text-sm border border-gray-300 rounded-md px-2 py-1"
                                        defaultValue="receipt"
                                      >
                                        <option value="receipt">領収書</option>
                                        <option value="invoice">請求書</option>
                                        <option value="estimate">見積書</option>
                                        <option value="delivery_note">納品書</option>
                                      </select>
                                      <button
                                        onClick={() => {
                                          const select = document.getElementById(`doc-type-list-${result.id}`) as HTMLSelectElement;
                                          handleCreateDocument(result, select.value);
                                        }}
                                        className="text-blue-600 hover:text-blue-900"
                                      >
                                        文書化
                                      </button>
                                      <button
                                        onClick={() => handleDeleteOcrResult(result)}
                                        className="text-red-600 hover:text-red-900"
                                      >
                                        削除
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
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
              <div className="mt-6">
                <div className="flex items-center justify-between px-4">
                  <div className="text-sm text-gray-700">
                    {totalPages}ページ中{currentPage}ページ目 
                    ({activeTab === 'ocr' ? ocrResults.length : documents.length}件中
                    {(currentPage - 1) * documentsPerPage + 1}-
                    {Math.min(currentPage * documentsPerPage, activeTab === 'ocr' ? ocrResults.length : documents.length)}件)
                  </div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => {
                        setCurrentPage(Math.max(1, currentPage - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      前へ
                    </button>
                    
                    {/* 最初のページ */}
                    {currentPage > 3 && (
                      <>
                        <button
                          onClick={() => {
                            setCurrentPage(1);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                          1
                        </button>
                        {currentPage > 4 && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                      </>
                    )}
                    
                    {/* 現在のページの周辺 */}
                    {(() => {
                      const pages = [];
                      let startPage = 1;
                      let endPage = totalPages;
                      
                      if (totalPages <= 5) {
                        // 5ページ以下の場合は全て表示
                        startPage = 1;
                        endPage = totalPages;
                      } else {
                        // 5ページより多い場合
                        if (currentPage <= 3) {
                          startPage = 1;
                          endPage = 5;
                        } else if (currentPage >= totalPages - 2) {
                          startPage = totalPages - 4;
                          endPage = totalPages;
                        } else {
                          startPage = currentPage - 2;
                          endPage = currentPage + 2;
                        }
                      }
                      
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => {
                              setCurrentPage(i);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === i
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      return pages;
                    })()}
                    
                    {/* 最後のページ */}
                    {currentPage < totalPages - 2 && totalPages > 5 && (
                      <>
                        {currentPage < totalPages - 3 && (
                          <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setCurrentPage(totalPages);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => {
                        setCurrentPage(Math.min(totalPages, currentPage + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      次へ
                    </button>
                  </nav>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}