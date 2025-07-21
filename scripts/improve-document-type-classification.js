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

// 改善された文書タイプ判定関数
function detectDocumentType(doc) {
  const ocrText = (doc.extractedText || doc.extracted_text || '').toLowerCase();
  const vendorName = (doc.vendor_name || doc.vendorName || doc.store_name || '').toLowerCase();
  const fileName = (doc.fileName || doc.file_name || '').toLowerCase();
  
  // JSONパース可能かチェック
  let jsonData = null;
  try {
    jsonData = JSON.parse(doc.extractedText || doc.extracted_text || '{}');
  } catch (e) {
    // JSONではない
  }
  
  // 文書タイプのスコアリング
  const scores = {
    receipt: 0,
    invoice: 0,
    quotation: 0,
    delivery_note: 0,
    purchase_order: 0
  };
  
  // 1. OCRテキストによるキーワード検出（最も重要）
  if (ocrText) {
    // 領収書関連
    if (ocrText.includes('領収書') || ocrText.includes('領収証')) scores.receipt += 10;
    if (ocrText.includes('レシート')) scores.receipt += 10;
    if (ocrText.includes('receipt')) scores.receipt += 10;
    if (ocrText.includes('お預かり') || ocrText.includes('お釣り')) scores.receipt += 5;
    if (ocrText.includes('税込') && ocrText.includes('合計')) scores.receipt += 3;
    
    // 請求書関連
    if (ocrText.includes('請求書')) scores.invoice += 10;
    if (ocrText.includes('invoice')) scores.invoice += 10;
    if (ocrText.includes('bill')) scores.invoice += 8;
    if (ocrText.includes('ご請求')) scores.invoice += 8;
    if (ocrText.includes('お支払い期限') || ocrText.includes('振込先')) scores.invoice += 5;
    
    // 見積書関連
    if (ocrText.includes('見積書')) scores.quotation += 10;
    if (ocrText.includes('お見積')) scores.quotation += 10;
    if (ocrText.includes('quotation')) scores.quotation += 10;
    if (ocrText.includes('estimate')) scores.quotation += 10;
    if (ocrText.includes('有効期限') && !ocrText.includes('お支払い')) scores.quotation += 5;
    
    // 納品書関連
    if (ocrText.includes('納品書')) scores.delivery_note += 10;
    if (ocrText.includes('delivery note')) scores.delivery_note += 10;
    if (ocrText.includes('delivery slip')) scores.delivery_note += 10;
    
    // 発注書関連
    if (ocrText.includes('発注書') || ocrText.includes('注文書')) scores.purchase_order += 10;
    if (ocrText.includes('purchase order')) scores.purchase_order += 10;
    if (ocrText.includes('order form')) scores.purchase_order += 10;
  }
  
  // 2. ベンダー名による推測（駐車場の場合は領収書の可能性が高い）
  if (vendorName) {
    if (vendorName.includes('タイムズ') || vendorName.includes('times') || 
        vendorName.includes('パーキング') || vendorName.includes('parking') ||
        vendorName.includes('駐車場')) {
      scores.receipt += 5;
    }
  }
  
  // 3. ファイル名による推測
  if (fileName) {
    if (fileName.includes('receipt') || fileName.includes('領収')) scores.receipt += 3;
    if (fileName.includes('invoice') || fileName.includes('請求')) scores.invoice += 3;
    if (fileName.includes('quote') || fileName.includes('見積')) scores.quotation += 3;
    if (fileName.includes('delivery') || fileName.includes('納品')) scores.delivery_note += 3;
    if (fileName.includes('order') || fileName.includes('発注')) scores.purchase_order += 3;
  }
  
  // 4. JSONデータの特殊処理
  if (jsonData && jsonData.documentType) {
    // JSON内に明示的な文書タイプがある場合は優先
    const typeMap = {
      '領収書': 'receipt',
      '請求書': 'invoice',
      '見積書': 'quotation',
      '納品書': 'delivery_note',
      '発注書': 'purchase_order'
    };
    
    for (const [key, value] of Object.entries(typeMap)) {
      if (jsonData.documentType.includes(key)) {
        scores[value] += 20;
      }
    }
  }
  
  // 5. 複数の用途が記載されている場合の処理
  // 「領収書\n\n見積書・請求書としてもご利用いただけます」のようなケース
  if (ocrText.includes('領収書') && 
      (ocrText.includes('見積書・請求書としてもご利用いただけます') || 
       ocrText.includes('見積書・請求書としても'))) {
    // 主要な用途は領収書として扱う
    scores.receipt += 5;
    scores.quotation -= 3;
    scores.invoice -= 3;
  }
  
  // 6. OCRテキストが空の場合のフォールバック
  if (!ocrText || ocrText.trim() === '') {
    // 金額情報がある場合は領収書の可能性が高い
    if (doc.total_amount || doc.totalAmount) {
      scores.receipt += 2;
    }
  }
  
  // 最高スコアの文書タイプを返す
  let maxScore = 0;
  let detectedType = 'receipt'; // デフォルトは領収書
  
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = type;
    }
  }
  
  return {
    type: detectedType,
    scores: scores,
    confidence: maxScore
  };
}

async function improveDocumentTypeClassification() {
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

    // 更新結果のカウンター
    const updateStats = {
      total: 0,
      changed: 0,
      byType: {
        receipt: 0,
        invoice: 0,
        quotation: 0,
        delivery_note: 0,
        purchase_order: 0
      }
    };

    // 各ドキュメントの文書タイプを再判定
    for (const doc of documents) {
      const currentType = doc.documentType || 'unknown';
      const detection = detectDocumentType(doc);
      
      console.log(`\n========== ドキュメント ==========`);
      console.log(`ID: ${doc._id}`);
      console.log(`ファイル名: ${doc.fileName || doc.file_name}`);
      console.log(`現在のタイプ: ${currentType}`);
      console.log(`検出されたタイプ: ${detection.type} (信頼度: ${detection.confidence})`);
      console.log(`スコア詳細:`, detection.scores);
      
      // タイプが変更される場合のみ更新
      if (currentType !== detection.type) {
        console.log(`✅ タイプを更新: ${currentType} → ${detection.type}`);
        
        await collection.updateOne(
          { _id: doc._id },
          { 
            $set: { 
              documentType: detection.type,
              type: detection.type,
              documentTypeConfidence: detection.confidence,
              documentTypeScores: detection.scores,
              updatedAt: new Date()
            }
          }
        );
        
        updateStats.changed++;
        updateStats.byType[detection.type]++;
      } else {
        console.log(`⏭️  タイプ変更なし`);
      }
      
      updateStats.total++;
    }

    // 結果サマリー
    console.log('\n\n📊 ===== 更新結果サマリー =====');
    console.log(`総処理数: ${updateStats.total}`);
    console.log(`更新数: ${updateStats.changed}`);
    console.log('\n更新後の文書タイプ別カウント:');
    
    const typeCounts = await collection.aggregate([
      {
        $match: {
          companyId: '11111111-1111-1111-1111-111111111111',
          ocrStatus: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$documentType',
          count: { $sum: 1 }
        }
      }
    ]).toArray();
    
    typeCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id || 'unknown'}: ${count}件`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// スクリプトを実行
improveDocumentTypeClassification();