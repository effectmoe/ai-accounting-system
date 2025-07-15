#!/usr/bin/env tsx

/**
 * MastraとVercel APIを使用した完全自動デプロイスクリプト
 * 
 * このスクリプトは以下を自動化します：
 * 1. Vercel APIトークンの取得
 * 2. 環境変数の自動設定（API経由）
 * 3. プロジェクトの再デプロイ
 */

import { vercelIntegrationAgent } from '../src/agents/vercel-integration-agent';
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
    // 1. Vercel APIトークン確認
    console.log(chalk.yellow('1️⃣ Vercel APIトークンを確認中...'));
    const tokenResult = await vercelIntegrationAgent.run('getVercelToken', {});
    
    if (!tokenResult.hasToken) {
      console.error(chalk.red('❌ ' + tokenResult.message));
      console.log(chalk.yellow('\nVercel CLIでログインしてください:'));
      console.log(chalk.gray('  vercel login'));
      process.exit(1);
    }
    console.log(chalk.green('✅ ' + tokenResult.message));
    
    // 2. プロジェクト情報取得
    console.log(chalk.yellow('\n2️⃣ プロジェクト情報を取得中...'));
    const projectInfo = await vercelIntegrationAgent.run('getProjectInfo', {
      projectName: 'accounting-automation'
    });
    
    if (!projectInfo.success) {
      console.error(chalk.red('❌ ' + projectInfo.error));
      process.exit(1);
    }
    console.log(chalk.green('✅ プロジェクトを確認しました'));
    console.log(chalk.gray(`  Project ID: ${projectInfo.projectId}`));
    if (projectInfo.teamId) {
      console.log(chalk.gray(`  Team ID: ${projectInfo.teamId}`));
    }
    
    // 3. 環境変数設定
    console.log(chalk.yellow('\n3️⃣ 環境変数を設定中...'));
    
    const variables = [
      {
        key: 'AZURE_FORM_RECOGNIZER_ENDPOINT',
        value: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT || '',
      },
      {
        key: 'AZURE_FORM_RECOGNIZER_KEY',
        value: process.env.AZURE_FORM_RECOGNIZER_KEY || '',
      },
      {
        key: 'MONGODB_URI',
        value: process.env.MONGODB_URI || '',
      },
      {
        key: 'USE_AZURE_MONGODB',
        value: 'true',
      },
    ];
    
    // 必須環境変数チェック
    const missingVars = variables
      .filter(v => v.key !== 'USE_AZURE_MONGODB' && !v.value)
      .map(v => v.key);
    
    if (missingVars.length > 0) {
      console.error(chalk.red('❌ 必須環境変数が設定されていません:'));
      missingVars.forEach(v => console.error(chalk.red(`  - ${v}`)));
      console.log(chalk.yellow('\n.env.localファイルに環境変数を設定してください'));
      process.exit(1);
    }
    
    // 環境変数を一括設定
    const envResult = await vercelIntegrationAgent.run('setEnvironmentVariables', {
      projectName: 'accounting-automation',
      variables,
    });
    
    if (!envResult.success) {
      console.error(chalk.red('❌ 環境変数の設定に失敗しました'));
      envResult.results.forEach(r => {
        if (r.success) {
          console.log(chalk.green(`  ✅ ${r.key}`));
        } else {
          console.error(chalk.red(`  ❌ ${r.key}: ${r.error}`));
        }
      });
      
      if (!envResult.results.every(r => r.success)) {
        process.exit(1);
      }
    } else {
      console.log(chalk.green('✅ すべての環境変数を設定しました'));
      envResult.results.forEach(r => {
        console.log(chalk.gray(`  - ${r.key}`));
      });
    }
    
    // 4. デプロイ実行
    console.log(chalk.yellow('\n4️⃣ 本番環境へデプロイ中...'));
    
    // Vercel CLIを使用してデプロイ
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync('vercel --prod --yes');
      
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