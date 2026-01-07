'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, FileText, Loader2, Receipt as ReceiptIcon, FileDown, CheckCircle2, Trash2, Copy, Scan, FolderInput, RefreshCw, ScanLine, ArrowUpDown, ArrowUp, ArrowDown, Filter } from 'lucide-react';
import { ScanSnapButton } from '@/components/ScanSnapButton';
import { DirectScanResult } from '@/types/scansnap';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date-utils';

import { logger } from '@/lib/logger';
import { ACCOUNT_CATEGORIES, AccountCategory } from '@/types/receipt';

// タブの種類
type TabType = 'all' | 'manual' | 'scanned';

// 領収書ステータスのマッピング
const RECEIPT_STATUS_LABELS = {
  draft: '下書き',
  issued: '発行済み',
  sent: '送信済み',
  cancelled: 'キャンセル'
} as const;

const RECEIPT_STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
} as const;

interface Receipt {
  _id: string;
  receiptNumber: string;
  title?: string;
  issueDate: string;
  paidDate?: string;
  customerName: string;
  customer?: {
    companyName?: string;
    name?: string;
  };
  totalAmount: number;
  status: keyof typeof RECEIPT_STATUS_LABELS;
  invoiceNumber?: string;
  invoiceId?: string;
  scannedFromPdf?: boolean;
  scanMetadata?: {
    originalFileName: string;
    processedAt: string;
    visionModelUsed: string;
  };
  accountCategory?: string;
  accountCategoryConfidence?: number;
  issuerName?: string;
}

export default function ReceiptsPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedReceipts, setSelectedReceipts] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 並び替え
  const [sortBy, setSortBy] = useState<'issueDate' | 'totalAmount' | 'issuerName'>('issueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // フィルター
  const [accountCategoryFilter, setAccountCategoryFilter] = useState<string>('all');
  const [amountMin, setAmountMin] = useState<string>('');
  const [amountMax, setAmountMax] = useState<string>('');

  // タブ管理
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // スキャン処理
  const [pendingPdfCount, setPendingPdfCount] = useState(0);
  const [pendingPdfFiles, setPendingPdfFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResult, setProcessingResult] = useState<{
    success: number;
    failed: number;
    total: number;
  } | null>(null);

  // ScanSnapスキャン結果
  const [scanSnapResult, setScanSnapResult] = useState<DirectScanResult | null>(null);

  // ページネーション
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  // データ取得関数（早期定義）
  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        skip: ((currentPage - 1) * itemsPerPage).toString(),
        sortBy: sortBy,
        sortOrder: sortOrder,
      });

      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);

      // 勘定科目フィルタ
      if (accountCategoryFilter && accountCategoryFilter !== 'all') {
        params.append('accountCategory', accountCategoryFilter);
      }

      // 金額範囲フィルタ
      if (amountMin) params.append('amountMin', amountMin);
      if (amountMax) params.append('amountMax', amountMax);

      // タブによるフィルタ
      if (activeTab === 'scanned') {
        params.append('scannedFromPdf', 'true');
      } else if (activeTab === 'manual') {
        params.append('scannedFromPdf', 'false');
      }

      const response = await fetch(`/api/receipts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch receipts');
      }

      const data = await response.json();
      setReceipts(data.receipts || []);
      setTotalCount(data.total || 0);
    } catch (error) {
      logger.error('Error fetching receipts:', error);
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage, currentPage, sortBy, sortOrder, statusFilter, searchTerm, accountCategoryFilter, amountMin, amountMax, activeTab]);

  // 処理待ちPDF情報を取得
  const fetchPendingPdfs = useCallback(async () => {
    try {
      const response = await fetch('/api/scan-receipt/pending');
      if (response.ok) {
        const data = await response.json();
        setPendingPdfCount(data.pendingCount || 0);
        setPendingPdfFiles(data.pendingFiles || []);
      }
    } catch (error) {
      logger.error('Error fetching pending PDFs:', error);
    }
  }, []);

  // タブ変更時にページをリセット
  useEffect(() => {
    setCurrentPage(1);
    setSelectedReceipts(new Set());
    setProcessingResult(null);
    setScanSnapResult(null);
  }, [activeTab]);

  // ScanSnapスキャン完了時のハンドラ
  const handleScanSnapComplete = useCallback((result: DirectScanResult) => {
    setScanSnapResult(result);
    // データを再取得
    fetchReceipts();
    logger.info('ScanSnap scan completed:', result);
  }, [fetchReceipts]);

  // ScanSnapスキャンエラー時のハンドラ
  const handleScanSnapError = useCallback((error: string) => {
    logger.error('ScanSnap scan error:', error);
    alert(`スキャンエラー: ${error}`);
  }, []);

  // データ取得
  useEffect(() => {
    fetchReceipts();
    if (activeTab === 'scanned') {
      fetchPendingPdfs();
    }
  }, [fetchReceipts, fetchPendingPdfs, activeTab]);

  // スキャン処理を実行
  const handleProcessScan = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setProcessingResult(null);

    try {
      const response = await fetch('/api/scan-receipt/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error('Failed to process scan receipts');
      }

      const data = await response.json();
      setProcessingResult({
        success: data.successCount || 0,
        failed: data.failedCount || 0,
        total: data.processedCount || 0,
      });

      // データを再取得
      await fetchReceipts();
      await fetchPendingPdfs();

      logger.info('Scan processing completed:', data);
    } catch (error) {
      logger.error('Error processing scan receipts:', error);
      alert('スキャン処理に失敗しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (receiptId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // 領収書リストを更新
        setReceipts(prev =>
          prev.map(receipt =>
            receipt._id === receiptId
              ? { ...receipt, status: newStatus as keyof typeof RECEIPT_STATUS_LABELS }
              : receipt
          )
        );
        logger.info(`Receipt ${receiptId} status changed to ${newStatus}`);
      } else {
        logger.error('Failed to update receipt status');
      }
    } catch (error) {
      logger.error('Error updating receipt status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(receipts.map(receipt => receipt._id));
      setSelectedReceipts(allIds);
    } else {
      setSelectedReceipts(new Set());
    }
  };

  const handleSelectReceipt = (receiptId: string, checked: boolean) => {
    const newSelection = new Set(selectedReceipts);
    if (checked) {
      newSelection.add(receiptId);
    } else {
      newSelection.delete(receiptId);
    }
    setSelectedReceipts(newSelection);
  };

  const handleBulkStatusChange = async () => {
    if (!bulkStatus || selectedReceipts.size === 0) return;

    setIsUpdating(true);
    try {
      const promises = Array.from(selectedReceipts).map(receiptId =>
        fetch(`/api/receipts/${receiptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: bulkStatus }),
        })
      );

      await Promise.all(promises);

      // 一覧を再取得
      await fetchReceipts();

      // 選択をクリア
      setSelectedReceipts(new Set());
      setBulkStatus('');
    } catch (error) {
      logger.error('Error in bulk status update:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 一括削除
  const handleBulkDelete = async () => {
    if (selectedReceipts.size === 0) return;

    const confirmMessage = `選択した${selectedReceipts.size}件の領収書を削除してもよろしいですか？この操作は取り消せません。`;
    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const promises = Array.from(selectedReceipts).map(receiptId =>
        fetch(`/api/receipts/${receiptId}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.allSettled(promises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;

      if (failedCount > 0) {
        alert(`${successCount}件削除成功、${failedCount}件削除失敗`);
      }

      // 一覧を再取得
      await fetchReceipts();

      // 選択をクリア
      setSelectedReceipts(new Set());

      logger.info(`Bulk delete completed: ${successCount} success, ${failedCount} failed`);
    } catch (error) {
      logger.error('Error in bulk delete:', error);
      alert('一括削除に失敗しました');
    } finally {
      setIsDeleting(false);
    }
  };

  // 並び替えのトグル
  const toggleSort = (field: 'issueDate' | 'totalAmount' | 'issuerName') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // 並び替えアイコンの取得
  const getSortIcon = (field: 'issueDate' | 'totalAmount' | 'issuerName') => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const getStatusBadge = (status: keyof typeof RECEIPT_STATUS_LABELS) => {
    return (
      <Badge className={`${RECEIPT_STATUS_COLORS[status]} border-0`}>
        {RECEIPT_STATUS_LABELS[status]}
      </Badge>
    );
  };

  const handleDelete = async (receiptId: string) => {
    if (!confirm('この領収書を削除してもよろしいですか？この操作は取り消せません。')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/receipts/${receiptId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete receipt');
      }

      // 領収書リストから削除
      setReceipts(prev => prev.filter(receipt => receipt._id !== receiptId));
      // 総数を減らす
      setTotalCount(prev => prev - 1);

      logger.info(`Receipt ${receiptId} deleted successfully`);
    } catch (error) {
      logger.error('Error deleting receipt:', error);
      alert('領収書の削除に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  // サーバー側でフィルタリングするため、filteredReceiptsはreceiptsをそのまま使用
  const filteredReceipts = receipts;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">領収書管理</h1>
          <p className="text-muted-foreground">
            発行した領収書と受領した領収書の管理
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* ScanSnapで直接スキャン */}
          <ScanSnapButton
            onScanComplete={handleScanSnapComplete}
            onError={handleScanSnapError}
          />
          {activeTab === 'scanned' && (
            <Button
              onClick={handleProcessScan}
              disabled={isProcessing || pendingPdfCount === 0}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Scan className="h-4 w-4" />
              )}
              {isProcessing ? '処理中...' : `フォルダ処理 (${pendingPdfCount}件)`}
            </Button>
          )}
          <Button
            onClick={() => router.push('/receipts/new')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            新しい領収書
          </Button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabType)}>
        <TabsList>
          <TabsTrigger value="all">すべて</TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            発行領収書
          </TabsTrigger>
          <TabsTrigger value="scanned" className="flex items-center gap-1">
            <Scan className="h-4 w-4" />
            受領領収書
            {pendingPdfCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                {pendingPdfCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* スキャン処理結果 */}
      {processingResult && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              <span>
                スキャン処理完了: {processingResult.total}件中 {processingResult.success}件成功
                {processingResult.failed > 0 && `、${processingResult.failed}件失敗`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProcessingResult(null)}
                className="ml-auto"
              >
                ×
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ScanSnapスキャン結果 */}
      {scanSnapResult && scanSnapResult.success && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-800">
                <ScanLine className="h-5 w-5" />
                <div>
                  <span className="font-medium">ScanSnapスキャン完了</span>
                  <span className="ml-2">
                    領収書番号: {scanSnapResult.receiptNumber}
                  </span>
                  {scanSnapResult.extractedData && (
                    <span className="ml-2 text-sm">
                      ¥{scanSnapResult.extractedData.totalAmount?.toLocaleString() || 0}
                      {scanSnapResult.extractedData.issuerName && ` (${scanSnapResult.extractedData.issuerName})`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => scanSnapResult.receiptId && router.push(`/receipts/${scanSnapResult.receiptId}`)}
                >
                  詳細を見る
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScanSnapResult(null)}
                >
                  ×
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 処理待ちPDFの情報（スキャン済みタブのみ表示） */}
      {activeTab === 'scanned' && pendingPdfCount > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-800">
                <FolderInput className="h-5 w-5" />
                <span>
                  {pendingPdfCount}件のPDFが処理待ちです
                </span>
              </div>
              <Button
                onClick={handleProcessScan}
                disabled={isProcessing}
                size="sm"
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Scan className="h-4 w-4" />
                )}
                OCR処理を開始
              </Button>
            </div>
            {pendingPdfFiles.length > 0 && (
              <div className="mt-2 text-sm text-blue-700">
                ファイル: {pendingPdfFiles.slice(0, 5).join(', ')}
                {pendingPdfFiles.length > 5 && ` 他${pendingPdfFiles.length - 5}件`}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 一括操作 */}
      {selectedReceipts.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-blue-800">
                {selectedReceipts.size}件選択中
              </span>

              <div className="flex items-center gap-2">
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="ステータス変更" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">下書き</SelectItem>
                    <SelectItem value="issued">発行済み</SelectItem>
                    <SelectItem value="sent">送信済み</SelectItem>
                    <SelectItem value="cancelled">キャンセル</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleBulkStatusChange}
                  disabled={!bulkStatus || isUpdating}
                  size="sm"
                  variant="outline"
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    '一括更新'
                  )}
                </Button>
              </div>

              <div className="h-6 w-px bg-gray-300" />

              {/* 一括削除ボタン */}
              <Button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                size="sm"
                variant="destructive"
                className="flex items-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    一括削除
                  </>
                )}
              </Button>

              {/* 選択解除ボタン */}
              <Button
                onClick={() => setSelectedReceipts(new Set())}
                size="sm"
                variant="ghost"
                className="ml-auto"
              >
                選択解除
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総領収書数</CardTitle>
            <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">発行済み</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {receipts.filter(r => r.status === 'issued').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">送信済み</CardTitle>
            <FileDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {receipts.filter(r => r.status === 'sent').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総金額</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ¥{receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* フィルターバー */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* 上段: 検索と基本フィルター */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="領収書番号、発行元、請求書番号で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="ステータス" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全ステータス</SelectItem>
                  <SelectItem value="draft">下書き</SelectItem>
                  <SelectItem value="issued">発行済み</SelectItem>
                  <SelectItem value="sent">送信済み</SelectItem>
                  <SelectItem value="cancelled">キャンセル</SelectItem>
                </SelectContent>
              </Select>

              {/* 並び替え */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [field, order] = value.split('-') as ['issueDate' | 'totalAmount' | 'issuerName', 'asc' | 'desc'];
                setSortBy(field);
                setSortOrder(order);
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-48">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="並び替え" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="issueDate-desc">発行日（新しい順）</SelectItem>
                  <SelectItem value="issueDate-asc">発行日（古い順）</SelectItem>
                  <SelectItem value="totalAmount-desc">金額（高い順）</SelectItem>
                  <SelectItem value="totalAmount-asc">金額（低い順）</SelectItem>
                  <SelectItem value="issuerName-asc">発行元（A→Z）</SelectItem>
                  <SelectItem value="issuerName-desc">発行元（Z→A）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 下段: 詳細フィルター */}
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              {/* 勘定科目フィルター（受領領収書タブまたはすべてタブ時のみ表示） */}
              {(activeTab === 'scanned' || activeTab === 'all') && (
                <div className="w-48">
                  <label className="text-xs text-muted-foreground mb-1 block">勘定科目</label>
                  <Select value={accountCategoryFilter} onValueChange={setAccountCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="勘定科目" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全勘定科目</SelectItem>
                      {ACCOUNT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.code} value={cat.code}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* 金額範囲フィルター */}
              <div className="flex items-end gap-2">
                <div className="w-32">
                  <label className="text-xs text-muted-foreground mb-1 block">金額（最小）</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                  />
                </div>
                <span className="pb-2 text-muted-foreground">〜</span>
                <div className="w-32">
                  <label className="text-xs text-muted-foreground mb-1 block">金額（最大）</label>
                  <Input
                    type="number"
                    placeholder="上限なし"
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                  />
                </div>
              </div>

              {/* フィルタークリアボタン */}
              {(accountCategoryFilter !== 'all' || amountMin || amountMax || statusFilter !== 'all' || searchTerm) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setAccountCategoryFilter('all');
                    setAmountMin('');
                    setAmountMax('');
                    setStatusFilter('all');
                    setSearchTerm('');
                    setCurrentPage(1);
                  }}
                  className="text-muted-foreground"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  フィルターをクリア
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 領収書一覧テーブル */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ReceiptIcon className="h-5 w-5" />
            領収書一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              領収書が見つかりません
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedReceipts.size === filteredReceipts.length && filteredReceipts.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>領収書番号</TableHead>
                  <TableHead>発行元</TableHead>
                  <TableHead>発行日</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>勘定科目</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow key={receipt._id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedReceipts.has(receipt._id)}
                        onCheckedChange={(checked) =>
                          handleSelectReceipt(receipt._id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell
                      className="font-medium"
                      onClick={() => router.push(`/receipts/${receipt._id}`)}
                    >
                      <div className="flex items-center gap-2">
                        {receipt.receiptNumber}
                        {receipt.scannedFromPdf && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                            <Scan className="h-3 w-3 mr-0.5" />
                            スキャン
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      <div className="max-w-[200px] truncate" title={receipt.scannedFromPdf ? receipt.issuerName : receipt.customerName}>
                        {receipt.scannedFromPdf ? receipt.issuerName || '（不明）' : receipt.customerName}
                      </div>
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      {safeFormatDate(receipt.issueDate, 'yyyy/MM/dd', ja)}
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      ¥{receipt.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      {receipt.accountCategory ? (
                        <Badge
                          variant="outline"
                          className={`text-xs ${receipt.accountCategoryConfidence && receipt.accountCategoryConfidence >= 0.8 ? 'border-green-500 text-green-700' : 'border-yellow-500 text-yellow-700'}`}
                        >
                          {receipt.accountCategory}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => router.push(`/receipts/${receipt._id}`)}>
                      <Select
                        value={receipt.status}
                        onValueChange={(value) => handleStatusChange(receipt._id, value)}
                      >
                        <SelectTrigger
                          className="w-28 h-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {getStatusBadge(receipt.status)}
                        </SelectTrigger>
                        <SelectContent onClick={(e) => e.stopPropagation()}>
                          <SelectItem value="draft">下書き</SelectItem>
                          <SelectItem value="issued">発行済み</SelectItem>
                          <SelectItem value="sent">送信済み</SelectItem>
                          <SelectItem value="cancelled">キャンセル</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/receipts/${receipt._id}/edit`)}
                        >
                          編集
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(receipt._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                {totalCount}件中 {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalCount)}件を表示
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  前へ
                </Button>
                <div className="text-sm">
                  {currentPage} / {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  次へ
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}