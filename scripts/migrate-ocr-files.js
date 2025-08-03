const { MongoClient, ObjectId } = require('mongodb');

async function migrateOcrFiles() {
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
    
    // GridFSからsupplier-quoteタイプのファイルを取得
    const files = await db.collection('fs.files').find({
      'metadata.documentType': 'supplier-quote'
    }).toArray();
    
    console.log(`移行対象のファイル数: ${files.length}`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const file of files) {
      try {
        // ファイル名から見積書番号を推測する
        // または、メタデータから見積書IDを取得する
        let quoteId = null;
        
        if (file.metadata && file.metadata.quoteId) {
          quoteId = file.metadata.quoteId;
        } else {
          // ファイル名から見積書を推測（例：ファイル名に含まれる見積書番号）
          // これは推測なので、正確な関連付けができない場合があります
          console.log(`推測が必要なファイル: ${file.filename}`);
          
          // とりあえず最新の見積書に関連付ける（デモ用）
          const latestQuote = await db.collection('supplierQuotes').findOne(
            {},
            { sort: { createdAt: -1 } }
          );
          
          if (latestQuote) {
            quoteId = latestQuote._id.toString();
            console.log(`  -> 最新の見積書 ${latestQuote.quoteNumber} に関連付けます`);
          }
        }
        
        if (!quoteId) {
          console.log(`スキップ: ${file.filename} (関連する見積書が見つからない)`);
          skippedCount++;
          continue;
        }
        
        // 見積書にocrFilesフィールドを追加
        const fileInfo = {
          id: file._id.toString(),
          filename: file.filename,
          uploadedAt: file.uploadDate,
          fileType: file.metadata?.contentType || 'application/octet-stream',
          fileSize: file.length
        };
        
        const result = await db.collection('supplierQuotes').updateOne(
          { _id: new ObjectId(quoteId) },
          {
            $push: { ocrFiles: fileInfo },
            $set: { updatedAt: new Date() }
          }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✓ 移行完了: ${file.filename} -> 見積書ID ${quoteId}`);
          migratedCount++;
        } else {
          console.log(`失敗: ${file.filename} (見積書が見つからない: ${quoteId})`);
          skippedCount++;
        }
        
      } catch (error) {
        console.error(`エラー処理中 ${file.filename}:`, error.message);
        skippedCount++;
      }
    }
    
    console.log(`\n=== 移行結果 ===`);
    console.log(`移行成功: ${migratedCount}件`);
    console.log(`スキップ: ${skippedCount}件`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

migrateOcrFiles();