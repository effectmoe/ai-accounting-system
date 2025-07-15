/**
 * AI会計システム 完全版OCR処理スクリプト（修正版）
 * Version: 2.1.0
 * 
 * 修正内容:
 * - console.log を Logger.log に変更
 * - 詳細なログ出力を追加
 * - エラーハンドリングの改善
 */

// ===== 設定 =====
const SUPABASE_URL = 'https://clqpfmroqcnvyxdzadln.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNscXBmbXJvcWNudnl4ZHphZGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2OTc3NDEsImV4cCI6MjA2NzI3Mzc0MX0.CN7Vk_-W7Pn09jvrlVyOlgyguxqgNLs3C-9Bf1UTdTA';
const FOLDER_ID = '1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL'; // 監視対象フォルダID
const ARCHIVE_FOLDER_ID = '1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ'; // アーカイブ用フォルダID

// ===== Webhook処理（プッシュ通知） =====
function doPost(e) {
  Logger.log('=== doPost開始 ===');
  Logger.log('プッシュ通知を受信しました');
  
  try {
    // リクエストの内容をログ出力
    if (e && e.postData) {
      Logger.log('受信データ: ' + e.postData.contents);
    }
    
    // 通知を受けたら少し待機（ファイルの完全アップロードを待つ）
    Utilities.sleep(2000);
    Logger.log('2秒待機完了');
    
    // 最新のファイルをチェックして処理
    Logger.log('checkAndProcessRecentFiles を実行します');
    const results = checkAndProcessRecentFiles();
    Logger.log('処理結果: ' + JSON.stringify(results));
    
    const response = {
      success: true,
      processed: results.length,
      results: results
    };
    
    Logger.log('=== doPost完了 ===');
    Logger.log('レスポンス: ' + JSON.stringify(response));
    
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('=== doPostエラー ===');
    Logger.log('エラー内容: ' + error.toString());
    Logger.log('スタックトレース: ' + error.stack);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// doGetも実装（ステータス確認用）
function doGet(e) {
  Logger.log('=== doGet実行 ===');
  const response = {
    status: 'OK',
    message: 'AI会計OCR Web Appsが正常に動作しています',
    version: '2.1.0',
    timestamp: new Date().toISOString()
  };
  
  Logger.log('レスポンス: ' + JSON.stringify(response));
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== 最新ファイルのチェックと処理 =====
function checkAndProcessRecentFiles() {
  Logger.log('=== checkAndProcessRecentFiles開始 ===');
  const results = [];
  
  try {
    // 過去5分以内のファイルを取得
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    Logger.log('検索開始時刻: ' + fiveMinutesAgo);
    
    const query = `'${FOLDER_ID}' in parents and (mimeType = 'application/pdf' or mimeType contains 'image/') and modifiedDate > '${fiveMinutesAgo}' and trashed = false`;
    Logger.log('検索クエリ: ' + query);
    
    const files = Drive.Files.list({
      q: query,
      orderBy: 'modifiedDate desc',
      maxResults: 10
    });
    
    Logger.log('検索結果: ' + files.items.length + '件のファイルが見つかりました');
    
    if (files.items && files.items.length > 0) {
      for (const file of files.items) {
        Logger.log('処理対象ファイル: ' + file.title + ' (ID: ' + file.id + ')');
        
        // 既に処理済みかチェック
        const isProcessed = checkIfProcessed(file.id);
        if (isProcessed) {
          Logger.log('既に処理済みのためスキップ: ' + file.title);
          continue;
        }
        
        // OCR処理を実行
        Logger.log('OCR処理を開始: ' + file.title);
        const result = processFile(file.id);
        Logger.log('OCR処理結果: ' + JSON.stringify(result));
        
        results.push(result);
      }
    } else {
      Logger.log('処理対象のファイルがありません');
    }
  } catch (error) {
    Logger.log('checkAndProcessRecentFilesでエラー: ' + error.toString());
    Logger.log('スタックトレース: ' + error.stack);
  }
  
  Logger.log('=== checkAndProcessRecentFiles完了 ===');
  Logger.log('処理件数: ' + results.length);
  return results;
}

// ===== ファイル処理済みチェック =====
function checkIfProcessed(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const description = file.getDescription();
    return description && description.includes('[OCR処理済み]');
  } catch (error) {
    Logger.log('checkIfProcessedでエラー: ' + error.toString());
    return false;
  }
}

// ===== メインのファイル処理 =====
function processFile(fileId) {
  Logger.log('=== processFile開始 (ID: ' + fileId + ') ===');
  
  try {
    // OCR処理
    Logger.log('performOCRを実行');
    const ocrResult = performOCR(fileId);
    
    if (!ocrResult.success) {
      Logger.log('OCR処理失敗: ' + ocrResult.error);
      return ocrResult;
    }
    
    // Supabaseに保存
    Logger.log('saveToSupabaseを実行');
    const saveResult = saveToSupabase(ocrResult.data);
    Logger.log('Supabase保存結果: ' + JSON.stringify(saveResult));
    
    if (saveResult.success) {
      // 処理済みマークを付ける
      Logger.log('処理済みマークを付与');
      markAsProcessed(fileId);
      
      // アーカイブフォルダに移動
      Logger.log('アーカイブフォルダに移動');
      moveToArchive(fileId);
    }
    
    Logger.log('=== processFile完了 ===');
    return {
      fileId: fileId,
      fileName: ocrResult.data.file_name,
      success: saveResult.success,
      supabaseId: saveResult.data ? saveResult.data.id : null,
      error: saveResult.error
    };
    
  } catch (error) {
    Logger.log('processFileでエラー: ' + error.toString());
    Logger.log('スタックトレース: ' + error.stack);
    return {
      fileId: fileId,
      success: false,
      error: error.toString()
    };
  }
}

// ===== OCR処理 =====
function performOCR(fileId) {
  Logger.log('=== performOCR開始 ===');
  
  try {
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    const fileSize = file.getSize();
    const mimeType = file.getMimeType();
    
    Logger.log('ファイル情報: ' + fileName + ' (' + mimeType + ', ' + fileSize + ' bytes)');
    
    let ocrText = '';
    let confidence = 0.95;
    
    // Drive API v2を使用したOCR
    try {
      Logger.log('Drive API v2でOCR実行');
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
        Logger.log('OCRドキュメント作成成功: ' + docFile.id);
        const doc = DocumentApp.openById(docFile.id);
        ocrText = doc.getBody().getText();
        Drive.Files.remove(docFile.id);
        Logger.log('OCRテキスト取得成功（文字数: ' + ocrText.length + '）');
      }
    } catch (apiError) {
      Logger.log('Drive APIエラー: ' + apiError.toString());
      // フォールバック処理
      ocrText = `[OCR処理中]\nファイル名: ${fileName}\n処理日時: ${new Date().toLocaleString('ja-JP')}`;
      confidence = 0.5;
    }
    
    // テキストから情報を抽出
    Logger.log('extractInformationを実行');
    const extracted = extractInformation(ocrText, fileName);
    Logger.log('抽出結果: ' + JSON.stringify(extracted));
    
    const result = {
      success: true,
      data: {
        file_name: fileName,
        file_size: fileSize,
        file_type: mimeType,
        file_url: `gdrive://${fileId}`,
        extracted_text: ocrText.substring(0, 5000), // 最初の5000文字
        confidence: confidence,
        vendor_name: extracted.vendor_name,
        receipt_date: extracted.receipt_date,
        total_amount: extracted.total_amount,
        tax_amount: extracted.tax_amount,
        subtotal_amount: extracted.subtotal_amount,
        payment_amount: extracted.payment_amount,
        change_amount: extracted.change_amount,
        receipt_number: extracted.receipt_number,
        store_name: extracted.store_name,
        store_phone: extracted.store_phone,
        company_name: extracted.company_name,
        notes: extracted.notes,
        status: 'completed',
        company_id: '11111111-1111-1111-1111-111111111111' // デモ用固定値
      }
    };
    
    Logger.log('=== performOCR完了 ===');
    return result;
    
  } catch (error) {
    Logger.log('performOCRでエラー: ' + error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===== 情報抽出（拡張版） =====
function extractInformation(text, fileName) {
  Logger.log('=== extractInformation開始 ===');
  
  const result = {
    vendor_name: '',
    receipt_date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    tax_amount: 0,
    subtotal_amount: 0,
    payment_amount: 0,
    change_amount: 0,
    receipt_number: '',
    store_name: '',
    store_phone: '',
    company_name: '',
    notes: ''
  };
  
  try {
    // ベンダー名・会社名の抽出
    const vendorMatch = text.match(/株式会社[\s\S]{1,20}|[\s\S]{1,20}株式会社|[\s\S]{1,20}商店|[\s\S]{1,20}ストア/);
    if (vendorMatch) {
      const vendorName = vendorMatch[0].trim().substring(0, 50);
      result.vendor_name = vendorName;
      result.company_name = vendorName;
    }
    
    // 店舗名の抽出
    const storeMatch = text.match(/店舗[：　\s]*([^\n]{1,30})|店名[：　\s]*([^\n]{1,30})/);
    if (storeMatch) {
      result.store_name = (storeMatch[1] || storeMatch[2] || '').trim();
    }
    
    // 電話番号の抽出
    const phoneMatch = text.match(/(?:TEL|Tel|電話|℡)[：　\s]*(\d{2,4}-\d{2,4}-\d{3,4}|\d{10,11})/);
    if (phoneMatch) {
      result.store_phone = phoneMatch[1];
    }
    
    // 領収書番号の抽出
    const receiptNoMatch = text.match(/(?:No\.|NO\.|No|NO|伝票|領収書)[：　\s]*(\d{4,20})/);
    if (receiptNoMatch) {
      result.receipt_number = receiptNoMatch[1];
    }
    
    // 日付の抽出
    const dateMatch = text.match(/\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}[日]?/);
    if (dateMatch) {
      const dateStr = dateMatch[0].replace(/[年月]/g, '-').replace(/日/g, '');
      result.receipt_date = new Date(dateStr).toISOString().split('T')[0];
    }
    
    // 金額情報の抽出
    // 小計
    const subtotalMatch = text.match(/(?:小計|税抜|税抜き金額)[\s　]*[：:]?[\s　]*[¥￥]?[\s　]*(\d{1,3}(?:,\d{3})*|¥)/);
    if (subtotalMatch) {
      result.subtotal_amount = parseInt(subtotalMatch[1].replace(/[,\s]/g, ''));
    }
    
    // 消費税
    const taxMatch = text.match(/(?:消費税|税|内税|外税)[\s　]*[：:]?[\s　]*[¥￥]?[\s　]*(\d{1,3}(?:,\d{3})*|¥)/);
    if (taxMatch) {
      result.tax_amount = parseInt(taxMatch[1].replace(/[,\s]/g, ''));
    }
    
    // 合計金額
    const totalMatch = text.match(/(?:合計|計|金額)[\s　]*[：:]?[\s　]*[¥￥]?[\s　]*(\d{1,3}(?:,\d{3})*|¥)/);
    if (totalMatch) {
      result.total_amount = parseInt(totalMatch[1].replace(/[,\s]/g, ''));
    }
    
    // お預かり金額
    const paymentMatch = text.match(/(?:お預かり|お預り|預かり金額|受領金額)[\s　]*[：:]?[\s　]*[¥￥]?[\s　]*(\d{1,3}(?:,\d{3})*|¥)/);
    if (paymentMatch) {
      result.payment_amount = parseInt(paymentMatch[1].replace(/[,\s]/g, ''));
    }
    
    // お釣り
    const changeMatch = text.match(/(?:お釣り|おつり|釣り銭|釣銭)[\s　]*[：:]?[\s　]*[¥￥]?[\s　]*(\d{1,3}(?:,\d{3})*|¥)/);
    if (changeMatch) {
      result.change_amount = parseInt(changeMatch[1].replace(/[,\s]/g, ''));
    }
    
    // 金額がまだ取得できていない場合のフォールバック
    if (result.total_amount === 0) {
      const amountMatches = text.match(/[¥￥]\s*[\d,]+/g) || [];
      if (amountMatches.length > 0) {
        const amounts = amountMatches.map(a => parseInt(a.replace(/[¥￥,\s]/g, '')));
        result.total_amount = Math.max(...amounts);
      }
    }
    
    // 小計と税額が取得できていない場合の推定
    if (result.subtotal_amount === 0 && result.total_amount > 0) {
      // 消費税10%と仮定
      result.tax_amount = Math.floor(result.total_amount * 0.1 / 1.1);
    }
    
    // ファイル名からも情報を補完
    if (!result.vendor_name && fileName) {
      const nameMatch = fileName.match(/^([^_\-\.]+)/);
      if (nameMatch) {
        result.vendor_name = nameMatch[1];
      }
    }
    
    Logger.log('抽出結果: ' + JSON.stringify(result));
  } catch (error) {
    Logger.log('extractInformationでエラー: ' + error.toString());
  }
  
  Logger.log('=== extractInformation完了 ===');
  return result;
}

// ===== Supabaseへの保存 =====
function saveToSupabase(data) {
  Logger.log('=== saveToSupabase開始 ===');
  Logger.log('保存データ: ' + JSON.stringify(data));
  
  try {
    const url = `${SUPABASE_URL}/rest/v1/ocr_results`;
    
    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      payload: JSON.stringify(data),
      muteHttpExceptions: true
    };
    
    Logger.log('Supabase APIを呼び出します');
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    Logger.log('レスポンスコード: ' + responseCode);
    Logger.log('レスポンス内容: ' + responseText);
    
    if (responseCode === 201) {
      const result = JSON.parse(responseText);
      Logger.log('=== saveToSupabase成功 ===');
      return {
        success: true,
        data: result[0]
      };
    } else {
      Logger.log('=== saveToSupabaseエラー ===');
      return {
        success: false,
        error: `HTTP ${responseCode}: ${responseText}`
      };
    }
  } catch (error) {
    Logger.log('saveToSupabaseで例外: ' + error.toString());
    Logger.log('スタックトレース: ' + error.stack);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ===== 処理済みマーク =====
function markAsProcessed(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const currentDesc = file.getDescription() || '';
    file.setDescription(currentDesc + '\n[OCR処理済み: ' + new Date().toISOString() + ']');
    Logger.log('処理済みマーク付与完了: ' + fileId);
  } catch (error) {
    Logger.log('markAsProcessedでエラー: ' + error.toString());
  }
}

// ===== アーカイブ移動 =====
function moveToArchive(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
    
    // ファイルを移動
    archiveFolder.addFile(file);
    folder.removeFile(file);
    
    Logger.log('アーカイブ移動完了: ' + fileId);
  } catch (error) {
    Logger.log('moveToArchiveでエラー: ' + error.toString());
  }
}

// ===== デバッグ用関数 =====
function outputDebugInfo() {
  Logger.log('=== デバッグ情報出力 ===');
  Logger.log('SUPABASE_URL: ' + SUPABASE_URL);
  Logger.log('SUPABASE_ANON_KEY: ' + (SUPABASE_ANON_KEY ? '設定済み' : '未設定'));
  Logger.log('FOLDER_ID: ' + FOLDER_ID);
  Logger.log('ARCHIVE_FOLDER_ID: ' + ARCHIVE_FOLDER_ID);
  
  // Drive APIの確認
  try {
    Drive.Files.list({ maxResults: 1 });
    Logger.log('Drive API v2: ✅ 正常');
  } catch (e) {
    Logger.log('Drive API v2: ❌ エラー - ' + e.toString());
  }
  
  // フォルダーアクセスの確認
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('監視フォルダ: ✅ ' + folder.getName());
  } catch (e) {
    Logger.log('監視フォルダ: ❌ アクセスエラー');
  }
  
  try {
    const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
    Logger.log('アーカイブフォルダ: ✅ ' + archiveFolder.getName());
  } catch (e) {
    Logger.log('アーカイブフォルダ: ❌ アクセスエラー');
  }
}

// ===== テスト関数（既存のものと同じ） =====
function checkApiSettings() {
  outputDebugInfo();
}

function manualOcrTest() {
  Logger.log('=== 手動OCRテスト開始 ===');
  const results = checkAndProcessRecentFiles();
  Logger.log('テスト結果: ' + JSON.stringify(results));
}

function testSupabaseConnection() {
  Logger.log('=== Supabase接続テスト ===');
  
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
  Logger.log('接続テスト結果: ' + JSON.stringify(result));
}

function checkRecentFiles() {
  Logger.log('=== 最新ファイル確認 ===');
  
  try {
    const files = Drive.Files.list({
      q: `'${FOLDER_ID}' in parents and mimeType = 'application/pdf' and trashed = false`,
      orderBy: 'createdDate desc',
      maxResults: 5
    });
    
    if (files.items.length === 0) {
      Logger.log('⚠️ PDFファイルが見つかりません');
      return;
    }
    
    Logger.log(`📄 ${files.items.length}個のPDFファイルが見つかりました:`);
    files.items.forEach((file, index) => {
      Logger.log(`${index + 1}. ${file.title} (${new Date(file.createdDate).toLocaleString('ja-JP')})`);
    });
  } catch (error) {
    Logger.log('エラー: ' + error.toString());
  }
}