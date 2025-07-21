const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const fs = require('fs');

// 環境変数を手動で読み込む
const envPath = path.join(__dirname, '..', '.env.local');
console.log('📁 Loading .env.local from:', envPath);

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    if (line.includes('MONGODB_URI=') && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      process.env[key] = valueParts.join('=').trim();
      break;
    }
  }
}

async function checkOCRTexts() {
  const uri = process.env.MONGODB_URI;
  if (!uri || !uri.includes('mongodb+srv://')) {
    console.error('❌ Valid MONGODB_URI is not defined');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db('accounting_system');
    const collection = db.collection('documents');

    // OCRステータスを持つドキュメントを取得
    const documents = await collection.find({
      companyId: '11111111-1111-1111-1111-111111111111',
      ocrStatus: { $exists: true }
    }).toArray();

    console.log(`\n📊 総ドキュメント数: ${documents.length}\n`);

    // 各ドキュメントのOCRテキストを確認
    documents.forEach((doc, index) => {
      const ocrText = doc.extractedText || doc.extracted_text || '';
      const text = ocrText.toLowerCase();
      
      console.log(`\n========== ドキュメント ${index + 1} ==========`);
      console.log(`ID: ${doc._id}`);
      console.log(`ファイル名: ${doc.fileName || doc.file_name}`);
      console.log(`現在のタイプ: ${doc.documentType || 'なし'}`);
      console.log(`ベンダー: ${doc.vendor_name || doc.vendorName || doc.store_name || 'なし'}`);
      console.log(`金額: ¥${doc.total_amount || doc.totalAmount || 0}`);
      console.log(`日付: ${doc.receipt_date || doc.documentDate || doc.issueDate || 'なし'}`);
      
      // OCRテキストの最初の200文字を表示
      console.log(`\nOCRテキスト (最初の200文字):`);
      console.log(ocrText.substring(0, 200));
      
      // 文書タイプのキーワードチェック
      console.log(`\n🔍 キーワード検出:`);
      if (text.includes('見積書') || text.includes('お見積') || text.includes('quotation') || text.includes('estimate')) {
        console.log('  ✓ 見積書キーワード検出');
      }
      if (text.includes('請求書') || text.includes('invoice') || text.includes('bill')) {
        console.log('  ✓ 請求書キーワード検出');
      }
      if (text.includes('領収書') || text.includes('レシート') || text.includes('receipt')) {
        console.log('  ✓ 領収書キーワード検出');
      }
      if (text.includes('納品書') || text.includes('delivery note')) {
        console.log('  ✓ 納品書キーワード検出');
      }
      if (text.includes('発注書') || text.includes('注文書') || text.includes('purchase order')) {
        console.log('  ✓ 発注書キーワード検出');
      }
      
      // JSONパース可能かチェック
      try {
        const parsed = JSON.parse(ocrText);
        console.log('\n📄 JSONとしてパース可能');
        if (parsed.documentNumber) {
          console.log(`  文書番号: ${parsed.documentNumber}`);
        }
        if (parsed.subject) {
          console.log(`  件名: ${parsed.subject}`);
        }
      } catch (e) {
        // JSONではない
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// スクリプトを実行
checkOCRTexts();