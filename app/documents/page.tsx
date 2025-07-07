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
  status: string;
  created_at: string;
  extracted_text?: string;
  file_url?: string;
}

export default function DocumentsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [filters, setFilters] = useState({
    documentType: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [newOcrResults, setNewOcrResults] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'documents' | 'ocr'>(
    (searchParams.get('tab') as 'documents' | 'ocr') || 'ocr'
  );
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set());
  
  // URLパラメータからタブを設定
  useEffect(() => {
    const tab = searchParams.get('tab') as 'documents' | 'ocr';
    if (tab && (tab === 'documents' || tab === 'ocr')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // ページ遷移時に通知済みIDをクリア
  useEffect(() => {
    setNotifiedIds(new Set());
  }, [currentPage]);
  const itemsPerPage = 20;
  
  // タブ切り替え時にURLも更新
  const handleTabChange = (tab: 'documents' | 'ocr') => {
    setActiveTab(tab);
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('tab', tab);
    router.push(`/documents?${newSearchParams.toString()}`);
  };
  
  // サイレント更新（UIをちらつかせない）
  const loadOcrResultsSilently = useCallback(async () => {
    try {
      const supabase = getSupabaseClient();
      const companyId = '11111111-1111-1111-1111-111111111111';
      
      // 最新データを取得
      const { data, error } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(itemsPerPage)
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      
      if (error) return;
      
      // 新しいデータがある場合のみ更新
      if (data && data.length > 0) {
        // 現在のデータセットにない新しいアイテムを検出
        const newItems = data.filter(item => {
          // 既存のocrResultsに存在しない
          const isNew = !ocrResults.find(existing => existing.id === item.id);
          // かつ、まだ通知していない
          const notNotified = !notifiedIds.has(item.id);
          return isNew && notNotified;
        });
        
        if (newItems.length > 0) {
          // 通知を表示
          toast(
            (t) => (
              <div 
                className="cursor-pointer"
                onClick={() => {
                  // 編集画面への遷移
                  router.push(`/documents/ocr/${newItems[0].id}/edit`);
                  toast.dismiss(t.id);
                }}
              >
                <div className="font-semibold">{newItems.length}件の新しい書類が追加されました！</div>
                <div className="text-sm mt-1">
                  {newItems[0].vendor_name || 'OCR処理完了'} - ¥{newItems[0].total_amount?.toLocaleString() || '0'}
                  {newItems.length > 1 && ` 他${newItems.length - 1}件`}
                </div>
                <div className="text-xs mt-2 text-gray-600">クリックして編集画面を開く</div>
              </div>
            ),
            {
              duration: 10000,
              icon: '📄'
            }
          );
          
          // 通知済みIDを追加
          setNotifiedIds(prev => {
            const newSet = new Set(prev);
            newItems.forEach(item => newSet.add(item.id));
            return newSet;
          });
          
          setNewOcrResults(prev => [...prev, ...newItems]);
        }
        
        // データを更新（新規アイテムがなくても更新）
        setOcrResults(data);
      }
    } catch (error) {
      // サイレントに失敗（エラーログなし）
    }
  }, [ocrResults, notifiedIds, currentPage, itemsPerPage, router]);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Loading documents...');
      const companyId = '11111111-1111-1111-1111-111111111111'; // デモ用
      const offset = (currentPage - 1) * itemsPerPage;
      
      const result = await DocumentService.getDocuments(
        companyId,
        filters.documentType || filters.status || filters.dateFrom || filters.dateTo ? filters : undefined,
        itemsPerPage,
        offset
      );
      
      console.log('Documents loaded:', result);
      setDocuments(result.documents);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('書類の読み込みに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setDocuments([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, filters]);

  const archiveFile = async (result: OcrResult) => {
    try {
      // file_urlからGoogle Drive IDを抽出
      const gdriveFileId = result.file_url?.startsWith('gdrive://') 
        ? result.file_url.replace('gdrive://', '') 
        : null;
        
      if (!gdriveFileId) {
        toast.error('Google DriveのファイルIDが見つかりません');
        return;
      }

      const response = await fetch('/api/gdrive/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: gdriveFileId,
          fileName: result.file_name
        })
      });

      if (response.ok) {
        toast.success('ファイルをアーカイブに移動しました');
        // リストから削除
        setOcrResults(prev => prev.filter(r => r.id !== result.id));
        
        // データベースのステータスを更新
        const supabase = getSupabaseClient();
        await supabase
          .from('ocr_results')
          .update({ status: 'archived' })
          .eq('id', result.id);
      } else {
        const error = await response.json();
        toast.error(`アーカイブに失敗: ${error.message}`);
      }
    } catch (error) {
      toast.error('アーカイブ処理中にエラーが発生しました');
      console.error('Archive error:', error);
    }
  };

  const loadOcrResults = useCallback(async () => {
    setLoading(true);
    try {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase is not configured');
        setOcrResults([]);
        setTotalCount(0);
        return;
      }
      
      const supabase = getSupabaseClient();
      const companyId = '11111111-1111-1111-1111-111111111111'; // デモ用
      
      console.log('Loading OCR results...');
      
      // OCR結果を取得（アーカイブ済みを除く）
      const { data, error } = await supabase
        .from('ocr_results')
        .select('*')
        .eq('company_id', companyId)
        .neq('status', 'archived')
        .order('created_at', { ascending: false })
        .limit(itemsPerPage)
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('OCR results loaded:', data?.length || 0);
      setOcrResults(data || []);
      
      // 総数を取得
      const { count } = await supabase
        .from('ocr_results')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .neq('status', 'archived');
      
      console.log('Total count:', count);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading OCR results:', error);
      toast.error('OCR結果の読み込みに失敗しました: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setOcrResults([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  const handleStatusUpdate = async (documentId: string, newStatus: SavedDocument['status']) => {
    const success = await DocumentService.updateDocumentStatus(documentId, newStatus);
    if (success) {
      loadDocuments();
    }
  };


  // useEffect を関数定義の後に配置
  useEffect(() => {
    console.log('Effect triggered - activeTab:', activeTab);
    if (activeTab === 'documents') {
      loadDocuments();
    } else {
      loadOcrResults();
    }
  }, [filters, currentPage, activeTab, loadDocuments, loadOcrResults]);

  // ポーリングで新しいOCR結果をチェック（10秒ごと）
  useEffect(() => {
    if (activeTab === 'ocr') {
      const interval = setInterval(() => {
        loadOcrResultsSilently();
      }, 10000); // 10秒ごと

      return () => clearInterval(interval);
    }
  }, [activeTab, loadOcrResultsSilently]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイルタイプチェック
    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      toast.error('PDFまたは画像ファイルを選択してください');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Google Driveにアップロード
      const uploadResponse = await fetch('/api/upload/gdrive', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('アップロードに失敗しました');
      }

      await uploadResponse.json();
      toast.success('ファイルをアップロードしました。OCR処理を開始します...');
      setOcrProcessing(true);

      // OCR処理の完了を待つ（実際の実装では、WebSocketやポーリングを使用）
      setTimeout(() => {
        setOcrProcessing(false);
        toast.success('OCR処理が完了しました');
        loadDocuments(); // リストを更新
      }, 5000);

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }, []);

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handleCreateDocumentFromOcr = async (result: OcrResult) => {
    try {
      // シンプル版のエンドポイントを使用（型の問題を回避）
      const response = await fetch('/api/documents/create-from-ocr-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ocrResultId: result.id,
          vendor_name: result.vendor_name || '',
          receipt_date: result.receipt_date || new Date().toISOString().split('T')[0],
          subtotal_amount: result.subtotal_amount || 0,
          tax_amount: result.tax_amount || 0,
          total_amount: result.total_amount || 0,
          payment_amount: result.payment_amount || 0,
          change_amount: result.change_amount || 0,
          receipt_number: result.receipt_number || '',
          store_name: result.store_name || '',
          store_phone: result.store_phone || '',
          company_name: result.company_name || '',
          notes: result.notes || '',
          file_name: result.file_name || '領収書'
        })
      });

      const responseText = await response.text();
      console.log('Response:', response.status, responseText);
      
      if (!response.ok) {
        let errorMessage = '文書の作成に失敗しました';
        try {
          const errorData = JSON.parse(responseText);
          console.error('API Error Details:', errorData);
          errorMessage = errorData.error || errorMessage;
          if (errorData.details) {
            console.error('Stack trace:', errorData.details);
          }
          if (errorData.errorObject) {
            console.error('Full error object:', errorData.errorObject);
          }
        } catch {
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      console.log('Document created:', data);
      toast.success('領収書を作成しました');
      // タブを切り替えてリストを更新
      setActiveTab('documents');
      await loadDocuments();
    } catch (error) {
      console.error('Create document error:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('文書の作成に失敗しました');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">書類一覧</h1>
            <div className="flex gap-3">
              {/* ファイルアップロードボタン */}
              <label className="relative inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleFileSelect}
                  accept=".pdf,image/*"
                  disabled={uploading || ocrProcessing}
                />
                <Paperclip className="h-4 w-4 mr-2" />
                {uploading ? '処理中...' : 'PDFをアップロード'}
              </label>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                新規作成
              </Link>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            アップロードされた書類とOCR処理結果を管理します
          </p>
        </div>

        {/* 新しいOCR結果の通知バナー */}
        {newOcrResults.length > 0 && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="h-5 w-5 text-green-600 mr-3" />
                <p className="text-sm text-green-800">
                  {newOcrResults.length}件の新しい書類が処理されました
                </p>
              </div>
              <button
                onClick={() => setNewOcrResults([])}
                className="text-green-600 hover:text-green-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* OCR処理中の表示 */}
        {ocrProcessing && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-sm text-blue-800">
                Google DriveでOCR処理中です。処理が完了するまでお待ちください...
              </p>
            </div>
          </div>
        )}

        {/* タブ切り替え */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => handleTabChange('ocr')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ocr'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                OCR処理済み書類
              </button>
              <button
                onClick={() => handleTabChange('documents')}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documents'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                作成済み文書
              </button>
            </nav>
          </div>
        </div>

        {/* フィルター */}
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

        {/* 文書一覧 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">読み込み中...</span>
              </div>
            </div>
          ) : activeTab === 'ocr' ? (
            // OCR結果テーブル
            ocrResults.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-600">OCR処理済みの書類がありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ファイル名
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        ベンダー
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                        日付
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        合計
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                        税額
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                        ステータス
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                        処理日時
                      </th>
                      <th className="relative px-3 py-3">
                        <span className="sr-only">アクション</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {ocrResults.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-3 py-4 text-sm text-gray-900">
                          <div className="max-w-[150px] md:max-w-[200px]">
                            <div className="truncate">
                              {result.file_name}
                            </div>
                            {result.extracted_text && (
                              <div className="text-xs text-gray-500 mt-1 truncate" title={result.extracted_text}>
                                {result.extracted_text.substring(0, 30)}...
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                          <div className="max-w-[100px] truncate">
                            {result.vendor_name || '-'}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                          {result.receipt_date ? new Date(result.receipt_date).toLocaleDateString('ja-JP') : '-'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          ¥{result.total_amount?.toLocaleString() || '0'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                          ¥{result.tax_amount?.toLocaleString() || '0'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            result.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {result.status === 'completed' ? '処理済み' : '処理中'}
                          </span>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                          {new Date(result.created_at).toLocaleString('ja-JP', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          })}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-1 md:space-x-2">
                                <button
                                  onClick={() => window.open(`/documents/ocr/${result.id}/edit`, '_blank')}
                                  className="inline-flex items-center px-2 py-1 border border-blue-600 rounded text-xs font-medium text-blue-600 bg-white hover:bg-blue-50"
                                  title="編集"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  編集
                                </button>
                                <button
                                  onClick={() => handleCreateDocumentFromOcr(result)}
                                  className="inline-flex items-center px-2 py-1 border border-green-600 rounded text-xs font-medium text-green-600 bg-white hover:bg-green-50"
                                  title="領収書を作成"
                                >
                                  <FileCheck className="h-3 w-3 mr-1" />
                                  文書化
                                </button>
                                <button
                                  onClick={() => archiveFile(result)}
                                  className="inline-flex items-center px-2 py-1 border border-gray-600 rounded text-xs font-medium text-gray-600 bg-white hover:bg-gray-50"
                                  title="アーカイブに移動"
                                >
                                  <Archive className="h-3 w-3 mr-1" />
                                  アーカイブ
                                </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : documents.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">文書が見つかりません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  {/* ヘッダー行 */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Link
                          href={`/documents/${doc.id}`}
                          className="text-lg font-medium text-blue-600 hover:text-blue-900"
                        >
                          {doc.documentNumber}
                        </Link>
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {documentTypeLabels[doc.documentType]}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[doc.status]}`}>
                          {statusLabels[doc.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.pdfUrl && (
                          <a
                            href={doc.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-600 hover:text-gray-900"
                            title="PDFをダウンロード"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}

                        {doc.status === 'draft' && (
                          <button
                            onClick={() => handleStatusUpdate(doc.id, 'confirmed')}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            確定
                          </button>
                        )}

                        {doc.status === 'confirmed' && (
                          <button
                            onClick={() => handleStatusUpdate(doc.id, 'draft')}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded hover:bg-orange-100"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            下書きに戻す
                          </button>
                        )}
                        
                        {doc.status === 'confirmed' && doc.documentType === 'invoice' && (
                          <button
                            onClick={() => handleStatusUpdate(doc.id, 'paid')}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded hover:bg-green-100"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            支払済み
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 詳細情報 */}
                  <div className="px-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      {/* 基本情報 */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">取引先情報</h4>
                        <p className="text-sm text-gray-900">{doc.partner.name}</p>
                        {doc.partner.phone && (
                          <p className="text-xs text-gray-500">TEL: {doc.partner.phone}</p>
                        )}
                        <p className="text-xs text-gray-500">発行日: {new Date(doc.issueDate).toLocaleDateString('ja-JP')}</p>
                      </div>

                      {/* 金額詳細 */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-500 mb-2">金額詳細</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">小計:</span>
                            <span className="text-gray-900">¥{doc.subtotal.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">消費税:</span>
                            <span className="text-gray-900">¥{doc.tax.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm font-medium border-t pt-1">
                            <span className="text-gray-900">合計:</span>
                            <span className="text-gray-900">¥{doc.total.toLocaleString()}</span>
                          </div>
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="mt-4 flex justify-center">
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
    </div>
  );
}