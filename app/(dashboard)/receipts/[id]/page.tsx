'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Printer,
  FileText,
  Loader2,
  Edit,
  X,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import EmailSendModal from '@/components/email-send-modal';

interface ReceiptItem {
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  amount: number;
}

interface Receipt {
  _id: string;
  receiptNumber: string;
  invoiceNumber?: string;
  invoiceId?: string;
  customerName: string;
  customerAddress?: string;
  issuerName: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  taxRate: number;
  items: ReceiptItem[];
  issueDate: string;
  paidDate?: string;
  subject?: string;
  notes?: string;
  status: 'draft' | 'issued' | 'sent' | 'cancelled';
  emailSentAt?: string;
  emailSentTo?: string[];
}

const RECEIPT_STATUS_LABELS = {
  draft: '下書き',
  issued: '発行済み',
  sent: '送信済み',
  cancelled: 'キャンセル',
};

const RECEIPT_STATUS_COLORS = {
  draft: 'default',
  issued: 'secondary',
  sent: 'success',
  cancelled: 'destructive',
};

export default function ReceiptDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  useEffect(() => {
    fetchReceipt();
  }, [params.id]);

  const fetchReceipt = async () => {
    try {
      const response = await fetch(`/api/receipts/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setReceipt(data);
      } else {
        logger.error('領収書の取得に失敗:', data.error);
        toast({
          title: 'エラー',
          description: '領収書の取得に失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('領収書の取得エラー:', error);
      toast({
        title: 'エラー',
        description: '領収書の取得中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = () => {
    setShowEmailModal(true);
  };

  const handleEmailSendSuccess = () => {
    setShowEmailModal(false);
    fetchReceipt(); // ステータス更新のため再取得
  };

  const handleDownloadPDF = () => {
    // 新しいウィンドウを開いて印刷ダイアログを表示（請求書と同じ方式）
    const printWindow = window.open(`/api/receipts/${params.id}/pdf?print=true`, '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const handleCancel = async () => {
    if (!confirm('この領収書をキャンセルしてもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/receipts/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (response.ok) {
        toast({
          title: '成功',
          description: '領収書をキャンセルしました',
        });
        fetchReceipt();
      } else {
        const data = await response.json();
        toast({
          title: 'エラー',
          description: data.error || '領収書のキャンセルに失敗しました',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('領収書キャンセルエラー:', error);
      toast({
        title: 'エラー',
        description: '領収書のキャンセル中にエラーが発生しました',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">領収書が見つかりません</p>
            <Button onClick={() => router.push('/receipts')} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              一覧に戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <Button onClick={() => router.push('/receipts')} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          一覧に戻る
        </Button>
        <div className="flex gap-2">
          {receipt.status !== 'cancelled' && (
            <>
              <Button onClick={() => setShowPdfPreview(true)} variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                プレビュー
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                PDF印刷
              </Button>
              <Button 
                onClick={handleSendEmail}
              >
                <Mail className="mr-2 h-4 w-4" />
                メール送信
              </Button>
              <Button onClick={handleCancel} variant="destructive">
                <X className="mr-2 h-4 w-4" />
                キャンセル
              </Button>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">領収書</CardTitle>
              <p className="text-lg font-medium mt-2">{receipt.receiptNumber}</p>
            </div>
            <Badge variant={RECEIPT_STATUS_COLORS[receipt.status] as any}>
              {RECEIPT_STATUS_LABELS[receipt.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">宛先</h3>
              <p className="text-lg font-medium">{receipt.customerName}</p>
              {receipt.customerAddress && (
                <p className="text-gray-600">{receipt.customerAddress}</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-2">発行者</h3>
              <p className="text-lg font-medium">{receipt.issuerName}</p>
              {receipt.issuerAddress && (
                <p className="text-gray-600">{receipt.issuerAddress}</p>
              )}
              {receipt.issuerPhone && (
                <p className="text-gray-600">TEL: {receipt.issuerPhone}</p>
              )}
              {receipt.issuerEmail && (
                <p className="text-gray-600">Email: {receipt.issuerEmail}</p>
              )}
            </div>
          </div>

          {/* 日付情報 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">領収日</p>
              <p className="font-medium">
                {format(new Date(receipt.issueDate), 'yyyy年MM月dd日', { locale: ja })}
              </p>
            </div>
            {receipt.invoiceNumber && (
              <div>
                <p className="text-sm text-gray-500">関連請求書</p>
                <p className="font-medium">{receipt.invoiceNumber}</p>
              </div>
            )}
            {receipt.emailSentAt && (
              <div>
                <p className="text-sm text-gray-500">メール送信日時</p>
                <p className="font-medium">
                  {format(new Date(receipt.emailSentAt), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                </p>
              </div>
            )}
          </div>

          {/* 件名 */}
          {receipt.subject && (
            <div>
              <h3 className="font-semibold mb-2">件名</h3>
              <p>{receipt.subject}</p>
            </div>
          )}

          {/* 金額情報 */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-500">領収金額</p>
              <p className="text-3xl font-bold">¥{receipt.totalAmount.toLocaleString()}</p>
            </div>
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <p className="text-sm text-gray-500">内訳</p>
                <p className="text-lg font-medium">¥{receipt.subtotal.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">{Math.round(receipt.taxRate * 100)}%消費税</p>
                <p className="text-lg font-medium">¥{receipt.taxAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* 明細 */}
          <div>
            <h3 className="font-semibold mb-2">内訳</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>摘要</TableHead>
                  <TableHead className="text-center">数量</TableHead>
                  <TableHead className="text-right">単価</TableHead>
                  <TableHead className="text-right">明細金額</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipt.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-center">
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
          </div>

          {/* 備考 */}
          {receipt.notes && (
            <div>
              <h3 className="font-semibold mb-2">備考</h3>
              <p className="whitespace-pre-wrap bg-gray-50 p-3 rounded">
                {receipt.notes}
              </p>
            </div>
          )}

          {/* 電子領収書の注記 */}
          <div className="text-center text-sm text-gray-500 border-t pt-4">
            <p>この領収書は電子的に発行されたものです。</p>
            <p>印紙税法第5条により収入印紙の貼付は不要です。</p>
          </div>
        </CardContent>
      </Card>

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
                src={`/api/receipts/${receipt._id}/pdf`}
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
                  // 印刷ダイアログを開く（請求書と同じ方式）
                  const printWindow = window.open(`/api/receipts/${receipt._id}/pdf?print=true`, '_blank', 'width=800,height=600');
                  if (printWindow) {
                    printWindow.focus();
                  }
                  setShowPdfPreview(false);
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                PDF印刷
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* メール送信モーダル（見積書と同じコンポーネント） */}
      <EmailSendModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        documentType="receipt"
        documentId={receipt._id}
        documentNumber={receipt.receiptNumber}
        documentTitle={receipt.subject}
        customerEmail={receipt.customerEmail || ''}
        customerName={receipt.customerName}
        customer={receipt.customer}
        customerSnapshot={receipt.customerSnapshot}
        totalAmount={receipt.totalAmount}
        onSuccess={handleEmailSendSuccess}
      />
    </div>
  );
}