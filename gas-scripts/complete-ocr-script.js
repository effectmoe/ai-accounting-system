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
    
    const { fileId, fileName } = data;
    
    if (!fileId || !fileName) {
      throw new Error('fileIdまたはfileNameが不足しています');
    }
    
    // MongoDB OCR Analyzeエンドポイントに直接ファイルを送信
    const ocrResult = sendFileToMongoDB(fileId, fileName);
    
    // Webhookでデータを送信（バックアップ用）
    // sendWebhook(ocrResult);
    
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
  const storeNameMatch = ocrText.match(/(?:店|ストア|スーパー|マーケット|薬局|ドラッグ|ローソン|セブン|ファミリーマート|ファミマ)[\s\S]{0,20}/);
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
 * MongoDB OCR Analyzeエンドポイントに直接ファイルを送信
 */
function sendFileToMongoDB(fileId, fileName) {
  console.log('MongoDB OCR Analyze送信開始:', fileId, fileName);
  
  try {
    // Google DriveからファイルをBlobとして取得
    const file = DriveApp.getFileById(fileId);
    const blob = file.getBlob();
    
    // マルチパートフォームデータを作成
    const boundary = '----WebKitFormBoundary' + Utilities.getUuid();
    const payload = [];
    
    // ファイル部分
    payload.push('--' + boundary);
    payload.push('Content-Disposition: form-data; name="file"; filename="' + fileName + '"');
    payload.push('Content-Type: ' + blob.getContentType());
    payload.push('');
    payload.push(blob.getBytes());
    payload.push('');
    
    // companyId部分
    payload.push('--' + boundary);
    payload.push('Content-Disposition: form-data; name="companyId"');
    payload.push('');
    payload.push('default');
    payload.push('');
    
    // 終了境界
    payload.push('--' + boundary + '--');
    
    // バイナリデータを結合
    const payloadBytes = [];
    for (let i = 0; i < payload.length; i++) {
      if (typeof payload[i] === 'string') {
        payloadBytes.push(Utilities.newBlob(payload[i], 'text/plain').getBytes());
      } else {
        payloadBytes.push(payload[i]);
      }
    }
    
    // 結合したバイナリデータ
    const combinedBytes = [];
    for (let i = 0; i < payloadBytes.length; i++) {
      const bytes = payloadBytes[i];
      for (let j = 0; j < bytes.length; j++) {
        combinedBytes.push(bytes[j]);
      }
    }
    
    const options = {
      method: 'POST',
      contentType: 'multipart/form-data; boundary=' + boundary,
      payload: combinedBytes,
      muteHttpExceptions: true
    };
    
    console.log('MongoDB OCR Analyze送信中...');
    const response = UrlFetchApp.fetch(OCR_ANALYZE_URL, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log('MongoDB OCR Analyze応答:', responseCode, responseText);
    
    if (responseCode !== 200) {
      throw new Error(`MongoDB OCR Analyze失敗: ${responseCode} - ${responseText}`);
    }
    
    return JSON.parse(responseText);
    
  } catch (error) {
    console.error('MongoDB OCR Analyze送信エラー:', error);
    throw error;
  }
}

/**
 * 初回セットアップ - Drive APIを有効化
 */
function setupDriveAPI() {
  try {
    DriveApp.getRootFolder();
    console.log('✅ Drive API有効化完了');
    return true;
  } catch (error) {
    console.error('❌ Drive API有効化エラー:', error);
    return false;
  }
}

/**
 * テスト1: シンプルなWebhookテスト（ファイル不要）
 */
function test1_SimpleWebhook() {
  console.log('=== シンプルWebhookテスト開始 ===');
  
  const testData = {
    fileId: 'test-' + new Date().getTime(),
    fileName: 'テストレシート.jpg',
    ocrText: 'ローソン\n2025年7月8日\n\n商品1 100円\n商品2 200円\n小計 300円\n消費税 30円\n合計 330円\n\nお預かり 500円\nお釣り 170円',
    documentInfo: {
      vendorName: 'ローソン',
      storeName: 'ローソン',
      receiptDate: '2025-07-08',
      subtotalAmount: 300,
      taxAmount: 30,
      totalAmount: 330,
      paymentAmount: 500,
      changeAmount: 170
    },
    processedAt: new Date().toISOString()
  };
  
  try {
    const result = sendWebhook(testData);
    console.log('✅ Webhook送信成功！');
    console.log('結果:', result);
    console.log('\n本番環境でOCR結果タブを確認してください:');
    console.log('https://accounting-automation-jczf4yiuv-effectmoes-projects.vercel.app/documents');
  } catch (error) {
    console.error('❌ Webhook送信失敗:', error);
  }
}

/**
 * テスト2: 実際のファイルでOCRテスト
 */
function test2_RealFileOCR() {
  console.log('=== 実ファイルOCRテスト開始 ===');
  
  // ここにファイルIDを入力してください
  const fileId = 'ここに実際のファイルIDを入力'; // 例: '1abc123def456'
  const fileName = 'test-receipt.jpg';
  
  if (fileId === 'ここに実際のファイルIDを入力') {
    console.error('❌ エラー: ファイルIDを設定してください');
    console.log('手順:');
    console.log('1. Google Driveにレシート画像をアップロード');
    console.log('2. ファイルを右クリック → リンクを取得');
    console.log('3. URLの /d/ の後の部分がファイルID');
    console.log('4. このスクリプトの fileId = の部分を更新');
    return;
  }
  
  try {
    // Drive APIの確認
    if (!setupDriveAPI()) {
      console.error('Drive APIが有効化されていません');
      return;
    }
    
    // OCR実行
    const result = processOCR(fileId, fileName);
    console.log('✅ OCR処理成功！');
    console.log('抽出されたテキスト:', result.ocrText);
    console.log('抽出された情報:', result.documentInfo);
    
    // Webhookで送信
    sendWebhook(result);
    console.log('✅ Webhook送信成功！');
    
  } catch (error) {
    console.error('❌ テスト失敗:', error);
  }
}

/**
 * Webhook URLを更新
 */
function updateWebhookUrl() {
  const newUrl = 'https://accounting-automation-jczf4yiuv-effectmoes-projects.vercel.app/api/webhook/ocr';
  PropertiesService.getScriptProperties().setProperty('WEBHOOK_URL', newUrl);
  console.log('✅ Webhook URL更新完了: ' + newUrl);
}

/**
 * ステータス確認
 */
function checkStatus() {
  console.log('=== ステータス確認 ===');
  
  // Drive API
  try {
    DriveApp.getRootFolder();
    console.log('✅ Drive API: 有効');
  } catch (error) {
    console.log('❌ Drive API: 無効（setupDriveAPI()を実行してください）');
  }
  
  // Webhook URL
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
  if (webhookUrl) {
    console.log('✅ Webhook URL (プロパティ): ' + webhookUrl);
  } else {
    console.log('⚠️ Webhook URL: デフォルト値を使用');
    console.log('  URL: ' + WEBHOOK_URL);
  }
  
  console.log('\n使い方:');
  console.log('1. updateWebhookUrl() - Webhook URLを更新');
  console.log('2. test1_SimpleWebhook() - ファイル不要のテスト');
  console.log('3. test2_RealFileOCR() - 実際のファイルでテスト（要ファイルID）');
}