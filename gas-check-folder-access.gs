// フォルダアクセス確認用スクリプト
function checkFolderAccess() {
  Logger.log('=== フォルダアクセス確認 ===');
  
  const FOLDER_ID = '1X3Q-t8V6xyqfDx1bGxnXCkDUMxlGNptL';
  const ARCHIVE_FOLDER_ID = '1bEwOT_swfFWp2m-CI97mgYePDGkFKYgZ';
  
  // 監視フォルダの確認
  try {
    Logger.log('監視フォルダID: ' + FOLDER_ID);
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('✅ 監視フォルダ名: ' + folder.getName());
    Logger.log('URL: ' + folder.getUrl());
  } catch (e) {
    Logger.log('❌ 監視フォルダエラー: ' + e.toString());
    Logger.log('このフォルダIDは存在しないか、アクセス権限がありません');
  }
  
  // アーカイブフォルダの確認
  try {
    Logger.log('\nアーカイブフォルダID: ' + ARCHIVE_FOLDER_ID);
    const archiveFolder = DriveApp.getFolderById(ARCHIVE_FOLDER_ID);
    Logger.log('✅ アーカイブフォルダ名: ' + archiveFolder.getName());
    Logger.log('URL: ' + archiveFolder.getUrl());
  } catch (e) {
    Logger.log('❌ アーカイブフォルダエラー: ' + e.toString());
    Logger.log('このフォルダIDは存在しないか、アクセス権限がありません');
  }
  
  // 自分のドライブのルートフォルダを確認
  Logger.log('\n=== マイドライブの確認 ===');
  const rootFolders = DriveApp.getRootFolder().getFolders();
  let count = 0;
  while (rootFolders.hasNext() && count < 10) {
    const folder = rootFolders.next();
    Logger.log(folder.getName() + ' - ID: ' + folder.getId());
    count++;
  }
}

// OCR用フォルダを作成または取得
function createOrGetOCRFolders() {
  Logger.log('=== OCR用フォルダの作成/取得 ===');
  
  const OCR_FOLDER_NAME = 'AAM会計OCR';
  const ARCHIVE_FOLDER_NAME = 'AAM会計OCR_アーカイブ';
  
  let ocrFolder, archiveFolder;
  
  // OCRフォルダを検索
  const ocrFolders = DriveApp.getFoldersByName(OCR_FOLDER_NAME);
  if (ocrFolders.hasNext()) {
    ocrFolder = ocrFolders.next();
    Logger.log('✅ 既存のOCRフォルダを使用: ' + ocrFolder.getName());
  } else {
    ocrFolder = DriveApp.createFolder(OCR_FOLDER_NAME);
    Logger.log('✅ 新しいOCRフォルダを作成: ' + ocrFolder.getName());
  }
  
  // アーカイブフォルダを検索
  const archiveFolders = DriveApp.getFoldersByName(ARCHIVE_FOLDER_NAME);
  if (archiveFolders.hasNext()) {
    archiveFolder = archiveFolders.next();
    Logger.log('✅ 既存のアーカイブフォルダを使用: ' + archiveFolder.getName());
  } else {
    archiveFolder = DriveApp.createFolder(ARCHIVE_FOLDER_NAME);
    Logger.log('✅ 新しいアーカイブフォルダを作成: ' + archiveFolder.getName());
  }
  
  Logger.log('\n=== 新しいフォルダID ===');
  Logger.log('OCRフォルダID: ' + ocrFolder.getId());
  Logger.log('OCRフォルダURL: ' + ocrFolder.getUrl());
  Logger.log('アーカイブフォルダID: ' + archiveFolder.getId());
  Logger.log('アーカイブフォルダURL: ' + archiveFolder.getUrl());
  
  Logger.log('\n⚠️ これらのIDを complete-ocr-system-fixed.gs の FOLDER_ID と ARCHIVE_FOLDER_ID に設定してください');
  
  return {
    ocrFolderId: ocrFolder.getId(),
    archiveFolderId: archiveFolder.getId()
  };
}