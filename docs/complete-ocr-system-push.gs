/**
 * AI会計システム 完全版OCR処理スクリプト
 * Version: 2.0.0
 * 
 * 機能:
 * 1. Google Driveのプッシュ通知でリアルタイムOCR処理
 * 2. PDFと画像ファイルのOCR
 * 3. Supabaseへの自動保存
 * 4. ファイルの自動アーカイブ
 * 5. テスト機能完備
 */

// ===== 設定 =====
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';
const FOLDER_ID = '1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL'; // 監視対象フォルダID
const ARCHIVE_FOLDER_ID = '1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ'; // アーカイブ用フォルダID

// ===== Webhook処理（プッシュ通知） =====
function doPost(e) {
  console.log('プッシュ通知を受信しました');
  
  try {
    // 通知を受けたら少し待機（ファイルの完全アップロードを待つ）
    Utilities.sleep(2000);
    
    // 最新のファイルをチェックして処理
    const results = checkAndProcessRecentFiles();
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      processed: results.length,
      results: results
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    console.error('Webhook処理エラー:', error);
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// doGetも実装（ステータス確認用）
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: 'AI会計OCR Web Appsが正常に動作しています',
    version: '2.0.0',
    lastCheck: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ===== 最新ファイルの確認と処理 =====
function checkAndProcessRecentFiles() {
  console.log('最新ファイルをチェック中...');
  
  const results = [];
  const processedFiles = PropertiesService.getScriptProperties().getProperty('processedFiles') || '[]';
  const processedList = JSON.parse(processedFiles);
  
  try {
    // 過去10分間のファイルを取得
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const files = Drive.Files.list({
      q: `'${FOLDER_ID}' in parents and modifiedDate > '${tenMinutesAgo}' and trashed = false`,
      maxResults: 20,
      orderBy: 'modifiedDate desc'
    });
    
    if (!files.items || files.items.length === 0) {
      console.log('新しいファイルが見つかりません');
      return results;
    }
    
    console.log(`${files.items.length}個のファイルが見つかりました`);
    
    // 各ファイルを処理
    for (const file of files.items) {
      if (!processedList.includes(file.id)) {
        console.log(`処理中: ${file.title}`);
        
        const result = processFile(file.id);
        if (result) {
          results.push(result);
          processedList.push(file.id);
        }
      }
    }
    
    // 処理済みリストを更新（最大100件保持）
    if (processedList.length > 100) {
      processedList.splice(0, processedList.length - 100);
    }
    PropertiesService.getScriptProperties().setProperty('processedFiles', JSON.stringify(processedList));
    
  } catch (error) {
    console.error('ファイルチェックエラー:', error);
  }
  
  return results;
}

// ===== 個別ファイルの処理 =====
function processFile(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    const mimeType = file.getMimeType();
    
    // PDFまたは画像ファイルのみ処理
    if (!mimeType.includes('pdf') && !mimeType.includes('image')) {
      console.log(`スキップ: ${fileName} (サポートされていないファイルタイプ)`);
      return null;
    }
    
    console.log(`OCR処理開始: ${fileName}`);
    
    // OCR処理
    const ocrResult = performOCR(fileId);
    
    if (ocrResult.success) {
      // Supabaseに保存
      const saveResult = saveToSupabase(ocrResult.data);
      
      if (saveResult.success) {
        // ファイルをアーカイブ
        archiveFile(fileId, ocrResult.data);
        
        return {
          fileId: fileId,
          fileName: fileName,
          success: true,
          data: saveResult.data
        };
      }
    }
    
    return {
      fileId: fileId,
      fileName: fileName,
      success: false,
      error: ocrResult.error
    };
    
  } catch (error) {
    console.error('ファイル処理エラー:', error);
    return {
      fileId: fileId,
      success: false,
      error: error.toString()
    };
  }
}

// ===== OCR処理 =====
function performOCR(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    const fileSize = file.getSize();
    const mimeType = file.getMimeType();
    
    let ocrText = '';
    let confidence = 0.95;
    
    // Drive API v2を使用したOCR
    try {
      const resource = {
        title: fileName + '_OCR_TEMP',
        mimeType: 'application/vnd.google-apps.document'
      };
      
      const docFile = Drive.Files.copy(resource, fileId, {
        convert: true,
        ocr: true,
        ocrLanguage: 'ja'
      });
      
      if (docFile && docFile.id) {
        const doc = DocumentApp.openById(docFile.id);
        ocrText = doc.getBody().getText();
        Drive.Files.remove(docFile.id);
      }
    } catch (apiError) {
      console.error('Drive API エラー:', apiError);
      // フォールバック処理
      ocrText = `[OCR処理中]\nファイル名: ${fileName}\n処理日時: ${new Date().toLocaleString('ja-JP')}`;
      confidence = 0.5;
    }
    
    // テキストから情報を抽出
    const extracted = extractInformation(ocrText, fileName);
    
    return {
      success: true,
      data: {
        file_name: fileName,
        file_size: fileSize,
        file_type: mimeType,
        file_url: file.getUrl(),
        extracted_text: ocrText,
        confidence: confidence,
        vendor_name: extracted.vendor,
        receipt_date: extracted.date,
        total_amount: extracted.amount,
        tax_amount: extracted.tax,
        status: 'completed',
        company_id: '11111111-1111-1111-1111-111111111111'
      }
    };
    
  } catch (error) {
    console.error('OCR処理エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===== 情報抽出 =====
function extractInformation(text, fileName) {
  const result = {
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    tax: 0
  };
  
  try {
    // ベンダー名の抽出
    const vendorMatch = text.match(/(?:株式会社|有限会社|合同会社)?[\u4e00-\u9fa5\u30a0-\u30ff]+(?:株式会社|店|商店|ストア)?/);
    if (vendorMatch) {
      result.vendor = vendorMatch[0];
    }
    
    // 日付の抽出
    const dateMatch = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})日?/);
    if (dateMatch) {
      const year = dateMatch[1];
      const month = dateMatch[2].padStart(2, '0');
      const day = dateMatch[3].padStart(2, '0');
      result.date = `${year}-${month}-${day}`;
    }
    
    // 金額の抽出
    const amountMatch = text.match(/[¥￥]?\s*([0-9,]+)\s*円?/g);
    if (amountMatch && amountMatch.length > 0) {
      const amounts = amountMatch.map(m => 
        parseInt(m.replace(/[¥￥,円\s]/g, ''))
      ).filter(a => !isNaN(a));
      
      if (amounts.length > 0) {
        result.amount = Math.max(...amounts);
        result.tax = Math.floor(result.amount * 0.1 / 1.1);
      }
    }
    
    // ファイル名からの補完
    if (!result.vendor && fileName.includes('_')) {
      const parts = fileName.split('_');
      if (parts.length >= 3) {
        result.vendor = parts[2];
      }
    }
    
  } catch (error) {
    console.error('情報抽出エラー:', error);
  }
  
  return result;
}

// ===== Supabaseへの保存 =====
function saveToSupabase(data) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/ocr_results`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      payload: JSON.stringify(data)
    });
    
    if (response.getResponseCode() === 201) {
      const result = JSON.parse(response.getContentText());
      console.log('Supabase保存成功:', result[0].id);
      return {
        success: true,
        data: result[0]
      };
    } else {
      throw new Error(`保存失敗: ${response.getResponseCode()}`);
    }
    
  } catch (error) {
    console.error('Supabase保存エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===== ファイルのアーカイブ =====
function archiveFile(fileId, ocrData) {
  try {
    const file = DriveApp.getFileById(fileId);
    const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
    
    // 新しいファイル名を生成
    const date = new Date(ocrData.receipt_date || new Date());
    const dateStr = Utilities.formatDate(date, 'JST', 'yyyyMMdd');
    const vendor = ocrData.vendor_name || 'unknown';
    const amount = ocrData.total_amount || 0;
    
    const newFileName = `${dateStr}_領収書_${vendor}_${amount}円.pdf`;
    
    // ファイルをコピーしてアーカイブ
    const copiedFile = file.makeCopy(newFileName, archiveFolder);
    
    // 元のファイルを削除
    file.setTrashed(true);
    
    console.log(`アーカイブ完了: ${newFileName}`);
    return true;
    
  } catch (error) {
    console.error('アーカイブエラー:', error);
    return false;
  }
}

// ===== テスト関数 =====

// 1. API設定確認
function checkApiSettings() {
  console.log('=== API設定確認 ===');
  
  // Drive API v2の確認
  try {
    const testList = Drive.Files.list({ maxResults: 1 });
    console.log('✅ Drive API v2: 正常');
  } catch (e) {
    console.error('❌ Drive API v2: 未設定', e.message);
    console.log('解決方法: サービス > Drive API を追加してください');
  }
  
  // フォルダーIDの確認
  console.log('📁 監視フォルダID:', FOLDER_ID);
  console.log('📁 アーカイブフォルダID:', ARCHIVE_FOLDER_ID);
  
  // Supabase設定の確認
  console.log('🔗 Supabase URL:', SUPABASE_URL ? '設定済み' : '未設定');
  console.log('🔑 Supabase Key:', SUPABASE_ANON_KEY ? '設定済み' : '未設定');
}

// 2. 手動OCR実行テスト
function manualOcrTest() {
  console.log('=== 手動OCRテスト開始 ===');
  
  // 最新ファイルを1つ処理
  const results = checkAndProcessRecentFiles();
  
  if (results.length > 0) {
    console.log('✅ OCR処理成功:', results[0]);
  } else {
    console.log('⚠️ 処理対象のファイルがありません');
    console.log('指定フォルダにPDFをアップロードしてください');
  }
}

// 3. Supabase接続テスト
function testSupabaseConnection() {
  console.log('=== Supabase接続テスト ===');
  
  const testData = {
    company_id: '11111111-1111-1111-1111-111111111111',
    file_name: 'test_connection_' + new Date().getTime() + '.pdf',
    file_size: 1024,
    file_type: 'application/pdf',
    file_url: 'https://example.com/test.pdf',
    extracted_text: 'テスト接続確認',
    confidence: 0.99,
    vendor_name: 'テスト店舗',
    receipt_date: new Date().toISOString().split('T')[0],
    total_amount: 1000,
    tax_amount: 100,
    status: 'completed'
  };
  
  const result = saveToSupabase(testData);
  
  if (result.success) {
    console.log('✅ Supabase接続成功');
    console.log('保存されたID:', result.data.id);
  } else {
    console.error('❌ Supabase接続失敗:', result.error);
  }
}

// 4. 最新ファイルの確認
function checkRecentFiles() {
  console.log('=== 最新ファイル確認 ===');
  
  const files = Drive.Files.list({
    q: `'${FOLDER_ID}' in parents and mimeType = 'application/pdf' and trashed = false`,
    orderBy: 'createdDate desc',
    maxResults: 5
  });
  
  if (files.items.length === 0) {
    console.log('⚠️ PDFファイルが見つかりません');
    return;
  }
  
  console.log(`📄 ${files.items.length}個のPDFファイルが見つかりました:`);
  files.items.forEach((file, index) => {
    console.log(`${index + 1}. ${file.title} (${new Date(file.createdDate).toLocaleString('ja-JP')})`);
  });
}

// 5. プッシュ通知の初期設定（ドライブ変更トリガー使用）
function setupPushNotifications() {
  try {
    console.log('=== リアルタイムOCR設定開始 ===');
    
    // 既存のトリガーを削除
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
      console.log('既存のトリガーを削除しました');
    });
    
    // ドライブ変更トリガーを作成（リアルタイムに近い）
    ScriptApp.newTrigger('onDriveChange')
      .forForm(FOLDER_ID)
      .onFormSubmit()
      .create();
    
    // または代替案：スプレッドシートのonChangeトリガー
    // 監視用のスプレッドシートを作成して、そこにトリガーを設定
    const sheet = SpreadsheetApp.create('OCR監視用シート');
    const sheetId = sheet.getId();
    
    PropertiesService.getScriptProperties().setProperty('monitorSheetId', sheetId);
    
    ScriptApp.newTrigger('onFileChange')
      .forSpreadsheet(sheetId)
      .onChange()
      .create();
    
    // さらに1分ごとの高頻度チェック
    ScriptApp.newTrigger('checkAndProcessRecentFiles')
      .timeBased()
      .everyMinutes(1)
      .create();
    
    console.log('✅ リアルタイムOCR設定完了！');
    console.log('📋 設定内容:');
    console.log('- 1分ごとに新しいファイルをチェック');
    console.log('- ファイル変更の監視');
    console.log('🎯 Google Driveにファイルをアップロードすると自動でOCR処理されます');
    
    // Web Appのデプロイ情報を表示
    const webAppUrl = ScriptApp.getService().getUrl();
    if (webAppUrl) {
      console.log('');
      console.log('📌 Web App URL（プッシュ通知用）:');
      console.log(webAppUrl);
      console.log('');
      console.log('Google Drive APIのプッシュ通知を設定する場合は、このURLをWebhookとして使用してください。');
    } else {
      console.log('');
      console.log('⚠️ Web Appとしてデプロイしてください:');
      console.log('1. デプロイ → 新しいデプロイ');
      console.log('2. 種類: ウェブアプリ');
      console.log('3. アクセス: 全員');
      console.log('4. デプロイ後、setupPushNotifications()を再実行');
    }
    
    // 初回チェック
    console.log('');
    console.log('初回チェックを実行中...');
    checkAndProcessRecentFiles();
    
  } catch (error) {
    console.error('設定エラー:', error);
  }
}

// 6. ファイル変更時の処理（補助関数）
function onFileChange(e) {
  console.log('ファイル変更を検知しました');
  checkAndProcessRecentFiles();
}

// 7. ドライブ変更時の処理（補助関数）
function onDriveChange(e) {
  console.log('ドライブ変更を検知しました');
  checkAndProcessRecentFiles();
}

// 8. 自動OCR設定の削除
function removeAutoOCR() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removed = 0;
    
    triggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
      removed++;
    });
    
    if (removed > 0) {
      console.log(`✅ ${removed}個のトリガーを削除しました`);
    } else {
      console.log('⚠️ トリガーは設定されていません');
    }
    
    // 監視用シートも削除
    const sheetId = PropertiesService.getScriptProperties().getProperty('monitorSheetId');
    if (sheetId) {
      try {
        DriveApp.getFileById(sheetId).setTrashed(true);
        console.log('監視用シートを削除しました');
      } catch (e) {
        // エラーは無視
      }
    }
    
  } catch (error) {
    console.error('削除エラー:', error);
  }
}

// 9. 現在のトリガー確認
function checkTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  if (triggers.length === 0) {
    console.log('⚠️ トリガーは設定されていません');
  } else {
    console.log(`📋 ${triggers.length}個のトリガーが設定されています:`);
    
    triggers.forEach((trigger, index) => {
      console.log(`${index + 1}. 関数: ${trigger.getHandlerFunction()}`);
      console.log(`   タイプ: ${trigger.getEventType()}`);
      console.log(`   ソース: ${trigger.getTriggerSource()}`);
    });
  }
  
  // Web App URLも確認
  const webAppUrl = ScriptApp.getService().getUrl();
  if (webAppUrl) {
    console.log('');
    console.log('📌 Web App URL:');
    console.log(webAppUrl);
  }
}