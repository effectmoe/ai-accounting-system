"use strict";
'use client';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NewDocumentPage;
const react_1 = require("react");
const navigation_1 = require("next/navigation");
const link_1 = __importDefault(require("next/link"));
const lucide_react_1 = require("lucide-react");
const react_hot_toast_1 = require("react-hot-toast");
function NewDocumentContent() {
    const router = (0, navigation_1.useRouter)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [file, setFile] = (0, react_1.useState)(null);
    const [dragActive, setDragActive] = (0, react_1.useState)(false);
    const [documentType, setDocumentType] = (0, react_1.useState)('general');
    // URLパラメータに基づいてドキュメントタイプを設定
    (0, react_1.useEffect)(() => {
        const type = searchParams.get('type');
        if (type === 'supplier-quote') {
            setDocumentType('supplier-quote');
        }
    }, [searchParams]);
    const handleFileUpload = async (selectedFile) => {
        if (!selectedFile)
            return;
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            let apiEndpoint = '/api/ocr/process';
            let successMessage = 'ドキュメントをアップロードしました';
            let redirectPath = '/documents';
            // 仕入先見積書の場合は専用のAPIを使用
            if (documentType === 'supplier-quote') {
                apiEndpoint = '/api/ocr/supplier-quote';
                successMessage = '仕入先見積書をOCRで処理しました';
                redirectPath = '/supplier-quotes';
            }
            const response = await fetch(apiEndpoint, {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                throw new Error('OCR処理に失敗しました');
            }
            const result = await response.json();
            if (result.success) {
                react_hot_toast_1.toast.success(successMessage);
                // 仕入先見積書の場合は作成された見積書の詳細ページに遷移
                if (documentType === 'supplier-quote' && result.supplierQuote) {
                    router.push(`/supplier-quotes/${result.supplierQuote.id}`);
                }
                else {
                    router.push(redirectPath);
                }
            }
            else {
                throw new Error(result.error || 'OCR処理に失敗しました');
            }
        }
        catch (error) {
            console.error('Upload error:', error);
            react_hot_toast_1.toast.error(error instanceof Error ? error.message : 'アップロードに失敗しました');
        }
        finally {
            setLoading(false);
        }
    };
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        }
        else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            setFile(droppedFile);
            handleFileUpload(droppedFile);
        }
    };
    const handleFileChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            handleFileUpload(selectedFile);
        }
    };
    return (<div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <link_1.default href="/documents" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <lucide_react_1.ArrowLeft size={20}/>
            戻る
          </link_1.default>
          <h1 className="text-2xl font-bold text-gray-900">新規ドキュメント</h1>
        </div>
      </div>

      {/* ドキュメントタイプの選択 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ドキュメントタイプを選択</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div onClick={() => setDocumentType('general')} className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${documentType === 'general'
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 ${documentType === 'general'
            ? 'border-blue-500 bg-blue-500'
            : 'border-gray-300'}`}>
                {documentType === 'general' && (<div className="w-full h-full rounded-full bg-white scale-50"></div>)}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">一般的な書類</h3>
                <p className="text-sm text-gray-600">領収書、請求書、その他の書類</p>
              </div>
            </div>
          </div>
          
          <div onClick={() => setDocumentType('supplier-quote')} className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${documentType === 'supplier-quote'
            ? 'border-green-500 bg-green-50'
            : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 ${documentType === 'supplier-quote'
            ? 'border-green-500 bg-green-500'
            : 'border-gray-300'}`}>
                {documentType === 'supplier-quote' && (<div className="w-full h-full rounded-full bg-white scale-50"></div>)}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">仕入先見積書</h3>
                <p className="text-sm text-gray-600">仕入先からの見積書（推奨）</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* アップロード方法の選択 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* OCRアップロード */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <lucide_react_1.Upload className="w-6 h-6 text-blue-600"/>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">OCRアップロード</h2>
              <p className="text-sm text-gray-600">画像やPDFから自動でテキストを抽出</p>
            </div>
          </div>
          
          <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'}`} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <lucide_react_1.FileText className="w-8 h-8 text-gray-600"/>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              ファイルをドラッグ&ドロップ
            </p>
            <p className="text-sm text-gray-600 mb-4">
              または以下のボタンからファイルを選択
            </p>
            <div className="flex justify-center">
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer inline-flex items-center gap-2">
                <lucide_react_1.Upload size={16}/>
                ファイルを選択
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} disabled={loading}/>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              対応形式: JPG, PNG, PDF (最大10MB)
            </p>
          </div>

          {loading && (<div className="mt-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">処理中...</span>
            </div>)}
        </div>

        {/* 手動作成 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <lucide_react_1.Plus className="w-6 h-6 text-green-600"/>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">手動作成</h2>
              <p className="text-sm text-gray-600">フォームから直接ドキュメントを作成</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <link_1.default href="/quotes/new" className="block w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">見積書</h3>
                  <p className="text-sm text-gray-600">新しい見積書を作成</p>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </link_1.default>
            
            <link_1.default href="/invoices/new" className="block w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">請求書</h3>
                  <p className="text-sm text-gray-600">新しい請求書を作成</p>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </link_1.default>

            <link_1.default href="/supplier-quotes/new" className="block w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">仕入先見積書</h3>
                  <p className="text-sm text-gray-600">新しい仕入先見積書を作成</p>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </link_1.default>
          </div>
        </div>
      </div>

      {/* 使用方法 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">使用方法</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">OCRアップロード</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. 領収書や請求書の画像/PDFを準備</li>
              <li>2. ファイルをドラッグ&ドロップまたは選択</li>
              <li>3. 自動でテキストが抽出され、データが作成されます</li>
              <li>4. 必要に応じて内容を編集・確認</li>
            </ol>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">手動作成</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. 作成したいドキュメントの種類を選択</li>
              <li>2. フォームに必要な情報を入力</li>
              <li>3. 内容を確認して保存</li>
              <li>4. 必要に応じてPDF出力や送信</li>
            </ol>
          </div>
        </div>
      </div>
    </div>);
}
function NewDocumentPage() {
    return (<react_1.Suspense fallback={<div className="container mx-auto p-6">読み込み中...</div>}>
      <NewDocumentContent />
    </react_1.Suspense>);
}
