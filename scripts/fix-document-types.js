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

async function fixDocumentTypes() {
  const uri = process.env.MONGODB_URI;
  console.log('🔍 MONGODB_URI:', uri ? 'Found' : 'Not found');
  console.log('🔍 URI prefix:', uri ? uri.substring(0, 50) + '...' : 'N/A');
  if (!uri || !uri.includes('mongodb+srv://')) {
    console.error('❌ Valid MONGODB_URI is not defined');
    console.error('Current URI:', uri);
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
      ocrStatus: { $exists: true },
      $or: [
        { documentType: 'receipt' },
        { documentType: { $exists: false } }
      ]
    }).toArray();

    console.log(`📊 Found ${documents.length} documents to analyze`);

    let updateCount = 0;
    const updatePromises = [];

    for (const doc of documents) {
      const ocrText = doc.extractedText || doc.extracted_text || '';
      const text = ocrText.toLowerCase();
      
      let detectedType = 'receipt'; // デフォルト
      
      // 文書タイプを検出
      if (text.includes('見積書') || text.includes('お見積') || text.includes('quotation') || text.includes('estimate')) {
        detectedType = 'quotation';
      } else if (text.includes('請求書') || text.includes('invoice') || text.includes('bill')) {
        detectedType = 'invoice';
      } else if (text.includes('発注書') || text.includes('注文書') || text.includes('purchase order')) {
        detectedType = 'purchase_order';
      } else if (text.includes('納品書') || text.includes('delivery note')) {
        detectedType = 'delivery_note';
      }
      
      // 現在のタイプと異なる場合のみ更新
      if (doc.documentType !== detectedType) {
        console.log(`🔄 Updating document ${doc._id}:`);
        console.log(`   Current type: ${doc.documentType || 'none'}`);
        console.log(`   Detected type: ${detectedType}`);
        console.log(`   File: ${doc.fileName}`);
        console.log(`   Text sample: ${ocrText.substring(0, 100)}...`);
        
        updatePromises.push(
          collection.updateOne(
            { _id: doc._id },
            { 
              $set: { 
                documentType: detectedType,
                updatedAt: new Date()
              }
            }
          )
        );
        updateCount++;
      }
    }

    // 一括更新を実行
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
      console.log(`\n✅ Updated ${updateCount} documents`);
    } else {
      console.log('\n✅ No documents needed updating');
    }

    // 更新後の統計を表示
    console.log('\n📊 Document type distribution after update:');
    const stats = await collection.aggregate([
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
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();

    stats.forEach(stat => {
      console.log(`   ${stat._id || 'unknown'}: ${stat.count} documents`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔒 MongoDB connection closed');
  }
}

// スクリプトを実行
fixDocumentTypes();