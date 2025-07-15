// 時間制限を拡張した手動テスト関数
function manualOcrTestExtended() {
  Logger.log('=== 手動OCRテスト（拡張版）開始 ===');
  const results = [];
  
  try {
    // 過去24時間以内のファイルを取得（テスト用に拡張）
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    Logger.log('検索開始時刻: ' + twentyFourHoursAgo);
    
    const query = `'${FOLDER_ID}' in parents and (mimeType = 'application/pdf' or mimeType contains 'image/') and modifiedDate > '${twentyFourHoursAgo}' and trashed = false`;
    Logger.log('検索クエリ: ' + query);
    
    const files = Drive.Files.list({
      q: query,
      orderBy: 'modifiedDate desc',
      maxResults: 10
    });
    
    Logger.log('検索結果: ' + files.items.length + '件のファイルが見つかりました');
    
    if (files.items && files.items.length > 0) {
      // 最初の1件だけ処理（テスト用）
      const file = files.items[0];
      Logger.log('処理対象ファイル: ' + file.title + ' (ID: ' + file.id + ')');
      
      // 既に処理済みかチェック
      const isProcessed = checkIfProcessed(file.id);
      if (isProcessed) {
        Logger.log('既に処理済みのためスキップ: ' + file.title);
        Logger.log('説明: ' + DriveApp.getFileById(file.id).getDescription());
      } else {
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
    Logger.log('エラー: ' + error.toString());
    Logger.log('スタックトレース: ' + error.stack);
  }
  
  Logger.log('=== 手動OCRテスト（拡張版）完了 ===');
  Logger.log('処理件数: ' + results.length);
  return results;
}