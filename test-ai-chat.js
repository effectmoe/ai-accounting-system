// AIチャットのテストスクリプト
// このスクリプトは、複数の請求書作成シナリオをテストします

async function testAIChat() {
  const baseUrl = 'http://localhost:3000/api/invoices/analyze-chat';
  const sessionId = Date.now().toString();
  
  console.log('=== AIチャットのテスト開始 ===');
  console.log('セッションID:', sessionId);
  
  // テストケース1: 谷川商事への請求書作成
  console.log('\n--- テスト1: 谷川商事への請求書作成 ---');
  const test1 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation: '谷川商事、システム構築費として120万円',
      conversationHistory: [],
      sessionId,
      currentInvoiceData: {},
      mode: 'create'
    })
  });
  
  const result1 = await test1.json();
  console.log('応答:', result1.message);
  console.log('請求書データ:', JSON.stringify(result1.data, null, 2));
  
  // テストケース2: 「はい」と答えて山田商事の請求書を追加
  console.log('\n--- テスト2: 「はい」と答えて山田商事を追加 ---');
  const conversationHistory = [
    { role: 'user', content: '谷川商事、システム構築費として120万円' },
    { role: 'assistant', content: result1.message }
  ];
  
  const test2 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation: 'はい',
      conversationHistory,
      sessionId,
      currentInvoiceData: result1.data,
      mode: 'create'
    })
  });
  
  const result2 = await test2.json();
  console.log('応答:', result2.message);
  
  // テストケース3: 山田商事の請求書を作成
  console.log('\n--- テスト3: 山田商事の請求書作成 ---');
  conversationHistory.push(
    { role: 'user', content: 'はい' },
    { role: 'assistant', content: result2.message }
  );
  
  const test3 = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      conversation: '山田商事さんに、ウェブサイト制作費として50万円の請求書を作成',
      conversationHistory,
      sessionId,
      currentInvoiceData: result1.data,
      mode: 'create'
    })
  });
  
  const result3 = await test3.json();
  console.log('応答:', result3.message);
  console.log('請求書データ:', JSON.stringify(result3.data, null, 2));
  
  // 結果の検証
  console.log('\n=== 検証結果 ===');
  if (result3.data.customerName === '山田商事' && result3.data.totalAmount === 550000) {
    console.log('✅ 成功: 山田商事の請求書が正しく作成されました');
  } else if (result3.data.customerName === '谷川商事') {
    console.log('❌ エラー: 谷川商事のデータが残っています（山田商事に変わるべき）');
  } else {
    console.log('❓ 予期しない結果:', result3.data.customerName, result3.data.totalAmount);
  }
}

// テスト実行
testAIChat().catch(console.error);