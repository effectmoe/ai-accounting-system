// スクリプトプロパティから設定を取得
const WEBHOOK_URL = 'https://accounting-automation-o8faz57m7-effectmoes-projects.vercel.app/api/webhook/ocr';
const OCR_ANALYZE_URL = 'https://accounting-automation-o8faz57m7-effectmoes-projects.vercel.app/api/ocr/analyze';

/**
 * HTTPリクエストを受け取る（ファイルアップロード時）
 */
function doPost(e) {
  console.log('doPost開始:', new Date());
  
  try {
    const data = JSON.parse(e.postData.contents);
    console.log('受信データ:', data);
    
    const { fileId, fileName, documentType } = data;
    
    if (!fileId || !fileName) {
      throw new Error('fileIdまたはfileNameが不足しています');
    }
    
    // OCR処理を実行
    const ocrResult = processOCR(fileId, fileName, documentType);
    
    // Webhookでデータを送信
    sendWebhook(ocrResult);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'OCR処理完了',
        ocrResult: ocrResult
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('エラー発生:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * OCR処理を実行
 */
function processOCR(fileId, fileName, specifiedDocumentType) {
  console.log('OCR処理開始:', fileId, fileName, 'documentType:', specifiedDocumentType);
  
  try {
    // Google DriveからファイルをBlobとして取得
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    
    // Drive APIを使用してOCR実行
    const resource = {
      title: fileName + '_OCR',
      mimeType: 'application/vnd.google-apps.document'
    };
    
    const options = {
      ocr: true,
      ocrLanguage: 'ja'
    };
    
    // OCR実行
    const ocrFile = Drive.Files.insert(resource, blob, options);
    
    // OCR結果のテキストを取得
    const doc = DocumentApp.openById(ocrFile.id);
    const ocrText = doc.getBody().getText();
    
    console.log('OCRテキスト:', ocrText);
    
    // 文書タイプを検出（指定されていない場合）
    let documentType = specifiedDocumentType;
    if (!documentType) {
      documentType = detectDocumentType(ocrText);
    }
    console.log('検出された文書タイプ:', documentType);
    
    // OCR結果から情報を抽出
    const extractedData = extractDocumentInfo(ocrText, documentType);
    
    // 一時ファイルを削除
    DriveApp.getFileById(ocrFile.id).setTrashed(true);
    
    return {
      fileId: fileId,
      fileName: fileName,
      ocrText: ocrText,
      documentType: documentType,
      documentInfo: extractedData,
      processedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('OCR処理エラー:', error);
    throw error;
  }
}

/**
 * OCRテキストから文書タイプを検出
 */
function detectDocumentType(ocrText) {
  const text = ocrText.toLowerCase();
  
  // 見積書のパターン
  if (text.includes('見積書') || text.includes('お見積') || text.includes('quotation') || text.includes('estimate')) {
    return 'quotation';
  }
  
  // 請求書のパターン
  if (text.includes('請求書') || text.includes('invoice') || text.includes('bill')) {
    return 'invoice';
  }
  
  // 発注書のパターン
  if (text.includes('発注書') || text.includes('注文書') || text.includes('purchase order')) {
    return 'purchase_order';
  }
  
  // 納品書のパターン
  if (text.includes('納品書') || text.includes('delivery note')) {
    return 'delivery_note';
  }
  
  // 領収書のパターン（デフォルト）
  return 'receipt';
}

/**
 * OCRテキストから文書情報を抽出（文書タイプに応じた処理）
 */
function extractDocumentInfo(ocrText, documentType) {
  console.log('情報抽出開始:', documentType);
  
  // 基本情報の初期化
  const info = {
    vendorName: '',
    documentDate: null,
    subtotalAmount: null,
    taxAmount: 0,
    totalAmount: 0,
    documentNumber: null,
    notes: ''
  };
  
  // 文書タイプ別の追加フィールド
  switch(documentType) {
    case 'receipt':
      info.receiptDate = null;
      info.paymentAmount = null;
      info.changeAmount = null;
      info.receiptNumber = null;
      info.storeName = null;
      info.storePhone = null;
      break;
    case 'invoice':
      info.invoiceNumber = null;
      info.dueDate = null;
      info.customerName = null;
      info.issueDate = null;
      break;
    case 'quotation':
      info.quotationNumber = null;
      info.validityDate = null;
      info.customerName = null;
      info.issueDate = null;
      break;
    case 'purchase_order':
      info.orderNumber = null;
      info.deliveryDate = null;
      info.supplierName = null;
      break;
  }
  
  // 共通: ベンダー名・会社名の抽出
  const vendorPatterns = [
    /(?:株式会社|有限会社|合同会社|合資会社)[\s\S]{1,30}/,
    /(?:店|ストア|スーパー|マーケット|薬局|ドラッグ)[\s\S]{1,20}/,
    /(?:ローソン|セブン|ファミリーマート|ファミマ)[\s\S]{0,10}/
  ];
  
  for (const pattern of vendorPatterns) {
    const match = ocrText.match(pattern);
    if (match) {
      info.vendorName = match[0].trim();
      if (documentType === 'receipt') {
        info.storeName = info.vendorName;
      }
      break;
    }
  }
  
  // 日付の抽出（複数パターン対応）
  const datePatterns = [
    /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/,
    /令和(\d+)年(\d{1,2})月(\d{1,2})日/,
    /R(\d+)\.(\d{1,2})\.(\d{1,2})/,
    /(\d{2})\/(\d{2})\/(\d{2})/
  ];
  
  for (const pattern of datePatterns) {
    const dateMatch = ocrText.match(pattern);
    if (dateMatch) {
      let dateStr;
      // 日付をフォーマット
      if (pattern.toString().includes('令和')) {
        const year = 2018 + parseInt(dateMatch[1]);
        dateStr = `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      } else if (dateMatch[1].length === 2) {
        dateStr = `20${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      } else {
        dateStr = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      }
      
      info.documentDate = dateStr;
      if (documentType === 'receipt') {
        info.receiptDate = dateStr;
      } else if (documentType === 'invoice' || documentType === 'quotation') {
        info.issueDate = dateStr;
      }
      break;
    }
  }
  
  // 金額の抽出
  const amountPatterns = {
    total: [
      /(?:合計|total|計|合計金額)[\s:：]*[¥￥]?([0-9,]+)/i,
      /[¥￥]([0-9,]+)[\s]*(?:円|yen)?[\s]*(?:税込|内税)?/i
    ],
    subtotal: [
      /(?:小計|subtotal|商品計)[\s:：]*[¥￥]?([0-9,]+)/i
    ],
    tax: [
      /(?:消費税|tax|内税|外税)[\s:：]*[¥￥]?([0-9,]+)/i,
      /\((?:内税|税)\s*[¥￥]?([0-9,]+)\)/
    ]
  };
  
  // 合計金額
  for (const pattern of amountPatterns.total) {
    const match = ocrText.match(pattern);
    if (match) {
      info.totalAmount = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // 小計
  for (const pattern of amountPatterns.subtotal) {
    const match = ocrText.match(pattern);
    if (match) {
      info.subtotalAmount = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // 税額
  for (const pattern of amountPatterns.tax) {
    const match = ocrText.match(pattern);
    if (match) {
      info.taxAmount = parseInt(match[1].replace(/,/g, ''));
      break;
    }
  }
  
  // 文書番号の抽出
  const numberPatterns = {
    receipt: /(?:レシート|領収書)[\s]*(?:No|番号|#)[\s.:：]*([A-Z0-9\-]+)/i,
    invoice: /(?:請求書|invoice)[\s]*(?:No|番号|#)[\s.:：]*([A-Z0-9\-]+)/i,
    quotation: /(?:見積書|quotation)[\s]*(?:No|番号|#)[\s.:：]*([A-Z0-9\-]+)/i,
    purchase_order: /(?:発注書|注文書|order)[\s]*(?:No|番号|#)[\s.:：]*([A-Z0-9\-]+)/i
  };
  
  if (numberPatterns[documentType]) {
    const match = ocrText.match(numberPatterns[documentType]);
    if (match) {
      info.documentNumber = match[1];
      if (documentType === 'receipt') {
        info.receiptNumber = match[1];
      } else if (documentType === 'invoice') {
        info.invoiceNumber = match[1];
      } else if (documentType === 'quotation') {
        info.quotationNumber = match[1];
      } else if (documentType === 'purchase_order') {
        info.orderNumber = match[1];
      }
    }
  }
  
  console.log('抽出結果:', info);
  return info;
}

/**
 * Webhookでデータを送信
 */
function sendWebhook(data) {
  console.log('Webhook送信開始');
  
  const payload = JSON.stringify(data);
  console.log('送信データ:', payload);
  
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': payload,
    'muteHttpExceptions': true
  };
  
  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('Webhook応答コード:', responseCode);
    console.log('Webhook応答:', responseText);
    
    if (responseCode !== 200) {
      throw new Error(`Webhook送信失敗: ${responseCode} - ${responseText}`);
    }
    
    return JSON.parse(responseText);
  } catch (error) {
    console.error('Webhook送信エラー:', error);
    throw error;
  }
}

/**
 * テスト関数
 */
function testWithSampleData() {
  const testData = {
    fileId: 'test-file-id',
    fileName: 'test-invoice.pdf',
    ocrText: '請求書\n\n株式会社テスト商事\n\n請求書番号: INV-2025-001\n発行日: 2025/01/21\n\n合計金額: ¥110,000\n（内税 ¥10,000）',
    documentType: null, // 自動検出をテスト
    documentInfo: {
      vendorName: '株式会社テスト商事',
      receiptDate: '2025-01-21',
      totalAmount: 110000,
      taxAmount: 10000
    },
    processedAt: new Date().toISOString()
  };
  
  // 文書タイプを検出
  testData.documentType = detectDocumentType(testData.ocrText);
  console.log('検出された文書タイプ:', testData.documentType);
  
  try {
    const result = sendWebhook(testData);
    console.log('✅ Webhook送信成功！');
    console.log('結果:', result);
  } catch (error) {
    console.error('❌ Webhook送信失敗:', error);
  }
}