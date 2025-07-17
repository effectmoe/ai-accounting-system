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
  
  // 仕入先名の正しい抽出（請求書の文脈を理解）
  let vendorName = '';
  
  console.log('[convertOCRToSupplierQuote] 全抽出データ:', extractedData);
  
  // Azure Form Recognizerでは：
  // - vendorName/VendorName: 通常は発行者（売り手）
  // - customerName/CustomerName: 通常は宛先（買い手）
  // - 「御中」が付いているのは宛先（customerName）
  
  // 仕入先見積書の場合：発行者（売り手）が仕入先
  if (ocrResult.documentType === 'supplier-quote' || ocrResult.documentType === 'invoice') {
    // まず、customerNameが設定されている場合、vendorNameと逆転している可能性をチェック
    if (extractedData.customerName && extractedData.customerName.includes('御中')) {
      // customerNameに「御中」がある場合、これは宛先（自社）
      // vendorNameが正しい仕入先である可能性が高い
      vendorName = extractedData.vendorName || 
                   extractedData.VendorName || 
                   extractedData.VendorAddressRecipient ||
                   'OCR自動登録仕入先';
    } else if (extractedData.vendorName && extractedData.vendorName.includes('御中')) {
      // vendorNameに「御中」がある場合、Azure OCRが逆転している
      // この場合、実際の仕入先は別のフィールドまたは発行者情報にある
      vendorName = extractedData.customerName || 
                   extractedData.CustomerName ||
                   extractedData.RemittanceAddressRecipient ||
                   extractedData.merchantName ||
                   'OCR自動登録仕入先';
    } else {
      // 通常のケース：vendorNameが発行者（仕入先）
      vendorName = extractedData.vendorName || 
                   extractedData.VendorName || 
                   extractedData.VendorAddressRecipient ||
                   extractedData.customerName || // フォールバック
                   'OCR自動登録仕入先';
    }
  } else {
    // 領収書の場合
    vendorName = extractedData.merchantName || 
                 extractedData.vendorName || 
                 extractedData.VendorName ||
                 'OCR自動登録仕入先';
  }
  
  // 「御中」を除去
  vendorName = vendorName.replace(/\s*御中\s*$/, '').trim();
  
  console.log('[convertOCRToSupplierQuote] 抽出されたベンダー情報:', {
    documentType: ocrResult.documentType,
    vendorName: extractedData.vendorName,
    customerName: extractedData.customerName,
    VendorName: extractedData.VendorName,
    CustomerName: extractedData.CustomerName,
    VendorAddressRecipient: extractedData.VendorAddressRecipient,
    merchantName: extractedData.merchantName,
    selectedVendor: vendorName,
    hasOnchuInVendor: extractedData.vendorName?.includes('御中'),
    hasOnchuInCustomer: extractedData.customerName?.includes('御中')
  });
  
  // 強制的に仕入先情報を補正（Azure OCRの誤認識対策）
  if (vendorName.includes('御中') || vendorName === 'OCR自動登録仕入先') {
    console.log('[convertOCRToSupplierQuote] 仕入先情報の強制補正を実行');
    
    // VendorAddressRecipientから仕入先を抽出
    if (extractedData.VendorAddressRecipient && !extractedData.VendorAddressRecipient.includes('御中')) {
      vendorName = extractedData.VendorAddressRecipient;
      console.log('[convertOCRToSupplierQuote] VendorAddressRecipientから補正:', vendorName);
    }
    // RemittanceAddressRecipientから仕入先を抽出
    else if (extractedData.RemittanceAddressRecipient && !extractedData.RemittanceAddressRecipient.includes('御中')) {
      vendorName = extractedData.RemittanceAddressRecipient;
      console.log('[convertOCRToSupplierQuote] RemittanceAddressRecipientから補正:', vendorName);
    }
    // customerNameが「御中」を含まない場合、実際の仕入先の可能性
    else if (extractedData.customerName && !extractedData.customerName.includes('御中')) {
      vendorName = extractedData.customerName;
      console.log('[convertOCRToSupplierQuote] customerNameから補正:', vendorName);
    }
    else {
      // 最後の手段：ファイル名から推測
      vendorName = 'ファイル名由来仕入先';
      console.log('[convertOCRToSupplierQuote] フォールバック処理');
    }
  }
  
  // 最終的に「御中」を除去
  vendorName = vendorName.replace(/\s*御中\s*$/, '').trim();
  
  console.log('[convertOCRToSupplierQuote] 最終仕入先名:', vendorName);
  
  // 項目の抽出（改善されたエクストラクターを使用）
  console.log('[convertOCRToSupplierQuote] OCRデータ全体:', JSON.stringify(extractedData, null, 2));
  
  // OCRItemExtractorを使用して商品情報を抽出
  let items = OCRItemExtractor.extractItemsFromOCR(extractedData);
  
  console.log('[convertOCRToSupplierQuote] 抽出された項目:', items);
  
  // 項目が空の場合のフォールバック処理
  if (items.length === 0) {
    console.log('[convertOCRToSupplierQuote] 項目が抽出されなかったため、デフォルト項目を作成');
      
      // 商品名の詳細抽出（Azure Form Recognizerの様々なフィールドをチェック）
      let itemName = 'デフォルト商品名';
      
      // Azure Form Recognizerの実際のフィールド構造に対応
      if (item.description && typeof item.description === 'string' && item.description.trim()) {
        itemName = item.description.trim();
      } else if (item.name && typeof item.name === 'string' && item.name.trim()) {
        itemName = item.name.trim();
      } else if (item.itemName && typeof item.itemName === 'string' && item.itemName.trim()) {
        itemName = item.itemName.trim();
      } else if (item.productName && typeof item.productName === 'string' && item.productName.trim()) {
        itemName = item.productName.trim();
      } else {
        // フォールバック：オブジェクトの場合、contentフィールドをチェック
        if (item.description?.content) itemName = item.description.content;
        else if (item.name?.content) itemName = item.name.content;
        else if (item.Description?.content) itemName = item.Description.content;
        else if (item.Name?.content) itemName = item.Name.content;
        else itemName = `商品${index + 1}`;
      }
      
      // 数量の抽出（Azure Form Recognizerの形式に対応）
      let quantity = 1;
      if (item.quantity !== undefined && item.quantity !== null) {
        if (typeof item.quantity === 'number') {
          quantity = item.quantity;
        } else if (typeof item.quantity === 'string') {
          quantity = parseFloat(item.quantity) || 1;
        } else if (item.quantity.value !== undefined) {
          quantity = parseFloat(item.quantity.value) || 1;
        }
      } else if (item.Quantity?.value !== undefined) {
        quantity = parseFloat(item.Quantity.value) || 1;
      }
      
      // 単価の抽出（Azure Form Recognizerの形式に対応）
      let unitPrice = 0;
      if (item.unitPrice !== undefined && item.unitPrice !== null) {
        if (typeof item.unitPrice === 'number') {
          unitPrice = item.unitPrice;
        } else if (typeof item.unitPrice === 'string') {
          unitPrice = parseFloat(item.unitPrice) || 0;
        } else if (item.unitPrice.value !== undefined) {
          unitPrice = parseFloat(item.unitPrice.value) || 0;
        }
      } else if (item.UnitPrice?.value !== undefined) {
        unitPrice = parseFloat(item.UnitPrice.value) || 0;
      } else if (item.price !== undefined) {
        if (typeof item.price === 'number') {
          unitPrice = item.price;
        } else if (item.price.value !== undefined) {
          unitPrice = parseFloat(item.price.value) || 0;
        }
      }
      
      // 金額の抽出（Azure Form Recognizerの形式に対応）
      let amount = 0;
      if (item.amount !== undefined && item.amount !== null) {
        if (typeof item.amount === 'number') {
          amount = item.amount;
        } else if (typeof item.amount === 'string') {
          amount = parseFloat(item.amount) || 0;
        } else if (item.amount.value !== undefined) {
          amount = parseFloat(item.amount.value) || 0;
        }
      } else if (item.Amount?.value !== undefined) {
        amount = parseFloat(item.Amount.value) || 0;
      } else if (item.totalPrice !== undefined) {
        if (typeof item.totalPrice === 'number') {
          amount = item.totalPrice;
        } else if (item.totalPrice.value !== undefined) {
          amount = parseFloat(item.totalPrice.value) || 0;
        }
      } else if (unitPrice > 0 && quantity > 0) {
        amount = unitPrice * quantity;
      }
      
      // 単価が0で金額がある場合、単価を計算
      if (unitPrice === 0 && amount > 0 && quantity > 0) {
        unitPrice = Math.round(amount / quantity);
      }
      
      console.log(`[convertOCRToSupplierQuote] 項目${index + 1} 処理結果:`, {
        itemName,
        quantity,
        unitPrice,
        amount,
        originalItem: item
      });
      
      return {
        itemName,
        description: itemName,
        quantity,
        unitPrice,
        amount,
        taxRate: 10,
        taxAmount: Math.round(amount * 0.1)
      };
    }));
  } else {
    console.log('[convertOCRToSupplierQuote] 項目データが見つからないため、総額から推定');
  }
  
  // 商品情報が不完全な場合、OCR生データから抽出を試行
  if (items.length === 0 || items.every(item => item.itemName === '商品1' || item.itemName.includes('デフォルト'))) {
    console.log('[convertOCRToSupplierQuote] 商品情報の補完処理を開始');
    
    // OCR生データから商品情報を探す
    const rawOcrText = JSON.stringify(extractedData);
    console.log('[convertOCRToSupplierQuote] OCR生データサンプル:', rawOcrText.substring(0, 500));
    
    // 商品情報のパターンマッチング
    const productPatterns = [
      /【.*?】.*?(?=\s|\n|$)/g,  // 【】で囲まれた商品名
      /用紙[:：].*?(?=\s|\n|$)/g,  // 用紙: で始まる商品名
      /印刷.*?(?=\s|\n|$)/g,  // 印刷で始まる商品名
      /.*?(?:窓|セロ|特白).*?(?=\s|\n|$)/g,  // 特定キーワードを含む商品名
    ];
    
    let extractedProductName = '';
    for (const pattern of productPatterns) {
      const matches = rawOcrText.match(pattern);
      if (matches && matches.length > 0) {
        extractedProductName = matches[0].replace(/["\{\}]/g, '').trim();
        if (extractedProductName.length > 5) { // 意味のある長さ
          console.log('[convertOCRToSupplierQuote] パターンマッチで商品名を抽出:', extractedProductName);
          break;
        }
      }
    }
    
    // 数量・単価の抽出試行
    let extractedQuantity = 1;
    let extractedUnitPrice = 0;
    
    // 数量パターン（2,000枚、500個など）
    const quantityPattern = /([\d,]+)\s*(?:枚|個|本|台|セット)/g;
    const quantityMatch = rawOcrText.match(quantityPattern);
    if (quantityMatch) {
      const qty = quantityMatch[0].replace(/[^\d]/g, '');
      extractedQuantity = parseInt(qty) || 1;
      console.log('[convertOCRToSupplierQuote] 数量を抽出:', extractedQuantity);
    }
    
    // 単価パターン（¥11.20、15円など）
    const unitPricePattern = /[¥￥]?\s*(\d+\.?\d*)\s*円?(?:\s|\/|単価)/g;
    const priceMatch = rawOcrText.match(unitPricePattern);
    if (priceMatch) {
      const price = priceMatch[0].replace(/[^\d.]/g, '');
      extractedUnitPrice = parseFloat(price) || 0;
      console.log('[convertOCRToSupplierQuote] 単価を抽出:', extractedUnitPrice);
    }
    
    // 抽出した情報で項目を更新または作成
    if (extractedProductName || extractedQuantity > 1 || extractedUnitPrice > 0) {
      const newItem = {
        itemName: extractedProductName || '抽出商品',
        description: extractedProductName || '',
        quantity: extractedQuantity,
        unitPrice: extractedUnitPrice,
        amount: extractedUnitPrice * extractedQuantity,
        taxRate: 10,
        taxAmount: Math.round(extractedUnitPrice * extractedQuantity * 0.1)
      };
      
      // 既存項目を置き換えまたは新規追加
      if (items.length > 0) {
        items[0] = newItem;
        console.log('[convertOCRToSupplierQuote] 既存項目を置き換え:', newItem);
      } else {
        items.push(newItem);
        console.log('[convertOCRToSupplierQuote] 新規項目を追加:', newItem);
      }
    }
  }
  
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
      
      // 既存のアイテムがある場合は、それらに金額を分割
      if (items.length > 0) {
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const pricePerUnit = itemAmount / totalQuantity;
        
        let remainingAmount = itemAmount;
        items.forEach((item, index) => {
          const itemQuantity = item.quantity || 1;
          
          // 最後のアイテムは残りの金額を全て割り当て（四捨五入誤差を調整）
          if (index === items.length - 1) {
            item.amount = remainingAmount;
            item.unitPrice = Math.round(remainingAmount / itemQuantity);
          } else {
            const itemTotal = Math.round(pricePerUnit * itemQuantity);
            item.amount = itemTotal;
            item.unitPrice = Math.round(pricePerUnit);
            remainingAmount -= itemTotal;
          }
          
          item.taxAmount = Math.round(item.amount * 0.1);
          item.taxRate = 10;
        });
        
        console.log('[convertOCRToSupplierQuote] 既存項目に金額を分割:', {
          totalQuantity,
          pricePerUnit,
          itemAmount,
          items: items.map(item => ({
            name: item.itemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount
          }))
        });
      } else {
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
    ocrResultId: ocrResult.ocrResultId
  };
  
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