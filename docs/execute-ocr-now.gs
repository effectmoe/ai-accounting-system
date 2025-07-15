// 17:13のファイルを今すぐOCR処理する関数
// Google Apps Scriptエディタで実行してください

function executeOCRNow() {
  // 既にgas-ocr-webhook.gsに存在する関数を呼び出す
  checkAndProcessRecentFiles();
}

// または、特定のファイルを直接処理
function processSpecificFile() {
  const fileId = '1tOe0di3gWC5m5exEMybWvw5GKKcYY8x2';
  
  try {
    // 既存のperformOCROnFile関数を使用
    const result = performOCROnFile(fileId);
    console.log('処理完了:', result);
    return result;
  } catch (error) {
    console.error('エラー:', error);
    // 関数が見つからない場合は、ocr_関数を使用
    const results = ocr_([fileId]);
    console.log('OCR結果:', results);
    return results;
  }
}