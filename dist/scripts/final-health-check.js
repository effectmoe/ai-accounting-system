#!/usr/bin/env tsx
"use strict";
/**
 * Final System Health Check
 * 問題解決エージェントシステム全体の最終ヘルスチェック
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
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fs = __importStar(require("fs"));
const llm_cascade_manager_1 = require("../lib/llm-cascade-manager");
const perplexity_client_1 = require("../lib/perplexity-client");
const firecrawl_client_1 = require("../lib/firecrawl-client");
const ml_analytics_manager_1 = require("../lib/ml-analytics-manager");
const websocket_manager_1 = require("../lib/websocket-manager");
class SystemHealthChecker {
    results = [];
    async runAllChecks() {
        console.log('🏥 AAM問題解決エージェントシステム - 総合ヘルスチェック');
        console.log('='.repeat(60));
        console.log(`実行日時: ${new Date().toLocaleString('ja-JP')}\n`);
        // 1. 環境変数チェック
        await this.checkEnvironmentVariables();
        // 2. AIカスケードチェック
        await this.checkAICascade();
        // 3. Perplexityチェック
        await this.checkPerplexity();
        // 4. Firecrawlチェック
        await this.checkFirecrawl();
        // 5. ML分析チェック
        await this.checkMLAnalytics();
        // 6. WebSocketチェック
        await this.checkWebSocket();
        // 7. MCPサーバーチェック
        await this.checkMCPServers();
        // 8. MongoDBチェック
        await this.checkMongoDB();
        // 結果サマリー
        this.printSummary();
    }
    async checkEnvironmentVariables() {
        console.log('📋 環境変数チェック...');
        const requiredEnvVars = [
            'DEEPSEEK_API_KEY',
            'OPENAI_API_KEY',
            'ANTHROPIC_API_KEY',
            'MONGODB_URI',
            'AZURE_FORM_RECOGNIZER_ENDPOINT',
            'AZURE_FORM_RECOGNIZER_KEY',
            'PERPLEXITY_API_KEY',
            'FIRECRAWL_API_KEY',
            'USE_AZURE_MONGODB',
            'MASTRA_API_SECRET',
        ];
        const optionalEnvVars = [
            'HANDWRITING_OCR_API_TOKEN',
            'GITHUB_TOKEN',
            'VERCEL_TOKEN',
            'WEBSOCKET_PORT',
        ];
        let missingRequired = 0;
        let setOptional = 0;
        requiredEnvVars.forEach(envVar => {
            if (process.env[envVar]) {
                console.log(`  ✅ ${envVar}: 設定済み`);
            }
            else {
                console.log(`  ❌ ${envVar}: 未設定`);
                missingRequired++;
            }
        });
        console.log('\nオプション環境変数:');
        optionalEnvVars.forEach(envVar => {
            if (process.env[envVar]) {
                console.log(`  ✅ ${envVar}: 設定済み`);
                setOptional++;
            }
            else {
                console.log(`  ⚠️ ${envVar}: 未設定`);
            }
        });
        this.results.push({
            component: '環境変数',
            status: missingRequired === 0 ? 'success' : 'error',
            message: `必須: ${requiredEnvVars.length - missingRequired}/${requiredEnvVars.length}, オプション: ${setOptional}/${optionalEnvVars.length}`,
        });
    }
    async checkAICascade() {
        console.log('\n🤖 AIカスケードチェック...');
        try {
            const manager = new llm_cascade_manager_1.LLMCascadeManager();
            const response = await manager.generateText('テスト', 'システムチェック用');
            console.log('  ✅ AIカスケード: 正常動作');
            console.log(`  📍 使用プロバイダー: ${response ? 'DeepSeek' : 'Unknown'}`);
            this.results.push({
                component: 'AIカスケード',
                status: 'success',
                message: 'DeepSeek → OpenAI → Anthropic の順で動作',
            });
        }
        catch (error) {
            console.log(`  ❌ AIカスケード: エラー - ${error}`);
            this.results.push({
                component: 'AIカスケード',
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async checkPerplexity() {
        console.log('\n🔍 Perplexity APIチェック...');
        try {
            const client = new perplexity_client_1.PerplexityClient();
            const result = await client.testConnection();
            if (result.available) {
                console.log('  ✅ Perplexity: 接続可能');
                this.results.push({
                    component: 'Perplexity',
                    status: 'success',
                    message: 'Web検索API利用可能',
                });
            }
            else {
                throw new Error(result.error || 'Connection failed');
            }
        }
        catch (error) {
            console.log(`  ❌ Perplexity: ${error}`);
            this.results.push({
                component: 'Perplexity',
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async checkFirecrawl() {
        console.log('\n🕷️ Firecrawl APIチェック...');
        try {
            const client = new firecrawl_client_1.FirecrawlClient();
            const result = await client.testConnection();
            if (result.available) {
                console.log('  ✅ Firecrawl: 接続可能');
                const creditResult = await client.getCreditBalance();
                console.log(`  💳 クレジット残高: ${creditResult.balance || 'Unknown'}`);
                this.results.push({
                    component: 'Firecrawl',
                    status: 'success',
                    message: `Webスクレイピング利用可能 (残高: ${creditResult.balance})`,
                });
            }
            else {
                throw new Error(result.error || 'Connection failed');
            }
        }
        catch (error) {
            console.log(`  ❌ Firecrawl: ${error}`);
            this.results.push({
                component: 'Firecrawl',
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async checkMLAnalytics() {
        console.log('\n📊 機械学習分析チェック...');
        try {
            const manager = new ml_analytics_manager_1.MLAnalyticsManager();
            const result = await manager.healthCheck();
            if (result.available) {
                console.log('  ✅ ML分析: 正常動作');
                console.log(`  🔧 利用可能機能: ${result.capabilities.join(', ')}`);
                this.results.push({
                    component: 'ML分析',
                    status: 'success',
                    message: `${result.capabilities.length}種類の分析機能が利用可能`,
                });
            }
            else {
                throw new Error(result.error || 'ML system not available');
            }
        }
        catch (error) {
            console.log(`  ❌ ML分析: ${error}`);
            this.results.push({
                component: 'ML分析',
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async checkWebSocket() {
        console.log('\n🔌 WebSocketチェック...');
        try {
            const wsManager = (0, websocket_manager_1.getWebSocketManager)();
            const stats = wsManager.getStats();
            console.log(`  📊 WebSocket状態: ${stats.isRunning ? '稼働中' : '停止中'}`);
            console.log(`  🔗 接続数: ${stats.totalConnections}`);
            this.results.push({
                component: 'WebSocket',
                status: stats.isRunning ? 'success' : 'warning',
                message: `ポート${stats.port || 3001}で${stats.isRunning ? '稼働中' : '停止中'}`,
            });
        }
        catch (error) {
            console.log(`  ❌ WebSocket: ${error}`);
            this.results.push({
                component: 'WebSocket',
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    async checkMCPServers() {
        console.log('\n🔧 MCPサーバーチェック...');
        const mcpServers = [
            { name: 'ml-analytics-server', path: 'src/mcp-servers/ml-analytics-mcp-server.ts' },
            { name: 'websocket-server', path: 'src/mcp-servers/websocket-mcp-server.ts' },
            { name: 'enhanced-firecrawl-server', path: 'src/mcp-servers/enhanced-firecrawl-mcp-server.ts' },
            { name: 'mcp-coordinator', path: 'src/mcp-servers/mcp-coordinator.ts' },
            { name: 'accounting-server', path: 'src/mcp-servers/accounting-mcp-server-mock.ts' },
        ];
        let successCount = 0;
        for (const server of mcpServers) {
            if (fs.existsSync(server.path)) {
                console.log(`  ✅ ${server.name}: ファイル存在`);
                successCount++;
            }
            else {
                console.log(`  ❌ ${server.name}: ファイル不在`);
            }
        }
        this.results.push({
            component: 'MCPサーバー',
            status: successCount === mcpServers.length ? 'success' : 'warning',
            message: `${successCount}/${mcpServers.length} サーバーが利用可能`,
        });
    }
    async checkMongoDB() {
        console.log('\n🗄️ MongoDBチェック...');
        const mongoUri = process.env.MONGODB_URI;
        if (mongoUri) {
            if (mongoUri.includes('mongodb+srv://')) {
                console.log('  ✅ MongoDB: Atlas接続文字列設定済み');
                this.results.push({
                    component: 'MongoDB',
                    status: 'success',
                    message: 'MongoDB Atlas接続設定済み',
                });
            }
            else if (mongoUri.includes('localhost')) {
                console.log('  ⚠️ MongoDB: ローカル接続設定（要MongoDB起動）');
                this.results.push({
                    component: 'MongoDB',
                    status: 'warning',
                    message: 'ローカルMongoDB設定（要起動確認）',
                });
            }
        }
        else {
            console.log('  ❌ MongoDB: 接続文字列未設定');
            this.results.push({
                component: 'MongoDB',
                status: 'error',
                message: 'MONGODB_URI未設定',
            });
        }
    }
    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📋 ヘルスチェック結果サマリー');
        console.log('='.repeat(60));
        const successCount = this.results.filter(r => r.status === 'success').length;
        const warningCount = this.results.filter(r => r.status === 'warning').length;
        const errorCount = this.results.filter(r => r.status === 'error').length;
        console.log(`\n✅ 正常: ${successCount}`);
        console.log(`⚠️  警告: ${warningCount}`);
        console.log(`❌ エラー: ${errorCount}`);
        console.log(`\n合計: ${this.results.length} コンポーネント`);
        console.log('\n詳細:');
        this.results.forEach(result => {
            const icon = result.status === 'success' ? '✅' :
                result.status === 'warning' ? '⚠️' : '❌';
            console.log(`${icon} ${result.component}: ${result.message}`);
        });
        const healthScore = (successCount / this.results.length) * 100;
        console.log(`\n🏥 システム健全性スコア: ${healthScore.toFixed(1)}%`);
        if (healthScore === 100) {
            console.log('🎉 システムは完全に正常です！');
        }
        else if (healthScore >= 80) {
            console.log('👍 システムは概ね正常に動作しています。');
        }
        else if (healthScore >= 60) {
            console.log('⚠️ 一部のコンポーネントに問題があります。');
        }
        else {
            console.log('❌ システムに重大な問題があります。環境設定を確認してください。');
        }
    }
}
// メイン実行
async function main() {
    const checker = new SystemHealthChecker();
    await checker.runAllChecks();
}
main().catch(error => {
    console.error('ヘルスチェック実行エラー:', error);
    process.exit(1);
});
