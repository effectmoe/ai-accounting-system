const { MongoClient } = require('mongodb');
require('dotenv').config();

// MongoDB接続設定
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting-db';

async function investigateDatabase() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ MongoDBに接続しました');
    
    const db = client.db('accounting');
    
    // 1. invoicesコレクションの調査
    console.log('\n========== INVOICES コレクション ==========');
    const invoices = await db.collection('invoices').find({}).toArray();
    console.log(`📋 ドキュメント数: ${invoices.length}`);
    
    let invoicesTotal = 0;
    invoices.forEach((invoice, index) => {
      console.log(`\n請求書 ${index + 1}:`);
      console.log(`  ID: ${invoice._id}`);
      console.log(`  請求書番号: ${invoice.invoiceNumber}`);
      console.log(`  顧客名: ${invoice.customerName}`);
      console.log(`  金額: ¥${(invoice.amount || 0).toLocaleString()}`);
      console.log(`  ステータス: ${invoice.status}`);
      console.log(`  日付: ${invoice.invoiceDate}`);
      invoicesTotal += invoice.amount || 0;
    });
    console.log(`\n💰 請求書合計金額: ¥${invoicesTotal.toLocaleString()}`);
    
    // 2. quotesコレクションの調査
    console.log('\n\n========== QUOTES コレクション ==========');
    const quotes = await db.collection('quotes').find({}).toArray();
    console.log(`📋 ドキュメント数: ${quotes.length}`);
    
    let quotesTotal = 0;
    let suspiciousQuotes = [];
    
    quotes.forEach((quote, index) => {
      console.log(`\n見積書 ${index + 1}:`);
      console.log(`  ID: ${quote._id}`);
      console.log(`  見積書番号: ${quote.quoteNumber}`);
      console.log(`  顧客名: ${quote.customerName}`);
      console.log(`  金額: ¥${(quote.amount || 0).toLocaleString()}`);
      console.log(`  ステータス: ${quote.status}`);
      console.log(`  日付: ${quote.quoteDate}`);
      
      // 仕入見積書が混在していないかチェック
      if (quote.supplierName || quote.type === 'supplier' || quote.quoteNumber?.includes('SUP')) {
        console.log(`  ⚠️  仕入見積書の可能性があります！`);
        console.log(`  仕入先名: ${quote.supplierName || 'なし'}`);
        console.log(`  タイプ: ${quote.type || 'なし'}`);
        suspiciousQuotes.push(quote);
      }
      
      quotesTotal += quote.amount || 0;
    });
    console.log(`\n💰 見積書合計金額: ¥${quotesTotal.toLocaleString()}`);
    
    if (suspiciousQuotes.length > 0) {
      console.log(`\n⚠️  ${suspiciousQuotes.length}件の仕入見積書らしきドキュメントが見つかりました`);
    }
    
    // 3. supplierQuotesコレクションの調査
    console.log('\n\n========== SUPPLIER QUOTES コレクション ==========');
    const supplierQuotes = await db.collection('supplierQuotes').find({}).toArray();
    console.log(`📋 ドキュメント数: ${supplierQuotes.length}`);
    
    let supplierQuotesTotal = 0;
    supplierQuotes.forEach((quote, index) => {
      console.log(`\n仕入見積書 ${index + 1}:`);
      console.log(`  ID: ${quote._id}`);
      console.log(`  見積書番号: ${quote.quoteNumber}`);
      console.log(`  仕入先: ${quote.supplierName}`);
      console.log(`  金額: ¥${(quote.amount || 0).toLocaleString()}`);
      console.log(`  ステータス: ${quote.status}`);
      console.log(`  日付: ${quote.quoteDate}`);
      supplierQuotesTotal += quote.amount || 0;
    });
    console.log(`\n💰 仕入見積書合計金額: ¥${supplierQuotesTotal.toLocaleString()}`);
    
    // 4. purchaseInvoicesコレクションの調査
    console.log('\n\n========== PURCHASE INVOICES コレクション ==========');
    const purchaseInvoices = await db.collection('purchaseInvoices').find({}).toArray();
    console.log(`📋 ドキュメント数: ${purchaseInvoices.length}`);
    
    let purchaseInvoicesTotal = 0;
    purchaseInvoices.forEach((invoice, index) => {
      console.log(`\n仕入請求書 ${index + 1}:`);
      console.log(`  ID: ${invoice._id}`);
      console.log(`  請求書番号: ${invoice.invoiceNumber}`);
      console.log(`  仕入先: ${invoice.supplierName}`);
      console.log(`  金額: ¥${(invoice.amount || 0).toLocaleString()}`);
      console.log(`  ステータス: ${invoice.status}`);
      console.log(`  日付: ${invoice.invoiceDate}`);
      purchaseInvoicesTotal += invoice.amount || 0;
    });
    console.log(`\n💰 仕入請求書合計金額: ¥${purchaseInvoicesTotal.toLocaleString()}`);
    
    // 5. 集計結果
    console.log('\n\n========== 集計結果 ==========');
    console.log(`請求書合計: ¥${invoicesTotal.toLocaleString()}`);
    console.log(`見積書合計: ¥${quotesTotal.toLocaleString()}`);
    console.log(`仕入見積書合計: ¥${supplierQuotesTotal.toLocaleString()}`);
    console.log(`仕入請求書合計: ¥${purchaseInvoicesTotal.toLocaleString()}`);
    
    // ダッシュボードの表示値との比較
    const dashboardValue = 4616800;
    console.log(`\n🎯 ダッシュボードの表示値: ¥${dashboardValue.toLocaleString()}`);
    
    // 可能な組み合わせをチェック
    console.log('\n\n========== 金額の組み合わせチェック ==========');
    const combinations = [
      { name: '請求書のみ', total: invoicesTotal },
      { name: '見積書のみ', total: quotesTotal },
      { name: '請求書 + 見積書', total: invoicesTotal + quotesTotal },
      { name: '請求書 + 見積書 + 仕入見積書', total: invoicesTotal + quotesTotal + supplierQuotesTotal },
      { name: '全コレクション合計', total: invoicesTotal + quotesTotal + supplierQuotesTotal + purchaseInvoicesTotal },
      { name: '見積書 + 仕入見積書', total: quotesTotal + supplierQuotesTotal },
    ];
    
    let matchFound = false;
    combinations.forEach(combo => {
      console.log(`${combo.name}: ¥${combo.total.toLocaleString()}`);
      if (combo.total === dashboardValue) {
        console.log(`  ✅ ダッシュボードの値と一致！`);
        matchFound = true;
      }
    });
    
    if (!matchFound) {
      console.log('\n❌ ダッシュボードの値と一致する組み合わせが見つかりませんでした');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続を閉じました');
  }
}

// スクリプトを実行
investigateDatabase().catch(console.error);