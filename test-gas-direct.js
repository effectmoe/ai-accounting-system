// GAS直接実行テスト
const fetch = require('node-fetch');

async function testGASExecution() {
  const scriptId = 'AKfycbzKFGiF14PPGpMaTxPDtKc8CNDkAdyZx_98m7bGBBHRdp8oDvD_VS65AjYs5CGiboQ';
  const deploymentUrl = 'https://script.google.com/macros/s/AKfycbwfaf1sYjKovaHIRp7zhVO7C5G9O_LFlQGsTddR8F4hrJ2TZf_enMOlubssihW_atqU/exec';
  
  console.log('🔍 GAS直接実行テスト開始...\n');
  
  // 1. デプロイメントURLへのGETリクエスト
  console.log('1️⃣ デプロイメントURLにアクセス...');
  try {
    const response = await fetch(deploymentUrl);
    console.log('   ステータス:', response.status);
    console.log('   ステータステキスト:', response.statusText);
    
    if (response.ok) {
      const text = await response.text();
      console.log('   レスポンス:', text.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('   エラー:', error.message);
  }
  
  // 2. POSTリクエストでOCR処理をトリガー
  console.log('\n2️⃣ OCR処理をトリガー（POST）...');
  try {
    const response = await fetch(deploymentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'checkFiles',
        test: true
      })
    });
    
    console.log('   ステータス:', response.status);
    const result = await response.json();
    console.log('   結果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('   エラー:', error.message);
  }
}

testGASExecution();