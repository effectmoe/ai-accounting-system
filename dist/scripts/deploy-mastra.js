#!/usr/bin/env tsx
"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const deployment_agent_1 = __importDefault(require("../src/agents/deployment-agent"));
const chalk_1 = __importDefault(require("chalk"));
async function main() {
    console.log(chalk_1.default.blue.bold(`
╔══════════════════════════════════════════════════╗
║   Mastra Automated Deployment to Vercel          ║
║   Knowledge Chat + MongoDB System                ║
╚══════════════════════════════════════════════════╝
  `));
    console.log(chalk_1.default.yellow('📋 事前確認:'));
    console.log('  1. Vercel CLIがインストールされていること');
    console.log('  2. Vercelにログインしていること');
    console.log('  3. 環境変数が設定されていること\n');
    // ユーザー確認（オプション）
    if (process.argv.includes('--confirm')) {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        const answer = await new Promise((resolve) => {
            readline.question('デプロイを続行しますか？ (y/N): ', resolve);
        });
        readline.close();
        if (answer.toLowerCase() !== 'y') {
            console.log(chalk_1.default.yellow('\nデプロイをキャンセルしました'));
            process.exit(0);
        }
    }
    // デプロイ実行
    await deployWithMastraAgent();
}
async function deployWithMastraAgent() {
    try {
        console.log(chalk_1.default.blue('🤖 Mastraデプロイメントエージェントを起動中...\n'));
        // デプロイ設定
        const deploymentConfig = {
            platform: 'vercel',
            environment: 'production',
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
        console.log(chalk_1.default.yellow('📋 デプロイ設定を検証中...'));
        const validation = await deployment_agent_1.default.actions.validateConfig(deploymentConfig);
        if (!validation.valid) {
            console.error(chalk_1.default.red('❌ 設定検証失敗:'));
            validation.errors?.forEach(error => console.error(chalk_1.default.red(`  - ${error}`)));
            return;
        }
        if (validation.warnings?.length) {
            console.warn(chalk_1.default.yellow('⚠️  警告:'));
            validation.warnings.forEach(warning => console.warn(chalk_1.default.yellow(`  - ${warning}`)));
        }
        console.log(chalk_1.default.green('✅ 設定検証完了\n'));
        // 2. Vercelデプロイ実行
        console.log(chalk_1.default.blue('🚀 Vercelデプロイを実行中...'));
        const deployResult = await deployment_agent_1.default.actions.deployToVercel(deploymentConfig);
        if (deployResult.success) {
            console.log(chalk_1.default.green('\n✅ デプロイ成功!'));
            console.log(chalk_1.default.cyan(`🌐 URL: ${deployResult.url}`));
            console.log(chalk_1.default.gray(`⏱️  実行時間: ${deployResult.duration}ms`));
            if (deployResult.buildLogs?.length) {
                console.log(chalk_1.default.gray('\n📋 ビルドログ:'));
                deployResult.buildLogs.slice(-5).forEach(log => console.log(chalk_1.default.gray(`  ${log}`)));
            }
            console.log(chalk_1.default.green('\n🎉 デプロイが完了しました！'));
            console.log(chalk_1.default.cyan(`アプリケーションURL: ${deployResult.url}`));
        }
        else {
            console.error(chalk_1.default.red('\n❌ デプロイ失敗:'));
            console.error(chalk_1.default.red(`エラー: ${deployResult.error}`));
            if (deployResult.buildLogs?.length) {
                console.log(chalk_1.default.gray('\n📋 ビルドログ:'));
                deployResult.buildLogs.forEach(log => console.log(chalk_1.default.gray(`  ${log}`)));
            }
            throw new Error(deployResult.error);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('\n💥 デプロイエラー:'), error);
        throw error;
    }
}
// エラーハンドリング
main().catch(error => {
    console.error(chalk_1.default.red('\n予期しないエラーが発生しました:'), error);
    process.exit(1);
});
