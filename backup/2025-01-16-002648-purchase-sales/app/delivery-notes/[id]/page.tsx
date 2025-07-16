'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  Download, 
  Send, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye,
  X,
  Calculator,
  Package,
  Truck,
  MapPin,
  Calendar,
  Building2,
  User,
  MessageSquare
} from 'lucide-react';
import { DeliveryNote, DeliveryNoteStatus } from '@/types/collections';
import { safeFormatDate } from '@/lib/date-utils';
import EmailSendModal from '@/components/email-send-modal';
import { generatePDFBase64 } from '@/lib/pdf-export';
import { DocumentData } from '@/lib/document-generator';

const statusLabels: Record<DeliveryNoteStatus, string> = {
  draft: '下書き',
  saved: '保存済み',
  delivered: '納品済み',
  received: '受領済み',
  cancelled: 'キャンセル',
};

const statusColors: Record<DeliveryNoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  saved: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
  received: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-red-100 text-red-800',
};

const deliveryMethodLabels: Record<string, string> = {
  direct: '直接納品',
  shipping: '配送',
  pickup: '引き取り',
  email: 'メール送信',
  other: 'その他',
};

export default function DeliveryNoteDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [deliveryNote, setDeliveryNote] = useState<DeliveryNote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    fetchDeliveryNote();
  }, [params.id]);

  const fetchDeliveryNote = async () => {
    try {
      const response = await fetch(`/api/delivery-notes/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch delivery note');
      }
      const data = await response.json();
      setDeliveryNote(data);
    } catch (error) {
      console.error('Error fetching delivery note:', error);
      setError('納品書の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: DeliveryNoteStatus) => {
    setIsUpdating(true);
    try {
      const updateData: any = { status };
      
      // ステータス更新に伴う自動設定
      if (status === 'received') {
        updateData.receivedDate = new Date().toISOString();
      }

      const response = await fetch(`/api/delivery-notes/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      const updatedDeliveryNote = await response.json();
      setDeliveryNote(updatedDeliveryNote);
    } catch (error) {
      console.error('Error updating status:', error);
      setError('ステータスの更新に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('この納品書をキャンセルしてもよろしいですか？')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/delivery-notes/${params.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel delivery note');
      }
      
      router.push('/delivery-notes');
    } catch (error) {
      console.error('Error cancelling delivery note:', error);
      setError('納品書のキャンセルに失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!deliveryNote) return;

    if (!confirm('この納品書を請求書に変換しますか？')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/delivery-notes/${deliveryNote._id}/convert-to-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (response.ok) {
        alert('請求書への変換が完了しました！');
        fetchDeliveryNote(); // 納品書データを再読み込み
        if (confirm('作成された請求書を確認しますか？')) {
          router.push(`/invoices/${data._id}`);
        }
      } else {
        throw new Error(data.details || data.error || '変換に失敗しました');
      }
    } catch (error) {
      console.error('Error converting delivery note to invoice:', error);
      alert(`変換エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!deliveryNote) return;
    
    try {
      // DocumentData形式に変換
      const documentData: DocumentData = {
        documentType: 'delivery-note',
        documentNumber: deliveryNote.deliveryNoteNumber,
        issueDate: new Date(deliveryNote.issueDate),
        deliveryDate: new Date(deliveryNote.deliveryDate),
        customerName: deliveryNote.customer?.companyName || deliveryNote.customerSnapshot?.companyName || '',
        customerAddress: deliveryNote.customer ? 
          `${deliveryNote.customer.postalCode ? `〒${deliveryNote.customer.postalCode} ` : ''}${deliveryNote.customer.prefecture || ''}${deliveryNote.customer.city || ''}${deliveryNote.customer.address1 || ''}${deliveryNote.customer.address2 || ''}` :
          deliveryNote.customerSnapshot?.address || '',
        customer: deliveryNote.customer,
        customerSnapshot: deliveryNote.customerSnapshot,
        items: deliveryNote.items.map((item: any) => ({
          description: item.itemName || item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        subtotal: deliveryNote.subtotal,
        tax: deliveryNote.taxAmount,
        total: deliveryNote.totalAmount,
        notes: deliveryNote.notes,
        companyInfo: {
          name: deliveryNote.companySnapshot?.companyName || '',
          address: deliveryNote.companySnapshot?.address || '',
          phone: deliveryNote.companySnapshot?.phone,
          email: deliveryNote.companySnapshot?.email,
          registrationNumber: deliveryNote.companySnapshot?.invoiceRegistrationNumber,
          stampImage: deliveryNote.companySnapshot?.stampImage,
        },
      };
      
      // クライアントサイドでPDF生成
      const pdfBase64 = await generatePDFBase64(documentData);
      
      // PDFをダウンロード
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `納品書_${deliveryNote.deliveryNoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDFダウンロードエラー:', error);
      alert('PDFのダウンロードに失敗しました');
    }
  };

  const handlePdfPreview = async () => {
    if (!deliveryNote) return;
    
    try {
      // DocumentData形式に変換（handleDownloadPdfと同じ）
      const documentData: DocumentData = {
        documentType: 'delivery-note',
        documentNumber: deliveryNote.deliveryNoteNumber,
        issueDate: new Date(deliveryNote.issueDate),
        deliveryDate: new Date(deliveryNote.deliveryDate),
        customerName: deliveryNote.customer?.companyName || deliveryNote.customerSnapshot?.companyName || '',
        customerAddress: deliveryNote.customer ? 
          `${deliveryNote.customer.postalCode ? `〒${deliveryNote.customer.postalCode} ` : ''}${deliveryNote.customer.prefecture || ''}${deliveryNote.customer.city || ''}${deliveryNote.customer.address1 || ''}${deliveryNote.customer.address2 || ''}` :
          deliveryNote.customerSnapshot?.address || '',
        customer: deliveryNote.customer,
        customerSnapshot: deliveryNote.customerSnapshot,
        items: deliveryNote.items.map((item: any) => ({
          description: item.itemName || item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
        })),
        subtotal: deliveryNote.subtotal,
        tax: deliveryNote.taxAmount,
        total: deliveryNote.totalAmount,
        notes: deliveryNote.notes,
        companyInfo: {
          name: deliveryNote.companySnapshot?.companyName || '',
          address: deliveryNote.companySnapshot?.address || '',
          phone: deliveryNote.companySnapshot?.phone,
          email: deliveryNote.companySnapshot?.email,
          registrationNumber: deliveryNote.companySnapshot?.invoiceRegistrationNumber,
          stampImage: deliveryNote.companySnapshot?.stampImage,
        },
      };
      
      // クライアントサイドでPDF生成
      const pdfBase64 = await generatePDFBase64(documentData);
      
      // PDFをBlobに変換してプレビュー用URLを作成
      const byteCharacters = atob(pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      const url = window.URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPdfPreview(true);
    } catch (error) {
      console.error('PDFプレビューエラー:', error);
      alert('PDFプレビューに失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !deliveryNote) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || '納品書が見つかりません'}</AlertDescription>
        </Alert>
        <Button className="mt-4" onClick={() => router.push('/delivery-notes')}>
          納品書一覧に戻る
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
            onClick={() => router.push('/delivery-notes')}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            納品書一覧
          </Button>
          <h1 className="text-3xl font-bold">納品書詳細</h1>
        </div>
        <div className="flex gap-2">
          {/* 編集ボタン（受領済み・キャンセル以外） */}
          {deliveryNote.status !== 'received' && deliveryNote.status !== 'cancelled' && (
            <>
              <Button
                variant="outline"
                onClick={() => router.push(`/delivery-notes/${deliveryNote._id}/edit`)}
              >
                <Edit className="mr-2 h-4 w-4" />
                編集
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/delivery-notes/${deliveryNote._id}/edit?mode=ai`)}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                AI会話で編集
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={handlePdfPreview}
          >
            <Eye className="mr-2 h-4 w-4" />
            プレビュー
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF印刷
          </Button>
          {/* メール送信ボタン */}
          <Button
            variant="outline"
            onClick={() => setShowEmailModal(true)}
          >
            <Send className="mr-2 h-4 w-4" />
            メール送信
          </Button>
          {deliveryNote.status === 'draft' && (
            <Button
              onClick={() => updateStatus('saved')}
              disabled={isUpdating}
            >
              <Send className="mr-2 h-4 w-4" />
              保存済みにする
            </Button>
          )}
          {deliveryNote.status === 'saved' && (
            <Button
              variant="default"
              onClick={() => updateStatus('delivered')}
              disabled={isUpdating}
            >
              <Package className="mr-2 h-4 w-4" />
              納品済みにする
            </Button>
          )}
          {deliveryNote.status === 'delivered' && (
            <Button
              variant="default"
              onClick={() => updateStatus('received')}
              disabled={isUpdating}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              受領確認
            </Button>
          )}
          {deliveryNote.status === 'delivered' && !deliveryNote.convertedToInvoiceId && (
            <Button
              onClick={handleConvertToInvoice}
              disabled={isUpdating}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isUpdating ? (
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
          {['draft', 'saved'].includes(deliveryNote.status) && (
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

      {/* 納品書情報 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{deliveryNote.deliveryNoteNumber}</CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`${statusColors[deliveryNote.status]} border-0`}>
                  {statusLabels[deliveryNote.status]}
                </Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">発行日</p>
              <p className="font-medium">
                {safeFormatDate(deliveryNote.issueDate, 'yyyy年MM月dd日')}
              </p>
              <p className="text-sm text-gray-600 mt-2">納品日</p>
              <p className="font-medium">
                {safeFormatDate(deliveryNote.deliveryDate, 'yyyy年MM月dd日')}
              </p>
              {deliveryNote.receivedDate && (
                <>
                  <p className="text-sm text-gray-600 mt-2">受領日</p>
                  <p className="font-medium">
                    {safeFormatDate(deliveryNote.receivedDate, 'yyyy年MM月dd日')}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* 納品先 */}
            <div>
              <h3 className="font-semibold mb-2">納品先</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{deliveryNote.customer?.companyName || deliveryNote.customerSnapshot?.companyName}</p>
                {(deliveryNote.customer?.contacts?.[0]?.name || deliveryNote.customerSnapshot?.contactName) && (
                  <p>{deliveryNote.customer?.contacts?.[0]?.name || deliveryNote.customerSnapshot?.contactName} 様</p>
                )}
                {(deliveryNote.customer?.prefecture || deliveryNote.customerSnapshot?.address) && (
                  <p>
                    {deliveryNote.customer ? (
                      <>
                        {deliveryNote.customer.postalCode && `〒${deliveryNote.customer.postalCode} `}
                        {deliveryNote.customer.prefecture}
                        {deliveryNote.customer.city}
                        {deliveryNote.customer.address1}
                        {deliveryNote.customer.address2}
                      </>
                    ) : (
                      deliveryNote.customerSnapshot?.address
                    )}
                  </p>
                )}
                {(deliveryNote.customer?.phone || deliveryNote.customerSnapshot?.phone) && (
                  <p>TEL: {deliveryNote.customer?.phone || deliveryNote.customerSnapshot?.phone}</p>
                )}
                {(deliveryNote.customer?.email || deliveryNote.customerSnapshot?.email) && (
                  <p>Email: {deliveryNote.customer?.email || deliveryNote.customerSnapshot?.email}</p>
                )}
              </div>
            </div>

            {/* 納品元（自社情報）*/}
            <div>
              <h3 className="font-semibold mb-2">納品元</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{deliveryNote.companySnapshot?.companyName || '会社名未設定'}</p>
                {deliveryNote.companySnapshot?.address && (
                  <p>{deliveryNote.companySnapshot.address}</p>
                )}
                {deliveryNote.companySnapshot?.phone && (
                  <p>TEL: {deliveryNote.companySnapshot.phone}</p>
                )}
                {deliveryNote.companySnapshot?.email && (
                  <p>Email: {deliveryNote.companySnapshot.email}</p>
                )}
                {deliveryNote.companySnapshot?.invoiceRegistrationNumber && (
                  <p>登録番号: {deliveryNote.companySnapshot.invoiceRegistrationNumber}</p>
                )}
                {/* 社印 */}
                {deliveryNote.companySnapshot?.stampImage && (
                  <div className="mt-4">
                    <img 
                      src={deliveryNote.companySnapshot.stampImage} 
                      alt="社印" 
                      className="w-20 h-20 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 納品情報 */}
          {(deliveryNote.deliveryLocation || deliveryNote.deliveryMethod) && (
            <>
              <Separator className="my-6" />
              <div className="grid grid-cols-2 gap-6">
                {deliveryNote.deliveryLocation && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      納品先
                    </h3>
                    <p className="text-sm">{deliveryNote.deliveryLocation}</p>
                  </div>
                )}
                {deliveryNote.deliveryMethod && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <Truck className="mr-2 h-4 w-4" />
                      納品方法
                    </h3>
                    <p className="text-sm">{deliveryMethodLabels[deliveryNote.deliveryMethod] || deliveryNote.deliveryMethod}</p>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator className="my-6" />

          {/* 明細 */}
          <div>
            <h3 className="text-lg font-semibold mb-4">納品明細</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 border border-gray-200">品目・仕様</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 border border-gray-200 w-24">数量</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700 border border-gray-200 w-24">実納品数量</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border border-gray-200 w-32">単価</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border border-gray-200 w-32">小計</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border border-gray-200 w-32">消費税</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700 border border-gray-200 w-40">金額（税込）</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryNote.items.map((item, index) => (
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
                      <td className="text-center py-3 px-4 border border-gray-200">
                        <span className={item.deliveredQuantity !== item.quantity ? 'text-orange-600 font-medium' : ''}>
                          {item.deliveredQuantity || item.quantity}
                        </span>
                      </td>
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
                  <span className="text-lg font-mono">¥{(deliveryNote.subtotal || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700">消費税:</span>
                  <span className="text-lg font-mono">¥{(deliveryNote.taxAmount || 0).toLocaleString()}</span>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-gray-900">納品金額合計:</span>
                    <span className="text-2xl font-bold text-blue-600">¥{(deliveryNote.totalAmount || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* その他情報 */}
          <div className="grid grid-cols-2 gap-6">
            {deliveryNote.notes && (
              <div>
                <h3 className="font-semibold mb-2">備考</h3>
                <p className="text-sm whitespace-pre-wrap">{deliveryNote.notes}</p>
              </div>
            )}
            {deliveryNote.receivedBy && (
              <div>
                <h3 className="font-semibold mb-2">受領者</h3>
                <p className="text-sm">{deliveryNote.receivedBy}</p>
              </div>
            )}
          </div>

          {/* 変換情報 */}
          {(deliveryNote.convertedFromQuoteId || deliveryNote.convertedToInvoiceId) && (
            <>
              <Separator className="my-6" />
              <div>
                <h3 className="font-semibold mb-2">変換履歴</h3>
                <div className="space-y-2 text-sm">
                  {deliveryNote.convertedFromQuoteId && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">見積書から変換:</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => router.push(`/quotes/${deliveryNote.convertedFromQuoteId}`)}
                        className="p-0 h-auto"
                      >
                        見積書を表示
                      </Button>
                      {deliveryNote.convertedFromQuoteDate && (
                        <span className="text-gray-500">
                          ({safeFormatDate(deliveryNote.convertedFromQuoteDate, 'yyyy年MM月dd日')})
                        </span>
                      )}
                    </div>
                  )}
                  {deliveryNote.convertedToInvoiceId && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">請求書に変換済み:</span>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => router.push(`/invoices/${deliveryNote.convertedToInvoiceId}`)}
                        className="p-0 h-auto"
                      >
                        請求書を表示
                      </Button>
                      {deliveryNote.convertedToInvoiceDate && (
                        <span className="text-gray-500">
                          ({safeFormatDate(deliveryNote.convertedToInvoiceDate, 'yyyy年MM月dd日')})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* PDFプレビューモーダル */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">納品書プレビュー</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPdfPreview(false);
                  if (pdfPreviewUrl) {
                    window.URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl(null);
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              {pdfPreviewUrl ? (
                <iframe
                  src={pdfPreviewUrl}
                  className="w-full h-full"
                  title="納品書PDFプレビュー"
                />
              ) : (
                <div className="flex justify-center items-center h-full">
                  <p>PDFを生成中...</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPdfPreview(false);
                  if (pdfPreviewUrl) {
                    window.URL.revokeObjectURL(pdfPreviewUrl);
                    setPdfPreviewUrl(null);
                  }
                }}
              >
                閉じる
              </Button>
              <Button
                onClick={() => {
                  if (pdfPreviewUrl) {
                    const a = document.createElement('a');
                    a.href = pdfPreviewUrl;
                    a.download = `納品書_${deliveryNote.deliveryNoteNumber}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }
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
        documentType="delivery-note"
        documentId={deliveryNote._id || ''}
        documentNumber={deliveryNote.deliveryNoteNumber}
        customerEmail={deliveryNote.customer?.email || deliveryNote.customerSnapshot?.email}
        customerName={deliveryNote.customer?.companyName || deliveryNote.customerSnapshot?.companyName}
        customer={deliveryNote.customer}
        customerSnapshot={deliveryNote.customerSnapshot}
        totalAmount={deliveryNote.totalAmount}
        deliveryDate={safeFormatDate(deliveryNote.deliveryDate, 'yyyy年MM月dd日')}
        onSuccess={fetchDeliveryNote}
      />
    </div>
  );
}