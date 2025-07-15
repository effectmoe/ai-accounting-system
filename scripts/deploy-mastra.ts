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

import { deployAccountingSystem } from '../src/workflows/deployment-workflow';
import chalk from 'chalk';

async function main() {
  console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════╗
║   Mastra Automated Deployment to Vercel          ║
║   Azure Form Recognizer + MongoDB System         ║
╚══════════════════════════════════════════════════╝
  `));
  
  console.log(chalk.yellow('📋 事前確認:'));
  console.log('  1. Vercel CLIがインストールされていること');
  console.log('  2. Vercelにログインしていること');
  console.log('  3. .env.localに環境変数が設定されていること\n');
  
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
  await deployAccountingSystem();
}

// エラーハンドリング
main().catch(error => {
  console.error(chalk.red('\n予期しないエラーが発生しました:'), error);
  process.exit(1);
});