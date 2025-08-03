const { MongoClient, ObjectId } = require('mongodb');

async function migrateSpecificOcrFiles() {
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
    
    // マイグレーション対象の定義
    const migrations = [
      {
        quoteNumber: 'SQ-20250730-001',
        fileId: '6889add16f09a2e87c29c6d0',
        filename: '御見積書_ＣＲＯＰ様.PDF',
        reason: '日付が一致し、ファイル名が見積書を示している'
      }
    ];

    console.log('=== 特定のOCRファイルマイグレーション ===\n');

    for (const migration of migrations) {
      console.log(`処理中: ${migration.quoteNumber}`);
      
      // 見積書を取得
      const quote = await db.collection('supplierQuotes').findOne({
        quoteNumber: migration.quoteNumber
      });

      if (!quote) {
        console.log(`  ❌ 見積書が見つかりません: ${migration.quoteNumber}`);
        continue;
      }

      // GridFSファイルの存在確認
      const gridfsFile = await db.collection('fs.files').findOne({
        _id: new ObjectId(migration.fileId)
      });

      if (!gridfsFile) {
        console.log(`  ❌ GridFSファイルが見つかりません: ${migration.fileId}`);
        continue;
      }

      console.log(`  ✅ ファイル確認: ${gridfsFile.filename}`);

      // OCRファイル情報を準備
      const ocrFile = {
        id: migration.fileId,
        filename: gridfsFile.filename,
        uploadedAt: gridfsFile.uploadDate,
        fileType: gridfsFile.contentType || 'application/pdf',
        fileSize: gridfsFile.length
      };

      // 見積書を更新
      const updateResult = await db.collection('supplierQuotes').updateOne(
        { _id: quote._id },
        {
          $set: {
            ocrFiles: [ocrFile],
            updatedAt: new Date()
          }
        }
      );

      if (updateResult.modifiedCount > 0) {
        console.log(`  ✅ マイグレーション成功`);
        console.log(`     理由: ${migration.reason}`);
      } else {
        console.log(`  ❌ 更新に失敗しました`);
      }
    }

    // システム全体の提案
    console.log('\n=== システム的な改善提案 ===');
    console.log('1. 新規アップロード時に自動的に関連付けを行う');
    console.log('2. ファイル名に見積書番号を含める規則を導入');
    console.log('3. アップロード時にメタデータとして関連IDを保存');
    console.log('4. documentsコレクションとsupplierQuotesの統合');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

migrateSpecificOcrFiles();