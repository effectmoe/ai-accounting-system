'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export default function OCRUploadAzure() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const createSupplierQuote = async (ocrData: any, fileId: string) => {
    try {
      console.log('[OCR Upload] Creating supplier quote with fileId:', fileId);
      
      // OCRデータを仕入先見積書形式に変換
      const supplierQuoteData = {
        subject: ocrData.subject || '印刷物',
        quoteNumber: ocrData.documentNumber || `SQ-${Date.now()}`,
        issueDate: ocrData.issueDate || new Date().toISOString().split('T')[0],
        validityDate: ocrData.validityDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        
        // 仕入先情報（OCRで認識された発行元）
        vendorName: ocrData.vendor?.name || '不明',
        vendorAddress: ocrData.vendor?.address || '',
        vendorPhone: ocrData.vendor?.phone || '',
        vendorEmail: ocrData.vendor?.email || '',
        vendorFax: ocrData.vendor?.fax || '',
        
        // 顧客情報（OCRで認識された宛先）
        customerName: ocrData.customer?.name || '株式会社CROP',
        customerAddress: ocrData.customer?.address || '',
        
        // 商品情報
        items: ocrData.items?.map((item: any) => ({
          itemName: item.itemName || '商品',
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          amount: item.amount || 0,
          taxRate: item.taxRate || 10,
          taxAmount: item.taxAmount || 0,
          remarks: item.remarks || ''
        })) || [],
        
        // 金額情報
        subtotal: ocrData.subtotal || 0,
        taxAmount: ocrData.taxAmount || 0,
        totalAmount: ocrData.totalAmount || 0,
        
        // 追加情報
        deliveryLocation: ocrData.deliveryLocation || '',
        paymentTerms: ocrData.paymentTerms || '',
        quotationValidity: ocrData.quotationValidity || '',
        notes: ocrData.notes || '',
        
        // OCRメタデータ
        isGeneratedByAI: true,
        aiGenerationMetadata: {
          source: 'Azure Form Recognizer + DeepSeek',
          confidence: 0.8,
          timestamp: new Date()
        },
        
        // ファイルID
        fileId: fileId,
        
        // ステータス
        status: 'draft'
      };
      
      console.log('[OCR Upload] Supplier quote data:', supplierQuoteData);
      
      // 仕入先見積書APIを呼び出し
      const response = await fetch('/api/supplier-quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supplierQuoteData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '仕入先見積書の作成に失敗しました');
      }

      const createdQuote = await response.json();
      console.log('[OCR Upload] Created supplier quote:', createdQuote);
      
      toast.success('仕入先見積書が作成されました！', { duration: 4000 });
      
      // 作成した見積書のページに移動するオプション
      // window.location.href = `/supplier-quotes/${createdQuote._id}`;
      
    } catch (error) {
      console.error('[OCR Upload] Error creating supplier quote:', error);
      toast.error(`仕入先見積書の作成に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const processImage = async (file: File) => {
    try {
      // AI駆動のOCR処理
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', 'supplier-quote'); // 見積書として処理
      formData.append('companyId', '11111111-1111-1111-1111-111111111111');

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
          processingMethod: result.processingMethod,
          model: result.model,
          structuredData: result.data,
          fileId: result.fileId, // GridFSのファイルIDを追加
          ...result.data 
        }]);
        toast.success(`${file.name} の処理が完了しました (${result.processingMethod})`);
        
        // AI駆動処理の成功通知
        if (result.processingMethod === 'AI-driven') {
          toast.success('AI駆動のOCR解析が完了しました', { duration: 4000 });
        }
        
        // 仕入先見積書として処理する場合、自動的に見積書を作成
        if (result.data && result.fileId) {
          await createSupplierQuote(result.data, result.fileId);
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
      // AI駆動のOCR結果を使用
      if (data.structuredData) {
        const response = await fetch('/api/documents/create-from-ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aiStructuredData: data.structuredData,
            companyId: '11111111-1111-1111-1111-111111111111',
            processingMethod: data.processingMethod,
            model: data.model
          })
        });

        const result = await response.json();
        if (result.success !== false) {
          toast.success('AI駆動のOCR結果からドキュメントが作成されました');
        } else {
          toast.error('データベース保存に失敗: ' + result.error);
        }
      } else {
        // 従来の処理にフォールバック
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
              AI駆動のOCR処理 (Claude 3.5 Sonnet) を実行します
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
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium">{result.file}</h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  result.processingMethod === 'AI-driven' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {result.processingMethod || 'Legacy'}
                </span>
              </div>
              
              <div className="mt-2 space-y-1 text-sm">
                {result.subject && (
                  <p><strong>件名:</strong> {result.subject}</p>
                )}
                {result.vendor?.name && (
                  <p><strong>仕入先:</strong> {result.vendor.name}</p>
                )}
                {result.customer?.name && (
                  <p><strong>顧客:</strong> {result.customer.name}</p>
                )}
                {result.totalAmount && (
                  <p><strong>合計金額:</strong> ¥{result.totalAmount.toLocaleString()}</p>
                )}
                {result.subtotal && (
                  <p><strong>小計:</strong> ¥{result.subtotal.toLocaleString()}</p>
                )}
                {result.taxAmount && (
                  <p><strong>税額:</strong> ¥{result.taxAmount.toLocaleString()}</p>
                )}
                {result.issueDate && (
                  <p><strong>発行日:</strong> {result.issueDate}</p>
                )}
                {result.items && result.items.length > 0 && (
                  <div>
                    <p><strong>商品:</strong></p>
                    <ul className="ml-4 mt-1 space-y-1">
                      {result.items.map((item: any, itemIndex: number) => (
                        <li key={itemIndex} className="text-xs">
                          {item.itemName} - 数量: {item.quantity} - 金額: ¥{item.amount?.toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.model && (
                  <p className="text-gray-500"><strong>AIモデル:</strong> {result.model}</p>
                )}
              </div>
              
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => saveToDatabase(result)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                >
                  データベースに保存
                </button>
                {result.structuredData && (
                  <button
                    onClick={() => console.log('Structured Data:', result.structuredData)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                  >
                    詳細表示
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}