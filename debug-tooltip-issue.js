// ツールチップ表示問題のデバッグスクリプト
const { MongoClient } = require('mongodb');

async function debugTooltipIssue() {
  const uri = process.env.MONGODB_URI || process.env.MONGODB_CONNECTION_STRING;
  
  if (!uri) {
    console.error('❌ MONGODB_URI が設定されていません');
    return;
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ MongoDB接続成功');

    const db = client.db();
    const quotesCollection = db.collection('quotes');

    // 最新の見積書を5件取得
    const recentQuotes = await quotesCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    console.log(`\n📋 最新の見積書 ${recentQuotes.length} 件を調査:`);

    for (let i = 0; i < recentQuotes.length; i++) {
      const quote = recentQuotes[i];
      console.log(`\n--- 見積書 ${i + 1}: ${quote.quoteNumber} ---`);
      console.log('ID:', quote._id);
      console.log('顧客名:', quote.customerName || quote.customer?.companyName || '未設定');
      console.log('項目数:', quote.items?.length || 0);
      
      // htmlSettings の確認
      console.log('\n🔧 HTML設定:');
      if (quote.htmlSettings) {
        console.log('  - customMessage:', !!quote.htmlSettings.customMessage);
        console.log('  - tooltips:', quote.htmlSettings.tooltips?.length || 0, '件');
        console.log('  - productLinks:', quote.htmlSettings.productLinks?.length || 0, '件');
        console.log('  - suggestedOptions:', quote.htmlSettings.suggestedOptions?.length || 0, '件');
        
        // ツールチップの詳細
        if (quote.htmlSettings.tooltips && quote.htmlSettings.tooltips.length > 0) {
          console.log('\n  📝 ツールチップ詳細:');
          quote.htmlSettings.tooltips.forEach(([key, value], index) => {
            console.log(`    ${index + 1}. "${key}" -> "${value.substring(0, 50)}..."`);
          });
        } else {
          console.log('  ⚠️ ツールチップが保存されていません');
        }
      } else {
        console.log('  ❌ htmlSettings が存在しません');
      }

      // 項目の確認
      console.log('\n📦 見積項目:');
      if (quote.items && quote.items.length > 0) {
        quote.items.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.itemName || item.description || '名前なし'}`);
          console.log(`     数量: ${item.quantity}, 単価: ${item.unitPrice}, 金額: ${item.amount}`);
          if (item.tooltip) {
            console.log(`     ツールチップ: "${item.tooltip.substring(0, 50)}..."`);
          } else {
            console.log('     ツールチップ: なし');
          }
        });
      } else {
        console.log('  ❌ 項目がありません');
      }

      // 備考の確認
      console.log('\n📝 備考:');
      if (quote.notes) {
        console.log(`  内容: "${quote.notes.substring(0, 100)}${quote.notes.length > 100 ? '...' : ''}"`);
        console.log(`  文字数: ${quote.notes.length}`);
        console.log(`  タイプ: ${typeof quote.notes}`);
      } else {
        console.log('  ❌ 備考がありません');
      }
    }

    // ツールチップが設定されている見積書を検索
    console.log('\n\n🔍 ツールチップが設定されている見積書を検索:');
    const quotesWithTooltips = await quotesCollection
      .find({ 'htmlSettings.tooltips': { $exists: true, $ne: null, $not: { $size: 0 } } })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    if (quotesWithTooltips.length > 0) {
      console.log(`✅ ツールチップ設定済み見積書: ${quotesWithTooltips.length} 件`);
      quotesWithTooltips.forEach((quote, index) => {
        console.log(`  ${index + 1}. ${quote.quoteNumber} - ツールチップ数: ${quote.htmlSettings.tooltips.length}`);
      });
    } else {
      console.log('❌ ツールチップが設定された見積書が見つかりません');
    }

    // 備考がある見積書を検索
    console.log('\n📝 備考がある見積書を検索:');
    const quotesWithNotes = await quotesCollection
      .find({ notes: { $exists: true, $ne: null, $ne: '' } })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    if (quotesWithNotes.length > 0) {
      console.log(`✅ 備考あり見積書: ${quotesWithNotes.length} 件`);
      quotesWithNotes.forEach((quote, index) => {
        console.log(`  ${index + 1}. ${quote.quoteNumber} - 備考文字数: ${quote.notes.length}`);
        console.log(`     内容: "${quote.notes.substring(0, 50)}..."`);
      });
    } else {
      console.log('❌ 備考がある見積書が見つかりません');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB接続終了');
  }
}

// スクリプト実行
if (require.main === module) {
  debugTooltipIssue().catch(console.error);
}

module.exports = { debugTooltipIssue };