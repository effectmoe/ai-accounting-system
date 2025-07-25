"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DocumentDetailPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = require("react-hot-toast");
const logger_1 = require("@/lib/logger");
const DocumentAIChat_1 = __importDefault(require("@/components/documents/DocumentAIChat"));
const documentTypeLabels = {
    estimate: '見積書',
    invoice: '請求書',
    delivery_note: '納品書',
    receipt: '領収書'
};
const statusLabels = {
    draft: '下書き',
    confirmed: '確定済み',
    viewed: '閲覧済み',
    accepted: '承認済み',
    paid: '支払済み',
    cancelled: 'キャンセル'
};
const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    confirmed: 'bg-blue-100 text-blue-800',
    viewed: 'bg-yellow-100 text-yellow-800',
    accepted: 'bg-green-100 text-green-800',
    paid: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800'
};
function DocumentDetailPage() {
    const params = (0, navigation_1.useParams)();
    const router = (0, navigation_1.useRouter)();
    const [document, setDocument] = (0, react_1.useState)(null);
    const [items, setItems] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (params.id) {
            loadDocument(params.id);
        }
    }, [params.id]);
    const loadDocument = async (documentId) => {
        try {
            setLoading(true);
            // 文書の詳細を取得
            console.log('=== Document Loading Debug ===');
            console.log('Loading document with ID:', documentId);
            console.log('Is Journal Number?:', documentId.startsWith('J'));
            const response = await fetch(`/api/documents/${documentId}`);
            const data = await response.json();
            console.log('API Response:', {
                ok: response.ok,
                status: response.status,
                success: data.success,
                error: data.error,
                hasDocument: !!data.document
            });
            if (!response.ok || !data.success) {
                console.error('Failed to load document:', data.error);
                throw new Error(data.error || '文書の取得に失敗しました');
            }
            setDocument(data.document);
            // デバッグ: OCR関連フィールドの確認
            console.log('=== Document Detail Debug ===');
            console.log('Full document data:', data.document);
            console.log('Document OCR fields:', {
                id: data.document.id,
                ocr_result_id: data.document.ocr_result_id,
                gridfs_file_id: data.document.gridfs_file_id,
                has_ocr_result_id: !!data.document.ocr_result_id,
                has_gridfs_file_id: !!data.document.gridfs_file_id,
                // OCR詳細情報
                vendor_name: data.document.vendor_name,
                receipt_date: data.document.receipt_date,
                category: data.document.category,
                ocr_status: data.document.ocr_status,
                confidence: data.document.confidence,
                file_name: data.document.file_name,
                file_type: data.document.file_type,
                file_size: data.document.file_size
            });
            console.log('Parking fields:', {
                receipt_type: data.document.receipt_type,
                facility_name: data.document.facility_name,
                entry_time: data.document.entry_time,
                exit_time: data.document.exit_time,
                parking_duration: data.document.parking_duration,
                base_fee: data.document.base_fee,
                additional_fee: data.document.additional_fee
            });
            console.log('All document keys:', Object.keys(data.document));
            console.log('===========================');
            // MongoDBでは明細は別テーブルではなく、ドキュメント内に含まれるか、
            // または別途APIで取得する必要がある
            // 現在は空配列として扱う
            setItems([]);
        }
        catch (error) {
            logger_1.logger.error('Document load error:', error);
            setError(error instanceof Error ? error.message : '文書の読み込みに失敗しました');
            react_hot_toast_1.toast.error('文書の読み込みに失敗しました');
        }
        finally {
            setLoading(false);
        }
    };
    const handleStatusUpdate = async (newStatus) => {
        if (!document)
            return;
        try {
            const response = await fetch(`/api/documents/${document.id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'ステータスの更新に失敗しました');
            }
            setDocument({ ...document, status: newStatus });
            react_hot_toast_1.toast.success('ステータスを更新しました');
        }
        catch (error) {
            logger_1.logger.error('Status update error:', error);
            react_hot_toast_1.toast.error(error instanceof Error ? error.message : 'ステータスの更新に失敗しました');
        }
    };
    const handleDelete = async () => {
        if (!document || !confirm('本当にこの文書を削除しますか？'))
            return;
        try {
            const response = await fetch(`/api/documents/${document.id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '文書の削除に失敗しました');
            }
            react_hot_toast_1.toast.success('文書を削除しました');
            router.push('/documents');
        }
        catch (error) {
            logger_1.logger.error('Delete error:', error);
            react_hot_toast_1.toast.error(error instanceof Error ? error.message : '文書の削除に失敗しました');
        }
    };
    if (loading) {
        return (<div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>);
    }
    if (error || !document) {
        return (<div className="min-h-screen bg-gray-50 py-6">
        <div className="container mx-auto px-4">
          <div className="text-center py-8">
            <lucide_react_1.FileText className="mx-auto h-12 w-12 text-gray-400"/>
            <p className="mt-2 text-gray-600">{error || '文書が見つかりません'}</p>
            <link_1.default href="/documents?tab=documents" className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200">
              <lucide_react_1.ArrowLeft className="mr-2 h-4 w-4"/>
              作成済み文書に戻る
            </link_1.default>
          </div>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-6">
          <link_1.default href="/documents?tab=documents" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
            <lucide_react_1.ArrowLeft className="mr-1 h-4 w-4"/>
            作成済み文書に戻る
          </link_1.default>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {documentTypeLabels[document.document_type]} 詳細
              </h1>
              <p className="text-sm text-gray-500">文書番号: {document.document_number}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[document.status]}`}>
                {statusLabels[document.status]}
              </span>
              
              <div className="flex items-center gap-2 ml-4">
                <button onClick={() => router.push(`/documents/${document.id}/edit`)} className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <lucide_react_1.Edit className="mr-2 h-4 w-4"/>
                  編集
                </button>
                
                {document.status === 'draft' && (<button onClick={() => handleStatusUpdate('confirmed')} className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                    <lucide_react_1.Send className="mr-2 h-4 w-4"/>
                    確定
                  </button>)}
                
                {document.status === 'confirmed' && (<>
                    <button onClick={() => handleStatusUpdate('draft')} className="inline-flex items-center px-3 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50">
                      <lucide_react_1.Edit className="mr-2 h-4 w-4"/>
                      下書きに戻す
                    </button>
                    
                    {/* 仕訳伝票の場合、元の領収書へのリンクを表示 */}
                    {document.document_type === 'journal_entry' && document.sourceDocumentId && (<button onClick={() => router.push(`/documents/${document.sourceDocumentId}`)} className="inline-flex items-center px-3 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50">
                        <lucide_react_1.Receipt className="mr-2 h-4 w-4"/>
                        元の領収書を表示
                      </button>)}
                    
                    {document.document_type === 'receipt' && (<button onClick={() => {
                    console.log('Creating journal from document:', document);
                    // 領収書データをセッションストレージに保存
                    const journalData = {
                        documentId: document.id,
                        date: document.issue_date,
                        description: document.notes || `${document.partner_name} - ${document.document_number}`,
                        amount: document.total_amount,
                        taxAmount: document.tax_amount,
                        vendorName: document.partner_name,
                        // 駐車場情報を追加
                        parkingDetails: document.receipt_type === 'parking' ? {
                            receiptType: document.receipt_type,
                            facilityName: document.facility_name,
                            entryTime: document.entry_time,
                            exitTime: document.exit_time,
                            parkingDuration: document.parking_duration,
                            baseFee: document.base_fee,
                            additionalFee: document.additional_fee
                        } : null,
                        // OCR情報
                        category: document.category,
                        items: document.items
                    };
                    console.log('Journal data to be saved:', journalData);
                    sessionStorage.setItem('journalFromDocument', JSON.stringify(journalData));
                    router.push('/journal/new');
                }} className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                        <lucide_react_1.FileInput className="mr-2 h-4 w-4"/>
                        仕訳作成
                      </button>)}
                  </>)}
                
                <button onClick={handleDelete} className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50">
                  <lucide_react_1.Trash2 className="mr-2 h-4 w-4"/>
                  削除
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 基本情報 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">基本情報</h2>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">文書種類</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {documentTypeLabels[document.document_type]}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">文書番号</dt>
                  <dd className="mt-1 text-sm text-gray-900">{document.document_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">発行日</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(document.issue_date).toLocaleDateString('ja-JP')}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                  <dd className="mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[document.status]}`}>
                      {statusLabels[document.status]}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* 取引先情報 */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">取引先情報</h2>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">取引先名</dt>
                  <dd className="mt-1 text-sm text-gray-900">{document.partner_name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">電話番号</dt>
                  <dd className="mt-1 text-sm text-gray-900">{document.partner_phone || '-'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">住所</dt>
                  <dd className="mt-1 text-sm text-gray-900">{document.partner_address || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">メールアドレス</dt>
                  <dd className="mt-1 text-sm text-gray-900">{document.partner_email || '-'}</dd>
                </div>
              </dl>
            </div>

            {/* 明細 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">明細</h2>
              {items.length > 0 ? (<div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          項目名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          数量
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          単価
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          金額
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item) => (<tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.item_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ¥{item.unit_price.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ¥{item.amount.toLocaleString()}
                          </td>
                        </tr>))}
                    </tbody>
                  </table>
                </div>) : (<p className="text-sm text-gray-500">明細がありません</p>)}
            </div>
          </div>

          {/* サイドバー */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">金額情報</h2>
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">小計</dt>
                  <dd className="text-sm text-gray-900">¥{document.subtotal.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-gray-500">消費税</dt>
                  <dd className="text-sm text-gray-900">¥{document.tax_amount.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-4">
                  <dt className="text-base font-medium text-gray-900">合計</dt>
                  <dd className="text-base font-medium text-gray-900">¥{document.total_amount.toLocaleString()}</dd>
                </div>
              </dl>

              {document.notes && (<div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">備考</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{document.notes}</p>
                </div>)}

              {/* OCR情報 */}
              {(document.ocr_result_id || document.gridfs_file_id || document.ocr_status === 'completed') && (<div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">OCR情報</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    この書類はOCRによって自動生成されました。
                  </p>
                  
                  {/* OCR詳細情報 */}
                  <dl className="space-y-2 mb-4">
                    {document.receipt_type && (<div className="flex justify-between text-sm">
                        <dt className="text-gray-500 flex items-center gap-1">
                          <lucide_react_1.Receipt className="w-3 h-3"/>
                          領収書タイプ
                        </dt>
                        <dd className="text-gray-900">
                          {document.receipt_type === 'parking' ? '駐車場領収書' : '一般領収書'}
                        </dd>
                      </div>)}
                    {document.vendor_name && (<div className="flex justify-between text-sm">
                        <dt className="text-gray-500">ベンダー名</dt>
                        <dd className="text-gray-900">{document.vendor_name}</dd>
                      </div>)}
                    {document.receipt_date && (<div className="flex justify-between text-sm">
                        <dt className="text-gray-500">領収日</dt>
                        <dd className="text-gray-900">
                          {new Date(document.receipt_date).toLocaleDateString('ja-JP')}
                        </dd>
                      </div>)}
                    {document.category && (<div className="flex justify-between text-sm">
                        <dt className="text-gray-500">カテゴリ</dt>
                        <dd className="text-gray-900">{document.category}</dd>
                      </div>)}
                    
                    {/* 駐車場固有情報 */}
                    {document.receipt_type === 'parking' && (<>
                        {document.facility_name && (<div className="flex justify-between text-sm pt-2 border-t">
                            <dt className="text-gray-500 flex items-center gap-1">
                              <lucide_react_1.Building className="w-3 h-3"/>
                              施設名
                            </dt>
                            <dd className="text-gray-900">{document.facility_name}</dd>
                          </div>)}
                        {document.entry_time && (<div className="flex justify-between text-sm">
                            <dt className="text-gray-500 flex items-center gap-1">
                              <lucide_react_1.Clock className="w-3 h-3"/>
                              入庫時刻
                            </dt>
                            <dd className="text-gray-900">{document.entry_time}</dd>
                          </div>)}
                        {document.exit_time && (<div className="flex justify-between text-sm">
                            <dt className="text-gray-500 flex items-center gap-1">
                              <lucide_react_1.Clock className="w-3 h-3"/>
                              出庫時刻
                            </dt>
                            <dd className="text-gray-900">{document.exit_time}</dd>
                          </div>)}
                        {document.parking_duration && (<div className="flex justify-between text-sm">
                            <dt className="text-gray-500 flex items-center gap-1">
                              <lucide_react_1.Car className="w-3 h-3"/>
                              駐車時間
                            </dt>
                            <dd className="text-gray-900">{document.parking_duration}</dd>
                          </div>)}
                        {document.base_fee !== undefined && (<div className="flex justify-between text-sm">
                            <dt className="text-gray-500 flex items-center gap-1">
                              <lucide_react_1.CreditCard className="w-3 h-3"/>
                              基本料金
                            </dt>
                            <dd className="text-gray-900">¥{document.base_fee.toLocaleString()}</dd>
                          </div>)}
                        {document.additional_fee !== undefined && (<div className="flex justify-between text-sm">
                            <dt className="text-gray-500 flex items-center gap-1">
                              <lucide_react_1.CreditCard className="w-3 h-3"/>
                              追加料金
                            </dt>
                            <dd className="text-gray-900">¥{document.additional_fee.toLocaleString()}</dd>
                          </div>)}
                      </>)}
                    
                    {/* 明細情報 */}
                    {document.items && document.items.length > 0 && (<div className="pt-2 border-t">
                        <dt className="text-gray-500 text-sm mb-2">明細</dt>
                        <dd className="text-sm">
                          {document.items.map((item, index) => (<div key={index} className="flex justify-between py-1">
                              <span className="text-gray-700">{item.item_name}</span>
                              <span className="text-gray-900">¥{item.amount.toLocaleString()}</span>
                            </div>))}
                        </dd>
                      </div>)}
                    
                    {document.confidence && (<div className="flex justify-between text-sm pt-2 border-t">
                        <dt className="text-gray-500">信頼度</dt>
                        <dd className="text-gray-900">{Math.round(document.confidence * 100)}%</dd>
                      </div>)}
                    {document.file_name && (<div className="flex justify-between text-sm">
                        <dt className="text-gray-500">ファイル名</dt>
                        <dd className="text-gray-900 truncate max-w-[150px]" title={document.file_name}>
                          {document.file_name}
                        </dd>
                      </div>)}
                    {document.file_size && (<div className="flex justify-between text-sm">
                        <dt className="text-gray-500">ファイルサイズ</dt>
                        <dd className="text-gray-900">
                          {(document.file_size / 1024).toFixed(1)} KB
                        </dd>
                      </div>)}
                  </dl>
                  <div className="space-y-2">
                    {document.gridfs_file_id && (<>
                        <a href={`/api/files/${document.gridfs_file_id}`} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors text-sm" onClick={async (e) => {
                    console.log('Clicking file view with ID:', document.gridfs_file_id);
                    // ファイルが存在するかチェック
                    try {
                        const response = await fetch(`/api/files/${document.gridfs_file_id}`, { method: 'HEAD' });
                        if (!response.ok) {
                            e.preventDefault();
                            react_hot_toast_1.toast.error('元ファイルが見つかりません');
                            console.error('File not found:', response.status);
                        }
                    }
                    catch (error) {
                        e.preventDefault();
                        react_hot_toast_1.toast.error('ファイルアクセスエラー');
                        console.error('File check error:', error);
                    }
                }}>
                          <lucide_react_1.Eye className="w-4 h-4"/>
                          元ファイルを表示
                        </a>
                        <a href={`/api/files/${document.gridfs_file_id}?download=true`} download className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors text-sm" onClick={async (e) => {
                    console.log('Clicking file download with ID:', document.gridfs_file_id);
                    // ファイルが存在するかチェック
                    try {
                        const response = await fetch(`/api/files/${document.gridfs_file_id}`, { method: 'HEAD' });
                        if (!response.ok) {
                            e.preventDefault();
                            react_hot_toast_1.toast.error('ダウンロードファイルが見つかりません');
                            console.error('Download file not found:', response.status);
                        }
                    }
                    catch (error) {
                        e.preventDefault();
                        react_hot_toast_1.toast.error('ダウンロードエラー');
                        console.error('Download check error:', error);
                    }
                }}>
                          <lucide_react_1.Download className="w-4 h-4"/>
                          ダウンロード
                        </a>
                      </>)}
                    {document.ocr_result_id && (<a href={`/api/ocr-results/${document.ocr_result_id}`} target="_blank" rel="noopener noreferrer" className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors text-sm">
                        <lucide_react_1.FileText className="w-4 h-4"/>
                        OCR結果を表示
                      </a>)}
                  </div>
                </div>)}

              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">更新履歴</h3>
                <div className="text-sm text-gray-500">
                  <p>作成日: {new Date(document.created_at).toLocaleString('ja-JP')}</p>
                  <p>更新日: {new Date(document.updated_at).toLocaleString('ja-JP')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AIチャットコンポーネントを追加 */}
        <div className="mt-6">
          <DocumentAIChat_1.default document={document} documentId={document.id}/>
        </div>
      </div>
    </div>);
}
