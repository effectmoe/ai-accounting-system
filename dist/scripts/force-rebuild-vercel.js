#!/usr/bin/env tsx
"use strict";
/**
 * Vercelのキャッシュクリアと強制再ビルドを実行するスクリプト
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
console.log('🔧 Vercel強制再ビルドスクリプトを開始します...');
try {
    // 1. .vercelディレクトリを削除（キャッシュクリア）
    const vercelDir = path_1.default.join(process.cwd(), '.vercel');
    if (fs_1.default.existsSync(vercelDir)) {
        console.log('📁 .vercelディレクトリを削除しています...');
        fs_1.default.rmSync(vercelDir, { recursive: true, force: true });
        console.log('✅ .vercelディレクトリを削除しました');
    }
    // 2. .nextディレクトリを削除（ローカルキャッシュクリア）
    const nextDir = path_1.default.join(process.cwd(), '.next');
    if (fs_1.default.existsSync(nextDir)) {
        console.log('📁 .nextディレクトリを削除しています...');
        fs_1.default.rmSync(nextDir, { recursive: true, force: true });
        console.log('✅ .nextディレクトリを削除しました');
    }
    // 3. node_modules/.cacheを削除
    const cacheDir = path_1.default.join(process.cwd(), 'node_modules', '.cache');
    if (fs_1.default.existsSync(cacheDir)) {
        console.log('📁 node_modules/.cacheを削除しています...');
        fs_1.default.rmSync(cacheDir, { recursive: true, force: true });
        console.log('✅ node_modules/.cacheを削除しました');
    }
    // 4. Vercelへの強制デプロイ
    console.log('\n🚀 Vercelへ強制デプロイを実行しています...');
    console.log('⚠️  このコマンドはVercel CLIがインストールされている必要があります');
    try {
        // --force と --yes フラグで強制的に再ビルド
        (0, child_process_1.execSync)('vercel --prod --force --yes', {
            stdio: 'inherit',
            env: {
                ...process.env,
                VERCEL_FORCE_NO_BUILD_CACHE: '1' // ビルドキャッシュを無効化
            }
        });
        console.log('\n✅ Vercelへの強制デプロイが完了しました！');
    }
    catch (deployError) {
        console.error('\n❌ Vercelデプロイ中にエラーが発生しました');
        console.error('Vercel CLIがインストールされていない場合は、以下のコマンドを実行してください:');
        console.error('npm i -g vercel');
        throw deployError;
    }
}
catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    process.exit(1);
}
console.log('\n✨ 全ての処理が完了しました！');
console.log('🔍 ブラウザのキャッシュもクリアすることをお勧めします（Ctrl+Shift+R または Cmd+Shift+R）');
