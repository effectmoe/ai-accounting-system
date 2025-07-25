#!/usr/bin/env tsx
"use strict";
/**
 * Mastraデプロイメントエージェントを使用してVercelにデプロイ
 * 最新の修正を含む本番環境デプロイ
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
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const dotenv = __importStar(require("dotenv"));
// 環境変数を読み込み
dotenv.config({ path: '.env.production.actual' });
class MastraDeploymentManager {
    logs = [];
    log(message, color = 'blue') {
        const coloredMessage = chalk_1.default[color](message);
        console.log(coloredMessage);
        this.logs.push(message);
    }
    async runCommand(command, args = []) {
        return new Promise((resolve) => {
            const childProcess = (0, child_process_1.spawn)(command, args, {
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
    async checkPrerequisites() {
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
    async buildProject() {
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
    async deployToVercel() {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                logs: this.logs
            };
        }
    }
    async healthCheck(url) {
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
            }
            else {
                this.log(`⚠️ ヘルスチェック失敗: ${response.status}`, 'yellow');
                return false;
            }
        }
        catch (error) {
            this.log(`⚠️ ヘルスチェックエラー: ${error}`, 'yellow');
            return false;
        }
    }
    async execute() {
        console.log(chalk_1.default.blue.bold(`
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
        }
        catch (error) {
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
        console.log(chalk_1.default.green('\n✅ デプロイ成功！'));
        if (result.url) {
            console.log(chalk_1.default.blue(`🌐 URL: ${result.url}`));
        }
        process.exit(0);
    }
    else {
        console.log(chalk_1.default.red('\n❌ デプロイ失敗'));
        console.log(chalk_1.default.red(`エラー: ${result.error}`));
        process.exit(1);
    }
}
// エラーハンドリング
main().catch(error => {
    console.error(chalk_1.default.red('\n予期しないエラー:'), error);
    process.exit(1);
});
