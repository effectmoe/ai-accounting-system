const { MongoClient, ObjectId } = require('mongodb');

async function fixQuoteAmounts() {
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
    
    // SQ-20250803-001の金額を確認・修正
    const quote = await db.collection('supplierQuotes').findOne({
      quoteNumber: 'SQ-20250803-001'
    });

    if (!quote) {
      console.error('Quote not found');
      return;
    }

    console.log('\n=== 元の見積書の金額確認 ===');
    console.log(`見積書番号: ${quote.quoteNumber}`);
    console.log(`現在の総額: ¥${(quote.totalAmount || 0).toLocaleString()}`);
    console.log(`小計: ¥${(quote.subtotal || 0).toLocaleString()}`);
    console.log(`税額: ¥${(quote.taxAmount || 0).toLocaleString()}`);

    // 正しい総額を計算
    const correctTotal = (quote.subtotal || 0) + (quote.taxAmount || 0);
    console.log(`計算上の正しい総額: ¥${correctTotal.toLocaleString()}`);

    if (quote.totalAmount !== correctTotal) {
      console.log('⚠️ 総額に間違いがあります。修正します...');
      
      const updateResult = await db.collection('supplierQuotes').updateOne(
        { _id: quote._id },
        { 
          $set: { 
            totalAmount: correctTotal,
            updatedAt: new Date()
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        console.log('✅ 総額を修正しました');
      } else {
        console.log('❌ 修正に失敗しました');
      }
    } else {
      console.log('✅ 総額は正しいです');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixQuoteAmounts();