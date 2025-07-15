/**
 * Google Apps Script - OCR処理とWebhook送信
 * 
 * 設定方法：
 * 1. Google Apps Scriptプロジェクトを作成
 * 2. このコードをコピー
 * 3. プロジェクト設定 > スクリプトプロパティに以下を追加：
 *    - WEBHOOK_URL: https://accounting-automation-l4rd0r8mn-effectmoes-projects.vercel.app/api/webhook/ocr
 * 4. デプロイ > 新しいデプロイ > ウェブアプリとして公開
 * 5. アクセス権限を「全員」に設定
 */

// スクリプトプロパティから設定を取得
const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');

/**
 * HTTPリクエストを受け取る（ファイルアップロード時）
 */
function doPost(e) {
  console.log('doPost開始:', new Date());
  
  try {
    // リクエストデータを解析
    const data = JSON.parse(e.postData.contents);
    console.log('受信データ:', data);
    
    const { fileId, fileName } = data;
    
    if (!fileId || !fileName) {
      throw new Error('fileIdまたはfileNameが不足しています');
    }
    
    // OCR処理を実行
    const ocrResult = processOCR(fileId, fileName);
    
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
function processOCR(fileId, fileName) {
  console.log('OCR処理開始:', fileId, fileName);
  
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
    
    // OCR結果から情報を抽出
    const extractedData = extractDocumentInfo(ocrText);
    
    // 一時ファイルを削除
    DriveApp.getFileById(ocrFile.id).setTrashed(true);
    
    return {
      fileId: fileId,
      fileName: fileName,
      ocrText: ocrText,
      documentInfo: extractedData,
      processedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('OCR処理エラー:', error);
    throw error;
  }
}

/**
 * OCRテキストから文書情報を抽出
 */
function extractDocumentInfo(ocrText) {
  console.log('情報抽出開始');
  
  const info = {
    vendorName: '',
    receiptDate: null,
    subtotalAmount: null,
    taxAmount: 0,
    totalAmount: 0,
    paymentAmount: null,
    changeAmount: null,
    receiptNumber: null,
    storeName: null,
    storePhone: null,
    companyName: null,
    notes: ''
  };
  
  // 店舗名・会社名の抽出
  const storeNameMatch = ocrText.match(/(?:店|ストア|スーパー|マーケット|薬局|ドラッグ)[\s\S]{0,20}/);
  if (storeNameMatch) {
    info.storeName = storeNameMatch[0].trim();
    info.vendorName = info.storeName;
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
      // 日付をフォーマット
      if (pattern.toString().includes('令和')) {
        const year = 2018 + parseInt(dateMatch[1]);
        info.receiptDate = `${year}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      } else if (dateMatch[1].length === 2) {
        info.receiptDate = `20${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      } else {
        info.receiptDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
      }
      break;
    }
  }
  
  // 金額の抽出
  const amountPatterns = {
    total: /(?:合計|総額|請求|total|合計金額)[\s:：]*[¥￥]?\s*([0-9,]+)/i,
    subtotal: /(?:小計|税抜|subtotal)[\s:：]*[¥￥]?\s*([0-9,]+)/i,
    tax: /(?:消費税|税|内税|外税|tax)[\s:：]*[¥￥]?\s*([0-9,]+)/i,
    payment: /(?:お預|預り|お預かり|payment|現金)[\s:：]*[¥￥]?\s*([0-9,]+)/i,
    change: /(?:お釣|釣り|おつり|change)[\s:：]*[¥￥]?\s*([0-9,]+)/i
  };
  
  // 各金額を抽出
  for (const [key, pattern] of Object.entries(amountPatterns)) {
    const match = ocrText.match(pattern);
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ''));
      switch(key) {
        case 'total': info.totalAmount = amount; break;
        case 'subtotal': info.subtotalAmount = amount; break;
        case 'tax': info.taxAmount = amount; break;
        case 'payment': info.paymentAmount = amount; break;
        case 'change': info.changeAmount = amount; break;
      }
    }
  }
  
  // 小計が無い場合は計算
  if (!info.subtotalAmount && info.totalAmount && info.taxAmount) {
    info.subtotalAmount = info.totalAmount - info.taxAmount;
  }
  
  // レシート番号の抽出
  const receiptNoMatch = ocrText.match(/(?:No|番号|伝票)[\s:：]*([0-9\-]+)/);
  if (receiptNoMatch) {
    info.receiptNumber = receiptNoMatch[1];
  }
  
  // 電話番号の抽出
  const phoneMatch = ocrText.match(/(?:TEL|電話|℡)[\s:：]*([0-9\-\(\)]+)/);
  if (phoneMatch) {
    info.storePhone = phoneMatch[1];
  }
  
  console.log('抽出結果:', info);
  return info;
}

/**
 * Webhookでデータを送信
 */
function sendWebhook(data) {
  console.log('Webhook送信開始:', WEBHOOK_URL);
  
  if (!WEBHOOK_URL) {
    console.error('WEBHOOK_URLが設定されていません');
    throw new Error('WEBHOOK_URLが設定されていません');
  }
  
  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('Webhook応答:', responseCode, responseText);
    
    if (responseCode !== 200) {
      throw new Error(`Webhook失敗: ${responseCode} - ${responseText}`);
    }
    
    return JSON.parse(responseText);
    
  } catch (error) {
    console.error('Webhook送信エラー:', error);
    throw error;
  }
}

/**
 * テスト用関数（直接実行可能）
 */
function testOCR() {
  // テスト用のファイルIDを設定
  // ここに実際のファイルIDを入れてください！
  const testFileId = 'YOUR_TEST_FILE_ID_HERE'; // ← ここを実際のファイルIDに変更
  const testFileName = 'test-receipt.jpg';
  
  try {
    const result = processOCR(testFileId, testFileName);
    console.log('テスト結果:', result);
    
    // Webhookも送信してみる
    sendWebhook(result);
    console.log('Webhook送信完了！');
    
  } catch (error) {
    console.error('テストエラー:', error);
  }
}

/**
 * 簡単なテスト（Webhook送信のみ）
 */
function testWebhookOnly() {
  const testData = {
    fileId: 'test123',
    fileName: 'test-receipt.jpg',
    ocrText: 'テストレシート\n合計 1,000円\n2025/07/08',
    documentInfo: {
      vendorName: 'テスト店舗',
      totalAmount: 1000,
      receiptDate: '2025-07-08'
    },
    processedAt: new Date().toISOString()
  };
  
  try {
    sendWebhook(testData);
    console.log('テストWebhook送信成功！');
  } catch (error) {
    console.error('Webhook送信エラー:', error);
  }
}

/**
 * Drive APIを有効化（初回のみ実行）
 */
function enableDriveAPI() {
  // この関数を一度実行してDrive APIへのアクセス許可を取得
  DriveApp.getRootFolder();
}