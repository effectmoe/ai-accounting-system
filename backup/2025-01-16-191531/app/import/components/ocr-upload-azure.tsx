'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function OCRUploadAzure() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const processImage = async (file: File) => {
    try {
      // 新システム（Azure + MongoDB）でのOCR処理
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ocr/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'OCR処理に失敗しました');
      }

      const result = await response.json();
      
      if (result.success) {
        setResults(prev => [...prev, { 
          file: file.name, 
          ocrResultId: result.ocrResultId,
          extractedData: result.extractedData,
          confidence: result.confidence,
          ...result.data 
        }]);
        toast.success(`${file.name} の処理が完了しました`);
        
        // GridFSにファイルが保存されたことを通知
        if (result.fileId) {
          toast.success('ファイルがMongoDB GridFSに保存されました', { duration: 4000 });
        }
      } else {
        toast.error(`${file.name} の処理に失敗: ${result.error}`);
      }
    } catch (error) {
      toast.error(`${file.name} の処理エラー: ${error}`);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsProcessing(true);
    
    for (const file of acceptedFiles) {
      await processImage(file);
    }
    
    setIsProcessing(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.bmp', '.tiff'],
      'application/pdf': ['.pdf']
    },
    multiple: true,
    maxSize: 50 * 1024 * 1024 // 50MB
  });

  const saveToDatabase = async (data: any) => {
    try {
      const response = await fetch('/api/documents/create-from-ocr-mongodb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ocrResultId: data.ocrResultId,
          documentType: determineDocumentType(data),
          approvedBy: 'user'
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success('ドキュメントがデータベースに保存されました');
      } else {
        toast.error('データベース保存に失敗: ' + result.error);
      }
    } catch (error) {
      toast.error('データベース保存エラー: ' + error);
    }
  };

  const determineDocumentType = (data: any): string => {
    // ファイル名や抽出データから文書タイプを判定
    const fileName = data.file?.toLowerCase() || '';
    if (fileName.includes('invoice') || fileName.includes('請求')) {
      return 'invoice';
    } else if (fileName.includes('receipt') || fileName.includes('領収')) {
      return 'receipt';
    }
    return 'document';
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-600">ファイルをドロップしてください...</p>
        ) : (
          <>
            <p className="text-gray-600">
              ファイルをドラッグ&ドロップ、またはクリックして選択
            </p>
            <p className="text-sm text-gray-500 mt-2">
              対応形式: PDF, JPEG, PNG, BMP, TIFF (最大50MB)
            </p>
            <p className="text-sm text-blue-600 mt-2">
              Azure Form Recognizer でOCR処理を実行します
            </p>
          </>
        )}
      </div>

      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700">処理中...</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold">処理結果:</h3>
          {results.map((result, index) => (
            <div key={index} className="bg-white border rounded-lg p-4 shadow-sm">
              <h4 className="font-medium">{result.file}</h4>
              <div className="mt-2 space-y-1 text-sm">
                {result.extractedData?.vendorName && (
                  <p>取引先: {result.extractedData.vendorName}</p>
                )}
                {result.extractedData?.totalAmount && (
                  <p>金額: ¥{result.extractedData.totalAmount.toLocaleString()}</p>
                )}
                {result.extractedData?.invoiceDate && (
                  <p>日付: {new Date(result.extractedData.invoiceDate).toLocaleDateString('ja-JP')}</p>
                )}
                {result.confidence && (
                  <p className="text-gray-500">信頼度: {(result.confidence * 100).toFixed(1)}%</p>
                )}
              </div>
              <button
                onClick={() => saveToDatabase(result)}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                データベースに保存
              </button>
              {result.ocrResultId && (
                <p className="mt-2 text-xs text-gray-500">
                  OCR Result ID: {result.ocrResultId}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}