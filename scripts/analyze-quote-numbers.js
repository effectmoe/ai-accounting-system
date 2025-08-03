const { MongoClient } = require('mongodb');

async function analyzeQuoteNumberPattern() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || 'accounting');
    
    console.log('=== 仕入先見積書番号の現状分析 ===\n');
    
    // 1. 既存の見積書番号を確認
    const quotes = await db.collection('supplierQuotes').find({})
      .sort({ quoteNumber: -1 })
      .toArray();
    
    console.log('1. 既存の見積書番号:');
    quotes.forEach((quote, i) => {
      console.log(`   ${i+1}. ${quote.quoteNumber} - 仕入先: ${quote.supplier || '未設定'} - 発行日: ${quote.issueDate}`);
    });
    
    // 2. 番号のパターン分析
    console.log('\n2. 番号パターンの分析:');
    const patterns = {};
    quotes.forEach(quote => {
      if (quote.quoteNumber) {
        const match = quote.quoteNumber.match(/^SQ-(\d{8})-(\d{3})/);
        if (match) {
          const datePrefix = match[1];
          if (!patterns[datePrefix]) {
            patterns[datePrefix] = [];
          }
          patterns[datePrefix].push({
            fullNumber: quote.quoteNumber,
            sequence: parseInt(match[2]),
            supplier: quote.supplier
          });
        }
      }
    });
    
    Object.keys(patterns).sort().forEach(prefix => {
      console.log(`\n   日付プレフィックス: SQ-${prefix}`);
      patterns[prefix].forEach(item => {
        console.log(`     - ${item.fullNumber} (仕入先: ${item.supplier || '未設定'})`);
      });
    });
    
    // 3. 仕入先ごとの見積書数
    console.log('\n3. 仕入先ごとの見積書数:');
    const supplierCounts = {};
    quotes.forEach(quote => {
      const supplier = quote.supplier || '未設定';
      supplierCounts[supplier] = (supplierCounts[supplier] || 0) + 1;
    });
    
    Object.entries(supplierCounts).forEach(([supplier, count]) => {
      console.log(`   ${supplier}: ${count}件`);
    });
    
    // 4. 現在のロジックの問題点
    console.log('\n4. 現在のロジックの問題点:');
    console.log('   - 日付ごとに連番をリセットしている');
    console.log('   - 仕入先に関係なく同じ日付なら連番が続く');
    console.log('   - 異なる仕入先でも同じ番号体系を使用');
    
    // 5. 改善提案
    console.log('\n5. 改善提案:');
    console.log('   案1: 仕入先コードを含む番号体系');
    console.log('        例: SQ-{仕入先コード}-{年月日}-{連番}');
    console.log('   案2: 仕入先ごとに独立した連番管理');
    console.log('        例: 各仕入先で001から開始');
    console.log('   案3: 年月でリセットする番号体系');
    console.log('        例: SQ-{年月}-{4桁連番}');
    
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await client.close();
  }
}

analyzeQuoteNumberPattern();