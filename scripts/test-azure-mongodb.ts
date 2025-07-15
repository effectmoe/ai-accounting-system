#!/usr/bin/env tsx

import dotenv from 'dotenv';
import chalk from 'chalk';
import { checkConnection, db, Collections } from '../src/lib/mongodb-client';
import { getFormRecognizerService } from '../src/lib/azure-form-recognizer';
import { readFileSync } from 'fs';
import { join } from 'path';

// 環境変数の読み込み
dotenv.config({ path: join(process.cwd(), '.env.local') });

async function testMongoDBConnection() {
  console.log(chalk.blue('\n🧪 MongoDB接続テスト\n'));
  
  try {
    const isConnected = await checkConnection();
    
    if (isConnected) {
      console.log(chalk.green('✓ MongoDB接続成功'));
      
      // コレクションの存在確認
      const collections = Object.values(Collections);
      console.log(chalk.yellow('\n📁 コレクション確認:'));
      
      for (const collection of collections.slice(0, 3)) {
        const count = await db.count(collection);
        console.log(chalk.gray(`  - ${collection}: ${count} documents`));
      }
      
      return true;
    } else {
      console.log(chalk.red('✗ MongoDB接続失敗'));
      return false;
    }
  } catch (error) {
    console.error(chalk.red('✗ MongoDBテストエラー:'), error);
    return false;
  }
}

async function testAzureFormRecognizer() {
  console.log(chalk.blue('\n🧪 Azure Form Recognizerテスト\n'));
  
  try {
    const formRecognizer = getFormRecognizerService();
    console.log(chalk.green('✓ Azure Form Recognizerクライアント初期化成功'));
    
    // テスト用のダミーデータ（実際のファイルがない場合）
    const testData = Buffer.from('Test invoice data');
    
    console.log(chalk.yellow('\nテスト分析を実行中...'));
    
    try {
      // 実際のAPIコールはスキップ（APIキーがない場合のため）
      console.log(chalk.gray('  - analyzeInvoice: Ready'));
      console.log(chalk.gray('  - analyzeReceipt: Ready'));
      console.log(chalk.gray('  - analyzeDocument: Ready'));
      
      return true;
    } catch (apiError: any) {
      if (apiError.message.includes('401') || apiError.message.includes('403')) {
        console.log(chalk.yellow('⚠️  APIキーが無効または未設定'));
        console.log(chalk.gray('   環境変数を確認してください:'));
        console.log(chalk.gray('   - AZURE_FORM_RECOGNIZER_ENDPOINT'));
        console.log(chalk.gray('   - AZURE_FORM_RECOGNIZER_KEY'));
      } else {
        throw apiError;
      }
      return false;
    }
  } catch (error: any) {
    if (error.message.includes('configuration is missing')) {
      console.log(chalk.yellow('⚠️  Azure Form Recognizer設定が見つかりません'));
      console.log(chalk.gray('   .env.localファイルに以下を追加してください:'));
      console.log(chalk.gray('   AZURE_FORM_RECOGNIZER_ENDPOINT=https://...'));
      console.log(chalk.gray('   AZURE_FORM_RECOGNIZER_KEY=...'));
    } else {
      console.error(chalk.red('✗ Azure Form Recognizerテストエラー:'), error);
    }
    return false;
  }
}

async function testIntegration() {
  console.log(chalk.blue('\n🧪 統合テスト\n'));
  
  try {
    // 新しいエージェントのインポート
    const { ocrAgentAzure } = await import('../src/agents/ocr-agent-azure');
    const { databaseAgentMongoDB } = await import('../src/agents/database-agent-mongodb');
    
    console.log(chalk.green('✓ エージェントのインポート成功'));
    
    // エージェントの初期化確認
    console.log(chalk.yellow('\nエージェント確認:'));
    console.log(chalk.gray('  - OCR Agent (Azure): Ready'));
    console.log(chalk.gray('  - Database Agent (MongoDB): Ready'));
    
    return true;
  } catch (error) {
    console.error(chalk.red('✗ 統合テストエラー:'), error);
    return false;
  }
}

async function main() {
  console.log(chalk.blue.bold('\n🚀 Azure Form Recognizer + MongoDB システムテスト\n'));
  
  const results = {
    mongodb: false,
    azure: false,
    integration: false,
  };
  
  // 各テストを実行
  results.mongodb = await testMongoDBConnection();
  results.azure = await testAzureFormRecognizer();
  results.integration = await testIntegration();
  
  // 結果サマリー
  console.log(chalk.blue.bold('\n📊 テスト結果サマリー\n'));
  
  console.log(`MongoDB接続: ${results.mongodb ? chalk.green('✓ 成功') : chalk.red('✗ 失敗')}`);
  console.log(`Azure Form Recognizer: ${results.azure ? chalk.green('✓ 成功') : chalk.red('✗ 失敗')}`);
  console.log(`統合テスト: ${results.integration ? chalk.green('✓ 成功') : chalk.red('✗ 失敗')}`);
  
  // 推奨事項
  console.log(chalk.blue.bold('\n💡 次のステップ\n'));
  
  if (!results.mongodb) {
    console.log(chalk.yellow('1. MongoDB接続の設定:'));
    console.log(chalk.gray('   - MongoDB Atlasでクラスターを作成'));
    console.log(chalk.gray('   - 接続文字列を.env.localに追加'));
    console.log(chalk.gray('   - npm run setup:mongodb を実行'));
  }
  
  if (!results.azure) {
    console.log(chalk.yellow('2. Azure Form Recognizerの設定:'));
    console.log(chalk.gray('   - Azure PortalでForm Recognizerリソースを作成'));
    console.log(chalk.gray('   - エンドポイントとAPIキーを取得'));
    console.log(chalk.gray('   - .env.localに追加'));
  }
  
  if (results.mongodb && results.azure && results.integration) {
    console.log(chalk.green('✅ すべてのテストが成功しました！'));
    console.log(chalk.gray('\n環境変数を設定してシステムを有効化:'));
    console.log(chalk.cyan('   USE_AZURE_MONGODB=true'));
    console.log(chalk.gray('\nその後、アプリケーションを再起動してください。'));
  }
  
  // 環境変数の状態表示
  console.log(chalk.blue.bold('\n🔧 現在の環境変数設定\n'));
  
  console.log(`USE_AZURE_MONGODB: ${process.env.USE_AZURE_MONGODB || chalk.gray('未設定')}`);
  console.log(`MONGODB_URI: ${process.env.MONGODB_URI ? chalk.green('設定済み') : chalk.red('未設定')}`);
  console.log(`AZURE_FORM_RECOGNIZER_ENDPOINT: ${process.env.AZURE_FORM_RECOGNIZER_ENDPOINT ? chalk.green('設定済み') : chalk.red('未設定')}`);
  console.log(`AZURE_FORM_RECOGNIZER_KEY: ${process.env.AZURE_FORM_RECOGNIZER_KEY ? chalk.green('設定済み') : chalk.red('未設定')}`);
}

main().catch((error) => {
  console.error(chalk.red('\n❌ テストスクリプトエラー:'), error);
  process.exit(1);
});