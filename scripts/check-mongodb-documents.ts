#!/usr/bin/env tsx

import { config } from 'dotenv';
import path from 'path';
import { db } from '../src/lib/mongodb-client';

// .env.localファイルを読み込む
config({ path: path.join(process.cwd(), '.env.local') });

async function checkDocuments() {
  console.log('🔍 Checking MongoDB documents collection...\n');

  try {
    // ドキュメントの総数を確認
    const totalCount = await db.count('documents', {});
    console.log(`📊 Total documents in collection: ${totalCount}\n`);

    // 最新の5件を取得
    const recentDocs = await db.find('documents', {}, {
      limit: 5,
      sort: { createdAt: -1 }
    });

    if (recentDocs.length > 0) {
      console.log('📄 Recent documents:');
      recentDocs.forEach((doc, index) => {
        console.log(`\n${index + 1}. Document ID: ${doc._id}`);
        console.log(`   File Name: ${doc.fileName}`);
        console.log(`   Vendor: ${doc.vendorName}`);
        console.log(`   Total Amount: ¥${doc.totalAmount}`);
        console.log(`   Created: ${doc.createdAt}`);
        console.log(`   OCR Status: ${doc.ocrStatus}`);
        console.log(`   GridFS File ID: ${doc.gridfsFileId}`);
      });
    } else {
      console.log('❌ No documents found in the collection');
    }

    // OCR結果の数を確認
    const ocrResultCount = await db.count('ocrResults', {});
    console.log(`\n📊 Total OCR results: ${ocrResultCount}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    // MongoDB接続を閉じる
    const { MongoClient } = await import('mongodb');
    await MongoClient.prototype.close.call(global._mongoClientPromise);
    process.exit(0);
  }
}

checkDocuments().catch(console.error);