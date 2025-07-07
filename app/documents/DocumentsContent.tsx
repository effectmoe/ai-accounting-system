'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DocumentService, SavedDocument } from '@/services/document-service';
import { FileText, Download, Send, CheckCircle, Filter, Plus, Paperclip, Bell, Edit, FileCheck, Archive } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-singleton';

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
  subtotal_amount?: number;  // 小計（税抜き）
  tax_amount: number;       // 消費税
  total_amount: number;     // 合計（税込み）
  payment_amount?: number;   // お預かり金額
  change_amount?: number;    // お釣り
  receipt_number?: string;  // 領収書番号
  store_name?: string;      // 店舗名
  store_phone?: string;     // 店舗電話番号
  company_name?: string;    // 会社名
  notes?: string;           // 備考
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
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/ocr-results?page=${currentPage}&limit=${documentsPerPage}`);
      const data = await response.json();
      
      if (data.success) {
        setOcrResults(data.data || []);
        setTotalPages(Math.ceil((data.total || 0) / documentsPerPage));
      } else {
        console.error('Failed to fetch OCR results:', data.error);
        toast.error('OCR結果の取得に失敗しました');
      }
    } catch (error) {
      console.error('Error fetching OCR results:', error);
      toast.error('OCR結果の取得中にエラーが発生しました');
    }
  }, [currentPage]);

  // 文書一覧を取得
  const fetchDocuments = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      console.error('Supabase is not configured');
      setLoading(false);
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const companyId = '11111111-1111-1111-1111-111111111111';
      
      let query = supabase
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      // フィルター適用
      if (filters.documentType) {
        query = query.eq('document_type', filters.documentType);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.dateFrom) {
        query = query.gte('issue_date', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('issue_date', filters.dateTo);
      }

      // ページネーション
      const from = (currentPage - 1) * documentsPerPage;
      const to = from + documentsPerPage - 1;
      
      const { data, error, count } = await query
        .range(from, to)
        .select('*', { count: 'exact' });

      if (error) {
        console.error('Error fetching documents:', error);
        toast.error('文書の取得に失敗しました');
      } else {
        setDocuments(data || []);
        setTotalPages(Math.ceil((count || 0) / documentsPerPage));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('文書の取得中にエラーが発生しました');
    }
  }, [filters, currentPage]);

  // 領収書文書化
  const handleCreateDocument = async (ocrResult: OcrResult) => {
    try {
      // API経由で文書作成（シンプル版）
      const response = await fetch('/api/documents/create-from-ocr-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ocrResultId: ocrResult.id,
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
      
      if (response.ok) {
        toast.success(`${result.message || '領収書を作成しました'}`);
        // リストを更新
        await fetchOcrResults();
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

  // 初回ロード
  useEffect(() => {
    setLoading(true);
    
    if (activeTab === 'ocr') {
      fetchOcrResults().finally(() => setLoading(false));
    } else {
      fetchDocuments().finally(() => setLoading(false));
    }
  }, [activeTab, fetchOcrResults, fetchDocuments]);

  // フィルター変更時
  useEffect(() => {
    setCurrentPage(1); // フィルター変更時はページを1に戻す
  }, [filters]);

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

            {/* フィルター（作成済み文書タブのみ） */}
            {activeTab === 'documents' && (
              <div className="bg-white rounded-lg shadow mb-6 p-4">
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
              </div>
            )}

            {/* コンテンツ */}
            <div className="bg-white rounded-lg shadow">
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
                ) : (
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            文書番号
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            種類
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            取引先
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            小計
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            税額
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            合計
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            支払/お釣り
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            発行日
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            勘定科目
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ステータス
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            アクション
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ocrResults.map((result) => (
                          <tr key={result.id}>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {result.receipt_number || result.file_name.split('.')[0]}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                領収書
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              {result.vendor_name || result.store_name || result.company_name || '-'}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              ¥{(result.subtotal_amount || (result.total_amount - result.tax_amount)).toLocaleString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              ¥{result.tax_amount.toLocaleString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ¥{result.total_amount.toLocaleString()}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {result.payment_amount ? (
                                <div>
                                  <div>¥{result.payment_amount.toLocaleString()}</div>
                                  {result.change_amount ? (
                                    <div className="text-xs">お釣り: ¥{result.change_amount.toLocaleString()}</div>
                                  ) : null}
                                </div>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(result.receipt_date).toLocaleDateString('ja-JP')}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className="inline-flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                未分類
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              {result.linked_document_id ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  文書化済み
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  未処理
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                              {result.linked_document_id ? (
                                <Link
                                  href={`/documents/${result.linked_document_id}`}
                                  className="text-blue-600 hover:text-blue-900"
                                >
                                  詳細
                                </Link>
                              ) : (
                                <button
                                  onClick={() => handleCreateDocument(result)}
                                  className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-md text-sm"
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
                )
              ) : (
                // 作成済み文書（カード形式）
                documents.length === 0 ? (
                  <div className="p-8 text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-600">作成済みの文書がありません</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                    {documents.map((doc) => (
                      <div key={doc.id} className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="p-4">
                          {/* ヘッダー */}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {documentTypeLabels[doc.documentType as keyof typeof documentTypeLabels]}
                              </h3>
                              <p className="text-sm text-gray-500">{doc.documentNumber}</p>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[doc.status as keyof typeof statusColors]}`}>
                              {statusLabels[doc.status as keyof typeof statusLabels]}
                            </span>
                          </div>

                          {/* 詳細情報をグリッドで表示 */}
                          <div className="space-y-4">
                            {/* 取引先情報 */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-1">取引先</h4>
                              <p className="text-sm text-gray-900">{doc.partnerName}</p>
                              {doc.partnerAddress && (
                                <p className="text-xs text-gray-600">{doc.partnerAddress}</p>
                              )}
                            </div>

                            {/* 金額情報 */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-1">金額</h4>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">小計:</span>
                                  <span className="font-medium">¥{doc.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">消費税:</span>
                                  <span>¥{doc.taxAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm font-semibold">
                                  <span>合計:</span>
                                  <span className="text-lg">¥{doc.totalAmount.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            {/* 日付情報 */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-1">日付</h4>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">発行日:</span>
                                  <span>{new Date(doc.issueDate).toLocaleDateString('ja-JP')}</span>
                                </div>
                                {doc.dueDate && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">支払期限:</span>
                                    <span>{new Date(doc.dueDate).toLocaleDateString('ja-JP')}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* 勘定科目 */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">勘定科目</h4>
                              <div className="space-y-1">
                                {doc.documentType === 'receipt' && (
                                  <>
                                    <div className="text-sm">
                                      <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                        交際費
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      一般管理費/接待交際費
                                    </div>
                                  </>
                                )}
                                {doc.documentType === 'invoice' && (
                                  <>
                                    <div className="text-sm">
                                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                                        売上高
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      営業収益/売上高
                                    </div>
                                  </>
                                )}
                                {(doc.documentType === 'estimate' || doc.documentType === 'delivery_note') && (
                                  <>
                                    <div className="text-sm">
                                      <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded">
                                        売掛金
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      流動資産/売掛金
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 明細・備考 */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-500 mb-2">明細・備考</h4>
                              {doc.items && doc.items.length > 0 && (
                                <div className="mb-2">
                                  <div className="text-sm text-gray-900">
                                    {doc.items[0].name}
                                    {doc.items.length > 1 && (
                                      <span className="text-xs text-gray-500"> 他{doc.items.length - 1}件</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {doc.notes && (
                                <div className="text-xs text-gray-600 truncate" title={doc.notes}>
                                  {doc.notes.length > 50 ? `${doc.notes.substring(0, 50)}...` : doc.notes}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 mt-1">
                                作成: {new Date(doc.createdAt).toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                          </div>

                          {/* アクションボタン */}
                          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                            <div className="flex space-x-2">
                              <Link
                                href={`/documents/${doc.id}`}
                                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                詳細
                              </Link>
                              <Link
                                href={`/documents/${doc.id}/edit`}
                                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                              >
                                編集
                              </Link>
                            </div>
                            {doc.status === 'draft' && (
                              <button
                                onClick={() => handleStatusUpdate(doc.id, 'confirmed')}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                確定する
                              </button>
                            )}
                            {doc.status === 'confirmed' && (
                              <button
                                onClick={() => handleStatusUpdate(doc.id, 'draft')}
                                className="inline-flex items-center px-3 py-1 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                下書きに戻す
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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