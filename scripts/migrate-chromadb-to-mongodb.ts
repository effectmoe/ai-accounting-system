/**
 * ChromaDB から MongoDB へのRAGデータ移行スクリプト
 *
 * 使用方法:
 * 1. ChromaDBのPythonスクリプトでデータをエクスポート: python scripts/export_chromadb.py > chromadb_export.json
 * 2. このスクリプトでインポート: npx ts-node scripts/migrate-chromadb-to-mongodb.ts
 *
 * または直接実行:
 * source rag_env/bin/activate && python -c "..." | npx ts-node scripts/migrate-chromadb-to-mongodb.ts
 */

import { MongoClient, ObjectId } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// .env.localを読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface ChromaDBRecord {
  id: string;
  document: string;
  metadata: {
    store_name: string;
    category: string;
    description: string;
    item_description?: string;
    total_amount?: number;
    issue_date?: string;
    verified: boolean;
  };
}

interface MongoDBRAGRecord {
  document: string;
  storeName: string;
  category: string;
  description: string;
  itemDescription?: string;
  totalAmount?: number;
  issueDate?: string;
  verified: boolean;
  sourceReceiptId?: string;
  createdAt: Date;
  updatedAt: Date;
}

async function migrateData() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  // ChromaDBエクスポートファイルを読み込む
  const exportFilePath = path.join(process.cwd(), 'chromadb_export.json');

  let chromaRecords: ChromaDBRecord[] = [];

  if (fs.existsSync(exportFilePath)) {
    const exportData = fs.readFileSync(exportFilePath, 'utf-8');
    const parsed = JSON.parse(exportData);
    chromaRecords = parsed.records || [];
  } else {
    // 標準入力から読み込む
    console.log('chromadb_export.jsonが見つかりません。標準入力から読み込みます...');
    const stdin = fs.readFileSync(0, 'utf-8');
    try {
      const parsed = JSON.parse(stdin);
      chromaRecords = parsed.records || [];
    } catch (e) {
      console.error('JSONのパースに失敗しました:', e);
      process.exit(1);
    }
  }

  if (chromaRecords.length === 0) {
    console.log('移行するデータがありません。');
    return;
  }

  console.log(`${chromaRecords.length}件のレコードを移行します...`);

  // MongoDBに接続
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    console.log('MongoDBに接続しました');

    const db = client.db();
    const collection = db.collection('ragRecords');

    // 既存データの件数を確認
    const existingCount = await collection.countDocuments();
    console.log(`既存のragRecordsコレクション: ${existingCount}件`);

    // データを変換して挿入
    const now = new Date();
    const mongoRecords: MongoDBRAGRecord[] = chromaRecords.map((record) => ({
      document: record.document,
      storeName: record.metadata.store_name,
      category: record.metadata.category,
      description: record.metadata.description,
      itemDescription: record.metadata.item_description,
      totalAmount: record.metadata.total_amount,
      issueDate: record.metadata.issue_date,
      verified: record.metadata.verified ?? false,
      createdAt: now,
      updatedAt: now,
    }));

    // バッチで挿入
    if (mongoRecords.length > 0) {
      const result = await collection.insertMany(mongoRecords);
      console.log(`${result.insertedCount}件のレコードを挿入しました`);
    }

    // 最終確認
    const finalCount = await collection.countDocuments();
    console.log(`移行後のragRecordsコレクション: ${finalCount}件`);

    console.log('移行完了！');
  } catch (error) {
    console.error('移行エラー:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// 実行
migrateData();
