#!/usr/bin/env tsx

/**
 * Mastraを使用してVercelに自動デプロイするスクリプト
 * 
 * 使用方法:
 *   npm run deploy:mastra
 * 
 * 前提条件:
 *   1. Vercel CLIがインストールされていること（npm i -g vercel）
 *   2. Vercelにログインしていること（vercel login）
 *   3. .env.localに必要な環境変数が設定されていること
 */

import deploymentAgent from '../src/agents/deployment-agent';
import chalk from 'chalk';

async function main() {
  console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════╗
║   Mastra Automated Deployment to Vercel          ║
║   Knowledge Chat + MongoDB System                ║
╚══════════════════════════════════════════════════╝
  `));
  
  console.log(chalk.yellow('📋 事前確認:'));
  console.log('  1. Vercel CLIがインストールされていること');
  console.log('  2. Vercelにログインしていること');
  console.log('  3. 環境変数が設定されていること\n');
  
  // ユーザー確認（オプション）
  if (process.argv.includes('--confirm')) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const answer = await new Promise<string>((resolve) => {
      readline.question('デプロイを続行しますか？ (y/N): ', resolve);
    });
    
    readline.close();
    
    if (answer.toLowerCase() !== 'y') {
      console.log(chalk.yellow('\nデプロイをキャンセルしました'));
      process.exit(0);
    }
  }
  
  // デプロイ実行
  await deployWithMastraAgent();
}

async function deployWithMastraAgent() {
  try {
    console.log(chalk.blue('🤖 Mastraデプロイメントエージェントを起動中...\n'));
    
    // デプロイ設定
    const deploymentConfig = {
      platform: 'vercel' as const,
      environment: 'production' as const,
      buildCommand: 'npm run build',
      environmentVariables: {
        MONGODB_URI: process.env.MONGODB_URI || '',
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://accounting-automation.vercel.app',
        AZURE_FORM_RECOGNIZER_ENDPOINT: process.env.AZURE_FORM_RECOGNIZER_ENDPOINT || '',
        AZURE_FORM_RECOGNIZER_KEY: process.env.AZURE_FORM_RECOGNIZER_KEY || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ''
      }
    };
    
    // 1. 設定検証
    console.log(chalk.yellow('📋 デプロイ設定を検証中...'));
    const validation = await deploymentAgent.actions.validateConfig(deploymentConfig);
    
    if (!validation.valid) {
      console.error(chalk.red('❌ 設定検証失敗:'));
      validation.errors?.forEach(error => console.error(chalk.red(`  - ${error}`)));
      return;
    }
    
    if (validation.warnings?.length) {
      console.warn(chalk.yellow('⚠️  警告:'));
      validation.warnings.forEach(warning => console.warn(chalk.yellow(`  - ${warning}`)));
    }
    
    console.log(chalk.green('✅ 設定検証完了\n'));
    
    // 2. Vercelデプロイ実行
    console.log(chalk.blue('🚀 Vercelデプロイを実行中...'));
    const deployResult = await deploymentAgent.actions.deployToVercel(deploymentConfig);
    
    if (deployResult.success) {
      console.log(chalk.green('\n✅ デプロイ成功!'));
      console.log(chalk.cyan(`🌐 URL: ${deployResult.url}`));
      console.log(chalk.gray(`⏱️  実行時間: ${deployResult.duration}ms`));
      
      if (deployResult.buildLogs?.length) {
        console.log(chalk.gray('\n📋 ビルドログ:'));
        deployResult.buildLogs.slice(-5).forEach(log => 
          console.log(chalk.gray(`  ${log}`))
        );
      }
      
      console.log(chalk.green('\n🎉 デプロイが完了しました！'));
      console.log(chalk.cyan(`アプリケーションURL: ${deployResult.url}`));
      
    } else {
      console.error(chalk.red('\n❌ デプロイ失敗:'));
      console.error(chalk.red(`エラー: ${deployResult.error}`));
      
      if (deployResult.buildLogs?.length) {
        console.log(chalk.gray('\n📋 ビルドログ:'));
        deployResult.buildLogs.forEach(log => 
          console.log(chalk.gray(`  ${log}`))
        );
      }
      
      throw new Error(deployResult.error);
    }
    
  } catch (error) {
    console.error(chalk.red('\n💥 デプロイエラー:'), error);
    throw error;
  }
}

// エラーハンドリング
main().catch(error => {
  console.error(chalk.red('\n予期しないエラーが発生しました:'), error);
  process.exit(1);
});