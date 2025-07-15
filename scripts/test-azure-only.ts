#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';
import chalk from 'chalk';

// .env.localファイルを明示的に読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function testAzureFormRecognizer() {
  console.log(chalk.blue.bold('\n🧪 Azure AI Document Intelligence テスト\n'));

  // 環境変数の確認
  console.log(chalk.yellow('環境変数チェック:'));
  console.log(`AZURE_FORM_RECOGNIZER_ENDPOINT: ${process.env.AZURE_FORM_RECOGNIZER_ENDPOINT ? chalk.green('✓ 設定済み') : chalk.red('✗ 未設定')}`);
  console.log(`AZURE_FORM_RECOGNIZER_KEY: ${process.env.AZURE_FORM_RECOGNIZER_KEY ? chalk.green('✓ 設定済み') : chalk.red('✗ 未設定')}`);
  console.log();

  if (!process.env.AZURE_FORM_RECOGNIZER_ENDPOINT || !process.env.AZURE_FORM_RECOGNIZER_KEY) {
    console.log(chalk.red('環境変数が設定されていません。'));
    return;
  }

  try {
    // Azure Form Recognizerクライアントのテスト
    const { getFormRecognizerService } = await import('../src/lib/azure-form-recognizer');
    const formRecognizer = getFormRecognizerService();
    
    console.log(chalk.green('✓ Azure Form Recognizerクライアント初期化成功'));
    console.log(chalk.gray(`  エンドポイント: ${process.env.AZURE_FORM_RECOGNIZER_ENDPOINT}`));

    // 実際のAPIテスト（テスト画像で）
    console.log(chalk.yellow('\nAPIアクセステスト...'));
    
    // テスト用の最小限のPDFデータ
    const testPdfBase64 = 'JVBERi0xLjMKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovT3V0bGluZXMgMiAwIFIKL1BhZ2VzIDMgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9UeXBlIC9PdXRsaW5lcwovQ291bnQgMAo+PgplbmRvYmoKMyAwIG9iago8PAovVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzQgMCBSXQo+PgplbmRvYmoKNCAwIG9iago8PAovVHlwZSAvUGFnZQovUGFyZW50IDMgMCBSCi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdCi9SZXNvdXJjZXMgPDwKL0ZvbnQgPDwKL0YxIDw8Ci9UeXBlIC9Gb250Ci9TdWJ0eXBlIC9UeXBlMQovQmFzZUZvbnQgL0hlbHZldGljYQo+Pgo+Pgo+PgovQ29udGVudHMgNSAwIFIKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0xlbmd0aCA0NAo+PgpzdHJlYW0KQlQKL0YxIDEyIFRmCjEwMCAxMDAgVGQKKFRlc3QgRG9jdW1lbnQpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEwOCAwMDAwMCBuIAowMDAwMDAwMTY3IDAwMDAwIG4gCjAwMDAwMDAzNjggMDAwMDAgbiAKdHJhaWxlcgo8PAovU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0NjUKJSVFT0Y=';
    const testPdfBuffer = Buffer.from(testPdfBase64, 'base64');

    try {
      const result = await formRecognizer.analyzeDocument(testPdfBuffer, 'test.pdf');
      console.log(chalk.green('✓ API接続成功！'));
      console.log(chalk.gray('  Document Type:', result.documentType));
      console.log(chalk.gray('  Confidence:', result.confidence));
    } catch (error: any) {
      if (error.message.includes('401')) {
        console.log(chalk.red('✗ 認証エラー: APIキーが無効です'));
      } else if (error.message.includes('404')) {
        console.log(chalk.red('✗ エンドポイントエラー: URLが正しくありません'));
      } else if (error.message.includes('InvalidImage')) {
        console.log(chalk.yellow('⚠️  テスト画像の問題ですが、API接続は成功しています'));
      } else {
        console.log(chalk.red('✗ APIエラー:'), error.message);
      }
    }

    // 利用可能な機能の表示
    console.log(chalk.blue('\n📋 利用可能な機能:'));
    console.log(chalk.gray('  • 請求書分析 (analyzeInvoice)'));
    console.log(chalk.gray('  • 領収書分析 (analyzeReceipt)'));
    console.log(chalk.gray('  • 汎用ドキュメント分析 (analyzeDocument)'));
    console.log(chalk.gray('  • バッチ処理 (batchProcess)'));
    console.log(chalk.gray('  • GridFSファイル保存 (saveToGridFS)'));

  } catch (error) {
    console.error(chalk.red('エラー:'), error);
  }
}

// MongoDBのローカルインストール確認
async function checkLocalMongoDB() {
  console.log(chalk.blue.bold('\n🗄️  MongoDB 状態確認\n'));
  
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    await execAsync('mongod --version');
    console.log(chalk.green('✓ MongoDBがローカルにインストールされています'));
    
    // MongoDBが実行中か確認
    try {
      await execAsync('pgrep mongod');
      console.log(chalk.green('✓ MongoDBが実行中です'));
    } catch {
      console.log(chalk.yellow('⚠️  MongoDBが実行されていません'));
      console.log(chalk.gray('  起動コマンド: mongod --dbpath /usr/local/var/mongodb'));
    }
  } catch {
    console.log(chalk.yellow('⚠️  MongoDBがインストールされていません'));
    console.log(chalk.gray('  インストール方法:'));
    console.log(chalk.gray('  macOS: brew install mongodb-community'));
    console.log(chalk.gray('  または'));
    console.log(chalk.gray('  MongoDB Atlasの無料クラスターを使用してください'));
    console.log(chalk.cyan('  https://www.mongodb.com/cloud/atlas'));
  }
}

async function main() {
  await testAzureFormRecognizer();
  await checkLocalMongoDB();
  
  console.log(chalk.blue.bold('\n✨ テスト完了\n'));
  
  console.log(chalk.yellow('次のステップ:'));
  console.log('1. MongoDBの設定（ローカルまたはAtlas）');
  console.log('2. npm run setup:mongodb でデータベース初期化');
  console.log('3. アプリケーションの起動: npm run dev');
}

main().catch(console.error);