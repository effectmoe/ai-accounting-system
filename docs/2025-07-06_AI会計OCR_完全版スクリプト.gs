/**
 * AI会計システム OCR処理 完全版
 * 
 * 機能:
 * 1. Google Driveのプッシュ通知でリアルタイムOCR処理
 * 2. PDFと画像ファイルのOCR
 * 3. Supabaseへの自動保存
 * 4. ファイルの自動アーカイブ
 */

// ===== 設定 =====
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';
const FOLDER_ID = '1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9'; // Google DriveフォルダID
const DEPLOYMENT_URL = 'https://script.google.com/macros/s/AKfycbwfaf1sYjKovaHIRp7zhVO7C5G9O_LFlQGsTddR8F4hrJ2TZf_enMOlubssihW_atqU/exec';

// ===== メイン処理 =====

/**
 * ファイルのOCR処理を実行
 * @param {string} fileId - 処理するファイルのID
 */
function performOCROnFile(fileId) {
  const file = DriveApp.getFileById(fileId);
  const fileName = file.getName();
  const mimeType = file.getMimeType();
  
  console.log('OCR処理開始:', fileName);

  // PDFまたは画像ファイルのみ処理
  if (!mimeType.includes('pdf') && !mimeType.includes('image')) {
    throw new Error('サポートされていないファイル形式: ' + mimeType);
  }

  let ocrText = '';
  
  try {
    // Drive API v2でOCR実行
    const resource = {
      title: fileName + '_OCR_TEMP',
      mimeType: 'application/vnd.google-apps.document'
    };
    
    const docFile = Drive.Files.copy(resource, fileId, {
      convert: true,
      ocr: true,
      ocrLanguage: 'ja'
    });
    
    if (!docFile || !docFile.id) {
      throw new Error('OCR変換に失敗しました');
    }
    
    // テキスト取得
    const doc = DocumentApp.openById(docFile.id);
    ocrText = doc.getBody().getText();
    
    // 一時ファイル削除
    Drive.Files.remove(docFile.id);
    
    console.log('OCRテキスト取得成功');
    
  } catch (error) {
    console.error('OCRエラー:', error);
    throw error;
  }
  
  // 情報抽出
  const documentInfo = analyzeDocumentType(ocrText);
  
  // Supabaseに保存
  const supabaseData = {
    company_id: '11111111-1111-1111-1111-111111111111',
    file_name: fileName,
    file_type: mimeType,
    file_url: file.getUrl(),
    extracted_text: ocrText,
    vendor_name: documentInfo.vendor,
    receipt_date: documentInfo.date,
    total_amount: documentInfo.amount,
    tax_amount: documentInfo.taxAmount,
    status: 'completed',
    confidence: 0.95
  };
  
  saveToSupabase(supabaseData);
  
  // ファイルアーカイブ
  archiveFile(file, documentInfo);
  
  return {
    success: true,
    fileName: fileName,
    documentInfo: documentInfo
  };
}

/**
 * Supabaseにデータを保存
 */
function saveToSupabase(data) {
  const url = `${SUPABASE_URL}/rest/v1/ocr_results`;
  
  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(data)
  });
  
  console.log('Supabase保存完了');
  return JSON.parse(response.getContentText());
}

/**
 * ファイルをアーカイブ
 */
function archiveFile(file, documentInfo) {
  const parentFolder = DriveApp.getFolderById(FOLDER_ID);
  
  // アーカイブフォルダ作成/取得
  const archiveFolderName = `アーカイブ_${documentInfo.year}年`;
  const monthFolderName = `${documentInfo.month}月`;
  
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
  
  // ファイル名変更と移動
  const timestamp = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss');
  const newFileName = `${documentInfo.date}_${documentInfo.type}_${documentInfo.vendor}_${timestamp}.pdf`;
  
  file.setName(newFileName);
  file.moveTo(monthFolder);
  
  console.log('アーカイブ完了:', newFileName);
}

/**
 * OCRテキストから情報を抽出
 */
function analyzeDocumentType(ocrText) {
  const info = {
    type: '領収書',
    vendor: '不明',
    date: Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd'),
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    amount: 0,
    taxAmount: 0
  };
  
  // ベンダー名抽出
  if (ocrText.includes('タイムズ')) {
    info.vendor = 'タイムズ24株式会社';
  }
  
  // 日付抽出
  const dateMatch = ocrText.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/);
  if (dateMatch) {
    info.date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    info.year = dateMatch[1];
    info.month = dateMatch[2].padStart(2, '0');
  }
  
  // 金額抽出
  const amountMatch = ocrText.match(/[¥￥]\s*(\d{1,3}(?:,\d{3})*)/);
  if (amountMatch) {
    info.amount = parseInt(amountMatch[1].replace(/,/g, ''));
    info.taxAmount = Math.floor(info.amount * 0.1 / 1.1);
  }
  
  return info;
}

// ===== プッシュ通知処理 =====

/**
 * Google Drive変更通知を受信（自動実行）
 */
function doPost(e) {
  console.log('Drive変更通知を受信');
  
  // 2秒待機（アップロード完了待ち）
  Utilities.sleep(2000);
  
  // 新しいファイルを処理
  const results = checkAndProcessRecentFiles();
  
  return ContentService
    .createTextOutput(JSON.stringify({
      success: true,
      processed: results.length
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 最近のファイルをチェックして処理
 */
function checkAndProcessRecentFiles() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const results = [];
  
  const files = folder.getFiles();
  
  while (files.hasNext()) {
    const file = files.next();
    const createdDate = file.getDateCreated();
    const mimeType = file.getMimeType();
    
    // 5分以内のPDF/画像ファイルを処理
    if (createdDate > fiveMinutesAgo && 
        (mimeType.includes('pdf') || mimeType.includes('image'))) {
      
      console.log('新しいファイルを検出:', file.getName());
      
      try {
        const result = performOCROnFile(file.getId());
        results.push(result);
      } catch (error) {
        console.error('処理エラー:', error);
      }
    }
  }
  
  return results;
}

// ===== プッシュ通知設定 =====

/**
 * Google Driveプッシュ通知を設定
 */
function setupDriveWatch() {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // 既存チャンネル停止
  const existingChannelId = scriptProperties.getProperty('DRIVE_CHANNEL_ID');
  if (existingChannelId) {
    try {
      Drive.Channels.stop({
        id: existingChannelId,
        resourceId: scriptProperties.getProperty('DRIVE_RESOURCE_ID')
      });
    } catch (e) {
      console.log('既存チャンネル停止エラー（無視）');
    }
  }
  
  // 新規チャンネル作成
  const channel = Drive.Files.watch({
    id: Utilities.getUuid(),
    type: 'web_hook',
    address: DEPLOYMENT_URL,
    token: 'ai-accounting-ocr',
    expiration: `${Date.now() + 24 * 60 * 60 * 1000}`, // 24時間
    payload: true
  }, FOLDER_ID);
  
  // 情報保存
  scriptProperties.setProperty('DRIVE_CHANNEL_ID', channel.id);
  scriptProperties.setProperty('DRIVE_RESOURCE_ID', channel.resourceId);
  
  console.log('プッシュ通知設定完了:', channel);
  return channel;
}

/**
 * 自動更新トリガー設定（23時間ごと）
 */
function setupRenewalTrigger() {
  // 既存削除
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'renewDriveWatch') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 新規作成
  ScriptApp.newTrigger('renewDriveWatch')
    .timeBased()
    .everyHours(23)
    .create();
    
  console.log('自動更新トリガー設定完了');
}

/**
 * プッシュ通知を更新
 */
function renewDriveWatch() {
  console.log('プッシュ通知を更新');
  setupDriveWatch();
}

// ===== 初期設定 =====

/**
 * 初回設定（最初に1回だけ実行）
 */
function initialSetup() {
  console.log('=== 初期設定開始 ===');
  
  // 1. プッシュ通知設定
  setupDriveWatch();
  
  // 2. 自動更新設定
  setupRenewalTrigger();
  
  console.log('=== 初期設定完了 ===');
  console.log('これでファイルをGoogle Driveにアップロードすると');
  console.log('自動的にOCR処理が実行されます。');
}

// ===== テスト関数 =====

/**
 * 手動テスト実行
 */
function testOCR() {
  console.log('テスト実行開始');
  const results = checkAndProcessRecentFiles();
  console.log('処理結果:', results);
}