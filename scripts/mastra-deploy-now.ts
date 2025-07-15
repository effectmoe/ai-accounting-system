#!/usr/bin/env tsx

/**
 * Mastraデプロイメントエージェントを使用してVercelにデプロイ
 * 最新の修正を含む本番環境デプロイ
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: '.env.production.actual' });

interface DeploymentResult {
  success: boolean;
  url?: string;
  error?: string;
  logs: string[];
}

class MastraDeploymentManager {
  private logs: string[] = [];

  private log(message: string, color: 'blue' | 'green' | 'yellow' | 'red' = 'blue') {
    const coloredMessage = chalk[color](message);
    console.log(coloredMessage);
    this.logs.push(message);
  }

  private async runCommand(command: string, args: string[] = []): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      const childProcess = spawn(command, args, { 
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' }
      });
      
      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        this.log(`📤 ${text.trim()}`);
      });

      childProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        this.log(`⚠️ ${text.trim()}`, 'yellow');
      });

      childProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output + errorOutput
        });
      });
    });
  }

  async checkPrerequisites(): Promise<boolean> {
    this.log('🔍 前提条件をチェック中...', 'blue');
    
    // Vercel CLIの確認
    const vercelCheck = await this.runCommand('vercel', ['--version']);
    if (!vercelCheck.success) {
      this.log('❌ Vercel CLIがインストールされていません', 'red');
      return false;
    }
    
    this.log('✅ Vercel CLI確認完了', 'green');

    // Node.jsバージョン確認
    const nodeCheck = await this.runCommand('node', ['--version']);
    if (!nodeCheck.success) {
      this.log('❌ Node.jsが見つかりません', 'red');
      return false;
    }
    
    this.log('✅ Node.js確認完了', 'green');

    // 環境変数確認
    const requiredEnvVars = [
      'MONGODB_URI',
      'AZURE_FORM_RECOGNIZER_ENDPOINT',
      'AZURE_FORM_RECOGNIZER_KEY'
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        this.log(`❌ 環境変数 ${envVar} が設定されていません`, 'red');
        return false;
      }
    }

    this.log('✅ 環境変数確認完了', 'green');
    return true;
  }

  async buildProject(): Promise<boolean> {
    this.log('🏗️ プロジェクトをビルド中...', 'blue');
    
    // 依存関係をインストール
    const installResult = await this.runCommand('npm', ['install']);
    if (!installResult.success) {
      this.log('❌ 依存関係のインストールに失敗', 'red');
      return false;
    }

    // プロジェクトをビルド
    const buildResult = await this.runCommand('npm', ['run', 'build']);
    if (!buildResult.success) {
      this.log('❌ ビルドに失敗', 'red');
      return false;
    }

    this.log('✅ ビルド完了', 'green');
    return true;
  }

  async deployToVercel(): Promise<DeploymentResult> {
    this.log('🚀 Vercelにデプロイ中...', 'blue');
    
    try {
      // 本番環境にデプロイ
      const deployResult = await this.runCommand('vercel', [
        '--prod',
        '--yes',
        '--force'
      ]);

      if (!deployResult.success) {
        return {
          success: false,
          error: 'Vercelデプロイに失敗',
          logs: this.logs
        };
      }

      // デプロイURLを抽出
      const urlMatch = deployResult.output.match(/https:\/\/[^\s]+/);
      const deployUrl = urlMatch ? urlMatch[0] : undefined;

      this.log('✅ デプロイ完了', 'green');
      if (deployUrl) {
        this.log(`🌐 デプロイURL: ${deployUrl}`, 'green');
      }

      return {
        success: true,
        url: deployUrl,
        logs: this.logs
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs: this.logs
      };
    }
  }

  async healthCheck(url: string): Promise<boolean> {
    this.log('🏥 ヘルスチェック実行中...', 'blue');
    
    try {
      const healthUrl = `${url}/api/health`;
      const response = await fetch(healthUrl, { 
        method: 'GET',
        timeout: 30000 
      });
      
      if (response.ok) {
        this.log('✅ ヘルスチェック成功', 'green');
        return true;
      } else {
        this.log(`⚠️ ヘルスチェック失敗: ${response.status}`, 'yellow');
        return false;
      }
    } catch (error) {
      this.log(`⚠️ ヘルスチェックエラー: ${error}`, 'yellow');
      return false;
    }
  }

  async execute(): Promise<DeploymentResult> {
    console.log(chalk.blue.bold(`
╔══════════════════════════════════════════════════╗
║   Mastra Deployment Agent - Vercel Deploy        ║
║   Accounting Automation System v1.0             ║
╚══════════════════════════════════════════════════╝
    `));

    try {
      // 1. 前提条件チェック
      const prereqsOk = await this.checkPrerequisites();
      if (!prereqsOk) {
        return {
          success: false,
          error: '前提条件チェックに失敗',
          logs: this.logs
        };
      }

      // 2. プロジェクトビルド
      const buildOk = await this.buildProject();
      if (!buildOk) {
        return {
          success: false,
          error: 'ビルドに失敗',
          logs: this.logs
        };
      }

      // 3. Vercelデプロイ
      const deployResult = await this.deployToVercel();
      if (!deployResult.success) {
        return deployResult;
      }

      // 4. ヘルスチェック（オプション）
      if (deployResult.url) {
        await this.healthCheck(deployResult.url);
      }

      this.log('\n🎉 Mastraデプロイメント完了！', 'green');
      
      return deployResult;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs: this.logs
      };
    }
  }
}

async function main() {
  const deploymentManager = new MastraDeploymentManager();
  const result = await deploymentManager.execute();

  if (result.success) {
    console.log(chalk.green('\n✅ デプロイ成功！'));
    if (result.url) {
      console.log(chalk.blue(`🌐 URL: ${result.url}`));
    }
    process.exit(0);
  } else {
    console.log(chalk.red('\n❌ デプロイ失敗'));
    console.log(chalk.red(`エラー: ${result.error}`));
    process.exit(1);
  }
}

// エラーハンドリング
main().catch(error => {
  console.error(chalk.red('\n予期しないエラー:'), error);
  process.exit(1);
});