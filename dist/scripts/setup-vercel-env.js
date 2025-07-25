"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const readline = __importStar(require("readline"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const envVariables = [
    {
        name: 'MONGODB_URI',
        description: 'MongoDB接続URI (データベース接続用)',
        required: true,
        example: 'mongodb+srv://username:password@cluster.mongodb.net/dbname',
        secure: true
    },
    {
        name: 'NEXTAUTH_SECRET',
        description: 'NextAuth認証用シークレット',
        required: true,
        example: 'ランダムな文字列（openssl rand -base64 32で生成）',
        secure: true
    },
    {
        name: 'NEXTAUTH_URL',
        description: 'NextAuthのベースURL',
        required: true,
        example: 'https://accounting-automation.vercel.app',
        secure: false
    },
    {
        name: 'GOOGLE_CLIENT_ID',
        description: 'Google OAuth2クライアントID',
        required: true,
        example: '123456789-abcdefg.apps.googleusercontent.com',
        secure: false
    },
    {
        name: 'GOOGLE_CLIENT_SECRET',
        description: 'Google OAuth2クライアントシークレット',
        required: true,
        example: 'GOCSPX-xxxxxxxxxxxxxxxx',
        secure: true
    },
    {
        name: 'DEEPSEEK_API_KEY',
        description: 'DeepSeek AI APIキー (Sequential Thinking用)',
        required: true,
        example: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        secure: true
    },
    {
        name: 'PERPLEXITY_API_KEY',
        description: 'Perplexity APIキー (高度な検索と分析)',
        required: true,
        example: 'pplx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        secure: true
    },
    {
        name: 'FIRECRAWL_API_KEY',
        description: 'Firecrawl APIキー (Webスクレイピング)',
        required: true,
        example: 'fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        secure: true
    },
    {
        name: 'DATAFORSEO_API_KEY',
        description: 'DataForSEO APIキー (SEO分析) - email:passwordのBase64エンコード',
        required: true,
        example: 'Base64エンコードされた認証情報',
        secure: true
    },
    {
        name: 'MIDSCENE_API_KEY',
        description: 'Midscene APIキー (ビジュアル解析)',
        required: true,
        example: 'ms-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        secure: true
    },
    {
        name: 'MIDSCENE_CHROME_EXTENSION_ID',
        description: 'Midscene Chrome拡張機能ID (オプション)',
        required: false,
        example: 'abcdefghijklmnopqrstuvwxyz'
    },
    {
        name: 'NLWEB_API_KEY',
        description: 'NLWeb APIキー (既存システムとの連携)',
        required: false,
        example: 'nlw-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        secure: true
    },
    {
        name: 'NLWEB_SITE_URL',
        description: 'NLWebサイトURL',
        required: false,
        example: 'https://your-nlweb-site.com'
    },
    {
        name: 'GITHUB_TOKEN',
        description: 'GitHubトークン (デプロイ用)',
        required: false,
        example: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        secure: true
    }
];
// 入力を求める関数
function question(query) {
    return new Promise((resolve) => {
        rl.question(query, resolve);
    });
}
// マスクされた入力を表示
function maskValue(value, secure) {
    if (!secure || value.length <= 8)
        return value;
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}
// Vercelコマンドを実行
function executeVercelCommand(args) {
    return new Promise((resolve, reject) => {
        let output = '';
        const vercel = (0, child_process_1.spawn)('vercel', args);
        vercel.stdout.on('data', (data) => {
            output += data.toString();
        });
        vercel.stderr.on('data', (data) => {
            output += data.toString();
        });
        vercel.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            }
            else {
                reject(new Error(`Vercel command failed with code ${code}`));
            }
        });
        vercel.on('error', (err) => {
            reject(err);
        });
    });
}
// メイン処理
async function main() {
    console.log('🚀 Vercel環境変数セットアップツール');
    console.log('=====================================\n');
    console.log('このツールは問題解決専門エージェント用の環境変数をVercelに設定します。\n');
    // Vercel CLIがインストールされているか確認
    try {
        const version = await executeVercelCommand(['--version']);
        console.log('✅ Vercel CLIが検出されました:', version.trim());
    }
    catch (error) {
        console.error('❌ Vercel CLIがインストールされていません。');
        console.log('\n以下のコマンドでインストールしてください:');
        console.log('npm i -g vercel\n');
        rl.close();
        process.exit(1);
    }
    // プロジェクトにリンクされているか確認
    const isLinked = await question('このプロジェクトはVercelにリンクされていますか？ (y/n): ');
    if (isLinked.toLowerCase() !== 'y') {
        console.log('\n📎 Vercelプロジェクトにリンクします...');
        console.log('\n以下のコマンドを実行してプロジェクトをリンクしてください:');
        console.log('vercel link\n');
        console.log('リンクが完了したら、再度このスクリプトを実行してください。');
        rl.close();
        process.exit(0);
    }
    console.log('\n📝 環境変数を設定します。');
    console.log('※ 空欄でEnterを押すとその環境変数はスキップされます。\n');
    const envValues = {};
    // 各環境変数について入力を求める
    for (const env of envVariables) {
        console.log(`\n${env.required ? '【必須】' : '【任意】'} ${env.name}`);
        console.log(`説明: ${env.description}`);
        if (env.example) {
            console.log(`例: ${env.example}`);
        }
        const value = await question(`値を入力してください: `);
        if (value) {
            envValues[env.name] = value;
            console.log(`✅ ${env.name} = ${maskValue(value, env.secure || false)}`);
        }
        else if (env.required) {
            console.log('⚠️  必須項目ですが、スキップされました。');
        }
        else {
            console.log('⏭️  スキップされました。');
        }
    }
    console.log('\n\n📋 設定する環境変数の確認:');
    console.log('=====================================');
    for (const [key, value] of Object.entries(envValues)) {
        const env = envVariables.find(e => e.name === key);
        console.log(`${key} = ${maskValue(value, env?.secure || false)}`);
    }
    const confirm = await question('\n\nこれらの環境変数をVercelに設定しますか？ (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
        console.log('\n❌ キャンセルされました。');
        rl.close();
        return;
    }
    console.log('\n🔄 Vercelに環境変数を設定しています...\n');
    // 各環境変数をVercelに設定
    for (const [key, value] of Object.entries(envValues)) {
        try {
            console.log(`設定中: ${key}...`);
            // vercel env add コマンドを使用
            const args = ['env', 'add', key, 'production', 'preview', 'development'];
            const vercel = (0, child_process_1.spawn)('vercel', args, {
                stdio: ['pipe', 'inherit', 'inherit']
            });
            // 値を標準入力に送信
            vercel.stdin.write(value + '\n');
            vercel.stdin.end();
            await new Promise((resolve, reject) => {
                vercel.on('close', (code) => {
                    if (code === 0) {
                        console.log(`✅ ${key} を設定しました。`);
                        resolve(undefined);
                    }
                    else {
                        reject(new Error(`Failed to set ${key}`));
                    }
                });
                vercel.on('error', reject);
            });
        }
        catch (error) {
            console.error(`❌ ${key} の設定に失敗しました: ${error}`);
        }
    }
    console.log('\n\n✅ すべての環境変数の設定が完了しました！');
    console.log('\n📌 次のステップ:');
    console.log('1. Vercelダッシュボードで環境変数を確認');
    console.log('2. 最新のデプロイメントを再デプロイ');
    console.log('3. https://accounting-automation.vercel.app/mastra-admin で動作確認\n');
    // .env.localファイルも作成するか確認
    const createLocal = await question('ローカル開発用の.env.localファイルも作成しますか？ (y/n): ');
    if (createLocal.toLowerCase() === 'y') {
        const envLocalPath = path.join(process.cwd(), '.env.local');
        let content = '# 自動生成された環境変数\n# ' + new Date().toISOString() + '\n\n';
        for (const [key, value] of Object.entries(envValues)) {
            content += `${key}=${value}\n`;
        }
        fs.writeFileSync(envLocalPath, content);
        console.log(`\n✅ .env.local ファイルを作成しました: ${envLocalPath}`);
    }
    rl.close();
}
// エラーハンドリング
process.on('unhandledRejection', (err) => {
    console.error('\n❌ エラーが発生しました:', err);
    rl.close();
    process.exit(1);
});
// 実行
main().catch((err) => {
    console.error('\n❌ エラーが発生しました:', err);
    rl.close();
    process.exit(1);
});
