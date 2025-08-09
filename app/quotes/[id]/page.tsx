'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logger } from '@/lib/logger';
import { 
  ArrowLeft, 
  Download, 
  Edit, 
  Trash2, 
  Calculator, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  AlertCircle,
  Eye,
  X,
  MessageSquare,
  Send,
  FileDown,
  Package,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Quote, QuoteStatus } from '@/types/collections';
import { safeFormatDate } from '@/lib/date-utils';
import EmailSendModal from '@/components/email-send-modal';
import SimpleQuoteOcrFiles from '@/components/simple-quote-ocr-files';

const statusLabels: Record<QuoteStatus, string> = {
  draft: '下書き',
  sent: '送信済み',
  saved: '保存済み',
  accepted: '承認済み',
  rejected: '拒否',
  expired: '期限切れ',
  converted: '請求書変換済み',
};

const statusColors: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  saved: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
  converted: 'bg-purple-100 text-purple-800',
};

interface QuoteDetailPageProps {
  params: { id: string };
}

export default function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    fetchQuote();
  }, [params.id]);

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/quotes/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch quote');
      }
      const data = await response.json();
      setQuote(data);
    } catch (error) {
      logger.error('Error fetching quote:', error);
      setError('見積書の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuoteStatus = async (newStatus: QuoteStatus) => {
    if (!quote) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/quotes/${quote._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          [newStatus === 'accepted' ? 'acceptedDate' : 
           newStatus === 'rejected' ? 'rejectedDate' : 
           newStatus === 'expired' ? 'expiredDate' : null]: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const updatedQuote = await response.json();
        setQuote(updatedQuote);
      } else {
        throw new Error('ステータス更新に失敗しました');
      }
    } catch (error) {
      logger.error('Error updating quote status:', error);
      alert('ステータスの更新に失敗しました');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // ステータス変更の確認が必要かチェック
  const needsConfirmation = (currentStatus: QuoteStatus, newStatus: QuoteStatus): boolean => {
    // 承認済み・保存済みから下書きに戻す場合は確認が必要
    if ((currentStatus === 'accepted' || currentStatus === 'saved') && newStatus === 'draft') {
      return true;
    }
    // 承認済みから保存済み・拒否・期限切れに変更する場合も確認が必要
    if (currentStatus === 'accepted' && ['saved', 'rejected', 'expired'].includes(newStatus)) {
      return true;
    }
    return false;
  };

  // ステータス変更ハンドラー
  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!quote || newStatus === quote.status) return;
    
    if (needsConfirmation(quote.status, newStatus)) {
      const confirmMessage = `見積書のステータスを「${statusLabels[quote.status]}」から「${statusLabels[newStatus]}」に変更しますか？\n\n※この操作は重要な変更です。本当に変更してもよろしいですか？`;
      if (confirm(confirmMessage)) {
        await updateQuoteStatus(newStatus);
      }
    } else {
      await updateQuoteStatus(newStatus);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quote) return;

    if (!confirm('この見積書を請求書に変換しますか？')) {
      return;
    }

    setIsConverting(true);
    try {
      const response = await fetch(`/api/quotes/${quote._id}/convert-to-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        alert('請求書への変換が完了しました！');
        fetchQuote(); // 見積書データを再読み込み
        if (confirm('作成された請求書を確認しますか？')) {
          router.push(`/invoices/${data._id}`);
        }
      } else {
        throw new Error(data.details || data.error || '変換に失敗しました');
      }
    } catch (error) {
      logger.error('Error converting quote to invoice:', error);
      alert(`変換エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsConverting(false);
    }
  };

  // 納品書への変換処理
  const handleConvertToDeliveryNote = async () => {
    if (!quote) return;
    if (!confirm('この見積書の内容で納品書を作成しますか？')) {
      return;
    }
    setIsConverting(true);
    try {
      const response = await fetch(`/api/quotes/${quote._id}/convert-to-delivery-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (response.ok) {
        alert('納品書の作成が完了しました！\n\n作成された納品書は下書き状態です。必要に応じて納品日や納品先などの情報を編集してください。');
        fetchQuote(); // 見積書データを再読み込み
        if (confirm('作成された納品書を確認しますか？')) {
          router.push(`/delivery-notes/${data._id}`);
        }
      } else {
        throw new Error(data.details || data.error || '変換に失敗しました');
      }
    } catch (error) {
      logger.error('Error converting quote to delivery note:', error);
      alert(`変換エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!quote) return;

    if (!confirm('この見積書をキャンセルしてもよろしいですか？')) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/quotes/${quote._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel quote');
      }

      router.push('/quotes');
    } catch (error) {
      logger.error('Error cancelling quote:', error);
      setError('見積書のキャンセルに失敗しました');
    } finally {
      setIsUpdatingStatus(false);
    }
  };


  const handleDownloadPdf = async () => {
    if (!quote) return;
    
    try {
      const response = await fetch(`/api/quotes/${quote._id}/pdf`);
      if (!response.ok) {
        throw new Error('PDFの生成に失敗しました');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `見積書_${quote.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error('PDFダウンロードエラー:', error);
      alert('PDFのダウンロードに失敗しました');
    }
  };

  const getStatusBadge = (status: QuoteStatus) => {
    return (
      <Badge className={`${statusColors[status]} border-0`}>
        {statusLabels[status]}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || '見積書が見つかりません'}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/quotes')}>
          見積書一覧に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/quotes')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            見積書一覧
          </Button>
          <h1 className="text-3xl font-bold">見積書詳細</h1>
        </div>
        <div className="flex gap-2">
          {/* 編集ボタン（承認済み・請求書変換済み以外） */}
          {quote.status !== 'accepted' && quote.status !== 'converted' && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/quotes/${quote._id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                編集
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/quotes/${quote._id}/edit?mode=ai`)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                AI会話で編集
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setShowPdfPreview(true)}
          >
            <Eye className="mr-2 h-4 w-4" />
            プレビュー
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // 新しいウィンドウを開いて印刷ダイアログを表示
              const printWindow = window.open(`/api/quotes/${quote._id}/pdf?print=true`, '_blank', 'width=800,height=600');
              if (printWindow) {
                printWindow.focus();
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF印刷
          </Button>
          {/* HTML見積書ボタン */}
          <Button
            variant="outline"
            onClick={() => router.push(`/quotes/${quote._id}/html-editor`)}
            className="bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200"
          >
            <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
            HTML見積書
          </Button>
          {/* メール送信ボタン */}
          <Button
            variant="outline"
            onClick={() => setShowEmailModal(true)}
          >
            <Send className="mr-2 h-4 w-4" />
            メール送信
          </Button>
          {quote.status === 'draft' && (
            <Button
              onClick={() => updateQuoteStatus('saved')}
              disabled={isUpdatingStatus}
            >
              <Send className="mr-2 h-4 w-4" />
              保存済みにする
            </Button>
          )}
          {quote.status === 'saved' && (
            <Button
              variant="default"
              onClick={() => updateQuoteStatus('accepted')}
              disabled={isUpdatingStatus}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              承認済みにする
            </Button>
          )}
          {quote.status === 'accepted' && !quote.convertedToInvoiceId && (
            <Button
              onClick={handleConvertToInvoice}
              disabled={isConverting}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isConverting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  変換中...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  請求書に変換
                </>
              )}
            </Button>
          )}
          {/* 納品書作成ボタン */}
          {['sent', 'saved', 'accepted'].includes(quote.status) && (
            <Button
              variant="outline"
              onClick={handleConvertToDeliveryNote}
              disabled={isConverting}
              className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700"
            >
              {isConverting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  変換中...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  納品書作成
                </>
              )}
            </Button>
          )}
          {['draft', 'saved'].includes(quote.status) && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isUpdatingStatus}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
          )}
        </div>
      </div>

      {/* 仕入先見積書との関連情報 */}
      {quote.sourceSupplierQuoteId && quote.sourceSupplierQuote && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Package className="h-5 w-5" />
              仕入先見積書から作成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm">
                <span className="font-medium">見積書番号:</span>{' '}
                <a
                  href={`/supplier-quotes/${quote.sourceSupplierQuoteId}`}
                  className="text-green-600 hover:text-green-800 underline"
                >
                  {quote.sourceSupplierQuote.quoteNumber}
                </a>
              </p>
              <p className="text-sm">
                <span className="font-medium">仕入先:</span> {quote.sourceSupplierQuote.supplier?.companyName || quote.sourceSupplierQuote.vendorName || '未設定'}
              </p>
              <p className="text-sm">
                <span className="font-medium">原価:</span> ¥{(quote.costAmount || 0).toLocaleString()}
              </p>
              <div className="mt-4 p-3 bg-white rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-700 mb-1">利益計算</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-gray-600">売価:</span> ¥{(quote.totalAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">利益額:</span> ¥{(quote.profitAmount || 0).toLocaleString()}
                  </p>
                  <p className="text-sm">
                    <span className="text-gray-600">利益率:</span> {(quote.profitMargin || 0).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 見積書情報 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{quote.quoteNumber}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-4">
                  <Badge className={`${statusColors[quote.status]} border-0`}>
                    {statusLabels[quote.status]}
                  </Badge>
                  {quote.status !== 'converted' && (
                    <Select 
                      value={quote.status} 
                      onValueChange={handleStatusChange}
                      disabled={isUpdatingStatus}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">下書き</SelectItem>
                        <SelectItem value="sent">送信済み</SelectItem>
                        <SelectItem value="saved">保存済み</SelectItem>
                        <SelectItem value="accepted">承認済み</SelectItem>
                        <SelectItem value="rejected">拒否</SelectItem>
                        <SelectItem value="expired">期限切れ</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {quote.convertedToInvoiceId && (
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push(`/invoices/${quote.convertedToInvoiceId}`)}
                    className="p-0 h-auto"
                  >
                    変換された請求書を表示
                  </Button>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">発行日</p>
              <p className="font-medium">
                {safeFormatDate(quote.issueDate, 'yyyy年MM月dd日')}
              </p>
              <p className="text-sm text-gray-600 mt-2">有効期限</p>
              <p className="font-medium">
                {safeFormatDate(quote.validityDate, 'yyyy年MM月dd日')}
              </p>
              {new Date(quote.validityDate) < new Date() && quote.status !== 'expired' && quote.status !== 'accepted' && quote.status !== 'rejected' && quote.status !== 'converted' && (
                <Badge className="mt-2 bg-orange-100 text-orange-800 border-0">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  期限切れ
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* 見積先 */}
            <div>
              <h3 className="font-semibold mb-2">見積先</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{quote.customer?.companyName || '顧客未設定'}</p>
                {quote.customer?.contacts?.[0]?.name && (
                  <p>{quote.customer.contacts[0].name} 様</p>
                )}
                {(quote.customer?.prefecture || quote.customer?.city || quote.customer?.address1) && (
                  <p>
                    {quote.customer.postalCode && `〒${quote.customer.postalCode} `}
                    {quote.customer.prefecture}
                    {quote.customer.city}
                    {quote.customer.address1}
                    {quote.customer.address2}
                  </p>
                )}
                {quote.customer?.phone && (
                  <p>TEL: {quote.customer.phone}</p>
                )}
                {quote.customer?.email && (
                  <p>Email: {quote.customer.email}</p>
                )}
              </div>
            </div>

            {/* 見積元（自社情報）*/}
            <div>
              <h3 className="font-semibold mb-2">見積元</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{quote.companySnapshot?.companyName || '会社名未設定'}</p>
                {quote.companySnapshot?.address && (
                  <p>{quote.companySnapshot.address}</p>
                )}
                {quote.companySnapshot?.phone && (
                  <p>TEL: {quote.companySnapshot.phone}</p>
                )}
                {quote.companySnapshot?.email && (
                  <p>Email: {quote.companySnapshot.email}</p>
                )}
                {quote.companySnapshot?.invoiceRegistrationNumber && (
                  <p>登録番号: {quote.companySnapshot.invoiceRegistrationNumber}</p>
                )}
                {/* 社印 */}
                {quote.companySnapshot?.stampImage && (
                  <div className="mt-4">
                    <img 
                      src={quote.companySnapshot.stampImage} 
                      alt="社印" 
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* 明細 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">見積明細</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 border border-gray-200">品目</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 border border-gray-200 w-24">数量</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border border-gray-200 w-32">単価</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border border-gray-200 w-32">小計</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border border-gray-200 w-32">消費税</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border border-gray-200 w-40">金額（税込）</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border border-gray-200">
                        <div>
                          <div className="font-medium">{item.itemName}</div>
                          {item.description && (
                            <div className="text-sm text-gray-600">{item.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 border border-gray-200">{item.quantity}</td>
                      <td className="text-right py-3 px-4 border border-gray-200 font-mono">¥{(item.unitPrice || 0).toLocaleString()}</td>
                      <td className="text-right py-3 px-4 border border-gray-200 font-mono">¥{(item.amount || 0).toLocaleString()}</td>
                      <td className="text-right py-3 px-4 border border-gray-200 font-mono text-sm text-gray-600">¥{(item.taxAmount || 0).toLocaleString()}</td>
                      <td className="text-right py-3 px-4 border border-gray-200 font-medium">¥{((item.amount || 0) + (item.taxAmount || 0)).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Separator className="my-6" />

          {/* 合計 */}
          <div className="flex justify-end">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 min-w-[300px]">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">小計:</span>
                  <span className="text-lg font-mono">¥{(quote.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">消費税:</span>
                  <span className="text-lg font-mono">¥{(quote.taxAmount || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">見積金額合計:</span>
                    <span className="text-2xl font-bold text-blue-600">¥{(quote.totalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />
        </CardContent>
      </Card>

      {/* OCRファイル */}
      <div className="mb-6">
        <SimpleQuoteOcrFiles 
          quoteId={quote._id || ''} 
          files={quote.ocrFiles || []}
          onUpdate={fetchQuote}
        />
      </div>

      {/* その他情報 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-6">
            {quote.notes && (
              <div>
                <h3 className="font-semibold mb-2">備考</h3>
                <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
            <div>
              <h3 className="font-semibold mb-2">ステータス履歴</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-800 border-0 text-xs">作成</Badge>
                  <span className="text-gray-600">
                    {safeFormatDate(quote.createdAt, 'yyyy年MM月dd日')}
                  </span>
                </div>
                {quote.acceptedDate && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 border-0 text-xs">承認</Badge>
                    <span className="text-gray-600">
                      {safeFormatDate(quote.acceptedDate, 'yyyy年MM月dd日')}
                    </span>
                  </div>
                )}
                {quote.rejectedDate && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 text-red-800 border-0 text-xs">拒否</Badge>
                    <span className="text-gray-600">
                      {safeFormatDate(quote.rejectedDate, 'yyyy年MM月dd日')}
                    </span>
                  </div>
                )}
                {quote.expiredDate && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-100 text-orange-800 border-0 text-xs">期限切れ</Badge>
                    <span className="text-gray-600">
                      {safeFormatDate(quote.expiredDate, 'yyyy年MM月dd日')}
                    </span>
                  </div>
                )}
                {quote.convertedToInvoiceDate && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-800 border-0 text-xs">請求書変換</Badge>
                    <span className="text-gray-600">
                      {safeFormatDate(quote.convertedToInvoiceDate, 'yyyy年MM月dd日')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDFプレビューモーダル */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">見積書プレビュー</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPdfPreview(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`/api/quotes/${quote._id}/pdf`}
                className="w-full h-full"
                title="見積書PDFプレビュー"
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPdfPreview(false)}
              >
                閉じる
              </Button>
              <Button
                onClick={() => {
                  window.open(`/api/quotes/${quote._id}/pdf?download=true`, '_blank');
                  setShowPdfPreview(false);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                ダウンロード
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* メール送信モーダル */}
      <EmailSendModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        documentType="quote"
        documentId={quote._id || ''}
        documentNumber={quote.quoteNumber}
        documentTitle={quote.title}
        customerEmail={quote.customer?.email}
        customerName={quote.customer?.companyName}
        customer={quote.customer}
        customerSnapshot={quote.customerSnapshot}
        totalAmount={quote.totalAmount}
        dueDate={quote.validityDate}
        onSuccess={fetchQuote}
      />

    </div>
  );
}