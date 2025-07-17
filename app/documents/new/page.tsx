'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, FileText, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { OCRItemExtractor } from '@/lib/ocr-item-extractor';

// OCR結果を仕入先見積書に変換する関数
async function convertOCRToSupplierQuote(ocrResult: any) {
  // OCR結果から仕入先見積書データを抽出
  const extractedData = ocrResult.extractedData || {};
  
  console.log('[convertOCRToSupplierQuote] 全抽出データ:', extractedData);
  
  // 仕入先名の正しい抽出（請求書の文脈を理解）
  let vendorName = '';
  
  // Azure Form Recognizerでは、vendorName/customerNameが混同されることがある
  const extractedVendorName = extractedData.vendorName || extractedData.VendorName;
  const extractedCustomerName = extractedData.customerName || extractedData.CustomerName;
  const vendorAddressRecipient = extractedData.VendorAddressRecipient;
  
  // 「御中」チェックで正しい仕入先を特定
  if (extractedVendorName && extractedVendorName.includes('御中')) {
    // vendorNameに「御中」がある場合、Azure OCRが混同している
    vendorName = vendorAddressRecipient || 
                 extractedData.RemittanceAddressRecipient ||
                 extractedCustomerName ||
                 'OCR抽出仕入先';
  } else if (vendorAddressRecipient && !vendorAddressRecipient.includes('御中')) {
    // VendorAddressRecipientに会社名があり、「御中」がない場合、これが仕入先
    vendorName = vendorAddressRecipient;
  } else {
    // 通常のケース
    vendorName = extractedVendorName || 
                 vendorAddressRecipient ||
                 'OCR抽出仕入先';
  }
  
  // 「御中」を除去
  vendorName = vendorName.replace(/\s*御中\s*$/, '').trim();
  
  console.log('[convertOCRToSupplierQuote] 最終仕入先名:', vendorName);
  
  // 項目の抽出（改善されたエクストラクターを使用）
  console.log('[convertOCRToSupplierQuote] OCRデータ全体:', JSON.stringify(extractedData, null, 2));
  
  // itemsフィールドの内容を詳しく確認
  if (extractedData.items && Array.isArray(extractedData.items)) {
    console.log('[convertOCRToSupplierQuote] items配列の詳細:');
    extractedData.items.forEach((item: any, index: number) => {
      console.log(`  アイテム[${index}]:`, JSON.stringify(item, null, 2));
    });
  }
  
  // テーブルやラインアイテムの存在確認
  const tableFields = ['tables', 'Tables', 'lineItems', 'LineItems', 'invoiceItems', 'InvoiceItems'];
  for (const field of tableFields) {
    if (extractedData[field]) {
      console.log(`[convertOCRToSupplierQuote] ${field}フィールド発見:`, JSON.stringify(extractedData[field], null, 2));
    }
  }
  
  // OCRItemExtractorを使用して商品情報を抽出
  let items = OCRItemExtractor.extractItemsFromOCR(extractedData);
  
  console.log('[convertOCRToSupplierQuote] 抽出された項目:', items);
  
  // 金額抽出の改善（複数のフィールドを確認）
  const extractAmount = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const match = value.match(/[\d,]+/);
      if (match) {
        return parseInt(match[0].replace(/,/g, ''));
      }
    }
    if (typeof value === 'object' && value?.amount) {
      return value.amount;
    }
    return 0;
  };

  // より多くのフィールドから金額を抽出
  const totalAmountFromOCR = extractAmount(extractedData.totalAmount) || 
                            extractAmount(extractedData.total) || 
                            extractAmount(extractedData.InvoiceTotal) ||
                            extractAmount(extractedData.TotalAmount) ||
                            extractAmount(extractedData.Amount) || 0;
  
  const taxAmountFromOCR = extractAmount(extractedData.taxAmount) || 
                          extractAmount(extractedData.tax) || 
                          extractAmount(extractedData.TotalTax) || 0;

  console.log('[convertOCRToSupplierQuote] 抽出された金額:', {
    totalAmountFromOCR,
    taxAmountFromOCR,
    originalData: {
      totalAmount: extractedData.totalAmount,
      InvoiceTotal: extractedData.InvoiceTotal,
      taxAmount: extractedData.taxAmount
    }
  });

  // アイテムがない場合、または全てのアイテムの金額が0の場合、総額から推定
  const hasValidAmounts = items.some(item => (item.amount || 0) > 0);
  
  if (items.length === 0 || !hasValidAmounts) {
    if (totalAmountFromOCR > 0) {
      const itemAmount = totalAmountFromOCR - taxAmountFromOCR;
      
      // アイテムがない場合は新規作成
      items.push({
        itemName: '商品',
        description: '',
        quantity: 1,
        unitPrice: itemAmount,
        amount: itemAmount,
        taxRate: 10,
        taxAmount: taxAmountFromOCR || itemAmount * 0.1
      });
      
      console.log('[convertOCRToSupplierQuote] 新規項目を作成:', items[0]);
    }
  }
  
  // 合計金額の計算
  const subtotal = items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
  const calculatedTaxAmount = items.reduce((sum: number, item: any) => sum + (item.taxAmount || 0), 0);
  const taxAmount = taxAmountFromOCR || calculatedTaxAmount || subtotal * 0.1;
  const totalAmount = totalAmountFromOCR || subtotal + taxAmount;
  
  console.log('[convertOCRToSupplierQuote] 最終計算:', {
    subtotal,
    calculatedTaxAmount,
    taxAmountFromOCR,
    finalTaxAmount: taxAmount,
    totalAmountFromOCR,
    finalTotalAmount: totalAmount
  });
  
  // 発行日の正しい抽出と変換
  let issueDate = new Date().toISOString();
  
  // extractedDataから日付を抽出
  const dateFields = [
    extractedData.invoiceDate,
    extractedData.transactionDate,
    extractedData.InvoiceDate,
    extractedData.TransactionDate,
    extractedData.date
  ];
  
  console.log('[convertOCRToSupplierQuote] 日付フィールドの確認:', dateFields);
  
  for (const dateField of dateFields) {
    if (dateField && typeof dateField === 'string') {
      try {
        // 日本語日付形式の変換（2025年07月09日 → 2025-07-09）
        let normalizedDate = dateField;
        
        // 年月日形式の正規化
        if (normalizedDate.includes('年') && normalizedDate.includes('月') && normalizedDate.includes('日')) {
          normalizedDate = normalizedDate
            .replace(/年/g, '-')
            .replace(/月/g, '-')
            .replace(/日/g, '')
            .trim();
        }
        
        const parsedDate = new Date(normalizedDate);
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000) {
          issueDate = parsedDate.toISOString();
          console.log('[convertOCRToSupplierQuote] 発行日を正常に抽出:', {
            original: dateField,
            normalized: normalizedDate,
            parsed: issueDate
          });
          break;
        }
      } catch (error) {
        console.log('[convertOCRToSupplierQuote] 日付変換エラー:', dateField, error);
      }
    }
  }
  
  // 赤枠の4項目を抽出
  const subject = extractedData.subject || extractedData.Subject || 'OCR見積書';
  const deliveryLocation = extractedData.deliveryLocation || extractedData.DeliveryLocation || '';
  const paymentTerms = extractedData.paymentTerms || extractedData.PaymentTerms || 
                      extractedData.paymentTerm || extractedData.PaymentTerm || '';
  const quotationValidity = extractedData.quotationValidity || extractedData.QuotationValidity || '';
  
  console.log('[convertOCRToSupplierQuote] 追加フィールド:', {
    subject,
    deliveryLocation,
    paymentTerms,
    quotationValidity
  });
  
  // 仕入先見積書データの構築
  const supplierQuoteData = {
    vendorName,
    issueDate,
    validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
    items,
    subtotal,
    taxAmount,
    taxRate: 10,
    totalAmount,
    status: 'received',
    isGeneratedByAI: true,
    notes: 'OCRで自動生成された見積書',
    ocrResultId: ocrResult.ocrResultId,
    // 赤枠の4項目を追加
    subject,
    deliveryLocation,
    paymentTerms,
    quotationValidity
  };
  
  // 仕入先情報の詳細を取得
  const vendorAddress = extractedData.vendorAddress || extractedData.VendorAddress || '';
  const vendorPhone = extractedData.vendorPhoneNumber || extractedData.VendorPhoneNumber || 
                     extractedData.vendorPhone || extractedData.VendorPhone || '';
  const vendorEmail = extractedData.vendorEmail || extractedData.VendorEmail || '';
  
  // 仕入先が存在しない場合は作成
  if (vendorName && vendorName !== 'OCR抽出仕入先') {
    try {
      const vendorResponse = await fetch('/api/suppliers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: vendorName,
          address: vendorAddress,
          phone: vendorPhone,
          email: vendorEmail,
          contactPerson: '',
          isGeneratedByAI: true,
          notes: 'OCRで自動作成された仕入先'
        }),
      });
      
      if (vendorResponse.ok) {
        const vendor = await vendorResponse.json();
        console.log('[convertOCRToSupplierQuote] 仕入先を作成:', vendor);
      } else {
        console.log('[convertOCRToSupplierQuote] 仕入先作成失敗（既存の可能性）');
      }
    } catch (error) {
      console.error('[convertOCRToSupplierQuote] 仕入先作成エラー:', error);
    }
  }
  
  // 仕入先見積書APIに送信
  const response = await fetch('/api/supplier-quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(supplierQuoteData),
  });
  
  if (!response.ok) {
    const errorData = await response.text();
    console.error('[convertOCRToSupplierQuote] API Error:', errorData);
    throw new Error('仕入先見積書の作成に失敗しました');
  }
  
  const result = await response.json();
  console.log('[convertOCRToSupplierQuote] API Response:', result);
  
  // IDの確認
  if (!result._id && !result.id) {
    console.error('[convertOCRToSupplierQuote] No ID in response:', result);
  }
  
  // _idをidに変換（フロントエンドで一貫性を保つため）
  if (result._id && !result.id) {
    result.id = result._id;
  }
  
  return result;
}

function NewDocumentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [documentType, setDocumentType] = useState<'general' | 'supplier-quote'>('general');

  // URLパラメータに基づいてドキュメントタイプを設定
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'supplier-quote') {
      setDocumentType('supplier-quote');
    }
  }, [searchParams]);

  const handleFileUpload = async (selectedFile: File) => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // 共通のOCR APIを使用
      const apiEndpoint = '/api/ocr/analyze';
      let successMessage = 'ドキュメントをアップロードしました';
      let redirectPath = '/documents';

      // ドキュメントタイプに応じて設定を変更
      if (documentType === 'supplier-quote') {
        formData.append('documentType', 'supplier-quote');
        successMessage = '仕入先見積書をOCRで処理しました';
        redirectPath = '/supplier-quotes';
      } else {
        formData.append('documentType', 'receipt');
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('OCR処理に失敗しました');
      }

      const result = await response.json();
      
      console.log('[Documents New] OCR Response:', result);
      
      if (result.success) {
        toast.success(successMessage);
        
        // 仕入先見積書の場合は、OCR結果から仕入先見積書を作成
        if (documentType === 'supplier-quote') {
          try {
            const supplierQuoteData = await convertOCRToSupplierQuote(result);
            console.log('[Documents New] Created supplier quote:', supplierQuoteData.id);
            router.push(`/supplier-quotes/${supplierQuoteData.id}`);
          } catch (error) {
            console.error('Supplier quote creation error:', error);
            toast.error('仕入先見積書の作成に失敗しました');
            router.push(redirectPath);
          }
        } else {
          router.push(redirectPath);
        }
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

      {/* ドキュメントタイプの選択 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">ドキュメントタイプを選択</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setDocumentType('general')}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              documentType === 'general' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                documentType === 'general' 
                  ? 'border-blue-500 bg-blue-500' 
                  : 'border-gray-300'
              }`}>
                {documentType === 'general' && (
                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                )}
              </div>
              <div>
                <h3 className="font-medium text-gray-900">一般的な書類</h3>
                <p className="text-sm text-gray-600">領収書、請求書、その他の書類</p>
              </div>
            </div>
          </div>
          
          <div
            onClick={() => setDocumentType('supplier-quote')}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              documentType === 'supplier-quote' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full border-2 ${
                documentType === 'supplier-quote' 
                  ? 'border-green-500 bg-green-500' 
                  : 'border-gray-300'
              }`}>
                {documentType === 'supplier-quote' && (
                  <div className="w-full h-full rounded-full bg-white scale-50"></div>
                )}
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

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">読み込み中...</div>}>
      <NewDocumentContent />
    </Suspense>
  );
}