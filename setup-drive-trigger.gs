/**
 * Google Drive変更トリガーの設定
 * このスクリプトをGASエディタで実行して、
 * フォルダの変更を監視するトリガーを設定します。
 */

// フォルダIDの設定
const WATCHED_FOLDER_ID = '1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9';

/**
 * トリガーのセットアップ
 */
function setupDriveTrigger() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getEventType() === ScriptApp.EventType.ON_CHANGE) {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 新しいトリガーを作成
  ScriptApp.newTrigger('onDriveChange')
    .forSpreadsheet(SpreadsheetApp.getActive()) // またはDriveApp
    .onChange()
    .create();
    
  console.log('Driveトリガーが設定されました');
}

/**
 * ファイル変更時のハンドラー
 */
function onDriveChange(e) {
  console.log('Drive変更イベントが発生しました:', e);
  
  try {
    // フォルダ内の新しいファイルをチェック
    const folder = DriveApp.getFolderById(WATCHED_FOLDER_ID);
    const files = folder.getFiles();
    
    // 最新のファイルを処理（過去1分以内に作成されたもの）
    const oneMinuteAgo = new Date(Date.now() - 60000);
    const newFiles = [];
    
    while (files.hasNext()) {
      const file = files.next();
      const createdDate = file.getDateCreated();
      
      if (createdDate > oneMinuteAgo) {
        newFiles.push(file.getId());
        console.log('新しいファイルを検出:', file.getName());
      }
    }
    
    // 新しいファイルがあればOCR処理を実行
    if (newFiles.length > 0) {
      const results = ocr_(newFiles);
      console.log('OCR処理結果:', results);
    }
    
  } catch (error) {
    console.error('Drive変更処理エラー:', error);
  }
}

/**
 * 手動でフォルダをチェックする関数
 */
function checkNewFiles() {
  const folder = DriveApp.getFolderById(WATCHED_FOLDER_ID);
  const files = folder.getFiles();
  
  // 最新10ファイルを取得
  const recentFiles = [];
  let count = 0;
  
  while (files.hasNext() && count < 10) {
    const file = files.next();
    recentFiles.push({
      id: file.getId(),
      name: file.getName(),
      created: file.getDateCreated(),
      mimeType: file.getMimeType()
    });
    count++;
  }
  
  console.log('最近のファイル:', recentFiles);
  return recentFiles;
}