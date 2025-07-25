#!/usr/bin/env tsx
"use strict";
/**
 * MastraとVercel APIを使用した完全自動デプロイスクリプト
 *
 * このスクリプトは以下を自動化します：
 * 1. Vercel APIトークンの取得
 * 2. 環境変数の自動設定（API経由）
 * 3. プロジェクトの再デプロイ
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { vercelIntegrationAgent } from '../src/agents/vercel-integration-agent';
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
// 環境変数を読み込み
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env.local') });
async function main() {
    console.log(chalk_1.default.blue.bold(`
╔══════════════════════════════════════════════════╗
║   Mastra + Vercel API 完全自動デプロイ           ║
║   Azure Form Recognizer + MongoDB System         ║
╚══════════════════════════════════════════════════╝
  `));
    try {
        // 1. Vercel CLIの確認
        console.log(chalk_1.default.yellow('1️⃣ Vercel CLIを確認中...'));
        const { exec } = await Promise.resolve().then(() => __importStar(require('child_process')));
        const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
        const execAsync = promisify(exec);
        try {
            await execAsync('npx vercel whoami');
            console.log(chalk_1.default.green('✅ Vercel CLIが利用可能です'));
        }
        catch (error) {
            console.error(chalk_1.default.red('❌ Vercel CLIでログインしてください:'));
            console.log(chalk_1.default.gray('  npx vercel login'));
            process.exit(1);
        }
        // 2. 環境変数確認
        console.log(chalk_1.default.yellow('\n2️⃣ 環境変数を確認中...'));
        const variables = [
            'MONGODB_URI',
        ];
        const missingVars = variables.filter(v => !process.env[v]);
        if (missingVars.length > 0) {
            console.error(chalk_1.default.red('❌ 必須環境変数が設定されていません:'));
            missingVars.forEach(v => console.error(chalk_1.default.red(`  - ${v}`)));
            console.log(chalk_1.default.yellow('\n.env.localファイルに環境変数を設定してください'));
            process.exit(1);
        }
        console.log(chalk_1.default.green('✅ すべての環境変数が設定されています'));
        // 3. デプロイ実行
        console.log(chalk_1.default.yellow('\n3️⃣ 本番環境へデプロイ中...'));
        try {
            const { stdout } = await execAsync('npx vercel --prod --yes');
            // URLを抽出
            const urlMatch = stdout.match(/Production: (https:\/\/[^\s]+)/);
            const prodUrl = urlMatch ? urlMatch[1] : 'https://accounting-automation.vercel.app';
            console.log(chalk_1.default.green('✅ デプロイが完了しました！'));
            console.log(chalk_1.default.blue(`\n🎉 新しいシステムが利用可能です！`));
            console.log(chalk_1.default.white(`\n📍 URL:`));
            console.log(chalk_1.default.cyan(`  メイン: ${prodUrl}`));
            console.log(chalk_1.default.cyan(`  状態確認: ${prodUrl}/test-azure-mongodb`));
            console.log(chalk_1.default.cyan(`  ヘルスチェック: ${prodUrl}/api/health`));
        }
        catch (error) {
            console.error(chalk_1.default.red('❌ デプロイエラー:'), error);
            process.exit(1);
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('\n予期しないエラーが発生しました:'), error);
        process.exit(1);
    }
}
// 実行
main().catch(error => {
    console.error(chalk_1.default.red('エラー:'), error);
    process.exit(1);
});
