'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

import { logger } from '@/lib/logger';
export default function OCRUploadAzure() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [documentType, setDocumentType] = useState<'supplier-quote' | 'purchase-invoice'>('supplier-quote');
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const createSupplierQuote = async (ocrData: any, fileId: string) => {
    try {
      logger.debug('[OCR Upload] Creating supplier quote with fileId:', fileId);
      
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
          taxRate: item.taxRate !== undefined ? item.taxRate : 10,
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
      
      logger.debug('[OCR Upload] Supplier quote data:', supplierQuoteData);
      
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
      logger.debug('[OCR Upload] Created supplier quote:', createdQuote);
      
      toast.success('仕入先見積書が作成されました！', { duration: 4000 });
      
      // 作成した見積書のページに移動するオプション
      // window.location.href = `/supplier-quotes/${createdQuote._id}`;
      
    } catch (error) {
      logger.error('[OCR Upload] Error creating supplier quote:', error);
      toast.error(`仕入先見積書の作成に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  const createPurchaseInvoice = async (ocrData: any, fileId: string) => {
    try {
      logger.debug('[OCR Upload] Creating purchase invoice with fileId:', fileId);
      
      // OCRデータを仕入請求書形式に変換
      const purchaseInvoiceData = {
        invoiceNumber: ocrData.documentNumber || `PI-${Date.now()}`,
        issueDate: ocrData.issueDate || new Date().toISOString().split('T')[0],
        dueDate: ocrData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        
        // 仕入先情報（OCRで認識された発行元）
        vendorName: ocrData.vendor?.name || '不明',
        vendorAddress: ocrData.vendor?.address || '',
        vendorPhone: ocrData.vendor?.phone || '',
        vendorEmail: ocrData.vendor?.email || '',
        vendorFax: ocrData.vendor?.fax || '',
        vendor: ocrData.vendor, // vendor オブジェクト全体も送信
        
        // 商品情報
        items: ocrData.items?.map((item: any) => ({
          itemName: item.itemName || '商品',
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          amount: item.amount || 0,
          taxRate: item.taxRate !== undefined ? item.taxRate : 10,
          taxAmount: item.taxAmount || 0,
          remarks: item.remarks || ''
        })) || [],
        
        // 金額情報
        subtotal: ocrData.subtotal || 0,
        taxAmount: ocrData.taxAmount || 0,
        totalAmount: ocrData.totalAmount || 0,
        taxRate: 10, // デフォルト税率
        
        // 追加情報
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
        status: 'received',
        paymentStatus: 'pending'
      };
      
      logger.debug('[OCR Upload] Purchase invoice data:', purchaseInvoiceData);
      
      // 仕入請求書APIを呼び出し
      const response = await fetch('/api/purchase-invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseInvoiceData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '仕入請求書の作成に失敗しました');
      }

      const createdInvoice = await response.json();
      logger.debug('[OCR Upload] Created purchase invoice:', createdInvoice);
      
      toast.success('仕入請求書が作成されました！', { duration: 4000 });
      
      // 作成した請求書のページに移動するオプション
      // window.location.href = `/purchase-invoices/${createdInvoice._id}`;
      
    } catch (error) {
      logger.error('[OCR Upload] Error creating purchase invoice:', error);
      toast.error(`仕入請求書の作成に失敗: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const processImage = async (file: File) => {
    try {
      // AI駆動のOCR処理
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType); // 選択されたドキュメントタイプ
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
          documentType: documentType,
          ...result.data 
        }]);
        toast.success(`${file.name} の処理が完了しました (${result.processingMethod})`);
        
        // AI駆動処理の成功通知
        if (result.processingMethod === 'AI-driven') {
          toast.success('AI駆動のOCR解析が完了しました', { duration: 4000 });
        }
        
        // ドキュメントタイプに応じて処理
        if (result.data && result.fileId) {
          if (documentType === 'supplier-quote') {
            await createSupplierQuote(result.data, result.fileId);
          } else if (documentType === 'purchase-invoice') {
            await createPurchaseInvoice(result.data, result.fileId);
          }
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
      {/* ドキュメントタイプ選択 */}
      <div className="flex items-center space-x-4">
        <label className="font-medium text-gray-700">ドキュメントタイプ:</label>
        <select
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as 'supplier-quote' | 'purchase-invoice')}
          className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="supplier-quote">仕入先見積書</option>
          <option value="purchase-invoice">仕入請求書</option>
        </select>
      </div>
      
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
              AI駆動のOCR処理 (DeepSeek) を実行します
            </p>
            <p className="text-sm text-green-600 mt-1">
              選択中: {documentType === 'supplier-quote' ? '仕入先見積書' : '仕入請求書'}として処理
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
                    onClick={() => {
                      setSelectedResult(result);
                      setShowDetailModal(true);
                    }}
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

      {/* 詳細表示モーダル */}
      {showDetailModal && selectedResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">OCR解析結果詳細</h2>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
              <div className="space-y-4">
                {/* 基本情報 */}
                <div>
                  <h3 className="font-semibold text-lg mb-2">基本情報</h3>
                  <div className="bg-gray-50 p-4 rounded space-y-2">
                    <p><span className="font-medium">処理方法:</span> {selectedResult.processingMethod}</p>
                    <p><span className="font-medium">AIモデル:</span> {selectedResult.model}</p>
                    <p><span className="font-medium">ファイル名:</span> {selectedResult.fileName}</p>
                  </div>
                </div>

                {/* 構造化データ */}
                {selectedResult.structuredData && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">抽出データ</h3>
                    <div className="bg-gray-50 p-4 rounded space-y-4">
                      {/* 基本情報セクション */}
                      {(selectedResult.structuredData.subject || selectedResult.structuredData.documentNumber || selectedResult.structuredData.issueDate) && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">基本情報</h4>
                          <div className="space-y-1 text-sm">
                            {selectedResult.structuredData.subject && (
                              <p><span className="font-medium">件名:</span> {selectedResult.structuredData.subject}</p>
                            )}
                            {selectedResult.structuredData.documentNumber && (
                              <p><span className="font-medium">文書番号:</span> {selectedResult.structuredData.documentNumber}</p>
                            )}
                            {selectedResult.structuredData.issueDate && (
                              <p><span className="font-medium">発行日:</span> {selectedResult.structuredData.issueDate}</p>
                            )}
                            {selectedResult.structuredData.validityDate && (
                              <p><span className="font-medium">有効期限:</span> {selectedResult.structuredData.validityDate}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 仕入先情報 */}
                      {selectedResult.structuredData.vendor && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">仕入先情報</h4>
                          <div className="space-y-1 text-sm">
                            {selectedResult.structuredData.vendor.name && (
                              <p><span className="font-medium">会社名:</span> {selectedResult.structuredData.vendor.name}</p>
                            )}
                            {selectedResult.structuredData.vendor.address && (
                              <p><span className="font-medium">住所:</span> {selectedResult.structuredData.vendor.address}</p>
                            )}
                            {selectedResult.structuredData.vendor.phone && (
                              <p><span className="font-medium">電話番号:</span> {selectedResult.structuredData.vendor.phone}</p>
                            )}
                            {selectedResult.structuredData.vendor.fax && (
                              <p><span className="font-medium">FAX:</span> {selectedResult.structuredData.vendor.fax}</p>
                            )}
                            {selectedResult.structuredData.vendor.email && (
                              <p><span className="font-medium">メール:</span> {selectedResult.structuredData.vendor.email}</p>
                            )}
                            {selectedResult.structuredData.vendor.website && (
                              <p><span className="font-medium">ウェブサイト:</span> {selectedResult.structuredData.vendor.website}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 顧客情報 */}
                      {selectedResult.structuredData.customer && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">顧客情報</h4>
                          <div className="space-y-1 text-sm">
                            {selectedResult.structuredData.customer.name && (
                              <p><span className="font-medium">会社名:</span> {selectedResult.structuredData.customer.name}</p>
                            )}
                            {selectedResult.structuredData.customer.address && (
                              <p><span className="font-medium">住所:</span> {selectedResult.structuredData.customer.address}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 商品明細 */}
                      {selectedResult.structuredData.items && selectedResult.structuredData.items.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">商品明細</h4>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">商品名</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">数量</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">単価</th>
                                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {selectedResult.structuredData.items.map((item: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="px-3 py-2 text-sm">{item.itemName || item.description || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-right">{item.quantity || '-'}</td>
                                    <td className="px-3 py-2 text-sm text-right">
                                      {item.unitPrice ? `¥${item.unitPrice.toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-sm text-right">
                                      {item.amount ? `¥${item.amount.toLocaleString()}` : '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* 金額情報 */}
                      {(selectedResult.structuredData.subtotal || selectedResult.structuredData.taxAmount || selectedResult.structuredData.totalAmount) && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">金額情報</h4>
                          <div className="space-y-1 text-sm">
                            {selectedResult.structuredData.subtotal && (
                              <p><span className="font-medium">小計:</span> ¥{selectedResult.structuredData.subtotal.toLocaleString()}</p>
                            )}
                            {selectedResult.structuredData.taxAmount && (
                              <p><span className="font-medium">税額:</span> ¥{selectedResult.structuredData.taxAmount.toLocaleString()}</p>
                            )}
                            {selectedResult.structuredData.totalAmount && (
                              <p className="text-lg"><span className="font-medium">合計金額:</span> <span className="font-bold">¥{selectedResult.structuredData.totalAmount.toLocaleString()}</span></p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* その他の情報 */}
                      {(selectedResult.structuredData.deliveryLocation || selectedResult.structuredData.paymentTerms || selectedResult.structuredData.notes) && (
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">その他の情報</h4>
                          <div className="space-y-1 text-sm">
                            {selectedResult.structuredData.deliveryLocation && (
                              <p><span className="font-medium">納品場所:</span> {selectedResult.structuredData.deliveryLocation}</p>
                            )}
                            {selectedResult.structuredData.paymentTerms && (
                              <p><span className="font-medium">支払条件:</span> {selectedResult.structuredData.paymentTerms}</p>
                            )}
                            {selectedResult.structuredData.notes && (
                              <p><span className="font-medium">備考:</span> {selectedResult.structuredData.notes}</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 生JSONデータ表示（デバッグ用） */}
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">生データを表示</summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                          {JSON.stringify(selectedResult.structuredData, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                )}

                {/* エラー情報 */}
                {selectedResult.error && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-red-600">エラー</h3>
                    <div className="bg-red-50 p-4 rounded">
                      <p className="text-red-700">{selectedResult.error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedResult(null);
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}