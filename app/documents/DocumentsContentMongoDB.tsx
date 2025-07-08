'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Download, Send, CheckCircle, Filter, Plus, Paperclip, Bell, Edit, FileCheck, Archive, Grid3X3, List, Trash2, Image } from 'lucide-react';
import { toast } from 'react-hot-toast';

const documentTypeLabels = {
  estimate: '見積書',
  invoice: '請求書',
  delivery_note: '納品書',
  receipt: '領収書',
  journal_entry: '仕訳伝票'
};

const statusLabels = {
  draft: '下書き',
  confirmed: '確定済み',
  viewed: '閲覧済み',
  accepted: '承認済み',
  paid: '支払済み',
  cancelled: 'キャンセル',
  pending: '処理中',
  completed: '完了'
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  confirmed: 'bg-blue-100 text-blue-800',
  viewed: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  paid: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
  pending: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800'
};

interface Document {
  id: string;
  company_id: string;
  document_type: string;
  document_number: string;
  status: string;
  issue_date: string;
  partner_name: string;
  partner_address?: string;
  total_amount: number;
  tax_amount: number;
  subtotal: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  
  // OCR関連フィールド
  file_name?: string;
  file_type?: string;
  file_size?: number;
  vendor_name?: string;
  receipt_date?: string;
  category?: string;
  extracted_text?: string;
  confidence?: number;
  ocr_status?: string;
  ocr_result_id?: string;
  gridfs_file_id?: string;
}

export default function DocumentsContentMongoDB() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'ocr' | 'created'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());

  // MongoDB から書類を取得
  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/documents/list?' + new URLSearchParams({
        companyId: 'all',
        limit: '100'
      }));
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setDocuments(data.documents);
      } else {
        throw new Error(data.error || 'Failed to load documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('書類の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const selectAllDocuments = () => {
    if (selectedDocuments.size === filteredDocuments.length) {
      setSelectedDocuments(new Set());
    } else {
      setSelectedDocuments(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  const deleteSelectedDocuments = async () => {
    if (selectedDocuments.size === 0) return;
    
    if (!confirm(`選択した${selectedDocuments.size}件の書類を削除しますか？`)) {
      return;
    }

    try {
      // TODO: MongoDB削除APIの実装
      toast.error('削除機能は現在実装中です');
    } catch (error) {
      console.error('Error deleting documents:', error);
      toast.error('削除に失敗しました');
    }
  };

  const handleCreateJournalEntry = async (doc: any) => {
    try {
      // OCRProcessorをインポートして仕訳作成ロジックを使用
      const { OCRProcessor } = await import('@/lib/ocr-processor');
      const ocrProcessor = new OCRProcessor();
      
      // OCR結果から仕訳データを生成
      const ocrResult = {
        vendor: doc.vendorName || doc.vendor_name,
        amount: doc.totalAmount || doc.total_amount || 0,
        taxAmount: doc.taxAmount || doc.tax_amount || 0,
        date: doc.documentDate || doc.document_date || new Date().toISOString().split('T')[0],
        items: []
      };
      
      const journalEntry = await ocrProcessor.createJournalEntry(ocrResult, doc.companyId || doc.company_id);
      
      // 仕訳作成APIを呼び出す
      const response = await fetch('/api/journals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: doc.companyId || doc.company_id,
          ...journalEntry,
          documentId: doc._id || doc.id
        })
      });
      
      if (!response.ok) {
        throw new Error('仕訳作成に失敗しました');
      }
      
      const result = await response.json();
      
      toast.success(`仕訳を作成しました\n借方: ${journalEntry.debitAccount} ¥${journalEntry.amount.toLocaleString()}\n貸方: ${journalEntry.creditAccount} ¥${journalEntry.amount.toLocaleString()}`);
      
      // ドキュメントのステータスを更新
      await fetch(`/api/documents/${doc._id || doc.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'journalized' })
      });
      
      // リストを更新
      fetchDocuments();
      
    } catch (error) {
      console.error('仕訳作成エラー:', error);
      toast.error('仕訳作成に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (activeTab === 'ocr') {
      // OCRで処理されたドキュメント（仕訳伝票以外）
      return doc.ocr_status === 'completed' && doc.document_type !== 'journal_entry';
    } else if (activeTab === 'created') {
      // 手動作成されたドキュメントまたは仕訳伝票
      return !doc.ocr_status || doc.document_type === 'journal_entry';
    }
    return true;
  });

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
        <h1 className="text-2xl font-bold">書類管理</h1>
        <div className="flex gap-2">
          <Link href="/documents/new" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            新規作成
          </Link>
        </div>
      </div>

      <div className="mb-4 bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded ${activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              すべて
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`px-4 py-2 rounded ${activeTab === 'ocr' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              OCR結果
            </button>
            <button
              onClick={() => setActiveTab('created')}
              className={`px-4 py-2 rounded ${activeTab === 'created' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              作成済み文書
            </button>
          </div>
          
          <div className="flex gap-2 items-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-gray-300' : 'bg-gray-100'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-gray-300' : 'bg-gray-100'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 ml-4">{filteredDocuments.length}件</span>
          </div>
        </div>

        {selectedDocuments.size > 0 && (
          <div className="flex gap-2 items-center mb-4 p-2 bg-blue-50 rounded">
            <input
              type="checkbox"
              checked={selectedDocuments.size === filteredDocuments.length}
              onChange={selectAllDocuments}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm">{selectedDocuments.size}件選択中</span>
            <button
              onClick={deleteSelectedDocuments}
              className="ml-auto text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
            >
              <Trash2 className="w-4 h-4" />
              削除
            </button>
          </div>
        )}

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => (
              <div key={doc.id} className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow relative">
                <input
                  type="checkbox"
                  checked={selectedDocuments.has(doc.id)}
                  onChange={() => toggleDocumentSelection(doc.id)}
                  className="absolute top-2 left-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                
                <div className="ml-8">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">
                      {doc.vendor_name || doc.partner_name || 'Unknown'}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[doc.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[doc.status] || doc.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-1">
                    {documentTypeLabels[doc.document_type] || doc.document_type}
                  </p>
                  
                  {doc.file_name && (
                    <p className="text-xs text-gray-500 mb-2">{doc.file_name}</p>
                  )}
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">小計</span>
                      <span>¥{doc.subtotal?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">税額</span>
                      <span>¥{doc.tax_amount?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>合計</span>
                      <span>¥{doc.total_amount?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    <div>お預かり: -</div>
                    <div>お釣り: -</div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      {doc.category && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          {doc.category}
                        </span>
                      )}
                      <span>処理: {new Date(doc.created_at).toLocaleDateString('ja-JP')}</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleCreateJournalEntry(doc)}
                      className="flex-1 bg-blue-600 text-white text-sm py-1 px-2 rounded hover:bg-blue-700"
                    >
                      文書化する
                    </button>
                    <button
                      onClick={() => toast.info('削除機能は実装中です')}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-2 text-left">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.size === filteredDocuments.length}
                      onChange={selectAllDocuments}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
                  <th className="p-2 text-left text-sm font-medium text-gray-700">書類番号</th>
                  <th className="p-2 text-left text-sm font-medium text-gray-700">種類</th>
                  <th className="p-2 text-left text-sm font-medium text-gray-700">取引先</th>
                  <th className="p-2 text-left text-sm font-medium text-gray-700">発行日</th>
                  <th className="p-2 text-left text-sm font-medium text-gray-700">金額</th>
                  <th className="p-2 text-left text-sm font-medium text-gray-700">ステータス</th>
                  <th className="p-2 text-left text-sm font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selectedDocuments.has(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </td>
                    <td className="p-2 text-sm">{doc.document_number}</td>
                    <td className="p-2 text-sm">{documentTypeLabels[doc.document_type] || doc.document_type}</td>
                    <td className="p-2 text-sm">{doc.vendor_name || doc.partner_name}</td>
                    <td className="p-2 text-sm">{new Date(doc.issue_date).toLocaleDateString('ja-JP')}</td>
                    <td className="p-2 text-sm">¥{doc.total_amount?.toLocaleString()}</td>
                    <td className="p-2">
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[doc.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[doc.status] || doc.status}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <button className="text-blue-600 hover:text-blue-800 p-1">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-green-600 hover:text-green-800 p-1">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-800 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}