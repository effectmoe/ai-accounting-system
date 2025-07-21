'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function OCRUpload() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const processImage = async (file: File) => {
    console.log('🎯 [OCR Upload] ファイル処理開始:', file.name, 'サイズ:', file.size, 'タイプ:', file.type);
    
    try {
      // 1. 先にGoogle Driveにアップロード
      console.log('📤 [OCR Upload] Google Driveアップロード開始...');
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload/gdrive', {
        method: 'POST',
        body: formData
      });

      console.log('📡 [OCR Upload] Google Driveレスポンス:', {
        status: uploadResponse.status,
        ok: uploadResponse.ok
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('❌ [OCR Upload] Google Driveエラー:', errorData);
        throw new Error(`Google Driveへのアップロードに失敗しました: ${errorData.error || uploadResponse.status}`);
      }

      const uploadResult = await uploadResponse.json();
      console.log('✅ [OCR Upload] Google Drive成功:', uploadResult);
      const gdriveFileId = uploadResult.fileId;

      // 2. OCR処理を実行
      console.log('🔍 [OCR Upload] OCR処理開始...');
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', 'invoice');
        formData.append('companyId', '11111111-1111-1111-1111-111111111111');

        const response = await fetch('/api/ocr/analyze', {
          method: 'POST',
          body: formData
        });

        console.log('📡 [OCR Upload] OCRレスポンス:', {
          status: response.status,
          ok: response.ok
        });

        const result = await response.json();
        console.log('📊 [OCR Upload] OCR結果:', result);
        
        if (result.success) {
          setResults(prev => [...prev, { 
            file: file.name, 
            gdriveFileId: gdriveFileId,
            ...result.data 
          }]);
          toast.success(`${file.name} の処理が完了しました`);
          console.log('✅ [OCR Upload] OCR処理完了!');
          
          // デモモードの場合は追加のメッセージ
          if (result.demo) {
            toast.info('デモモード: モックデータが保存されました', { duration: 4000 });
          }
        } else {
          console.error('❌ [OCR Upload] OCR処理失敗:', result.error);
          toast.error(`${file.name} の処理に失敗: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ [OCR Upload] OCR処理エラー:', error);
        toast.error(`エラー: ${error}`);
      }
    } catch (error) {
      console.error('❌ [OCR Upload] アップロードエラー:', error);
      toast.error(`${file.name} のアップロードに失敗: ${error}`);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('📁 [OCR Upload] ファイルドロップ:', acceptedFiles.length, '個のファイル');
    setIsProcessing(true);
    
    for (const file of acceptedFiles) {
      await processImage(file);
    }
    
    setIsProcessing(false);
    console.log('🏁 [OCR Upload] 全ファイル処理完了');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const saveToDatabase = async (data: any) => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'receipt',
          vendor: data.vendor,
          date: data.date,
          amount: data.amount,
          items: data.items,
          category: data.category,
          rawText: data.rawText
        })
      });

      if (response.ok) {
        toast.success('データベースに保存しました');
        // 結果から削除
        setResults(prev => prev.filter(r => r !== data));
      } else {
        toast.error('保存に失敗しました');
      }
    } catch (error) {
      toast.error(`エラー: ${error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* アップロードエリア */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} disabled={isProcessing} />
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {isDragActive ? (
          <p className="text-lg">ファイルをドロップしてください</p>
        ) : (
          <>
            <p className="text-lg mb-2">領収書・請求書の画像をドラッグ＆ドロップ</p>
            <p className="text-sm text-gray-500">または、クリックしてファイルを選択</p>
            <p className="text-xs text-gray-400 mt-2">対応形式: JPEG, PNG, PDF</p>
          </>
        )}
      </div>

      {/* 処理中表示 */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span className="text-blue-700">OCR処理中...</span>
          </div>
        </div>
      )}

      {/* 結果表示 */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">OCR結果</h3>
          {results.map((result, index) => (
            <div key={index} className="bg-white border rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium">{result.file}</h4>
                <button
                  onClick={() => saveToDatabase(result)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  保存
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">店舗名:</span>
                  <span className="ml-2 font-medium">{result.vendor || '不明'}</span>
                </div>
                <div>
                  <span className="text-gray-500">日付:</span>
                  <span className="ml-2 font-medium">{result.date || '不明'}</span>
                </div>
                <div>
                  <span className="text-gray-500">金額:</span>
                  <span className="ml-2 font-medium">¥{result.amount?.toLocaleString() || '0'}</span>
                </div>
                <div>
                  <span className="text-gray-500">カテゴリ:</span>
                  <span className="ml-2 font-medium">{result.category || '未分類'}</span>
                </div>
              </div>

              {result.items && result.items.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-1">品目:</p>
                  <ul className="text-sm space-y-1">
                    {result.items.map((item: any, i: number) => (
                      <li key={i} className="flex justify-between">
                        <span>{item.name}</span>
                        <span>¥{item.price?.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="mt-3">
                <summary className="text-sm text-gray-500 cursor-pointer">生テキスト</summary>
                <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                  {result.rawText}
                </pre>
              </details>
            </div>
          ))}
          
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <button
              onClick={() => setResults([])}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              結果をクリア
            </button>
            <a
              href="/documents"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              書類一覧で確認
            </a>
          </div>
        </div>
      )}
    </div>
  );
}