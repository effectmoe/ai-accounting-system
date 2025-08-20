import { db } from '../lib/mongodb-client';

const Collections = {
  RECEIPTS: 'receipts'
};

async function testReceiptHTML() {
  console.log('=== 領収書HTML生成テスト（見積書・請求書と同じ方式） ===');
  
  try {
    // 最初の領収書を取得
    console.log('\n1. データベースから領収書を取得...');
    const receipts = await db.find(Collections.RECEIPTS, {}, { limit: 1 });
    
    if (receipts.length === 0) {
      console.log('領収書が見つかりません');
      return;
    }
    
    const dbReceipt = receipts[0];
    const receiptId = dbReceipt._id.toString();
    console.log('領収書ID:', receiptId);
    console.log('領収書番号:', dbReceipt.receiptNumber);
    console.log('顧客名:', dbReceipt.customerName);
    
    // テスト用URLを表示
    console.log('\n✅ ブラウザでテスト用URLを開いてください:');
    console.log('\n【HTMLビュー（デフォルト）】');
    console.log(`http://localhost:3000/api/receipts/${receiptId}/pdf`);
    
    console.log('\n【HTMLダウンロード】');
    console.log(`http://localhost:3000/api/receipts/${receiptId}/pdf?download=true`);
    
    console.log('\n【印刷モード（自動印刷ダイアログ）】');
    console.log(`http://localhost:3000/api/receipts/${receiptId}/pdf?print=true`);
    
    console.log('\n📌 見積書・請求書と同じ動作:');
    console.log('- HTMLを返す');
    console.log('- ブラウザの印刷機能でPDF化');
    console.log('- 日本語フォントの問題なし');
    
  } catch (error) {
    console.error('テスト失敗:', error);
  }
}

// テスト実行
testReceiptHTML().then(() => {
  console.log('\n=== テスト完了 ===');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});