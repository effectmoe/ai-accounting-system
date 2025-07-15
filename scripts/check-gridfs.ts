#!/usr/bin/env tsx

/**
 * GridFSに保存されているファイルを確認するスクリプト
 */

import { MongoClient, GridFSBucket } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import chalk from 'chalk';

// 環境変数を読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function checkGridFS() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error(chalk.red('MONGODB_URIが設定されていません'));
    return;
  }
  
  const client = new MongoClient(uri);
  
  try {
    console.log(chalk.blue.bold('\n🗄️  GridFS ファイル確認\n'));
    
    await client.connect();
    console.log(chalk.green('✓ MongoDBに接続しました'));
    
    const db = client.db('accounting');
    
    // デフォルトのGridFSバケット（fs）
    console.log(chalk.yellow('\n📁 デフォルトGridFS (fs.*):'));
    const defaultBucket = new GridFSBucket(db);
    const defaultFiles = await defaultBucket.find({}).toArray();
    
    if (defaultFiles.length === 0) {
      console.log(chalk.gray('  ファイルがありません'));
    } else {
      for (const file of defaultFiles) {
        console.log(chalk.cyan(`  - ${file.filename}`));
        console.log(chalk.gray(`    ID: ${file._id}`));
        console.log(chalk.gray(`    サイズ: ${(file.length / 1024).toFixed(2)} KB`));
        console.log(chalk.gray(`    アップロード日: ${file.uploadDate}`));
        console.log(chalk.gray(`    メタデータ: ${JSON.stringify(file.metadata || {})}`));
        console.log('');
      }
    }
    
    // documentsバケット
    console.log(chalk.yellow('\n📁 Documents GridFS (documents.*):'));
    const docsBucket = new GridFSBucket(db, { bucketName: 'documents' });
    const docsFiles = await docsBucket.find({}).toArray();
    
    if (docsFiles.length === 0) {
      console.log(chalk.gray('  ファイルがありません'));
    } else {
      for (const file of docsFiles) {
        console.log(chalk.cyan(`  - ${file.filename}`));
        console.log(chalk.gray(`    ID: ${file._id}`));
        console.log(chalk.gray(`    サイズ: ${(file.length / 1024).toFixed(2)} KB`));
        console.log(chalk.gray(`    アップロード日: ${file.uploadDate}`));
        console.log(chalk.gray(`    メタデータ: ${JSON.stringify(file.metadata || {})}`));
        console.log('');
      }
    }
    
    // コレクション一覧
    console.log(chalk.yellow('\n📊 GridFS関連コレクション:'));
    const collections = await db.listCollections().toArray();
    const gridfsCollections = collections.filter(col => 
      col.name.includes('.files') || col.name.includes('.chunks')
    );
    
    if (gridfsCollections.length > 0) {
      for (const col of gridfsCollections) {
        const count = await db.collection(col.name).countDocuments();
        console.log(chalk.gray(`  - ${col.name}: ${count} documents`));
      }
    } else {
      console.log(chalk.gray('  GridFSコレクションが見つかりません'));
    }
    
  } catch (error) {
    console.error(chalk.red('エラー:'), error);
  } finally {
    await client.close();
  }
}

// ファイルをダウンロードする関数（オプション）
async function downloadFile(bucketName: string, filename: string) {
  const uri = process.env.MONGODB_URI;
  if (!uri) return;
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('accounting');
    const bucket = new GridFSBucket(db, { bucketName });
    
    const downloadStream = bucket.openDownloadStreamByName(filename);
    const chunks: Buffer[] = [];
    
    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });
    
    downloadStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      console.log(chalk.green(`✓ ファイルダウンロード完了: ${filename} (${buffer.length} bytes)`));
    });
    
    downloadStream.on('error', (error) => {
      console.error(chalk.red('ダウンロードエラー:'), error);
    });
    
  } catch (error) {
    console.error(chalk.red('エラー:'), error);
  }
}

// メイン実行
checkGridFS().catch(console.error);