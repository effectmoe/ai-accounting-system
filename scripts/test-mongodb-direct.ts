#!/usr/bin/env tsx

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import chalk from 'chalk';

// 環境変数を明示的に読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testMongoDBConnection() {
  console.log(chalk.blue.bold('\n🧪 MongoDB Atlas 直接接続テスト\n'));

  const uri = process.env.MONGODB_URI;
  
  console.log(chalk.yellow('接続情報:'));
  console.log(`URI: ${uri ? chalk.green('設定済み') : chalk.red('未設定')}`);
  
  if (!uri) {
    console.log(chalk.red('MONGODB_URIが設定されていません'));
    return;
  }

  // URIの一部を表示（セキュリティのため全部は表示しない）
  const sanitizedUri = uri.replace(/:([^@]+)@/, ':****@');
  console.log(chalk.gray(`接続先: ${sanitizedUri}`));

  const client = new MongoClient(uri);

  try {
    console.log(chalk.yellow('\n接続を試行中...'));
    
    // タイムアウトを設定して接続
    await client.connect();
    
    console.log(chalk.green('✓ MongoDB Atlasに接続成功！'));

    // データベース一覧を取得
    const adminDb = client.db('admin');
    const result = await adminDb.command({ ping: 1 });
    
    if (result.ok === 1) {
      console.log(chalk.green('✓ Pingテスト成功'));
    }

    // accountingデータベースに接続
    const db = client.db('accounting');
    const collections = await db.listCollections().toArray();
    
    console.log(chalk.yellow('\nコレクション一覧:'));
    if (collections.length === 0) {
      console.log(chalk.gray('  (まだコレクションがありません)'));
    } else {
      collections.forEach(col => {
        console.log(chalk.gray(`  - ${col.name}`));
      });
    }

    return true;
  } catch (error: any) {
    console.log(chalk.red('\n接続エラー:'));
    
    if (error.code === 'ENOTFOUND') {
      console.log(chalk.red('DNSエラー: ホスト名が解決できません'));
      console.log(chalk.yellow('\n考えられる原因:'));
      console.log('1. インターネット接続を確認してください');
      console.log('2. クラスター名が正しいか確認してください');
      console.log('3. VPNを使用している場合は切断してみてください');
    } else if (error.code === 8000) {
      console.log(chalk.red('認証エラー: ユーザー名またはパスワードが正しくありません'));
    } else if (error.name === 'MongoServerSelectionError') {
      console.log(chalk.red('サーバー選択エラー: クラスターに接続できません'));
      console.log(chalk.yellow('\nMongoDB Atlasで以下を確認:'));
      console.log('1. Network Access で IP アドレスが許可されているか');
      console.log('2. クラスターが稼働中か');
      console.log('3. Database Access でユーザーが作成されているか');
    } else {
      console.log(chalk.red(error.message));
    }
    
    return false;
  } finally {
    await client.close();
  }
}

async function checkDNS() {
  console.log(chalk.blue.bold('\n🌐 DNS解決テスト\n'));
  
  const dns = await import('dns').then(m => m.promises);
  const hostname = 'accounting-cluster.nldgj20.mongodb.net';
  
  try {
    console.log(chalk.yellow(`ホスト名を解決中: ${hostname}`));
    const addresses = await dns.resolve4(hostname);
    console.log(chalk.green('✓ DNS解決成功'));
    console.log(chalk.gray(`  IPアドレス: ${addresses.join(', ')}`));
    return true;
  } catch (error) {
    console.log(chalk.red('✗ DNS解決失敗'));
    console.log(chalk.yellow('\nトラブルシューティング:'));
    console.log('1. nslookup accounting-cluster.nldgj20.mongodb.net を実行してみてください');
    console.log('2. 別のDNSサーバー（8.8.8.8）を試してみてください');
    console.log('3. MongoDB Atlasのクラスター名を再確認してください');
    return false;
  }
}

async function main() {
  // まずDNSをチェック
  await checkDNS();
  
  // MongoDB接続テスト
  await testMongoDBConnection();
  
  console.log(chalk.blue.bold('\n💡 ヒント\n'));
  console.log('もしまだ接続できない場合:');
  console.log('1. MongoDB Atlasの管理画面で "Connect" ボタンをクリック');
  console.log('2. "Connect your application" を選択');
  console.log('3. 新しい接続文字列をコピーして .env.local を更新');
}

main().catch(console.error);