'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function NewDocumentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/ocr/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR処理に失敗しました');
      }

      const result = await response.json();
      
      if (result.success) {
        toast.success('ドキュメントをアップロードしました');
        router.push('/documents');
      } else {
        throw new Error(result.error || 'OCR処理に失敗しました');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'アップロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      handleFileUpload(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      handleFileUpload(selectedFile);
    }
  };

  return (
    <div className="container mx-auto p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/documents"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">新規ドキュメント</h1>
        </div>
      </div>

      {/* アップロード方法の選択 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* OCRアップロード */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">OCRアップロード</h2>
              <p className="text-sm text-gray-600">画像やPDFから自動でテキストを抽出</p>
            </div>
          </div>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              ファイルをドラッグ&ドロップ
            </p>
            <p className="text-sm text-gray-600 mb-4">
              または以下のボタンからファイルを選択
            </p>
            <div className="flex justify-center">
              <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md cursor-pointer inline-flex items-center gap-2">
                <Upload size={16} />
                ファイルを選択
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  disabled={loading}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              対応形式: JPG, PNG, PDF (最大10MB)
            </p>
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-sm text-gray-600">処理中...</span>
            </div>
          )}
        </div>

        {/* 手動作成 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Plus className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">手動作成</h2>
              <p className="text-sm text-gray-600">フォームから直接ドキュメントを作成</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Link
              href="/quotes/new"
              className="block w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">見積書</h3>
                  <p className="text-sm text-gray-600">新しい見積書を作成</p>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </Link>
            
            <Link
              href="/invoices/new"
              className="block w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">請求書</h3>
                  <p className="text-sm text-gray-600">新しい請求書を作成</p>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </Link>

            <Link
              href="/supplier-quotes/new"
              className="block w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-4 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">仕入先見積書</h3>
                  <p className="text-sm text-gray-600">新しい仕入先見積書を作成</p>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </Link>
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
    </div>
  );
}