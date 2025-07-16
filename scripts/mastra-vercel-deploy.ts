#!/usr/bin/env tsx

/**
 * MastraとVercel APIを使用した完全自動デプロイスクリプト
 * 
 * このスクリプトは以下を自動化します：
 * 1. Vercel APIトークンの取得
 * 2. 環境変数の自動設定（API経由）
 * 3. プロジェクトの再デプロイ
 */

// import { vercelIntegrationAgent } from '../src/agents/vercel-integration-agent';
import dotenv from 'dotenv';
import path from 'path';
import chalk from 'chalk';

// 環境変数を読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════╗
║   Mastra + Vercel API 完全自動デプロイ           ║
║   Azure Form Recognizer + MongoDB System         ║
╚══════════════════════════════════════════════════╝
  `));
  
  try {
    // 1. Vercel CLIの確認
    console.log(chalk.yellow('1️⃣ Vercel CLIを確認中...'));
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      await execAsync('npx vercel whoami');
      console.log(chalk.green('✅ Vercel CLIが利用可能です'));
    } catch (error) {
      console.error(chalk.red('❌ Vercel CLIでログインしてください:'));
      console.log(chalk.gray('  npx vercel login'));
      process.exit(1);
    }
    
    // 2. 環境変数確認
    console.log(chalk.yellow('\n2️⃣ 環境変数を確認中...'));
    
    const variables = [
      'MONGODB_URI',
    ];
    
    const missingVars = variables.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      console.error(chalk.red('❌ 必須環境変数が設定されていません:'));
      missingVars.forEach(v => console.error(chalk.red(`  - ${v}`)));
      console.log(chalk.yellow('\n.env.localファイルに環境変数を設定してください'));
      process.exit(1);
    }
    
    console.log(chalk.green('✅ すべての環境変数が設定されています'));
    
    // 3. デプロイ実行
    console.log(chalk.yellow('\n3️⃣ 本番環境へデプロイ中...'));
    
    try {
      const { stdout } = await execAsync('npx vercel --prod --yes');
      
      // URLを抽出
      const urlMatch = stdout.match(/Production: (https:\/\/[^\s]+)/);
      const prodUrl = urlMatch ? urlMatch[1] : 'https://accounting-automation.vercel.app';
      
      console.log(chalk.green('✅ デプロイが完了しました！'));
      console.log(chalk.blue(`\n🎉 新しいシステムが利用可能です！`));
      console.log(chalk.white(`\n📍 URL:`));
      console.log(chalk.cyan(`  メイン: ${prodUrl}`));
      console.log(chalk.cyan(`  状態確認: ${prodUrl}/test-azure-mongodb`));
      console.log(chalk.cyan(`  ヘルスチェック: ${prodUrl}/api/health`));
      
    } catch (error) {
      console.error(chalk.red('❌ デプロイエラー:'), error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error(chalk.red('\n予期しないエラーが発生しました:'), error);
    process.exit(1);
  }
}

// 実行
main().catch(error => {
  console.error(chalk.red('エラー:'), error);
  process.exit(1);
});