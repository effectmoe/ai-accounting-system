/**
 * 既存のスキャン画像をR2にアップロードし、MongoDBを更新するマイグレーションスクリプト
 *
 * 使用方法:
 * npx ts-node scripts/migrate-images-to-r2.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { MongoClient, ObjectId } from 'mongodb';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import * as dotenv from 'dotenv';

// .env.local を読み込む
dotenv.config({ path: '.env.local' });

const PROCESSED_DIR = path.join(process.cwd(), 'scan-receipt', 'processed');
const MONGODB_URI = process.env.MONGODB_URI!;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'receipt-images';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// S3クライアント（R2用）
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

interface Receipt {
  _id: ObjectId;
  receiptNumber: string;
  imageUrl?: string;
  scanMetadata?: {
    originalFileName?: string;
    imageKey?: string;
  };
  createdAt?: Date;
}

async function uploadToR2(filePath: string, key: string): Promise<string> {
  const fileBuffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  let contentType = 'application/octet-stream';
  if (ext === '.jpg' || ext === '.jpeg') {
    contentType = 'image/jpeg';
  } else if (ext === '.png') {
    contentType = 'image/png';
  } else if (ext === '.webp') {
    contentType = 'image/webp';
  } else if (ext === '.pdf') {
    contentType = 'application/pdf';
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return `${R2_PUBLIC_URL}/${key}`;
}

async function main() {
  console.log('=== R2マイグレーション開始 ===\n');

  // 環境変数チェック
  if (!MONGODB_URI || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
    console.error('必要な環境変数が設定されていません:');
    console.error('- MONGODB_URI:', MONGODB_URI ? '✓' : '✗');
    console.error('- R2_ACCOUNT_ID:', R2_ACCOUNT_ID ? '✓' : '✗');
    console.error('- R2_ACCESS_KEY_ID:', R2_ACCESS_KEY_ID ? '✓' : '✗');
    console.error('- R2_SECRET_ACCESS_KEY:', R2_SECRET_ACCESS_KEY ? '✓' : '✗');
    console.error('- R2_PUBLIC_URL:', R2_PUBLIC_URL ? '✓' : '✗');
    process.exit(1);
  }

  // ローカルファイル一覧を取得
  const localFiles = fs.readdirSync(PROCESSED_DIR)
    .filter(f => !f.startsWith('.') && (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.pdf')));

  console.log(`ローカルファイル数: ${localFiles.length}`);
  console.log('ファイル一覧:', localFiles.join(', '));
  console.log('');

  // MongoDB接続
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('MongoDB接続成功\n');

  const db = client.db();
  const receiptsCollection = db.collection<Receipt>('receipts');

  // imageUrlがない領収書を取得
  const receiptsWithoutImage = await receiptsCollection.find({
    imageUrl: { $exists: false },
    scannedFromPdf: true
  }).toArray();

  console.log(`画像なし領収書数: ${receiptsWithoutImage.length}\n`);

  let uploadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const receipt of receiptsWithoutImage) {
    const originalFileName = receipt.scanMetadata?.originalFileName;

    if (!originalFileName) {
      console.log(`[SKIP] ${receipt.receiptNumber}: originalFileNameなし`);
      skippedCount++;
      continue;
    }

    // ローカルファイルを探す
    const localFilePath = path.join(PROCESSED_DIR, originalFileName);

    if (!fs.existsSync(localFilePath)) {
      console.log(`[SKIP] ${receipt.receiptNumber}: ファイルなし (${originalFileName})`);
      skippedCount++;
      continue;
    }

    try {
      // R2キーを生成
      const createdAt = receipt.createdAt || new Date();
      const year = createdAt.getFullYear();
      const month = String(createdAt.getMonth() + 1).padStart(2, '0');
      const ext = path.extname(originalFileName);
      const r2Key = `receipts/${year}/${month}/${receipt._id}${ext}`;

      console.log(`[UPLOAD] ${receipt.receiptNumber}: ${originalFileName} → ${r2Key}`);

      // R2にアップロード
      const imageUrl = await uploadToR2(localFilePath, r2Key);

      // MongoDBを更新
      await receiptsCollection.updateOne(
        { _id: receipt._id },
        {
          $set: {
            imageUrl: imageUrl,
            imageUploadedAt: new Date(),
            'scanMetadata.imageKey': r2Key,
            'scanMetadata.imageFormat': ext.replace('.', ''),
          }
        }
      );

      console.log(`  → 完了: ${imageUrl}`);
      uploadedCount++;
    } catch (error) {
      console.error(`[ERROR] ${receipt.receiptNumber}: ${error}`);
      errorCount++;
    }
  }

  await client.close();

  console.log('\n=== マイグレーション完了 ===');
  console.log(`アップロード成功: ${uploadedCount}`);
  console.log(`スキップ: ${skippedCount}`);
  console.log(`エラー: ${errorCount}`);
}

main().catch(console.error);
