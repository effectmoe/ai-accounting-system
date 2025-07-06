'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DocumentService, SavedDocument } from '@/services/document-service';
import { FileText, Download, Eye, Send, CheckCircle, Calendar, Filter, Plus, Upload, Paperclip } from 'lucide-react';
import { toast } from 'react-hot-toast';

const documentTypeLabels = {
  estimate: '見積書',
  invoice: '請求書',
  delivery_note: '納品書',
  receipt: '領収書'
};

const statusLabels = {
  draft: '下書き',
  sent: '送信済み',
  viewed: '閲覧済み',
  accepted: '承認済み',
  paid: '支払済み',
  cancelled: 'キャンセル'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  paid: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800'
};

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
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
  const itemsPerPage = 20;

  useEffect(() => {
    loadDocuments();
  }, [filters, currentPage]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const companyId = '11111111-1111-1111-1111-111111111111'; // デモ用
      const offset = (currentPage - 1) * itemsPerPage;
      
      const result = await DocumentService.getDocuments(
        companyId,
        filters.documentType || filters.status || filters.dateFrom || filters.dateTo ? filters : undefined,
        itemsPerPage,
        offset
      );
      
      setDocuments(result.documents);
      setTotalCount(result.total);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (documentId: string, newStatus: SavedDocument['status']) => {
    const success = await DocumentService.updateDocumentStatus(documentId, newStatus);
    if (success) {
      loadDocuments();
    }
  };

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

      const uploadData = await uploadResponse.json();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">AI会計アシスタント</h1>
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
            自然な言葉で会計処理をお手伝いします
          </p>
        </div>

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
              <option value="sent">送信済み</option>
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
          ) : documents.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-2 text-gray-600">文書が見つかりません</p>
            </div>
          ) : (
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
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    発行日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        {doc.documentNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {documentTypeLabels[doc.documentType]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {doc.partner.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ¥{doc.total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(doc.issueDate).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[doc.status]}`}>
                        {statusLabels[doc.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                        
                        <button
                          onClick={() => router.push(`/documents/${doc.id}`)}
                          className="text-gray-600 hover:text-gray-900"
                          title="詳細を表示"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        {doc.status === 'draft' && (
                          <button
                            onClick={() => handleStatusUpdate(doc.id, 'sent')}
                            className="text-blue-600 hover:text-blue-900"
                            title="送信"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                        )}

                        {doc.status === 'sent' && doc.documentType === 'invoice' && (
                          <button
                            onClick={() => handleStatusUpdate(doc.id, 'paid')}
                            className="text-green-600 hover:text-green-900"
                            title="支払済みにする"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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