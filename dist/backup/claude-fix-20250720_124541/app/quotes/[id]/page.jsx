"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QuoteDetailPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const card_1 = require("@/components/ui/card");
const button_1 = require("@/components/ui/button");
const badge_1 = require("@/components/ui/badge");
const separator_1 = require("@/components/ui/separator");
const alert_1 = require("@/components/ui/alert");
const select_1 = require("@/components/ui/select");
const logger_1 = require("@/lib/logger");
const lucide_react_1 = require("lucide-react");
const date_utils_1 = require("@/lib/date-utils");
const email_send_modal_1 = __importDefault(require("@/components/email-send-modal"));
const statusLabels = {
    draft: '下書き',
    sent: '送信済み',
    saved: '保存済み',
    accepted: '承認済み',
    rejected: '拒否',
    expired: '期限切れ',
    converted: '請求書変換済み',
};
const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    saved: 'bg-blue-100 text-blue-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-orange-100 text-orange-800',
    converted: 'bg-purple-100 text-purple-800',
};
function QuoteDetailPage({ params }) {
    const router = (0, navigation_1.useRouter)();
    const [quote, setQuote] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = (0, react_1.useState)(false);
    const [isConverting, setIsConverting] = (0, react_1.useState)(false);
    const [showPdfPreview, setShowPdfPreview] = (0, react_1.useState)(false);
    const [showEmailModal, setShowEmailModal] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
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
        }
        catch (error) {
            logger_1.logger.error('Error fetching quote:', error);
            setError('見積書の取得に失敗しました');
        }
        finally {
            setIsLoading(false);
        }
    };
    const updateQuoteStatus = async (newStatus) => {
        if (!quote)
            return;
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
            }
            else {
                throw new Error('ステータス更新に失敗しました');
            }
        }
        catch (error) {
            logger_1.logger.error('Error updating quote status:', error);
            alert('ステータスの更新に失敗しました');
        }
        finally {
            setIsUpdatingStatus(false);
        }
    };
    // ステータス変更の確認が必要かチェック
    const needsConfirmation = (currentStatus, newStatus) => {
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
    const handleStatusChange = async (newStatus) => {
        if (!quote || newStatus === quote.status)
            return;
        if (needsConfirmation(quote.status, newStatus)) {
            const confirmMessage = `見積書のステータスを「${statusLabels[quote.status]}」から「${statusLabels[newStatus]}」に変更しますか？\n\n※この操作は重要な変更です。本当に変更してもよろしいですか？`;
            if (confirm(confirmMessage)) {
                await updateQuoteStatus(newStatus);
            }
        }
        else {
            await updateQuoteStatus(newStatus);
        }
    };
    const handleConvertToInvoice = async () => {
        if (!quote)
            return;
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
            }
            else {
                throw new Error(data.details || data.error || '変換に失敗しました');
            }
        }
        catch (error) {
            logger_1.logger.error('Error converting quote to invoice:', error);
            alert(`変換エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
        finally {
            setIsConverting(false);
        }
    };
    // 納品書への変換処理
    const handleConvertToDeliveryNote = async () => {
        if (!quote)
            return;
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
            }
            else {
                throw new Error(data.details || data.error || '変換に失敗しました');
            }
        }
        catch (error) {
            logger_1.logger.error('Error converting quote to delivery note:', error);
            alert(`変換エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
        finally {
            setIsConverting(false);
        }
    };
    const handleDelete = async () => {
        if (!quote)
            return;
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
        }
        catch (error) {
            logger_1.logger.error('Error cancelling quote:', error);
            setError('見積書のキャンセルに失敗しました');
        }
        finally {
            setIsUpdatingStatus(false);
        }
    };
    const handleDownloadPdf = async () => {
        if (!quote)
            return;
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
        }
        catch (error) {
            logger_1.logger.error('PDFダウンロードエラー:', error);
            alert('PDFのダウンロードに失敗しました');
        }
    };
    const getStatusBadge = (status) => {
        return (<badge_1.Badge className={`${statusColors[status]} border-0`}>
        {statusLabels[status]}
      </badge_1.Badge>);
    };
    if (isLoading) {
        return (<div className="container mx-auto p-6 flex justify-center items-center h-screen">
        <lucide_react_1.Loader2 className="h-8 w-8 animate-spin"/>
      </div>);
    }
    if (error || !quote) {
        return (<div className="container mx-auto p-6">
        <alert_1.Alert variant="destructive">
          <lucide_react_1.AlertCircle className="h-4 w-4"/>
          <alert_1.AlertDescription>{error || '見積書が見つかりません'}</alert_1.AlertDescription>
        </alert_1.Alert>
        <button_1.Button className="mt-4" onClick={() => router.push('/quotes')}>
          見積書一覧に戻る
        </button_1.Button>
      </div>);
    }
    return (<div className="container mx-auto p-6 max-w-5xl">
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <button_1.Button variant="ghost" size="sm" onClick={() => router.push('/quotes')} className="mb-2">
            <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/>
            見積書一覧
          </button_1.Button>
          <h1 className="text-3xl font-bold">見積書詳細</h1>
        </div>
        <div className="flex gap-2">
          {/* 編集ボタン（承認済み・請求書変換済み以外） */}
          {quote.status !== 'accepted' && quote.status !== 'converted' && (<>
              <button_1.Button variant="outline" onClick={() => router.push(`/quotes/${quote._id}/edit`)}>
                <lucide_react_1.Edit className="mr-2 h-4 w-4"/>
                編集
              </button_1.Button>
              <button_1.Button variant="outline" onClick={() => router.push(`/quotes/${quote._id}/edit?mode=ai`)}>
                <lucide_react_1.MessageSquare className="mr-2 h-4 w-4"/>
                AI会話で編集
              </button_1.Button>
            </>)}
          <button_1.Button variant="outline" onClick={() => setShowPdfPreview(true)}>
            <lucide_react_1.Eye className="mr-2 h-4 w-4"/>
            プレビュー
          </button_1.Button>
          <button_1.Button variant="outline" onClick={() => {
            // 新しいウィンドウを開いて印刷ダイアログを表示
            const printWindow = window.open(`/api/quotes/${quote._id}/pdf?print=true`, '_blank', 'width=800,height=600');
            if (printWindow) {
                printWindow.focus();
            }
        }}>
            <lucide_react_1.Download className="mr-2 h-4 w-4"/>
            PDF印刷
          </button_1.Button>
          {/* メール送信ボタン */}
          <button_1.Button variant="outline" onClick={() => setShowEmailModal(true)}>
            <lucide_react_1.Send className="mr-2 h-4 w-4"/>
            メール送信
          </button_1.Button>
          {quote.status === 'draft' && (<button_1.Button onClick={() => updateQuoteStatus('saved')} disabled={isUpdatingStatus}>
              <lucide_react_1.Send className="mr-2 h-4 w-4"/>
              保存済みにする
            </button_1.Button>)}
          {quote.status === 'saved' && (<button_1.Button variant="default" onClick={() => updateQuoteStatus('accepted')} disabled={isUpdatingStatus}>
              <lucide_react_1.CheckCircle className="mr-2 h-4 w-4"/>
              承認済みにする
            </button_1.Button>)}
          {quote.status === 'accepted' && !quote.convertedToInvoiceId && (<button_1.Button onClick={handleConvertToInvoice} disabled={isConverting} className="bg-purple-600 hover:bg-purple-700 text-white">
              {isConverting ? (<>
                  <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                  変換中...
                </>) : (<>
                  <lucide_react_1.Calculator className="mr-2 h-4 w-4"/>
                  請求書に変換
                </>)}
            </button_1.Button>)}
          {/* 納品書作成ボタン */}
          {['sent', 'saved', 'accepted'].includes(quote.status) && (<button_1.Button variant="outline" onClick={handleConvertToDeliveryNote} disabled={isConverting} className="bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700">
              {isConverting ? (<>
                  <lucide_react_1.Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                  変換中...
                </>) : (<>
                  <lucide_react_1.Package className="mr-2 h-4 w-4"/>
                  納品書作成
                </>)}
            </button_1.Button>)}
          {['draft', 'saved'].includes(quote.status) && (<button_1.Button variant="destructive" onClick={handleDelete} disabled={isUpdatingStatus}>
              <lucide_react_1.Trash2 className="mr-2 h-4 w-4"/>
              キャンセル
            </button_1.Button>)}
        </div>
      </div>


      {/* 見積書情報 */}
      <card_1.Card className="mb-6">
        <card_1.CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <card_1.CardTitle>{quote.quoteNumber}</card_1.CardTitle>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-4">
                  <badge_1.Badge className={`${statusColors[quote.status]} border-0`}>
                    {statusLabels[quote.status]}
                  </badge_1.Badge>
                  {quote.status !== 'converted' && (<select_1.Select value={quote.status} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
                      <select_1.SelectTrigger className="w-[180px]">
                        <select_1.SelectValue />
                      </select_1.SelectTrigger>
                      <select_1.SelectContent>
                        <select_1.SelectItem value="draft">下書き</select_1.SelectItem>
                        <select_1.SelectItem value="sent">送信済み</select_1.SelectItem>
                        <select_1.SelectItem value="saved">保存済み</select_1.SelectItem>
                        <select_1.SelectItem value="accepted">承認済み</select_1.SelectItem>
                        <select_1.SelectItem value="rejected">拒否</select_1.SelectItem>
                        <select_1.SelectItem value="expired">期限切れ</select_1.SelectItem>
                      </select_1.SelectContent>
                    </select_1.Select>)}
                </div>
                {quote.convertedToInvoiceId && (<button_1.Button variant="link" size="sm" onClick={() => router.push(`/invoices/${quote.convertedToInvoiceId}`)} className="p-0 h-auto">
                    変換された請求書を表示
                  </button_1.Button>)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">発行日</p>
              <p className="font-medium">
                {(0, date_utils_1.safeFormatDate)(quote.issueDate, 'yyyy年MM月dd日')}
              </p>
              <p className="text-sm text-gray-600 mt-2">有効期限</p>
              <p className="font-medium">
                {(0, date_utils_1.safeFormatDate)(quote.validityDate, 'yyyy年MM月dd日')}
              </p>
              {new Date(quote.validityDate) < new Date() && quote.status !== 'expired' && quote.status !== 'accepted' && quote.status !== 'rejected' && quote.status !== 'converted' && (<badge_1.Badge className="mt-2 bg-orange-100 text-orange-800 border-0">
                  <lucide_react_1.AlertTriangle className="mr-1 h-3 w-3"/>
                  期限切れ
                </badge_1.Badge>)}
            </div>
          </div>
        </card_1.CardHeader>
        <card_1.CardContent>
          <div className="grid grid-cols-2 gap-6">
            {/* 見積先 */}
            <div>
              <h3 className="font-semibold mb-2">見積先</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{quote.customer?.companyName || '顧客未設定'}</p>
                {quote.customer?.contacts?.[0]?.name && (<p>{quote.customer.contacts[0].name} 様</p>)}
                {(quote.customer?.prefecture || quote.customer?.city || quote.customer?.address1) && (<p>
                    {quote.customer.postalCode && `〒${quote.customer.postalCode} `}
                    {quote.customer.prefecture}
                    {quote.customer.city}
                    {quote.customer.address1}
                    {quote.customer.address2}
                  </p>)}
                {quote.customer?.phone && (<p>TEL: {quote.customer.phone}</p>)}
                {quote.customer?.email && (<p>Email: {quote.customer.email}</p>)}
              </div>
            </div>

            {/* 見積元（自社情報）*/}
            <div>
              <h3 className="font-semibold mb-2">見積元</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{quote.companySnapshot?.companyName || '会社名未設定'}</p>
                {quote.companySnapshot?.address && (<p>{quote.companySnapshot.address}</p>)}
                {quote.companySnapshot?.phone && (<p>TEL: {quote.companySnapshot.phone}</p>)}
                {quote.companySnapshot?.email && (<p>Email: {quote.companySnapshot.email}</p>)}
                {quote.companySnapshot?.invoiceRegistrationNumber && (<p>登録番号: {quote.companySnapshot.invoiceRegistrationNumber}</p>)}
                {/* 社印 */}
                {quote.companySnapshot?.stampImage && (<div className="mt-4">
                    <img src={quote.companySnapshot.stampImage} alt="社印" className="w-20 h-20 object-contain"/>
                  </div>)}
              </div>
            </div>
          </div>

          <separator_1.Separator className="my-6"/>

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
                  {quote.items.map((item, index) => (<tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4 border border-gray-200">
                        <div>
                          <div className="font-medium">{item.itemName}</div>
                          {item.description && (<div className="text-sm text-gray-600">{item.description}</div>)}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4 border border-gray-200">{item.quantity}</td>
                      <td className="text-right py-3 px-4 border border-gray-200 font-mono">¥{(item.unitPrice || 0).toLocaleString()}</td>
                      <td className="text-right py-3 px-4 border border-gray-200 font-mono">¥{(item.amount || 0).toLocaleString()}</td>
                      <td className="text-right py-3 px-4 border border-gray-200 font-mono text-sm text-gray-600">¥{(item.taxAmount || 0).toLocaleString()}</td>
                      <td className="text-right py-3 px-4 border border-gray-200 font-medium">¥{((item.amount || 0) + (item.taxAmount || 0)).toLocaleString()}</td>
                    </tr>))}
                </tbody>
              </table>
            </div>
          </div>

          <separator_1.Separator className="my-6"/>

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

          <separator_1.Separator className="my-6"/>
        </card_1.CardContent>
      </card_1.Card>

      {/* その他情報 */}
      <card_1.Card className="mb-6">
        <card_1.CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-6">
            {quote.notes && (<div>
                <h3 className="font-semibold mb-2">備考</h3>
                <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
              </div>)}
            <div>
              <h3 className="font-semibold mb-2">ステータス履歴</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <badge_1.Badge className="bg-gray-100 text-gray-800 border-0 text-xs">作成</badge_1.Badge>
                  <span className="text-gray-600">
                    {(0, date_utils_1.safeFormatDate)(quote.createdAt, 'yyyy年MM月dd日')}
                  </span>
                </div>
                {quote.acceptedDate && (<div className="flex items-center gap-2">
                    <badge_1.Badge className="bg-green-100 text-green-800 border-0 text-xs">承認</badge_1.Badge>
                    <span className="text-gray-600">
                      {(0, date_utils_1.safeFormatDate)(quote.acceptedDate, 'yyyy年MM月dd日')}
                    </span>
                  </div>)}
                {quote.rejectedDate && (<div className="flex items-center gap-2">
                    <badge_1.Badge className="bg-red-100 text-red-800 border-0 text-xs">拒否</badge_1.Badge>
                    <span className="text-gray-600">
                      {(0, date_utils_1.safeFormatDate)(quote.rejectedDate, 'yyyy年MM月dd日')}
                    </span>
                  </div>)}
                {quote.expiredDate && (<div className="flex items-center gap-2">
                    <badge_1.Badge className="bg-orange-100 text-orange-800 border-0 text-xs">期限切れ</badge_1.Badge>
                    <span className="text-gray-600">
                      {(0, date_utils_1.safeFormatDate)(quote.expiredDate, 'yyyy年MM月dd日')}
                    </span>
                  </div>)}
                {quote.convertedToInvoiceDate && (<div className="flex items-center gap-2">
                    <badge_1.Badge className="bg-purple-100 text-purple-800 border-0 text-xs">請求書変換</badge_1.Badge>
                    <span className="text-gray-600">
                      {(0, date_utils_1.safeFormatDate)(quote.convertedToInvoiceDate, 'yyyy年MM月dd日')}
                    </span>
                  </div>)}
              </div>
            </div>
          </div>
        </card_1.CardContent>
      </card_1.Card>

      {/* PDFプレビューモーダル */}
      {showPdfPreview && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">見積書プレビュー</h2>
              <button_1.Button variant="ghost" size="sm" onClick={() => setShowPdfPreview(false)}>
                <lucide_react_1.X className="h-4 w-4"/>
              </button_1.Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe src={`/api/quotes/${quote._id}/pdf`} className="w-full h-full" title="見積書PDFプレビュー"/>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button_1.Button variant="outline" onClick={() => setShowPdfPreview(false)}>
                閉じる
              </button_1.Button>
              <button_1.Button onClick={() => {
                window.open(`/api/quotes/${quote._id}/pdf?download=true`, '_blank');
                setShowPdfPreview(false);
            }}>
                <lucide_react_1.Download className="mr-2 h-4 w-4"/>
                ダウンロード
              </button_1.Button>
            </div>
          </div>
        </div>)}

      {/* メール送信モーダル */}
      <email_send_modal_1.default isOpen={showEmailModal} onClose={() => setShowEmailModal(false)} documentType="quote" documentId={quote._id || ''} documentNumber={quote.quoteNumber} customerEmail={quote.customer?.email} customerName={quote.customer?.companyName} customer={quote.customer} customerSnapshot={quote.customerSnapshot} totalAmount={quote.totalAmount} dueDate={(0, date_utils_1.safeFormatDate)(quote.validityDate, 'yyyy年MM月dd日')} onSuccess={fetchQuote}/>

    </div>);
}
