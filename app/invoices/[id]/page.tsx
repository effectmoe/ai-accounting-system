'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Sparkles,
  Loader2,
  Eye,
  X,
  MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import AIChatDialog from '@/components/ai-chat-dialog';

interface Invoice {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string | Date;
  issueDate?: string | Date;
  dueDate: string;
  customerId: string;
  customerSnapshot: {
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
    invoiceRegistrationNumber?: string;
    bankAccount?: {
      bankName: string;
      branchName: string;
      accountType: string;
      accountNumber: string;
      accountHolder: string;
    };
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate: number;
    taxAmount: number;
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paidAmount: number;
  paidDate?: string;
  notes?: string;
  isGeneratedByAI?: boolean;
  aiConversationId?: string;
}

const statusLabels: Record<string, string> = {
  draft: '下書き',
  sent: '送信済み',
  viewed: '開封済み',
  paid: '支払済み',
  partially_paid: '一部支払済み',
  overdue: '期限超過',
  cancelled: 'キャンセル',
};

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  viewed: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
  partially_paid: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: '銀行振込',
  credit_card: 'クレジットカード',
  cash: '現金',
  other: 'その他',
};

export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }
      const data = await response.json();
      setInvoice(data);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      setError('請求書の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      const updatedInvoice = await response.json();
      setInvoice(updatedInvoice);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('ステータスの更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この請求書をキャンセルしてもよろしいですか？')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel invoice');
      }
      
      router.push('/invoices');
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      setError('請求書のキャンセルに失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  // AI編集完了時の処理
  const handleAIEditComplete = async (updatedData: any) => {
    setIsUpdating(true);
    try {
      // 請求書を更新
      const response = await fetch(`/api/invoices/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update invoice');
      }
      
      const updatedInvoice = await response.json();
      setInvoice(updatedInvoice);
      setShowAIChat(false);
      
      // 成功メッセージ表示（一時的）
      const tempError = error;
      setError(null);
      setTimeout(() => {
        if (!error || error === null) {
          setError(tempError);
        }
      }, 3000);
    } catch (error) {
      console.error('Error updating invoice:', error);
      setError('請求書の更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || '請求書が見つかりません'}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/invoices')}>
          請求書一覧に戻る
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
            onClick={() => router.push('/invoices')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            請求書一覧
          </Button>
          <h1 className="text-3xl font-bold">請求書詳細</h1>
        </div>
        <div className="flex gap-2">
          {/* 編集ボタン（支払済み以外） */}
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/invoices/${invoice._id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                編集
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/invoices/${invoice._id}/edit?mode=ai`)}
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
              const printWindow = window.open(`/api/invoices/${invoice._id}/pdf?print=true`, '_blank', 'width=800,height=600');
              if (printWindow) {
                printWindow.focus();
              }
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF印刷
          </Button>
          {invoice.status === 'draft' && (
            <Button
              onClick={() => updateStatus('sent')}
              disabled={isUpdating}
            >
              <Send className="mr-2 h-4 w-4" />
              送信
            </Button>
          )}
          {invoice.status === 'sent' && (
            <Button
              variant="default"
              onClick={() => updateStatus('paid')}
              disabled={isUpdating}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              支払済みにする
            </Button>
          )}
          {['draft', 'sent'].includes(invoice.status) && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isUpdating}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              キャンセル
            </Button>
          )}
        </div>
      </div>

      {/* 請求書情報 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{invoice.invoiceNumber}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${statusColors[invoice.status]} border-0`}>
                  {statusLabels[invoice.status]}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">請求日</p>
              <p className="font-medium">
                {invoice.invoiceDate && invoice.invoiceDate !== 'Invalid Date' ? 
                  format(new Date(invoice.issueDate || invoice.invoiceDate), 'yyyy年MM月dd日', { locale: ja }) : 
                  '日付未設定'}
              </p>
              <p className="text-sm text-gray-600 mt-2">支払期限</p>
              <p className="font-medium">
                {format(new Date(invoice.dueDate), 'yyyy年MM月dd日', { locale: ja })}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* 請求先 */}
            <div>
              <h3 className="font-semibold mb-2">請求先</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{invoice.customerSnapshot.companyName}</p>
                {invoice.customerSnapshot.contactName && (
                  <p>{invoice.customerSnapshot.contactName} 様</p>
                )}
                <p>{invoice.customerSnapshot.address}</p>
                {invoice.customerSnapshot.phone && (
                  <p>TEL: {invoice.customerSnapshot.phone}</p>
                )}
                {invoice.customerSnapshot.email && (
                  <p>Email: {invoice.customerSnapshot.email}</p>
                )}
              </div>
            </div>

            {/* 請求元 */}
            <div>
              <h3 className="font-semibold mb-2">請求元</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{invoice.companySnapshot.companyName}</p>
                <p>{invoice.companySnapshot.address}</p>
                {invoice.companySnapshot.phone && (
                  <p>TEL: {invoice.companySnapshot.phone}</p>
                )}
                {invoice.companySnapshot.email && (
                  <p>Email: {invoice.companySnapshot.email}</p>
                )}
                {invoice.companySnapshot.invoiceRegistrationNumber && (
                  <p>登録番号: {invoice.companySnapshot.invoiceRegistrationNumber}</p>
                )}
                {/* 社印 */}
                {(invoice.companySnapshot.sealImageUrl || invoice.companySnapshot.stampImage) && (
                  <div className="mt-4">
                    <img 
                      src={invoice.companySnapshot.sealImageUrl || invoice.companySnapshot.stampImage} 
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
            <h3 className="text-lg font-semibold mb-4">請求明細</h3>
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
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border border-gray-200">{item.description}</td>
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
                  <span className="text-lg font-mono">¥{(invoice.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">消費税:</span>
                  <span className="text-lg font-mono">¥{(invoice.taxAmount || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">請求金額合計:</span>
                    <span className="text-2xl font-bold text-blue-600">¥{(invoice.totalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
                {invoice.paidAmount > 0 && invoice.paidAmount < invoice.totalAmount && (
                  <div className="border-t border-gray-300 pt-3 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">支払済み:</span>
                      <span className="font-mono text-green-600">¥{(invoice.paidAmount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">残額:</span>
                      <span className="text-lg font-bold text-red-600">¥{((invoice.totalAmount || 0) - (invoice.paidAmount || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* その他情報 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">支払情報</h3>
              <div className="space-y-2 text-sm">
                <p>支払方法: {paymentMethodLabels[invoice.paymentMethod]}</p>
                {invoice.paymentMethod === 'bank_transfer' && invoice.companySnapshot.bankAccount && (
                  <div className="mt-2 p-3 bg-gray-50 rounded">
                    <p className="font-medium mb-1">振込先</p>
                    <p>{invoice.companySnapshot.bankAccount.bankName} {invoice.companySnapshot.bankAccount.branchName}</p>
                    <p>{invoice.companySnapshot.bankAccount.accountType} {invoice.companySnapshot.bankAccount.accountNumber}</p>
                    <p>{invoice.companySnapshot.bankAccount.accountHolder}</p>
                  </div>
                )}
                {invoice.paidDate && (
                  <p>支払日: {format(new Date(invoice.paidDate), 'yyyy年MM月dd日', { locale: ja })}</p>
                )}
              </div>
            </div>

            {invoice.notes && (
              <div>
                <h3 className="font-semibold mb-2">備考</h3>
                <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PDFプレビューモーダル */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">請求書プレビュー</h2>
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
                src={`/api/invoices/${invoice._id}/pdf`}
                className="w-full h-full"
                title="請求書PDFプレビュー"
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
                  window.open(`/api/invoices/${invoice._id}/pdf?download=true`, '_blank');
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

      {/* AI編集ダイアログ */}
      {invoice && (
        <AIChatDialog
          isOpen={showAIChat}
          onClose={() => setShowAIChat(false)}
          onComplete={handleAIEditComplete}
          initialInvoiceData={{
            customerId: invoice.customerId,
            customerName: invoice.customerSnapshot?.companyName,
            invoiceDate: invoice.invoiceDate,
            dueDate: invoice.dueDate,
            items: invoice.items.map(item => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              amount: item.amount,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount
            })),
            notes: invoice.notes,
            paymentMethod: invoice.paymentMethod,
            subtotal: invoice.subtotal,
            taxAmount: invoice.taxAmount,
            totalAmount: invoice.totalAmount
          }}
          mode="edit"
        />
      )}
    </div>
  );
}