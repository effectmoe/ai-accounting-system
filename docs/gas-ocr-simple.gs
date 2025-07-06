// シンプルなOCRテスト関数（Drive API不要）
function simpleOCRTest() {
  const fileId = '1jRto47tshXqWHpMuX06_-Jw4NaEJzt67';
  
  try {
    console.log('シンプルOCRテスト開始');
    
    // ファイルを取得
    const file = DriveApp.getFileById(fileId);
    const fileName = file.getName();
    const mimeType = file.getMimeType();
    
    console.log('ファイル名:', fileName);
    console.log('MIMEタイプ:', mimeType);
    
    // PDFの場合、Google Docsにコピーを作成してOCR
    if (mimeType === 'application/pdf') {
      const folder = DriveApp.getFolderById('1dlWqaq_BX5wrcbn4P3LpSOmog2r_hi-9');
      
      // ファイルのコピーを作成
      const copyName = fileName + '_OCR_' + new Date().getTime();
      const fileCopy = file.makeCopy(copyName, folder);
      
      console.log('コピー作成完了:', copyName);
      
      // 手動でOCR処理の指示
      console.log('');
      console.log('=== 次の手順でOCRを実行してください ===');
      console.log('1. Google Driveで以下のファイルを見つける:');
      console.log('   ファイル名:', copyName);
      console.log('2. ファイルを右クリック');
      console.log('3. 「アプリで開く」→「Google ドキュメント」を選択');
      console.log('4. OCR処理が完了したら、テキストが表示されます');
      console.log('');
      console.log('ファイルURL:', fileCopy.getUrl());
      
      // ファイルURLを開く
      return {
        success: true,
        fileName: fileName,
        copyName: copyName,
        fileUrl: fileCopy.getUrl(),
        message: 'ファイルのコピーを作成しました。手動でGoogle Docsで開いてOCRを実行してください。'
      };
    } else {
      return {
        success: false,
        fileName: fileName,
        message: 'PDFファイルではありません'
      };
    }
    
  } catch (error) {
    console.error('エラー:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}