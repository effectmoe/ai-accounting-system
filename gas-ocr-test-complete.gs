/**
 * AI会計システム OCR処理 完全版（テスト機能付き）
 * 
 * 機能:
 * 1. Google Driveのプッシュ通知でリアルタイムOCR処理
 * 2. PDFと画像ファイルのOCR
 * 3. Supabaseへの自動保存
 * 4. ファイルの自動アーカイブ
 * 5. テスト機能追加
 */

// ===== 設定 =====
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';
const FOLDER_ID = '1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL'; // 監視対象フォルダID
const ARCHIVE_FOLDER_ID = '1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ'; // アーカイブ用フォルダID
const DEPLOYMENT_URL = 'https://script.google.com/macros/s/AKfycbwfaf1sYjKovaHIRp7zhVO7C5G9O_LFlQGsTddR8F4hrJ2TZf_enMOlubssihW_atqU/exec';

// ===== テスト関数 =====

/**
 * API設定の確認
 */
function testAPISettings() {
  console.log('=== API設定確認 ===');
  
  // 1. Drive APIの確認
  try {
    const testFile = Drive.Files.list({
      maxResults: 1
    });
    console.log('✅ Drive API v2が有効です');
  } catch (error) {
    console.error('❌ Drive API v2が無効です:', error.message);
    console.log('解決方法: サービス > Drive API を追加してください');
  }
  
  // 2. フォルダアクセスの確認
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    console.log('✅ 監視フォルダにアクセス可能:', folder.getName());
  } catch (error) {
    console.error('❌ 監視フォルダにアクセスできません:', error.message);
  }
  
  try {
    const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
    console.log('✅ アーカイブフォルダにアクセス可能:', archiveFolder.getName());
  } catch (error) {
    console.error('❌ アーカイブフォルダにアクセスできません:', error.message);
  }
  
  // 3. Supabase接続の確認
  try {
    const response = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/', {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      }
    });
    console.log('✅ Supabaseに接続可能');
  } catch (error) {
    console.error('❌ Supabaseに接続できません:', error.message);
  }
}

/**
 * 最新ファイルの確認
 */
function checkLatestFiles() {
  console.log('=== 最新ファイル確認 ===');
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    let count = 0;
    
    while (files.hasNext() && count < 5) {
      const file = files.next();
      console.log(`${count + 1}. ${file.getName()} (${file.getMimeType()})`);
      console.log(`   作成日: ${file.getDateCreated()}`);
      console.log(`   ID: ${file.getId()}`);
      count++;
    }
    
    if (count === 0) {
      console.log('フォルダにファイルがありません');
    }
  } catch (error) {
    console.error('ファイル取得エラー:', error.message);
  }
}

/**
 * OCR手動実行テスト
 */
function testOCRManually() {
  console.log('=== OCR手動実行テスト ===');
  
  try {
    // フォルダから最初のPDFまたは画像ファイルを取得
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    let testFile = null;
    
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getMimeType();
      if (mimeType.includes('pdf') || mimeType.includes('image')) {
        testFile = file;
        break;
      }
    }
    
    if (!testFile) {
      console.log('テスト用のPDFまたは画像ファイルが見つかりません');
      return;
    }
    
    console.log('テストファイル:', testFile.getName());
    console.log('ファイルID:', testFile.getId());
    
    // OCR処理を実行
    const result = performOCROnFile(testFile.getId());
    console.log('OCR結果:', result);
    
  } catch (error) {
    console.error('OCRテストエラー:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

/**
 * 完全なテストスイート実行
 */
function runAllTests() {
  console.log('===== 完全テスト実行開始 =====');
  console.log(new Date().toLocaleString('ja-JP'));
  console.log('');
  
  testAPISettings();
  console.log('');
  
  checkLatestFiles();
  console.log('');
  
  testOCRManually();
  console.log('');
  
  console.log('===== テスト完了 =====');
}

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
    
    // テキストを取得
    const doc = DocumentApp.openById(docFile.id);
    ocrText = doc.getBody().getText();
    
    // 一時ファイルを削除
    DriveApp.getFileById(docFile.id).setTrashed(true);
    
  } catch (error) {
    console.error('OCRエラー:', error.message);
    throw error;
  }

  // Supabaseに保存
  const ocrResult = {
    file_id: fileId,
    file_name: fileName,
    mime_type: mimeType,
    ocr_text: ocrText,
    processed_at: new Date().toISOString(),
    status: 'completed'
  };

  try {
    saveToSupabase(ocrResult);
    console.log('Supabaseに保存成功');
  } catch (error) {
    console.error('Supabase保存エラー:', error.message);
    ocrResult.status = 'error';
    ocrResult.error_message = error.message;
  }

  // ファイルをアーカイブ
  try {
    archiveFile(fileId);
    console.log('ファイルをアーカイブしました');
  } catch (error) {
    console.error('アーカイブエラー:', error.message);
  }

  return ocrResult;
}

/**
 * Supabaseにデータを保存
 * @param {Object} data - 保存するデータ
 */
function saveToSupabase(data) {
  const url = SUPABASE_URL + '/rest/v1/ocr_results';
  
  const response = UrlFetchApp.fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(data)
  });

  if (response.getResponseCode() !== 201) {
    throw new Error('Supabase保存失敗: ' + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}

/**
 * ファイルをアーカイブフォルダに移動
 * @param {string} fileId - 移動するファイルのID
 */
function archiveFile(fileId) {
  const file = DriveApp.getFileById(fileId);
  const sourceFolder = DriveApp.getFolderById(FOLDER_ID);
  const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
  
  // ファイルを移動
  archiveFolder.addFile(file);
  sourceFolder.removeFile(file);
}

/**
 * プッシュ通知を受信
 */
function doPost(e) {
  console.log('プッシュ通知受信:', JSON.stringify(e));
  
  try {
    // 通知の検証
    const channelId = e.parameter['X-Goog-Channel-ID'];
    const resourceState = e.parameter['X-Goog-Resource-State'];
    const resourceId = e.parameter['X-Goog-Resource-ID'];
    
    console.log('Channel ID:', channelId);
    console.log('Resource State:', resourceState);
    console.log('Resource ID:', resourceId);
    
    // ファイルの変更を検知
    if (resourceState === 'add' || resourceState === 'update') {
      // 最新のファイルを処理
      const folder = DriveApp.getFolderById(FOLDER_ID);
      const files = folder.getFiles();
      
      while (files.hasNext()) {
        const file = files.next();
        const mimeType = file.getMimeType();
        
        // PDFまたは画像ファイルの場合
        if (mimeType.includes('pdf') || mimeType.includes('image')) {
          try {
            performOCROnFile(file.getId());
          } catch (error) {
            console.error('ファイル処理エラー:', error.message);
          }
        }
      }
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('プッシュ通知処理エラー:', error.message);
    return ContentService
      .createTextOutput(JSON.stringify({status: 'error', message: error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * GET確認用
 */
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'active',
      message: 'AI会計OCR Web Apps is running',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * プッシュ通知のチャンネルを設定
 */
function setupPushNotification() {
  const channelId = Utilities.getUuid();
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24); // 24時間後に期限切れ
  
  const resource = {
    id: channelId,
    type: 'web_hook',
    address: DEPLOYMENT_URL,
    expiration: expiration.getTime()
  };
  
  try {
    const response = Drive.Files.watch(resource, FOLDER_ID);
    console.log('プッシュ通知設定成功:', response);
    
    // チャンネル情報を保存（プロパティサービスを使用）
    PropertiesService.getScriptProperties().setProperty('channelId', channelId);
    PropertiesService.getScriptProperties().setProperty('channelExpiration', expiration.toISOString());
    
    return response;
  } catch (error) {
    console.error('プッシュ通知設定エラー:', error.message);
    throw error;
  }
}

/**
 * プッシュ通知のチャンネルを停止
 */
function stopPushNotification() {
  const channelId = PropertiesService.getScriptProperties().getProperty('channelId');
  
  if (!channelId) {
    console.log('チャンネルIDが見つかりません');
    return;
  }
  
  try {
    Drive.Channels.stop({
      id: channelId,
      resourceId: FOLDER_ID
    });
    console.log('プッシュ通知停止成功');
    
    // プロパティをクリア
    PropertiesService.getScriptProperties().deleteProperty('channelId');
    PropertiesService.getScriptProperties().deleteProperty('channelExpiration');
  } catch (error) {
    console.error('プッシュ通知停止エラー:', error.message);
  }
}

/**
 * 定期的にチャンネルを更新（トリガーで実行）
 */
function renewPushNotification() {
  console.log('プッシュ通知チャンネルを更新');
  
  // 既存のチャンネルを停止
  try {
    stopPushNotification();
  } catch (error) {
    console.log('既存チャンネル停止エラー（無視）:', error.message);
  }
  
  // 新しいチャンネルを設定
  setupPushNotification();
}

/**
 * 手動でOCR処理を実行（デバッグ用）
 */
function manualOCRProcess() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  let processedCount = 0;
  
  while (files.hasNext()) {
    const file = files.next();
    const mimeType = file.getMimeType();
    
    if (mimeType.includes('pdf') || mimeType.includes('image')) {
      try {
        console.log('処理中:', file.getName());
        performOCROnFile(file.getId());
        processedCount++;
      } catch (error) {
        console.error('エラー:', error.message);
      }
    }
  }
  
  console.log('処理完了. 処理ファイル数:', processedCount);
}

/**
 * 初期設定関数
 */
function initialSetup() {
  console.log('=== 初期設定開始 ===');
  
  // 1. API設定確認
  testAPISettings();
  
  // 2. プッシュ通知設定
  try {
    setupPushNotification();
    console.log('✅ プッシュ通知設定成功');
  } catch (error) {
    console.error('❌ プッシュ通知設定失敗:', error.message);
  }
  
  // 3. 定期更新トリガー設定
  try {
    // 既存のトリガーを削除
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'renewPushNotification') {
        ScriptApp.deleteTrigger(trigger);
      }
    });
    
    // 新しいトリガーを設定（23時間ごと）
    ScriptApp.newTrigger('renewPushNotification')
      .timeBased()
      .everyHours(23)
      .create();
    
    console.log('✅ 定期更新トリガー設定成功');
  } catch (error) {
    console.error('❌ トリガー設定失敗:', error.message);
  }
  
  console.log('=== 初期設定完了 ===');
}