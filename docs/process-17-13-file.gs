// 17:13のファイルを今すぐ処理する
function process1713FileNow() {
  // 17:13にアップロードされたファイルのID
  const fileId = '1tOe0di3gWC5m5exEMybWvw5GKKcYY8x2';
  const fileName = 'スキャン_20250705-2350.pdf';
  
  console.log('処理開始:', fileName);
  
  try {
    // performOCROnFile関数を呼び出し
    const result = performOCROnFile(fileId);
    console.log('OCR処理完了:', result);
    
    // 成功メッセージ
    console.log('ファイルが正常に処理されました！');
    console.log('書類一覧ページをリロードしてください。');
    
    return result;
  } catch (error) {
    console.error('エラー:', error);
    throw error;
  }
}

// この関数を実行してください！
process1713FileNow();