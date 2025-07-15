/**
 * AI会計システム リアルタイムOCR処理スクリプト
 * Version: 3.0.0
 * 
 * 機能:
 * 1. Google Driveのファイル変更をリアルタイムで検知
 * 2. PDFと画像ファイルの即時OCR処理
 * 3. Supabaseへの自動保存
 * 4. ファイルの自動アーカイブ
 * 5. プッシュ通知による即時処理
 */

// ===== 設定 =====
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';
const FOLDER_ID = '1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL'; // 監視対象フォルダID
const ARCHIVE_FOLDER_ID = '1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ'; // アーカイブ用フォルダID

// ===== リアルタイム処理用のトリガー設定 =====
function setupRealtimeOCR() {
  console.log('=== リアルタイムOCR設定開始 ===');
  
  try {
    // 既存のトリガーを削除
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
      console.log('既存トリガーを削除:', trigger.getHandlerFunction());
    });
    
    // フォルダ変更検知用のトリガーを作成
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // onChangeトリガーを作成（ファイル追加時に即座に実行）
    ScriptApp.newTrigger('onFileAdded')
      .forSpreadsheet(createMonitorSheet())
      .onChange()
      .create();
    
    // バックアップとして1分ごとのチェックも設定
    ScriptApp.newTrigger('quickCheck')
      .timeBased()
      .everyMinutes(1)
      .create();
    
    console.log('✅ リアルタイムOCR設定完了！');
    console.log('📋 設定内容:');
    console.log('- ファイル追加を即座に検知');
    console.log('- 1分ごとのバックアップチェック');
    
    // 監視シートの作成と設定
    initializeMonitoring();
    
  } catch (error) {
    console.error('設定エラー:', error);
    throw error;
  }
}

// ===== 監視用スプレッドシートの作成 =====
function createMonitorSheet() {
  const sheetName = 'OCR監視シート_' + new Date().getTime();
  const sheet = SpreadsheetApp.create(sheetName);
  const sheetId = sheet.getId();
  
  // プロパティに保存
  PropertiesService.getScriptProperties().setProperty('monitorSheetId', sheetId);
  
  // ヘッダー設定
  const headers = ['ファイルID', 'ファイル名', '追加日時', '処理状態', 'OCR結果ID'];
  sheet.getActiveSheet().getRange(1, 1, 1, headers.length).setValues([headers]);
  
  console.log('監視シート作成:', sheetName);
  return sheetId;
}

// ===== 監視の初期化 =====
function initializeMonitoring() {
  // フォルダの初期状態を記録
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFiles();
  const fileList = [];
  
  while (files.hasNext()) {
    const file = files.next();
    fileList.push(file.getId());
  }
  
  PropertiesService.getScriptProperties().setProperty('knownFiles', JSON.stringify(fileList));
  console.log('初期ファイルリスト記録:', fileList.length + '件');
}

// ===== ファイル追加検知（メイン処理） =====
function onFileAdded(e) {
  console.log('ファイル変更を検知しました');
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const files = folder.getFiles();
    const knownFiles = JSON.parse(PropertiesService.getScriptProperties().getProperty('knownFiles') || '[]');
    const currentFiles = [];
    const newFiles = [];
    
    // 現在のファイルリストを取得
    while (files.hasNext()) {
      const file = files.next();
      const fileId = file.getId();
      currentFiles.push(fileId);
      
      // 新規ファイルの検出
      if (!knownFiles.includes(fileId)) {
        newFiles.push(file);
      }
    }
    
    // 新規ファイルがある場合は処理
    if (newFiles.length > 0) {
      console.log(`新規ファイル検出: ${newFiles.length}件`);
      
      for (const file of newFiles) {
        const mimeType = file.getMimeType();
        
        // PDFまたは画像ファイルのみ処理
        if (mimeType.includes('pdf') || mimeType.includes('image')) {
          console.log(`OCR処理開始: ${file.getName()}`);
          const result = processFile(file.getId());
          
          if (result && result.success) {
            console.log(`✅ OCR処理成功: ${file.getName()}`);
            
            // 監視シートに記録
            recordToMonitorSheet(file, result.data);
          }
        }
      }
    }
    
    // 既知ファイルリストを更新
    PropertiesService.getScriptProperties().setProperty('knownFiles', JSON.stringify(currentFiles));
    
  } catch (error) {
    console.error('ファイル追加検知エラー:', error);
  }
}

// ===== 1分ごとのクイックチェック =====
function quickCheck() {
  // 最新の1ファイルのみチェック（高速化）
  const files = Drive.Files.list({
    q: `'${FOLDER_ID}' in parents and trashed = false`,
    maxResults: 1,
    orderBy: 'createdDate desc'
  });
  
  if (files.items && files.items.length > 0) {
    const file = files.items[0];
    const processedFiles = JSON.parse(PropertiesService.getScriptProperties().getProperty('processedFiles') || '[]');
    
    if (!processedFiles.includes(file.id)) {
      console.log(`新規ファイル検出（クイックチェック）: ${file.title}`);
      
      // ファイルタイプチェック
      if (file.mimeType.includes('pdf') || file.mimeType.includes('image')) {
        const result = processFile(file.id);
        
        if (result && result.success) {
          processedFiles.push(file.id);
          
          // 最大100件保持
          if (processedFiles.length > 100) {
            processedFiles.splice(0, processedFiles.length - 100);
          }
          
          PropertiesService.getScriptProperties().setProperty('processedFiles', JSON.stringify(processedFiles));
        }
      }
    }
  }
}

// ===== 監視シートへの記録 =====
function recordToMonitorSheet(file, ocrData) {
  try {
    const sheetId = PropertiesService.getScriptProperties().getProperty('monitorSheetId');
    if (!sheetId) return;
    
    const sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    const row = [
      file.getId(),
      file.getName(),
      new Date().toLocaleString('ja-JP'),
      '処理完了',
      ocrData.id || ''
    ];
    
    sheet.appendRow(row);
    
  } catch (error) {
    console.error('監視シート記録エラー:', error);
  }
}

// ===== 個別ファイルの処理 =====
function processFile(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    const mimeType = file.getMimeType();
    
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
      ocrText = `[OCR処理エラー]\nファイル名: ${fileName}\n処理日時: ${new Date().toLocaleString('ja-JP')}`;
      confidence = 0.0;
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

// 1. リアルタイムOCRの状態確認
function checkRealtimeStatus() {
  console.log('=== リアルタイムOCR状態確認 ===');
  
  // トリガー確認
  const triggers = ScriptApp.getProjectTriggers();
  console.log(`📋 設定されているトリガー: ${triggers.length}個`);
  
  triggers.forEach((trigger, index) => {
    console.log(`${index + 1}. ${trigger.getHandlerFunction()} (${trigger.getEventType()})`);
  });
  
  // 監視シート確認
  const sheetId = PropertiesService.getScriptProperties().getProperty('monitorSheetId');
  if (sheetId) {
    try {
      const sheet = SpreadsheetApp.openById(sheetId);
      console.log(`✅ 監視シート: ${sheet.getName()}`);
    } catch (e) {
      console.log('❌ 監視シートが見つかりません');
    }
  } else {
    console.log('⚠️ 監視シートが設定されていません');
  }
  
  // 最近の処理確認
  const processedFiles = JSON.parse(PropertiesService.getScriptProperties().getProperty('processedFiles') || '[]');
  console.log(`📄 最近処理したファイル: ${processedFiles.length}件`);
}

// 2. 手動でファイル追加をシミュレート
function testFileAddDetection() {
  console.log('=== ファイル追加検知テスト ===');
  
  // onFileAddedを手動実行
  onFileAdded({});
  
  console.log('テスト完了 - ログを確認してください');
}

// 3. リアルタイムOCRの削除
function removeRealtimeOCR() {
  try {
    // すべてのトリガーを削除
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      ScriptApp.deleteTrigger(trigger);
    });
    
    console.log('✅ すべてのトリガーを削除しました');
    
    // 監視シートの削除
    const sheetId = PropertiesService.getScriptProperties().getProperty('monitorSheetId');
    if (sheetId) {
      try {
        DriveApp.getFileById(sheetId).setTrashed(true);
        console.log('✅ 監視シートを削除しました');
      } catch (e) {
        // エラーは無視
      }
    }
    
    // プロパティのクリア
    PropertiesService.getScriptProperties().deleteAllProperties();
    console.log('✅ 保存されたプロパティをクリアしました');
    
  } catch (error) {
    console.error('削除エラー:', error);
  }
}