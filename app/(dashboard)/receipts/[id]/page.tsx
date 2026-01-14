'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { logger } from '@/lib/logger';
import {
  ArrowLeft,
  Download,
  Send,
  Edit,
  Trash2,
  Receipt as ReceiptIcon,
  AlertCircle,
  Loader2,
  Eye,
  FileText,
  CheckCircle2,
  X,
  ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { safeFormatDate } from '@/lib/date-utils';
import EmailSendModal from '@/components/email-send-modal';

interface Receipt {
  _id: string;
  receiptNumber: string;
  invoiceId?: string;
  invoiceNumber?: string;
  title?: string;
  issueDate: string | Date;
  paidDate?: string | Date;
  customerId: string;
  customerName: string;
  customerAddress?: string;
  customerSnapshot?: {
    companyName: string;
    address: string;
    phone?: string;
    email?: string;
    contactName?: string;
  };
  companySnapshot: {
    companyName: string;
    address: string;
    phone?: string;
    email?: string;
    registrationNumber?: string;
  };
  // スキャン領収書の発行者情報（OCRで取得）
  scannedFromPdf?: boolean;
  issuerName?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerRegistrationNumber?: string;
  accountCategory?: string;
  accountCategoryConfidence?: number;
  scanMetadata?: {
    originalFileName: string;
    processedAt: string;
    visionModelUsed: string;
  };
  items: Array<{
    itemName?: string;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    amount: number;
    taxType?: 'taxable' | 'non-taxable' | 'tax-exempt';
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  status: 'draft' | 'issued' | 'sent' | 'cancelled';
  subject?: string;
  notes?: string;
  issuerStamp?: string;
  emailSentAt?: string;
  emailSentTo?: string[];
  pdfUrl?: string;
  pdfGeneratedAt?: string;
  imageUrl?: string; // R2にアップロードされたスキャン画像（WEBP）
  imageUploadedAt?: string;
  invoice?: {
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
    status: string;
  };
}

const statusLabels: Record<string, string> = {
  draft: '下書き',
  issued: '発行済み',
  sent: '送信済み',
  cancelled: 'キャンセル',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  issued: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showOriginalPdf, setShowOriginalPdf] = useState(false);
  const [originalFileError, setOriginalFileError] = useState(false);

  useEffect(() => {
    fetchReceipt();
  }, [params.id]);

  const fetchReceipt = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/receipts/${params.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          router.push('/receipts');
          return;
        }
        throw new Error('Failed to fetch receipt');
      }

      const data = await response.json();
      setReceipt(data);
    } catch (error) {
      logger.error('Error fetching receipt:', error);
      alert('領収書の取得に失敗しました');
      router.push('/receipts');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!receipt) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/receipts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const updatedReceipt = await response.json();
        setReceipt(updatedReceipt);
        logger.info(`Receipt status changed to ${newStatus}`);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (error) {
      logger.error('Error updating receipt status:', error);
      alert('ステータスの更新に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!receipt) return;

    if (!confirm(`領収書 ${receipt.receiptNumber} を削除してもよろしいですか？この操作は取り消せません。`)) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/receipts/${params.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        logger.info('Receipt deleted successfully');
        router.push('/receipts');
      } else {
        throw new Error('Failed to delete receipt');
      }
    } catch (error) {
      logger.error('Error deleting receipt:', error);
      alert('領収書の削除に失敗しました');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">領収書が見つかりません</h2>
          <Button onClick={() => router.push('/receipts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            領収書一覧に戻る
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => (
    <Badge className={`${statusColors[status]} border-0`}>
      {statusLabels[status]}
    </Badge>
  );

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/receipts')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            領収書一覧に戻る
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ReceiptIcon className="h-8 w-8" />
              領収書 {receipt.receiptNumber}
            </h1>
            <p className="text-muted-foreground">
              発行日: {safeFormatDate(receipt.issueDate, 'yyyy年MM月dd日', ja)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(receipt.status)}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/receipts/${params.id}/edit`)}
          disabled={updating}
        >
          <Edit className="h-4 w-4 mr-2" />
          編集
        </Button>

        {/* プレビューボタン: 発行領収書→PDF、受領領収書→スキャン画像/元PDF */}
        {receipt.scannedFromPdf ? (
          receipt.imageUrl ? (
            <Button
              variant="outline"
              onClick={() => setShowImageModal(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              プレビュー
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowOriginalPdf(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              プレビュー
            </Button>
          )
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowPdfPreview(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            プレビュー
          </Button>
        )}

        {receipt.status === 'draft' && (
          <Button
            onClick={() => handleStatusChange('issued')}
            disabled={updating}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            発行
          </Button>
        )}

        {receipt.status === 'issued' && (
          <Button
            onClick={() => handleStatusChange('sent')}
            disabled={updating}
          >
            <Send className="h-4 w-4 mr-2" />
            送信済みにする
          </Button>
        )}

        <Button
          variant="outline"
          onClick={() => {
            // 新しいウィンドウを開いて印刷ダイアログを表示
            const printWindow = window.open(`/api/receipts/${params.id}/pdf?print=true`, '_blank', 'width=800,height=600');
            if (printWindow) {
              printWindow.focus();
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          PDF出力
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowEmailModal(true)}
        >
          <Send className="h-4 w-4 mr-2" />
          メール送信
        </Button>

        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={updating}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          削除
        </Button>
      </div>

      {/* 関連請求書 */}
      {receipt.invoice && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              この領収書は請求書
              <Button
                variant="link"
                className="h-auto p-1 text-blue-600"
                onClick={() => router.push(`/invoices/${receipt.invoiceId}`)}
              >
                {receipt.invoiceNumber}
              </Button>
               から作成されました
            </span>
            <Badge variant="outline">
              ¥{receipt.invoice.totalAmount.toLocaleString()}
            </Badge>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メイン情報 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle>基本情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">領収書番号</label>
                  <p className="font-mono">{receipt.receiptNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ステータス</label>
                  <div>{getStatusBadge(receipt.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">発行日</label>
                  <p>{safeFormatDate(receipt.issueDate, 'yyyy年MM月dd日', ja)}</p>
                </div>
                {receipt.paidDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">支払日</label>
                    <p>{safeFormatDate(receipt.paidDate, 'yyyy年MM月dd日', ja)}</p>
                  </div>
                )}
              </div>

              {receipt.subject && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">但し書き</label>
                  <p>{receipt.subject}</p>
                </div>
              )}

              {receipt.title && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">件名</label>
                  <p>{receipt.title}</p>
                </div>
              )}

              {receipt.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">備考</label>
                  <p className="whitespace-pre-wrap">{receipt.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 明細 */}
          <Card>
            <CardHeader>
              <CardTitle>明細</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>項目名</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead className="text-right">単価</TableHead>
                    <TableHead className="text-right">金額</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(receipt.items || []).map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.itemName || item.description}</div>
                          {item.itemName && item.description && item.itemName !== item.description && (
                            <div className="text-sm text-muted-foreground">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity} {item.unit || '個'}
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{item.unitPrice.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        ¥{item.amount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              {/* 合計金額 */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>小計</span>
                  <span>¥{receipt.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>消費税 ({Math.round(receipt.taxRate * 100)}%)</span>
                  <span>¥{receipt.taxAmount.toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>合計金額</span>
                  <span>¥{receipt.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* 宛先情報 - 手動作成のみ表示（スキャン領収書では不要） */}
          {!receipt.scannedFromPdf && (
            <Card>
              <CardHeader>
                <CardTitle>宛先情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">宛名</label>
                  <p className="font-medium">{receipt.customerName}</p>
                </div>
                {receipt.customerSnapshot && (
                  <>
                    {receipt.customerSnapshot.address && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">住所</label>
                        <p className="text-sm whitespace-pre-wrap">{receipt.customerSnapshot.address}</p>
                      </div>
                    )}
                    {receipt.customerSnapshot.phone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">電話番号</label>
                        <p className="text-sm">{receipt.customerSnapshot.phone}</p>
                      </div>
                    )}
                    {receipt.customerSnapshot.email && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">メールアドレス</label>
                        <p className="text-sm">{receipt.customerSnapshot.email}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* 発行者情報 - スキャン領収書と手動作成で表示を切り替え */}
          <Card>
            <CardHeader>
              <CardTitle>
                {receipt.scannedFromPdf ? '発行元（店舗/取引先）' : '発行者情報（自社）'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {receipt.scannedFromPdf ? (
                // スキャン領収書：OCRで読み取った店舗情報を表示
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">店舗名/会社名</label>
                    <p className="font-medium">{receipt.issuerName || '（不明）'}</p>
                  </div>
                  {receipt.issuerAddress && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">住所</label>
                      <p className="text-sm whitespace-pre-wrap">{receipt.issuerAddress}</p>
                    </div>
                  )}
                  {receipt.issuerPhone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">電話番号</label>
                      <p className="text-sm">{receipt.issuerPhone}</p>
                    </div>
                  )}
                  {receipt.issuerRegistrationNumber && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">登録番号</label>
                      <p className="text-sm font-mono">{receipt.issuerRegistrationNumber}</p>
                    </div>
                  )}
                  {receipt.accountCategory && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">勘定科目</label>
                      <Badge
                        variant="outline"
                        className={`text-xs ${receipt.accountCategoryConfidence && receipt.accountCategoryConfidence >= 0.8 ? 'border-green-500 text-green-700' : 'border-yellow-500 text-yellow-700'}`}
                      >
                        {receipt.accountCategory}
                      </Badge>
                    </div>
                  )}
                  {receipt.scanMetadata && (
                    <div className="pt-2 border-t">
                      <label className="text-sm font-medium text-muted-foreground">スキャン情報</label>
                      <p className="text-xs text-muted-foreground">
                        {receipt.scanMetadata.originalFileName}
                        <br />
                        処理: {safeFormatDate(receipt.scanMetadata.processedAt, 'yyyy/MM/dd HH:mm', ja)}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                // 手動作成：自社情報を表示
                <>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">会社名</label>
                    <p className="font-medium">{receipt.companySnapshot.companyName}</p>
                  </div>
                  {receipt.companySnapshot.address && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">住所</label>
                      <p className="text-sm whitespace-pre-wrap">{receipt.companySnapshot.address}</p>
                    </div>
                  )}
                  {receipt.companySnapshot.phone && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">電話番号</label>
                      <p className="text-sm">{receipt.companySnapshot.phone}</p>
                    </div>
                  )}
                  {receipt.companySnapshot.email && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">メールアドレス</label>
                      <p className="text-sm">{receipt.companySnapshot.email}</p>
                    </div>
                  )}
                  {receipt.companySnapshot.registrationNumber && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">登録番号</label>
                      <p className="text-sm font-mono">{receipt.companySnapshot.registrationNumber}</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* メール送信履歴 */}
          {receipt.emailSentAt && (
            <Card>
              <CardHeader>
                <CardTitle>送信履歴</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm">送信済み</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {safeFormatDate(receipt.emailSentAt, 'yyyy/MM/dd HH:mm', ja)}
                  </p>
                  {receipt.emailSentTo && receipt.emailSentTo.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">送信先: </span>
                      {receipt.emailSentTo.join(', ')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* PDFプレビューモーダル */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">領収書プレビュー</h2>
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
                src={`/api/receipts/${receipt?._id}/pdf`}
                className="w-full h-full"
                title="領収書PDFプレビュー"
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
                  window.open(`/api/receipts/${receipt?._id}/pdf?download=true`, '_blank');
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

      {/* 画像表示モーダル */}
      {showImageModal && receipt?.imageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">領収書画像 - {receipt.receiptNumber}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowImageModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <img
                src={receipt.imageUrl}
                alt={`領収書 ${receipt.receiptNumber}`}
                className="w-full h-auto rounded-lg border"
              />
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImageModal(false)}
              >
                閉じる
              </Button>
              <Button
                onClick={() => {
                  window.open(receipt.imageUrl, '_blank');
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                新しいタブで開く
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 元のPDF表示モーダル */}
      {showOriginalPdf && receipt?.scanMetadata?.originalFileName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">元の領収書 - {receipt.scanMetadata.originalFileName}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowOriginalPdf(false); setOriginalFileError(false); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden flex items-center justify-center">
              {originalFileError ? (
                <div className="text-center p-8">
                  <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700">元のファイルが見つかりません</p>
                  <p className="text-sm text-gray-500 mt-2">
                    この領収書はR2アップロード機能実装前に作成されたため、<br />
                    元の画像データが保存されていません。
                  </p>
                  <p className="text-sm text-gray-500 mt-4">
                    新しくスキャンした領収書は自動的に画像が保存されます。
                  </p>
                </div>
              ) : receipt.imageUrl ? (
                // R2にアップロードされた画像を表示
                <img
                  src={receipt.imageUrl}
                  alt={`元の領収書 ${receipt.receiptNumber}`}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                // ローカルファイルAPIを使用（ローカル環境のみ動作）
                <iframe
                  src={`/api/scan-receipt/file?filename=${encodeURIComponent(receipt.scanMetadata.originalFileName)}`}
                  className="w-full h-full"
                  title="元の領収書"
                  onLoad={(e) => {
                    // iframeの読み込み完了後にエラーチェック
                    try {
                      const iframe = e.target as HTMLIFrameElement;
                      const doc = iframe.contentDocument || iframe.contentWindow?.document;
                      if (doc?.body?.textContent?.includes('"error"')) {
                        setOriginalFileError(true);
                      }
                    } catch {
                      // クロスオリジンエラーの場合は無視
                    }
                  }}
                />
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowOriginalPdf(false); setOriginalFileError(false); }}
              >
                閉じる
              </Button>
              {!originalFileError && (
                <Button
                  onClick={() => {
                    // R2 URLがあればそれを使用、なければローカルファイルAPI
                    const url = receipt.imageUrl || `/api/scan-receipt/file?filename=${encodeURIComponent(receipt.scanMetadata!.originalFileName)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  新しいタブで開く
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* メール送信モーダル */}
      {receipt && (
        <EmailSendModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          documentType="receipt"
          documentId={receipt._id}
          documentNumber={receipt.receiptNumber}
          documentTitle={receipt.title}
          customerEmail={receipt.customerSnapshot?.email}
          customerName={receipt.customerSnapshot?.companyName || receipt.customerName}
          customer={receipt.customer}
          customerSnapshot={receipt.customerSnapshot}
          totalAmount={receipt.totalAmount}
          paidDate={receipt.paidDate}
          onSuccess={fetchReceipt}
        />
      )}
    </div>
  );
}