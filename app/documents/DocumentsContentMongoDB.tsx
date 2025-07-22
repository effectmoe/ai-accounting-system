'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, Download, Send, CheckCircle, Filter, Plus, Paperclip, Bell, Edit, FileCheck, Archive, Grid3X3, List, Trash2, Image, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import AccountCategoryEditor from './components/AccountCategoryEditor';

import { logger } from '@/lib/logger';
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
  
  // 診断用: routerが正しく機能しているか確認
  useEffect(() => {
    console.log('=== DocumentsContentMongoDB Diagnostic Info ===');
    console.log('Router available:', !!router);
    console.log('Router.push available:', !!router?.push);
    console.log('Current pathname:', typeof window !== 'undefined' ? window.location.pathname : 'SSR');
    console.log('===========================================');
  }, [router]);
  
  // 代替ナビゲーション関数
  const navigateToDocument = (docId: string) => {
    const targetUrl = `/documents/${docId}`;
    console.log('NavigateToDocument called with:', targetUrl);
    
    // 方法1: Next.js router
    try {
      console.log('Method 1: Using Next.js router.push');
      router.push(targetUrl);
    } catch (error) {
      console.error('Router.push failed:', error);
      
      // 方法2: window.location
      try {
        console.log('Method 2: Using window.location.href');
        window.location.href = targetUrl;
      } catch (error2) {
        console.error('window.location failed:', error2);
      }
    }
  };
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'ocr' | 'created'>('ocr');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  
  // ページネーション状態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12); // グリッドビューでは12個、リストビューでは20個
  
  // ソート状態
  const [sortField, setSortField] = useState<'createdAt' | 'issueDate' | 'fileName' | 'accountTitle'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
        // デバッグ用：取得したデータを確認
        logger.debug('Fetched documents:', data.documents);
        console.log('=== DOCUMENTS DATA CHECK ===');
        console.log('Total documents:', data.documents.length);
        if (data.documents.length > 0) {
          console.log('First document sample:', data.documents[0]);
          console.log('First document ID:', data.documents[0].id);
          console.log('First document _id:', data.documents[0]._id);
          console.log('ID type:', typeof data.documents[0].id);
          console.log('_id type:', typeof data.documents[0]._id);
          console.log('vendor_name value:', data.documents[0].vendor_name);
          console.log('gridfs_file_id value:', data.documents[0].gridfs_file_id);
        }
        console.log('========================');
        setDocuments(data.documents);
      } else {
        throw new Error(data.error || 'Failed to load documents');
      }
    } catch (error) {
      logger.error('Error loading documents:', error);
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
      const deletePromises = Array.from(selectedDocuments).map(docId => 
        fetch(`/api/documents/${docId}`, { method: 'DELETE' })
      );
      
      const results = await Promise.all(deletePromises);
      const failedDeletions = results.filter(r => !r.ok).length;
      
      if (failedDeletions > 0) {
        toast.error(`${failedDeletions}件の削除に失敗しました`);
      } else {
        toast.success(`${selectedDocuments.size}件の書類を削除しました`);
      }
      
      setSelectedDocuments(new Set());
      fetchDocuments();
    } catch (error) {
      logger.error('Error deleting documents:', error);
      toast.error('削除に失敗しました');
    }
  };

  const handleCreateJournalEntry = async (doc: any) => {
    try {
      logger.debug('=== Creating journal entry ===');
      logger.debug('Document data:', {
        id: doc.id,
        category: doc.category,
        vendor: doc.vendor_name,
        amount: doc.total_amount,
        date: doc.receipt_date || doc.issue_date,
        full_doc: doc
      });
      
      // ボタンを無効化して重複実行を防ぐ
      const button = event?.target as HTMLButtonElement;
      if (button) {
        button.disabled = true;
        button.textContent = '処理中...';
      }
      
      // 仕訳作成APIを呼び出す（サーバーサイドで処理）
      const requestBody = {
        companyId: doc.companyId || doc.company_id || '11111111-1111-1111-1111-111111111111',
        vendorName: doc.vendor_name || doc.partner_name || doc.file_name || '不明な店舗',
        amount: doc.totalAmount || doc.total_amount || 0,
        taxAmount: doc.taxAmount || doc.tax_amount || 0,
        date: doc.receipt_date || doc.documentDate || doc.document_date || doc.issue_date || new Date().toISOString().split('T')[0],
        documentId: doc._id || doc.id,
        debitAccount: doc.category && doc.category !== '未分類' ? doc.category : null,
        description: `${doc.vendor_name || doc.partner_name || '店舗名不明'} - 領収書`
      };
      
      logger.debug('Request body:', requestBody);
      
      const response = await fetch('/api/journals/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      logger.debug('Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Journal creation failed:', errorData);
        throw new Error(errorData.error || '仕訳作成に失敗しました');
      }
      
      const result = await response.json();
      logger.debug('Journal creation response:', result);
      
      if (result.success && result.journal) {
        const journal = result.journal;
        const debitLine = journal.lines?.[0];
        const creditLine = journal.lines?.[1];
        
        logger.debug('Journal created successfully:', {
          journalId: journal.id,
          debitAccount: debitLine?.accountName,
          creditAccount: creditLine?.accountName,
          amount: doc.total_amount
        });
        
        toast.success(`仕訳を作成しました\n借方: ${debitLine?.accountName || '不明'} ¥${(doc.total_amount || 0).toLocaleString()}\n貸方: ${creditLine?.accountName || '現金'} ¥${(doc.total_amount || 0).toLocaleString()}`);
        
        // ステータス更新は不要（仕訳作成時に自動的に処理される）
        logger.debug('Journal created, refreshing document list...');
        
        // リストを更新
        fetchDocuments();
      } else {
        throw new Error(result.error || '仕訳作成に失敗しました');
      }
      
    } catch (error) {
      logger.error('=== Journal creation error ===');
      logger.error('Error details:', error);
      toast.error('仕訳作成に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    } finally {
      // ボタンを元に戻す
      const button = event?.target as HTMLButtonElement;
      if (button) {
        button.disabled = false;
        button.textContent = '文書化する';
      }
    }
  };

  const handleEditDocument = (doc: any) => {
    // デバッグ用：編集ボタンクリック時の情報
    logger.debug('Edit button clicked for document:', {
      id: doc.id,
      ocr_status: doc.ocr_status,
      document_type: doc.document_type,
      vendor_name: doc.vendor_name,
      partner_name: doc.partner_name
    });
    
    // OCRドキュメントかどうかで編集ページを分ける
    if (doc.ocr_status === 'completed') {
      logger.debug('Navigating to OCR edit page:', `/documents/ocr/${doc.id}/edit`);
      router.push(`/documents/ocr/${doc.id}/edit`);
    } else {
      logger.debug('Navigating to standard edit page:', `/documents/${doc.id}/edit`);
      router.push(`/documents/${doc.id}/edit`);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('この書類を削除してもよろしいですか？')) {
      return;
    }

    try {
      logger.debug('Deleting document:', docId);
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });

      const responseText = await response.text();
      logger.debug('Delete response:', response.status, responseText);

      if (!response.ok) {
        let errorMessage = '削除に失敗しました';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // JSONパースエラーは無視
        }
        throw new Error(errorMessage);
      }

      toast.success('書類を削除しました');
      fetchDocuments();
    } catch (error) {
      logger.error('削除エラー:', error);
      toast.error(error instanceof Error ? error.message : '削除に失敗しました');
    }
  };

  const handleRevertToOCR = async (doc: any) => {
    if (!confirm('この文書をOCR結果に戻してもよろしいですか？関連する仕訳伝票も削除されます。')) {
      return;
    }

    try {
      logger.debug('Reverting to OCR - Full document:', doc);
      logger.debug('Reverting to OCR - Key fields:', {
        documentId: doc.id,
        journalId: doc.journalId,
        sourceDocumentId: doc.sourceDocumentId || doc.source_document_id,
        hasSourceDocumentId: !!(doc.sourceDocumentId || doc.source_document_id)
      });

      const requestBody = {
        journalId: doc.journalId,
        sourceDocumentId: doc.sourceDocumentId || doc.source_document_id
      };
      
      logger.debug('Revert request body:', requestBody);

      const response = await fetch(`/api/documents/${doc.id}/revert-to-ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      logger.debug('Revert response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('Revert failed:', errorData);
        throw new Error(errorData.error || 'OCR結果への復元に失敗しました');
      }

      const result = await response.json();
      logger.debug('Revert response:', result);
      
      if (result.success) {
        toast.success('OCR結果に戻しました');
        logger.debug('Revert successful, refreshing documents...');
        fetchDocuments();
      } else {
        throw new Error(result.error || 'OCR結果への復元に失敗しました');
      }
      
    } catch (error) {
      logger.error('OCR復元エラー:', error);
      toast.error(error instanceof Error ? error.message : 'OCR結果への復元に失敗しました');
    }
  };

  const filteredDocuments = documents.filter(doc => {
    if (activeTab === 'ocr') {
      // OCRで処理されたが、まだ文書化されていないドキュメント
      // journalIdがないものが未処理で、hiddenFromListがfalseまたは未設定のもの
      const isOcrDoc = doc.ocr_status === 'completed' && 
             doc.document_type !== 'journal_entry' && 
             !doc.journalId &&
             doc.hiddenFromList !== true; // 明示的にtrueでない場合は表示
      if (isOcrDoc) {
        logger.debug('OCR document included in filter:', {
          id: doc.id,
          vendor_name: doc.vendor_name,
          ocr_status: doc.ocr_status,
          document_type: doc.document_type,
          journalId: doc.journalId,
          hiddenFromList: doc.hiddenFromList
        });
      }
      return isOcrDoc;
    } else if (activeTab === 'created') {
      // 仕訳伝票、または文書化済み（journalIdを持つ）ドキュメント
      return doc.document_type === 'journal_entry' || 
             (doc.journalId && doc.journalId !== null);
    }
    return true;
  });

  // ソート処理
  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortField) {
      case 'createdAt':
        aValue = new Date(a.created_at).getTime();
        bValue = new Date(b.created_at).getTime();
        break;
      case 'issueDate':
        aValue = new Date(a.receipt_date || a.issue_date).getTime();
        bValue = new Date(b.receipt_date || b.issue_date).getTime();
        break;
      case 'fileName':
        aValue = a.file_name || '';
        bValue = b.file_name || '';
        break;
      case 'accountTitle':
        aValue = a.category || '未分類';
        bValue = b.category || '未分類';
        break;
      default:
        aValue = 0;
        bValue = 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // ページネーション処理
  const totalPages = Math.ceil(sortedDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDocuments = sortedDocuments.slice(startIndex, endIndex);

  // ページ変更時の処理
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ソート変更時の処理
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // ソート変更時は1ページ目に戻る
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
              onClick={() => setActiveTab('ocr')}
              className={`px-4 py-2 rounded ${activeTab === 'ocr' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              OCR結果（未処理）
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

        {/* リストビューの場合のみソートボタンを表示 */}
        {viewMode === 'list' && (
          <div className="flex gap-2 mb-4">
            <span className="text-sm text-gray-600">並び替え:</span>
            <button
              onClick={() => handleSort('createdAt')}
              className={`text-sm px-3 py-1 rounded ${
                sortField === 'createdAt' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              取込日付 {sortField === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('issueDate')}
              className={`text-sm px-3 py-1 rounded ${
                sortField === 'issueDate' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              発行日 {sortField === 'issueDate' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('fileName')}
              className={`text-sm px-3 py-1 rounded ${
                sortField === 'fileName' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ファイル名 {sortField === 'fileName' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => handleSort('accountTitle')}
              className={`text-sm px-3 py-1 rounded ${
                sortField === 'accountTitle' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              勘定科目 {sortField === 'accountTitle' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        )}

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
            {paginatedDocuments.map((doc) => (
              <div 
                key={doc.id} 
                className="bg-white border rounded-lg p-4 hover:shadow-lg transition-shadow relative cursor-pointer"
                onClick={(e) => {
                  // チェックボックスやボタンのクリックは除外
                  const target = e.target as HTMLElement;
                  if (target.closest('input') || target.closest('button') || target.closest('a') || target.closest('.account-category-editor')) {
                    return;
                  }
                  // 診断: イベントが正しく発火しているか
                  console.log('=== CARD CLICK EVENT FIRED ===');
                  console.log('Event type:', e.type);
                  console.log('Event target:', e.target);
                  console.log('Current target:', e.currentTarget);
                  
                  const docId = doc.id || doc._id;
                  console.log('Card clicked, doc data:', doc);
                  console.log('Card clicked, doc.id:', doc.id);
                  console.log('Card clicked, doc._id:', doc._id);
                  console.log('Card clicked, docId:', docId);
                  console.log('Card clicked, navigating to:', `/documents/${docId}`);
                  console.log('Router object:', router);
                  console.log('Router.push function:', router.push);
                  
                  // 診断: 実際にナビゲーションを実行
                  navigateToDocument(docId);
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedDocuments.has(doc.id)}
                  onChange={() => toggleDocumentSelection(doc.id)}
                  className="absolute top-2 left-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                
                <div className="ml-8">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">
                      {(() => {
                        const displayName = doc.vendor_name || doc.partner_name || doc.file_name || 'Unknown';
                        logger.debug('Document display name:', {
                          id: doc.id,
                          vendor_name: doc.vendor_name,
                          partner_name: doc.partner_name,
                          file_name: doc.file_name,
                          displayName
                        });
                        return displayName;
                      })()}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[doc.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[doc.status] || doc.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {documentTypeLabels[doc.document_type] || doc.document_type}
                    </span>
                    {doc.ocr_status === 'completed' && (
                      <div className="account-category-editor" onClick={(e) => e.stopPropagation()}>
                        <AccountCategoryEditor
                          documentId={doc.id}
                          vendorName={doc.vendor_name || doc.partner_name || ''}
                          currentCategory={doc.category || '未分類'}
                          amount={doc.total_amount}
                          fileName={doc.file_name}
                          extractedText={doc.extracted_text}
                          documentType={doc.document_type}
                          onCategoryUpdate={(newCategory) => {
                            // カテゴリー更新後の処理
                            fetchDocuments();
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {doc.document_number && (
                    <p className="text-xs text-gray-500 mb-1">番号: {doc.document_number}</p>
                  )}
                  
                  {(doc.receipt_date || doc.issue_date) && (
                    <p className="text-xs text-gray-500 mb-2">
                      日付: {new Date(doc.receipt_date || doc.issue_date).toLocaleDateString('ja-JP')} {new Date(doc.receipt_date || doc.issue_date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">小計</span>
                      <span>¥{(doc.total_amount - doc.tax_amount).toLocaleString() || 0}</span>
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
                  
                  {/* 未分類フィールド：OCR詳細情報 */}
                  {doc.extracted_text && (
                    <div className="mt-3 pt-3 border-t">
                      <details className="text-xs text-gray-500">
                        <summary className="cursor-pointer text-gray-700 font-medium mb-2">OCR詳細情報</summary>
                        <div className="bg-gray-50 p-2 rounded text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                          {typeof doc.extracted_text === 'string' 
                            ? doc.extracted_text 
                            : JSON.stringify(doc.extracted_text, null, 2)}
                        </div>
                      </details>
                    </div>
                  )}
                  
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      {doc.category && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded">
                          {doc.category}
                        </span>
                      )}
                      <span>処理: {new Date(doc.created_at).toLocaleDateString('ja-JP')} {new Date(doc.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {doc.gridfs_file_id && (
                      <div className="mt-1">
                        <a
                          href={`/api/files/${doc.gridfs_file_id}/direct`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          onClick={async (e) => {
                            logger.debug('Clicking file link with ID:', doc.gridfs_file_id);
                            logger.debug('Full document data:', doc);
                            
                            // ファイルが存在するかチェック
                            try {
                              const response = await fetch(`/api/files/${doc.gridfs_file_id}`, { method: 'HEAD' });
                              if (!response.ok) {
                                e.preventDefault();
                                toast.error('元画像ファイルが見つかりません（404エラー）');
                                return;
                              }
                            } catch (error) {
                              logger.error('File check error:', error);
                              e.preventDefault();
                              toast.error('元画像ファイルへのアクセスに失敗しました');
                              return;
                            }
                          }}
                        >
                          <Image className="w-3 h-3" />
                          <span>元画像を表示</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                    {doc.document_type !== 'journal_entry' && (
                      <button
                        onClick={() => {
                          logger.debug('文書化する button clicked - Document data:', {
                            id: doc.id,
                            document_type: doc.document_type,
                            ocr_status: doc.ocr_status,
                            journalId: doc.journalId,
                            category: doc.category
                          });
                          handleCreateJournalEntry(doc);
                        }}
                        className="flex-1 bg-blue-600 text-white text-sm py-1 px-2 rounded hover:bg-blue-700"
                      >
                        文書化する
                      </button>
                    )}
                    {doc.document_type === 'journal_entry' && doc.journalId && (
                      <button
                        onClick={() => {
                          logger.debug('OCR結果に戻す button clicked - Document data:', {
                            id: doc.id,
                            document_type: doc.document_type,
                            journalId: doc.journalId,
                            sourceDocumentId: doc.sourceDocumentId,
                            source_document_id: doc.source_document_id,
                            hasEitherSourceId: !!(doc.sourceDocumentId || doc.source_document_id)
                          });
                          handleRevertToOCR(doc);
                        }}
                        className="flex-1 bg-yellow-600 text-white text-sm py-1 px-2 rounded hover:bg-yellow-700"
                      >
                        OCR結果に戻す
                      </button>
                    )}
                    <button
                      onClick={() => handleEditDocument(doc)}
                      className="bg-gray-600 text-white text-sm py-1 px-2 rounded hover:bg-gray-700"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
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
                {paginatedDocuments.map((doc) => {
                  const docId = doc.id || doc._id;
                  return (
                    <tr 
                      key={docId} 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={(e) => {
                        // チェックボックスやボタンのクリックは除外
                        const target = e.target as HTMLElement;
                        if (target.closest('input') || target.closest('button') || target.closest('a')) {
                          return;
                        }
                        // 診断: イベントが正しく発火しているか
                        console.log('=== ROW CLICK EVENT FIRED ===');
                        console.log('Event type:', e.type);
                        console.log('Event target:', e.target);
                        console.log('Current target:', e.currentTarget);
                        
                        console.log('Row clicked, doc data:', doc);
                        console.log('Row clicked, doc.id:', doc.id);
                        console.log('Row clicked, doc._id:', doc._id);
                        console.log('Row clicked, docId:', docId);
                        console.log('Row clicked, navigating to:', `/documents/${docId}`);
                        console.log('Router object:', router);
                        console.log('Router.push function:', router.push);
                        
                        // 診断: 実際にナビゲーションを実行
                        navigateToDocument(docId);
                      }}
                    >
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
                    <td className="p-2 text-sm">{new Date(doc.receipt_date || doc.issue_date).toLocaleDateString('ja-JP')} {new Date(doc.receipt_date || doc.issue_date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-2 text-sm">¥{doc.total_amount?.toLocaleString()}</td>
                    <td className="p-2">
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[doc.status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[doc.status] || doc.status}
                      </span>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleEditDocument(doc)}
                          className="text-green-600 hover:text-green-800 p-1"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {doc.gridfs_file_id && (
                          <a
                            href={`/api/files/${doc.gridfs_file_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="元画像を表示"
                            onClick={async (e) => {
                              logger.debug('List view - Clicking file link with ID:', doc.gridfs_file_id);
                              logger.debug('List view - Full document data:', doc);
                              
                              // ファイルが存在するかチェック
                              try {
                                const response = await fetch(`/api/files/${doc.gridfs_file_id}`, { method: 'HEAD' });
                                if (!response.ok) {
                                  e.preventDefault();
                                  toast.error('元画像ファイルが見つかりません（404エラー）');
                                  return;
                                }
                              } catch (error) {
                                logger.error('File check error:', error);
                                e.preventDefault();
                                toast.error('元画像ファイルへのアクセスに失敗しました');
                                return;
                              }
                            }}
                          >
                            <Image className="w-4 h-4" />
                          </a>
                        )}
                        <button 
                          className="text-gray-400 cursor-not-allowed p-1"
                          title="ダウンロード機能は準備中です"
                          onClick={() => toast.info('ダウンロード機能は準備中です')}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="削除"
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
        )}
        
        {/* ページネーション */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center items-center gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              前へ
            </button>
            
            {/* ページ番号ボタン */}
            {(() => {
              const pageNumbers = [];
              const maxVisible = 5;
              let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
              let end = Math.min(totalPages, start + maxVisible - 1);
              
              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }
              
              if (start > 1) {
                pageNumbers.push(
                  <button
                    key={1}
                    onClick={() => handlePageChange(1)}
                    className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    1
                  </button>
                );
                if (start > 2) {
                  pageNumbers.push(<span key="dots1" className="px-2">...</span>);
                }
              }
              
              for (let i = start; i <= end; i++) {
                pageNumbers.push(
                  <button
                    key={i}
                    onClick={() => handlePageChange(i)}
                    className={`px-3 py-1 rounded ${
                      currentPage === i
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {i}
                  </button>
                );
              }
              
              if (end < totalPages) {
                if (end < totalPages - 1) {
                  pageNumbers.push(<span key="dots2" className="px-2">...</span>);
                }
                pageNumbers.push(
                  <button
                    key={totalPages}
                    onClick={() => handlePageChange(totalPages)}
                    className="px-3 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                  >
                    {totalPages}
                  </button>
                );
              }
              
              return pageNumbers;
            })()}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              次へ
            </button>
            
            <span className="ml-4 text-sm text-gray-600">
              {totalPages}ページ中{currentPage}ページ目 ({sortedDocuments.length}件中{startIndex + 1}-{Math.min(endIndex, sortedDocuments.length)}件)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}