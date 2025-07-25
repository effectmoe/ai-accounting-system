"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateGAS = authenticateGAS;
const mcp_client_1 = require("@/lib/mcp-client");
const mcp_config_1 = require("@/lib/mcp-config");
async function authenticateGAS() {
    console.log('🔐 GAS OAuth認証を開始します...');
    try {
        // MCPサーバーを初期化
        await (0, mcp_config_1.initializeMCPServers)();
        console.log('✅ MCPサーバーを初期化しました');
        // 認証開始
        console.log('🌐 ブラウザで認証画面を開きます...');
        const authResult = await mcp_client_1.mcpManager.callTool('gas', 'gas_auth', {
            mode: 'start'
        });
        console.log('認証結果:', authResult);
        // 認証状態確認
        const statusResult = await mcp_client_1.mcpManager.callTool('gas', 'gas_auth', {
            mode: 'status'
        });
        console.log('認証状態:', statusResult);
    }
    catch (error) {
        console.error('❌ 認証エラー:', error);
        throw error;
    }
}
// スクリプトを実行
if (require.main === module) {
    authenticateGAS()
        .then(() => {
        console.log('\n✅ 認証スクリプトが完了しました');
        console.log('次のステップ: npm run deploy:gas-ocr を実行してください');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n❌ 認証に失敗しました:', error);
        process.exit(1);
    });
}
