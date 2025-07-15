// 拡張されたOCR情報抽出のテスト関数
function testEnhancedOcrExtraction() {
  // テスト用のレシートテキスト
  const testText = `
タイムズ24株式会社
コインパーキング事業部
東京都品川区西五反田2-20-4

領収書

No. 2023070512345

2023年7月5日

店舗名: タイムズステーション品川
TEL: 03-1234-5678

小計         ¥1,000
消費税(10%)    ¥100
━━━━━━━━━━━━
合計       ¥1,100

お預かり    ¥2,000
お釣り      ¥900

レジ#3 担当: 山田

ありがとうございました
  `;
  
  // extractInformation関数のテスト
  const result = extractInformation(testText, 'test_receipt.pdf');
  
  Logger.log('=== テスト結果 ===');
  Logger.log('vendor_name: ' + result.vendor_name);
  Logger.log('company_name: ' + result.company_name);
  Logger.log('store_name: ' + result.store_name);
  Logger.log('store_phone: ' + result.store_phone);
  Logger.log('receipt_number: ' + result.receipt_number);
  Logger.log('receipt_date: ' + result.receipt_date);
  Logger.log('subtotal_amount: ' + result.subtotal_amount);
  Logger.log('tax_amount: ' + result.tax_amount);
  Logger.log('total_amount: ' + result.total_amount);
  Logger.log('payment_amount: ' + result.payment_amount);
  Logger.log('change_amount: ' + result.change_amount);
  Logger.log('notes: ' + result.notes);
  
  // 期待される結果との比較
  const expected = {
    vendor_name: 'タイムズ24株式会社',
    company_name: 'タイムズ24株式会社',
    store_name: 'タイムズステーション品川',
    store_phone: '03-1234-5678',
    receipt_number: '2023070512345',
    receipt_date: '2023-07-05',
    subtotal_amount: 1000,
    tax_amount: 100,
    total_amount: 1100,
    payment_amount: 2000,
    change_amount: 900,
    notes: 'レジ番号: 3\n担当: 山田'
  };
  
  Logger.log('\n=== 期待値との比較 ===');
  for (const key in expected) {
    const match = result[key] === expected[key];
    Logger.log(key + ': ' + (match ? '✓' : '✗') + ' (取得値: ' + result[key] + ', 期待値: ' + expected[key] + ')');
  }
}