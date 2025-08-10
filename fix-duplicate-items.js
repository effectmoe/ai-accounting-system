const { MongoClient } = require('mongodb');

async function fixDuplicateItems() {
  const uri = process.env.MONGODB_URI || "mongodb+srv://accounting-user:Monchan5454%40@accounting-cluster.nld0j20.mongodb.net/accounting?retryWrites=true&w=majority&appName=accounting-cluster";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('accounting');
    
    // QUO-20250810-001の見積書を取得
    const quote = await db.collection('quotes').findOne({ 
      quoteNumber: 'QUO-20250810-001' 
    });
    
    if (!quote) {
      console.log('見積書が見つかりません');
      return;
    }
    
    console.log('現在の品目:');
    quote.items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.itemName} - ¥${item.unitPrice}`);
    });
    
    // 重複を削除（同じ品目名と単価の場合）
    const uniqueItems = [];
    const seen = new Set();
    
    for (const item of quote.items) {
      const key = `${item.itemName}-${item.unitPrice}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    }
    
    if (uniqueItems.length < quote.items.length) {
      console.log('\n重複が見つかりました。修正します...');
      
      // 合計金額も再計算
      const subtotal = uniqueItems.reduce((sum, item) => sum + (item.amount || 0), 0);
      const taxAmount = uniqueItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
      const totalAmount = subtotal + taxAmount;
      
      // 更新
      const result = await db.collection('quotes').updateOne(
        { quoteNumber: 'QUO-20250810-001' },
        { 
          $set: { 
            items: uniqueItems,
            subtotal: subtotal,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log('修正後の品目:');
      uniqueItems.forEach((item, index) => {
        console.log(`${index + 1}. ${item.itemName} - ¥${item.unitPrice}`);
      });
      
      console.log('\n金額:');
      console.log(`小計: ¥${subtotal.toLocaleString()}`);
      console.log(`消費税: ¥${taxAmount.toLocaleString()}`);
      console.log(`合計: ¥${totalAmount.toLocaleString()}`);
      
      console.log('\n✅ 修正完了');
    } else {
      console.log('\n重複は見つかりませんでした');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.close();
  }
}

// 実行
fixDuplicateItems();