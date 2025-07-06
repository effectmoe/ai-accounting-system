/**
 * Google Drive OCR Webhook for Real-time Processing
 * 記事の方式に従った実装
 * 
 * このスクリプトは、Google Driveの変更通知を受け取り、
 * ほぼリアルタイムでOCR処理を実行します。
 */

// 設定項目
// スクリプトプロパティから設定を取得
const SUPABASE_URL = PropertiesService.getScriptProperties().getProperty('SUPABASE_URL') || 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_ANON_KEY = PropertiesService.getScriptProperties().getProperty('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';
const FOLDER_ID = PropertiesService.getScriptProperties().getProperty('FOLDER_ID') || '1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9';
const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL') || 'https://accounting-automation-i3mnej3yv-effectmoes-projects.vercel.app/api/webhook/ocr';

// OCR関数（記事の形式に従う）
function ocr_(list) {
  const opts = {
    database_id: FOLDER_ID,
    ocrOpts: [
      {
        scanFolderId: FOLDER_ID,
        ocrFolderId: FOLDER_ID,
        ocrLanguage: 'ja',
        tags: [],
        removeOcrFiles: false // アーカイブのため削除しない
      }
    ]
  };

  // 各ファイルに対してOCR処理を実行
  const results = [];
  for (const fileId of list) {
    try {
      const result = performOCROnFile(fileId);
      results.push(result);
    } catch (error) {
      console.error('OCR処理エラー:', error);
      results.push({ fileId, error: error.toString() });
    }
  }

  return results;
}

// 個別ファイルのOCR処理
function performOCROnFile(fileId) {
  const file = DriveApp.getFileById(fileId);
  const fileName = file.getName();
  const mimeType = file.getMimeType();
  
  console.log('OCR処理開始:', fileName);

  // PDFまたは画像ファイルの場合のみ処理
  if (mimeType.includes('pdf') || mimeType.includes('image')) {
    // Google DocsにコピーしてOCR
    const resource = {
      title: fileName + '_OCR',
      mimeType: 'application/vnd.google-apps.document',
      parents: [{id: FOLDER_ID}]
    };
    
    const options = {
      ocr: true,
      ocrLanguage: 'ja'
    };
    
    // OCR実行
    const ocrFile = Drive.Files.insert(resource, file.getBlob(), options);
    const doc = DocumentApp.openById(ocrFile.id);
    const ocrText = doc.getBody().getText();
    
    // OCR用のDocsファイルを削除
    DriveApp.getFileById(ocrFile.id).setTrashed(true);
    
    // OCRテキストから情報を抽出
    const documentInfo = analyzeDocumentType(ocrText);
    
    // Supabaseに保存
    const supabaseResult = saveToSupabase({
      file_id: fileId,
      file_name: fileName,
      ocr_text: ocrText,
      document_type: documentInfo.type,
      vendor: documentInfo.vendor,
      date: documentInfo.date,
      amount: documentInfo.amount,
      tax_amount: documentInfo.taxAmount
    });
    
    // ファイルをアーカイブ
    archiveFile(file, documentInfo);
    
    // クライアントに通知
    notifyClient({
      fileId: fileId,
      fileName: fileName,
      documentInfo: documentInfo,
      ocrText: ocrText.substring(0, 200) + '...'
    });
    
    return {
      fileId: fileId,
      fileName: fileName,
      success: true,
      documentInfo: documentInfo,
      supabaseId: supabaseResult.id
    };
  }
  
  return {
    fileId: fileId,
    fileName: fileName,
    success: false,
    error: 'サポートされていないファイル形式'
  };
}

// Supabaseへの保存
function saveToSupabase(data) {
  const url = `${SUPABASE_URL}/rest/v1/ocr_results`;
  
  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    payload: JSON.stringify({
      ...data,
      created_at: new Date().toISOString()
    })
  });
  
  return JSON.parse(response.getContentText());
}

// ファイルのアーカイブ
function archiveFile(file, documentInfo) {
  const parentFolder = DriveApp.getFolderById(FOLDER_ID);
  
  // アーカイブフォルダを取得または作成
  const archiveFolder = getOrCreateArchiveFolder(
    parentFolder,
    documentInfo.year,
    documentInfo.month
  );
  
  // ファイル名を生成
  const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss');
  const newFileName = `${documentInfo.date}_${documentInfo.type}_${documentInfo.vendor}_${timestamp}.pdf`;
  
  // ファイルをリネームして移動
  file.setName(newFileName);
  file.moveTo(archiveFolder);
  
  console.log('ファイルアーカイブ完了:', newFileName);
}

// クライアントへの通知
function notifyClient(data) {
  if (!WEBHOOK_URL || WEBHOOK_URL === 'VERCEL_WEBHOOK_URLを設定') {
    console.log('Webhook URLが設定されていません');
    return;
  }
  
  try {
    UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(data)
    });
  } catch (error) {
    console.error('クライアント通知エラー:', error);
  }
}

// Webhook設定関数
function settings_(properties) {
  const expiration = 60; // 60分
  const address = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL') || 'https://accounting-automation-i3mnej3yv-effectmoes-projects.vercel.app/api/webhook/ocr';
  
  return {
    resource: {
      id: Utilities.getUuid(),
      type: 'web_hook',
      token: '',
      expiration: `${new Date(
        Date.now() + 60 * expiration * 1000
      ).getTime()}`,
      address
    }
  };
}

// doGet関数（Webアプリ用）
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'OK',
      message: 'AI会計OCR Web Appsが正常に動作しています',
      version: '1.0.0'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// doPost関数（Webhookエントリーポイント）
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    console.log('Webhook received:', data);
    
    // ファイルリストを取得
    const fileIds = extractFileIds(data);
    if (fileIds.length > 0) {
      const results = ocr_(fileIds);
      
      return ContentService
        .createTextOutput(JSON.stringify({
          success: true,
          results: results
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: '処理対象ファイルがありません'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Webhook処理エラー:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Google Driveの変更通知からファイルIDを抽出
function extractFileIds(data) {
  // Google Driveの変更通知形式に応じて実装
  // 仮実装
  if (data.fileIds) {
    return data.fileIds;
  }
  return [];
}

// ドキュメントタイプ分析関数（既存のものを流用）
function analyzeDocumentType(ocrText) {
  const info = {
    type: '不明書類',
    vendor: '不明',
    date: Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd'),
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    amount: 0,
    taxAmount: 0
  };
  
  // 日付の抽出
  const datePatterns = [
    /(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/,
    /(\d{2})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/,
    /令和(\d+)年(\d{1,2})月(\d{1,2})日/
  ];
  
  for (const pattern of datePatterns) {
    const match = ocrText.match(pattern);
    if (match) {
      let year = match[1];
      if (match[0].includes('令和')) {
        year = String(2018 + parseInt(match[1]));
      } else if (year.length === 2) {
        year = `20${year}`;
      }
      info.date = `${year}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
      info.year = year;
      info.month = match[2].padStart(2, '0');
      break;
    }
  }
  
  // 書類タイプの判定
  if (ocrText.includes('領収書') || ocrText.includes('レシート')) {
    info.type = '領収書';
  } else if (ocrText.includes('請求書')) {
    info.type = '請求書';
  } else if (ocrText.includes('納品書')) {
    info.type = '納品書';
  } else if (ocrText.includes('見積書') || ocrText.includes('御見積')) {
    info.type = '見積書';
  } else if (ocrText.includes('契約書')) {
    info.type = '契約書';
  }
  
  // ベンダー名と金額の抽出（既存ロジック）
  const lines = ocrText.split('\n').filter(line => line.trim());
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && 
        !trimmedLine.match(/^\d/) && 
        trimmedLine.length > 2 &&
        !trimmedLine.includes('領収書') &&
        !trimmedLine.includes('レシート')) {
      info.vendor = trimmedLine
        .replace(/[\s　]+/g, '_')
        .replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\-_]/g, '')
        .substring(0, 30);
      break;
    }
  }
  
  // 金額の抽出
  const amountPatterns = [
    /[合計|計|total|Total|TOTAL]\s*[:：]?\s*[¥￥]?\s*(\d{1,3}(?:,\d{3})*)/gi,
    /[¥￥]\s*(\d{1,3}(?:,\d{3})*)/g,
    /\b(\d{1,3}(?:,\d{3})*)\s*円/g
  ];
  
  let maxAmount = 0;
  for (const pattern of amountPatterns) {
    const matches = ocrText.match(pattern);
    if (matches) {
      for (const match of matches) {
        const amount = parseInt(match.replace(/[^\d]/g, ''));
        if (amount > maxAmount) {
          maxAmount = amount;
        }
      }
    }
  }
  
  if (maxAmount > 0) {
    info.amount = maxAmount;
    info.taxAmount = Math.floor(maxAmount * 0.1 / 1.1);
  }
  
  return info;
}

// アーカイブフォルダを取得または作成
function getOrCreateArchiveFolder(parentFolder, year, month) {
  const archiveFolderName = `アーカイブ_${year}年`;
  const monthFolderName = `${month}月`;
  
  let yearFolder;
  const yearFolders = parentFolder.getFoldersByName(archiveFolderName);
  if (yearFolders.hasNext()) {
    yearFolder = yearFolders.next();
  } else {
    yearFolder = parentFolder.createFolder(archiveFolderName);
  }
  
  let monthFolder;
  const monthFolders = yearFolder.getFoldersByName(monthFolderName);
  if (monthFolders.hasNext()) {
    monthFolder = monthFolders.next();
  } else {
    monthFolder = yearFolder.createFolder(monthFolderName);
  }
  
  return monthFolder;
}

// テスト関数
function testOCR() {
  // テスト用のファイルIDを指定
  const testFileId = 'YOUR_TEST_FILE_ID';
  const result = ocr_([testFileId]);
  console.log('テスト結果:', result);
}

// スクリプトプロパティを設定する関数
function setupScriptProperties() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // 設定値を定義
  const properties = {
    'SUPABASE_URL': 'https://clqpfmroqcnvyxdzadln.supabase.co',
    'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA',
    'WEBHOOK_URL': 'https://accounting-automation-i3mnej3yv-effectmoes-projects.vercel.app/api/webhook/ocr',
    'FOLDER_ID': '1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9'
  };
  
  // プロパティを設定
  scriptProperties.setProperties(properties);
  
  console.log('スクリプトプロパティが設定されました');
  
  // 設定値を確認
  const allProperties = scriptProperties.getProperties();
  console.log('設定されたプロパティ:', allProperties);
}

// フォルダー変更を手動でチェックする関数
function checkFolderChanges() {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    const fileIds = [];
    
    // 最新のファイルを取得（最大10件）
    let count = 0;
    while (files.hasNext() && count < 10) {
      const file = files.next();
      fileIds.push(file.getId());
      count++;
    }
    
    if (fileIds.length > 0) {
      console.log(`${fileIds.length}個のファイルが見つかりました`);
      const results = ocr_(fileIds);
      console.log('OCR処理結果:', results);
      return results;
    } else {
      console.log('処理対象のファイルがありません');
      return { message: '処理対象のファイルがありません' };
    }
  } catch (error) {
    console.error('フォルダーチェックエラー:', error);
    return { error: error.toString() };
  }
}