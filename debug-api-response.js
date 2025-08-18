// APIレスポンスの詳細調査
async function debugApiResponse() {
  try {
    console.log('=== 見積書API調査 ===');
    
    // 見積書データを取得
    const response = await fetch('http://localhost:3000/api/quotes/68a03e8c3bd33315e2d46f69');
    if (!response.ok) {
      throw new Error('Failed to fetch quote');
    }
    const quote = await response.json();
    
    console.log('見積書ID:', quote._id);
    console.log('見積書番号:', quote.quoteNumber);
    console.log('顧客名:', quote.customerName);
    
    console.log('\n=== 項目詳細 ===');
    if (quote.items && Array.isArray(quote.items)) {
      quote.items.forEach((item, index) => {
        console.log(`項目 ${index + 1}:`);
        console.log(`  itemName: "${item.itemName}" (type: ${typeof item.itemName})`);
        console.log(`  description: "${item.description}" (type: ${typeof item.description})`);
        console.log(`  quantity: ${item.quantity}`);
        console.log(`  unitPrice: ${item.unitPrice}`);
        console.log(`  amount: ${item.amount}`);
        console.log(`  tooltip: "${item.tooltip}" (type: ${typeof item.tooltip})`);
      });
    } else {
      console.log('項目が存在しません');
    }
    
    console.log('\n=== htmlSettings詳細 ===');
    if (quote.htmlSettings) {
      console.log('customMessage:', quote.htmlSettings.customMessage ? '存在' : '不在');
      console.log('tooltips数:', quote.htmlSettings.tooltips?.length || 0);
      console.log('productLinks数:', quote.htmlSettings.productLinks?.length || 0);
      console.log('suggestedOptions数:', quote.htmlSettings.suggestedOptions?.length || 0);
      
      if (quote.htmlSettings.tooltips && quote.htmlSettings.tooltips.length > 0) {
        console.log('\nツールチップ一覧:');
        quote.htmlSettings.tooltips.forEach(([key, value], index) => {
          console.log(`  ${index + 1}. "${key}" -> "${value.substring(0, 50)}..."`);
        });
      }
    } else {
      console.log('htmlSettings が存在しません');
    }
    
    console.log('\n=== 備考 ===');
    console.log('notes:', quote.notes ? `"${quote.notes}"` : 'null/undefined');
    console.log('notes type:', typeof quote.notes);
    console.log('notes length:', quote.notes?.length || 0);
    
    console.log('\n=== 完全なquoteオブジェクト ===');
    console.log(JSON.stringify(quote, null, 2));
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

// Node.jsで実行
if (typeof fetch === 'undefined') {
  const { default: fetch } = require('node-fetch');
  global.fetch = fetch;
}

debugApiResponse().catch(console.error);