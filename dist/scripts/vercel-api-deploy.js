#!/usr/bin/env tsx
"use strict";
/**
 * Vercel APIを直接使用した環境変数設定とデプロイスクリプト
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const os_1 = __importDefault(require("os"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// 環境変数を読み込み
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), '.env.local') });
// Vercel APIトークン取得
async function getVercelToken() {
    try {
        // Vercel CLIの設定からトークンを取得
        const configPath = path_1.default.join(os_1.default.homedir(), '.vercel', 'auth.json');
        const configData = await promises_1.default.readFile(configPath, 'utf-8');
        const config = JSON.parse(configData);
        return config.token || null;
    }
    catch {
        // 環境変数から取得を試みる
        return process.env.VERCEL_TOKEN || null;
    }
}
// プロジェクト情報取得
async function getProjectInfo(token, projectName) {
    const response = await (0, node_fetch_1.default)('https://api.vercel.com/v9/projects', {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to get projects: ${response.statusText}`);
    }
    const data = await response.json();
    const project = data.projects?.find((p) => p.name === projectName);
    if (!project) {
        throw new Error(`Project ${projectName} not found`);
    }
    return {
        projectId: project.id,
        teamId: project.accountId,
    };
}
// 環境変数設定
async function setEnvironmentVariable(token, projectId, teamId, key, value, target = ['production', 'preview', 'development']) {
    const url = teamId
        ? `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`
        : `https://api.vercel.com/v10/projects/${projectId}/env`;
    // 既存の環境変数を削除
    try {
        const listResponse = await (0, node_fetch_1.default)(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (listResponse.ok) {
            const envData = await listResponse.json();
            const existingEnv = envData.envs?.find((e) => e.key === key);
            if (existingEnv) {
                const deleteUrl = `${url}/${existingEnv.id}`;
                await (0, node_fetch_1.default)(deleteUrl, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });
            }
        }
    }
    catch {
        // 既存の変数がない場合は無視
    }
    // 新しい環境変数を作成
    const response = await (0, node_fetch_1.default)(url, {
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
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Failed to set ${key}`);
    }
    return true;
}
async function main() {
    console.log(chalk_1.default.blue.bold(`
╔══════════════════════════════════════════════════╗
║   Vercel API 環境変数設定 & デプロイ             ║
║   Azure Form Recognizer + MongoDB System         ║
╚══════════════════════════════════════════════════╝
  `));
    try {
        // 1. Vercel APIトークン取得
        console.log(chalk_1.default.yellow('1️⃣ Vercel APIトークンを確認中...'));
        const token = await getVercelToken();
        if (!token) {
            console.error(chalk_1.default.red('❌ Vercel APIトークンが見つかりません'));
            console.log(chalk_1.default.yellow('\nVercel CLIでログインしてください:'));
            console.log(chalk_1.default.gray('  vercel login'));
            process.exit(1);
        }
        console.log(chalk_1.default.green('✅ Vercel APIトークンを取得しました'));
        // 2. プロジェクト情報取得
        console.log(chalk_1.default.yellow('\n2️⃣ プロジェクト情報を取得中...'));
        const { projectId, teamId } = await getProjectInfo(token, 'accounting-automation');
        console.log(chalk_1.default.green('✅ プロジェクトを確認しました'));
        console.log(chalk_1.default.gray(`  Project ID: ${projectId}`));
        if (teamId) {
            console.log(chalk_1.default.gray(`  Team ID: ${teamId}`));
        }
        // 3. 環境変数設定
        console.log(chalk_1.default.yellow('\n3️⃣ 環境変数を設定中...'));
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
            console.error(chalk_1.default.red('❌ 必須環境変数が設定されていません:'));
            missingVars.forEach(v => console.error(chalk_1.default.red(`  - ${v}`)));
            console.log(chalk_1.default.yellow('\n.env.localファイルに環境変数を設定してください'));
            process.exit(1);
        }
        // 各環境変数を設定
        for (const variable of variables) {
            try {
                await setEnvironmentVariable(token, projectId, teamId, variable.key, variable.value);
                console.log(chalk_1.default.green(`  ✅ ${variable.key}`));
            }
            catch (error) {
                console.error(chalk_1.default.red(`  ❌ ${variable.key}: ${error}`));
            }
        }
        console.log(chalk_1.default.green('\n✅ すべての環境変数を設定しました'));
        // 4. デプロイ実行
        console.log(chalk_1.default.yellow('\n4️⃣ 本番環境へデプロイ中...'));
        try {
            const { stdout } = await execAsync('vercel --prod --yes');
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
