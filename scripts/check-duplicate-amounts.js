const { MongoClient, ObjectId } = require('mongodb');

async function checkDuplicateAmounts() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(process.env.MONGODB_DB_NAME || 'accounting');
    
    // 両方の見積書を取得
    const quotes = await db.collection('supplierQuotes').find({
      quoteNumber: { $in: ['SQ-20250803-001', 'SQ-20250803-002'] }
    }).sort({ quoteNumber: 1 }).toArray();

    console.log('\n=== 複製前後の比較 ===');
    
    quotes.forEach((quote, index) => {
      console.log(`\n${index === 0 ? '元の見積書' : '複製された見積書'}: ${quote.quoteNumber}`);
      console.log(`  総額: ¥${(quote.totalAmount || 0).toLocaleString()}`);
      console.log(`  小計: ¥${(quote.subtotal || 0).toLocaleString()}`);
      console.log(`  税額: ¥${(quote.taxAmount || 0).toLocaleString()}`);
      console.log(`  項目数: ${quote.items ? quote.items.length : 0}`);
      
      if (quote.items && quote.items.length > 0) {
        console.log(`  項目詳細:`);
        quote.items.forEach((item, itemIndex) => {
          console.log(`    ${itemIndex + 1}. ${item.itemName}`);
          console.log(`       数量: ${item.quantity}, 単価: ¥${(item.unitPrice || 0).toLocaleString()}, 金額: ¥${(item.amount || 0).toLocaleString()}`);
          console.log(`       税率: ${item.taxRate}%, 税額: ¥${(item.taxAmount || 0).toLocaleString()}`);
        });
      }
    });

    // 金額の差異を計算
    if (quotes.length === 2) {
      const [original, duplicate] = quotes;
      const amountDiff = (duplicate.totalAmount || 0) - (original.totalAmount || 0);
      
      console.log('\n=== 差異分析 ===');
      console.log(`総額の差: ¥${amountDiff.toLocaleString()}`);
      
      if (amountDiff !== 0) {
        console.log('⚠️ 複製時に金額が変更されています！');
        
        // 項目レベルの比較
        if (original.items && duplicate.items) {
          if (original.items.length !== duplicate.items.length) {
            console.log(`項目数が異なります: ${original.items.length} → ${duplicate.items.length}`);
          } else {
            console.log('項目ごとの比較:');
            for (let i = 0; i < original.items.length; i++) {
              const origItem = original.items[i];
              const dupItem = duplicate.items[i];
              
              if (origItem.amount !== dupItem.amount) {
                console.log(`  項目${i + 1} "${origItem.itemName}": ¥${(origItem.amount || 0).toLocaleString()} → ¥${(dupItem.amount || 0).toLocaleString()}`);
              }
            }
          }
        }
      } else {
        console.log('✅ 金額は正しく複製されています');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkDuplicateAmounts();