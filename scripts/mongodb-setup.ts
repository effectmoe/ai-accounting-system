#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';
import { Collections, indexes, textIndexes } from '../src/models/mongodb-schemas';
import dotenv from 'dotenv';
import chalk from 'chalk';
import path from 'path';

// 環境変数の読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/accounting';

async function setupMongoDB() {
  console.log(chalk.blue('\n🚀 MongoDB セットアップを開始します\n'));

  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log(chalk.green('✓ MongoDBに接続しました'));
    
    const db = client.db('accounting');
    
    // コレクションの作成
    console.log(chalk.yellow('\n📁 コレクションを作成しています...'));
    
    for (const collectionName of Object.values(Collections)) {
      try {
        await db.createCollection(collectionName);
        console.log(chalk.green(`  ✓ ${collectionName}`));
      } catch (error: any) {
        if (error.codeName === 'NamespaceExists') {
          console.log(chalk.gray(`  - ${collectionName} (既存)`));
        } else {
          throw error;
        }
      }
    }
    
    // インデックスの作成
    console.log(chalk.yellow('\n🔍 インデックスを作成しています...'));
    
    for (const [collectionName, indexSpecs] of Object.entries(indexes)) {
      const collection = db.collection(collectionName);
      
      for (const indexSpec of indexSpecs) {
        try {
          const indexName = await collection.createIndex(indexSpec);
          console.log(chalk.green(`  ✓ ${collectionName}: ${indexName}`));
        } catch (error) {
          console.log(chalk.red(`  ✗ ${collectionName}: ${JSON.stringify(indexSpec)}`));
          console.error(error);
        }
      }
    }
    
    // テキストインデックスの作成
    console.log(chalk.yellow('\n📝 テキスト検索インデックスを作成しています...'));
    
    for (const [collectionName, textIndexSpec] of Object.entries(textIndexes)) {
      const collection = db.collection(collectionName);
      
      try {
        const indexName = await collection.createIndex(textIndexSpec);
        console.log(chalk.green(`  ✓ ${collectionName}: ${indexName}`));
      } catch (error: any) {
        if (error.codeName === 'IndexOptionsConflict') {
          console.log(chalk.gray(`  - ${collectionName} (既存のテキストインデックス)`));
        } else {
          console.log(chalk.red(`  ✗ ${collectionName}: テキストインデックス`));
          console.error(error);
        }
      }
    }
    
    // タイムスタンプ用のインデックス
    console.log(chalk.yellow('\n⏰ タイムスタンプインデックスを作成しています...'));
    
    for (const collectionName of Object.values(Collections)) {
      const collection = db.collection(collectionName);
      
      try {
        await collection.createIndex({ createdAt: -1 });
        await collection.createIndex({ updatedAt: -1 });
        console.log(chalk.green(`  ✓ ${collectionName}: createdAt, updatedAt`));
      } catch (error) {
        console.log(chalk.red(`  ✗ ${collectionName}: タイムスタンプインデックス`));
      }
    }
    
    // 接続テスト
    console.log(chalk.yellow('\n🧪 接続テストを実行しています...'));
    
    const adminDb = client.db('admin');
    const pingResult = await adminDb.command({ ping: 1 });
    
    if (pingResult.ok === 1) {
      console.log(chalk.green('✓ MongoDB接続テスト成功'));
    } else {
      console.log(chalk.red('✗ MongoDB接続テスト失敗'));
    }
    
    // データベース情報の表示
    console.log(chalk.yellow('\n📊 データベース情報:'));
    
    const dbStats = await db.stats();
    console.log(`  データベース名: ${dbStats.db}`);
    console.log(`  コレクション数: ${dbStats.collections}`);
    console.log(`  インデックス数: ${dbStats.indexes}`);
    console.log(`  データサイズ: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    
    console.log(chalk.green('\n✅ MongoDBセットアップが完了しました！\n'));
    
  } catch (error) {
    console.error(chalk.red('\n❌ エラーが発生しました:'), error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Supabaseからのデータ移行（オプション）
async function migrateFromSupabase() {
  console.log(chalk.blue('\n🔄 Supabaseからのデータ移行\n'));
  
  // ここにSupabaseからのデータ移行ロジックを実装
  // 1. Supabaseからデータを取得
  // 2. データ形式を変換
  // 3. MongoDBに挿入
  
  console.log(chalk.yellow('⚠️  データ移行は手動で実装する必要があります'));
}

// メイン実行
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
使用方法:
  npm run setup-mongodb          # MongoDBのセットアップ
  npm run setup-mongodb migrate  # Supabaseからの移行（未実装）

環境変数:
  MONGODB_URI  MongoDBの接続URI（デフォルト: mongodb://localhost:27017/accounting）
    `);
    return;
  }
  
  await setupMongoDB();
  
  if (args.includes('migrate')) {
    await migrateFromSupabase();
  }
}

main().catch((error) => {
  console.error(chalk.red('エラー:'), error);
  process.exit(1);
});