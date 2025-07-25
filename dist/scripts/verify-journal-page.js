#!/usr/bin/env tsx
"use strict";
/**
 * 仕訳ページの動作確認スクリプト
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const PRODUCTION_URL = 'https://accounting-automation-fhi36popl-effectmoes-projects.vercel.app';
async function checkJournalPage() {
    console.log('🔍 仕訳ページの動作確認を開始します...\n');
    try {
        // 1. HTMLページの取得
        console.log('📄 仕訳ページのHTMLを取得しています...');
        const pageResponse = await (0, node_fetch_1.default)(`${PRODUCTION_URL}/journal`);
        const html = await pageResponse.text();
        console.log(`✅ ステータスコード: ${pageResponse.status}`);
        console.log(`📏 HTMLサイズ: ${html.length} bytes`);
        // 2. JavaScriptファイルのリンクを抽出
        console.log('\n🔗 JavaScriptファイルのリンクを確認しています...');
        const scriptMatches = html.matchAll(/<script[^>]*src="([^"]+)"[^>]*>/g);
        const scripts = Array.from(scriptMatches).map(match => match[1]);
        console.log(`📊 見つかったスクリプト数: ${scripts.length}`);
        // 3. 各スクリプトの存在確認
        console.log('\n🔍 各スクリプトファイルの存在を確認しています...');
        const scriptResults = [];
        for (const script of scripts) {
            const scriptUrl = script.startsWith('http') ? script : `${PRODUCTION_URL}${script}`;
            try {
                const response = await (0, node_fetch_1.default)(scriptUrl, { method: 'HEAD' });
                scriptResults.push({
                    url: script,
                    status: response.status,
                    ok: response.ok
                });
                if (!response.ok) {
                    console.log(`❌ ${script} - ステータス: ${response.status}`);
                }
                else {
                    console.log(`✅ ${script} - OK`);
                }
            }
            catch (error) {
                console.log(`❌ ${script} - エラー: ${error.message}`);
                scriptResults.push({
                    url: script,
                    status: 0,
                    ok: false,
                    error: error.message
                });
            }
        }
        // 4. API エンドポイントの確認
        console.log('\n🔍 APIエンドポイントを確認しています...');
        const apiResponse = await (0, node_fetch_1.default)(`${PRODUCTION_URL}/api/journals?limit=1`);
        const apiData = await apiResponse.json();
        console.log(`✅ /api/journals ステータス: ${apiResponse.status}`);
        console.log(`📊 レスポンス: ${JSON.stringify(apiData).substring(0, 100)}...`);
        // 5. 結果のサマリー
        console.log('\n📊 診断結果サマリー:');
        console.log('='.repeat(50));
        const failedScripts = scriptResults.filter(s => !s.ok);
        if (failedScripts.length > 0) {
            console.log('\n❌ 読み込みに失敗したスクリプト:');
            failedScripts.forEach(script => {
                console.log(`  - ${script.url} (ステータス: ${script.status})`);
            });
            console.log('\n💡 推奨される対処法:');
            console.log('1. Vercelのダッシュボードでビルドログを確認');
            console.log('2. ブラウザの開発者ツールでネットワークタブを確認');
            console.log('3. scripts/clear-vercel-cache.sh を実行してキャッシュをクリア');
            console.log('4. Vercelダッシュボードの Settings > Functions > Purge Data Cache を実行');
        }
        else {
            console.log('\n✅ すべてのスクリプトが正常に読み込まれています');
            console.log('\n💡 ブラウザ側の問題の可能性があります:');
            console.log('1. ブラウザのキャッシュをクリア（Ctrl+Shift+R または Cmd+Shift+R）');
            console.log('2. シークレットウィンドウで確認');
            console.log('3. 別のブラウザで確認');
        }
    }
    catch (error) {
        console.error('\n❌ エラーが発生しました:', error);
    }
}
// 実行
checkJournalPage();
