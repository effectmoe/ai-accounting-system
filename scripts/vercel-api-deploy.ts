#!/usr/bin/env tsx

/**
 * Vercel APIを直接使用した環境変数設定とデプロイスクリプト
 */

import dotenv from 'dotenv';
import path from 'path';
import chalk from 'chalk';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import os from 'os';

const execAsync = promisify(exec);

// 環境変数を読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Vercel APIトークン取得
async function getVercelToken(): Promise<string | null> {
  try {
    // Vercel CLIの設定からトークンを取得
    const configPath = path.join(os.homedir(), '.vercel', 'auth.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);
    return config.token || null;
  } catch {
    // 環境変数から取得を試みる
    return process.env.VERCEL_TOKEN || null;
  }
}

// プロジェクト情報取得
async function getProjectInfo(token: string, projectName: string) {
  const response = await fetch('https://api.vercel.com/v9/projects', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get projects: ${response.statusText}`);
  }
  
  const data = await response.json() as any;
  const project = data.projects?.find((p: any) => p.name === projectName);
  
  if (!project) {
    throw new Error(`Project ${projectName} not found`);
  }
  
  return {
    projectId: project.id,
    teamId: project.accountId,
  };
}

// 環境変数設定
async function setEnvironmentVariable(
  token: string,
  projectId: string,
  teamId: string | undefined,
  key: string,
  value: string,
  target: string[] = ['production', 'preview', 'development']
) {
  const url = teamId 
    ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`
    : `https://api.vercel.com/v10/projects/${projectId}/env`;
  
  // 既存の環境変数を削除
  try {
    const listResponse = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (listResponse.ok) {
      const envData = await listResponse.json() as any;
      const existingEnv = envData.envs?.find((e: any) => e.key === key);
      
      if (existingEnv) {
        const deleteUrl = `${url}/${existingEnv.id}`;
        await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    }
  } catch {
    // 既存の変数がない場合は無視
  }
  
  // 新しい環境変数を作成
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key,
      value,
      type: 'encrypted',
      target,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json() as any;
    throw new Error(errorData.error?.message || `Failed to set ${key}`);
  }
  
  return true;
}

async function main() {
  console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════╗
║   Vercel API 環境変数設定 & デプロイ             ║
║   Azure Form Recognizer + MongoDB System         ║
╚══════════════════════════════════════════════════╝
  `));
  
  try {
    // 1. Vercel APIトークン取得
    console.log(chalk.yellow('1️⃣ Vercel APIトークンを確認中...'));
    const token = await getVercelToken();
    
    if (!token) {
      console.error(chalk.red('❌ Vercel APIトークンが見つかりません'));
      console.log(chalk.yellow('\nVercel CLIでログインしてください:'));
      console.log(chalk.gray('  vercel login'));
      process.exit(1);
    }
    console.log(chalk.green('✅ Vercel APIトークンを取得しました'));
    
    // 2. プロジェクト情報取得
    console.log(chalk.yellow('\n2️⃣ プロジェクト情報を取得中...'));
    const { projectId, teamId } = await getProjectInfo(token, 'accounting-automation');
    console.log(chalk.green('✅ プロジェクトを確認しました'));
    console.log(chalk.gray(`  Project ID: ${projectId}`));
    if (teamId) {
      console.log(chalk.gray(`  Team ID: ${teamId}`));
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
    
    // 各環境変数を設定
    for (const variable of variables) {
      try {
        await setEnvironmentVariable(token, projectId, teamId, variable.key, variable.value);
        console.log(chalk.green(`  ✅ ${variable.key}`));
      } catch (error) {
        console.error(chalk.red(`  ❌ ${variable.key}: ${error}`));
      }
    }
    
    console.log(chalk.green('\n✅ すべての環境変数を設定しました'));
    
    // 4. デプロイ実行
    console.log(chalk.yellow('\n4️⃣ 本番環境へデプロイ中...'));
    
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