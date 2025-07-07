/**
 * 簡単なテスト用スクリプト
 * GASエディタにコピペして実行
 */

// 1. まずこれを実行してDrive APIの権限を取得
function step1_enableAPI() {
  DriveApp.getRootFolder();
  console.log('Drive API有効化完了！次はstep2を実行してください');
}

// 2. Webhookのテスト（ファイル不要）
function step2_testWebhook() {
  const WEBHOOK_URL = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL');
  
  if (!WEBHOOK_URL) {
    console.error('エラー: スクリプトプロパティにWEBHOOK_URLを設定してください');
    console.log('設定方法: プロジェクト設定 > スクリプトプロパティ > WEBHOOK_URL = https://accounting-automation-l4rd0r8mn-effectmoes-projects.vercel.app/api/webhook/ocr');
    return;
  }
  
  const testData = {
    fileId: 'test123',
    fileName: 'test-receipt.jpg',
    ocrText: 'ローソン\n2025/07/08\n合計 1,000円',
    documentInfo: {
      vendorName: 'ローソン',
      totalAmount: 1000,
      receiptDate: '2025-07-08',
      storeName: 'ローソン'
    },
    processedAt: new Date().toISOString()
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(testData),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(WEBHOOK_URL, options);
  console.log('Webhook応答:', response.getResponseCode());
  console.log('応答内容:', response.getContentText());
  
  if (response.getResponseCode() === 200) {
    console.log('成功！アプリのOCR結果タブを確認してください');
  }
}