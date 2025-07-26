#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { logger } from '../lib/logger';
import { mcpManager } from '../src/mastra/mcp/mcp-manager';
import { createMCPTool } from '../src/mastra/mcp/mcp-tool-adapter';

async function verifyMCP() {
  console.log('🔍 MCP検証開始...\n');
  
  const results = {
    filesystem: false,
    github: false,
    search: false,
    vercel: false,
    perplexity: false,
    playwright: false,
  };
  
  try {
    // 環境変数の確認
    console.log('0️⃣ 環境変数の確認:');
    console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? '✅' : '❌');
    console.log('VERCEL_TOKEN:', process.env.VERCEL_TOKEN ? '✅' : '❌');
    console.log('PERPLEXITY_API_KEY:', process.env.PERPLEXITY_API_KEY ? '✅' : '❌');
    console.log('');
    
    // 1. MCPマネージャーを初期化
    console.log('1️⃣ MCPマネージャーの初期化...');
    await mcpManager.initialize();
    const connectedServers = mcpManager.getConnectedServers();
    console.log('✅ 接続されたサーバー:', connectedServers);
    console.log('');
    
    // 2. 各MCPサーバーの接続状態を確認
    console.log('2️⃣ 各MCPサーバーの接続テスト:');
    
    // filesystem テスト
    if (mcpManager.isServerConnected('filesystem')) {
      console.log('\n📁 Filesystem MCP:');
      try {
        const listTool = createMCPTool('filesystem', 'list_directory', 'List directory');
        const result = await listTool.handler({ path: '.' });
        console.log('✅ 動作確認OK - ファイル数:', result.entries?.length || 0);
        results.filesystem = true;
      } catch (e) {
        console.error('❌ エラー:', e);
      }
    }
    
    // perplexity テスト（APIキーあり）
    if (mcpManager.isServerConnected('perplexity')) {
      console.log('\n🔍 Perplexity MCP:');
      try {
        const searchTool = createMCPTool('perplexity', 'perplexity_search_web', 'Search Web');
        const result = await searchTool.handler({ 
          query: 'What is MCP (Model Context Protocol)?'
        });
        console.log('✅ 動作確認OK - 検索結果取得');
        results.perplexity = true;
      } catch (e) {
        console.error('❌ エラー:', e);
      }
    }
    
    // github テスト（APIキーなし）
    if (mcpManager.isServerConnected('github')) {
      console.log('\n🐙 GitHub MCP: 接続済み（APIキーが必要）');
      results.github = true;
    } else {
      console.log('\n🐙 GitHub MCP: 未接続（GITHUB_TOKENが未設定）');
    }
    
    // 他のサーバーも同様にチェック
    const otherServers = ['search', 'vercel', 'playwright'];
    for (const server of otherServers) {
      if (mcpManager.isServerConnected(server)) {
        console.log(`\n✅ ${server} MCP: 接続済み`);
        results[server as keyof typeof results] = true;
      } else {
        console.log(`\n⚠️  ${server} MCP: 未接続（環境変数が未設定）`);
      }
    }
    
    // 3. 結果サマリー
    console.log('\n\n📊 検証結果サマリー:');
    console.log('=====================================');
    Object.entries(results).forEach(([server, connected]) => {
      console.log(`${server.padEnd(12)}: ${connected ? '✅ 接続成功' : '❌ 未接続'}`);
    });
    
    const connectedCount = Object.values(results).filter(v => v).length;
    console.log('=====================================');
    console.log(`合計: ${connectedCount}/6 サーバーが利用可能`);
    
    // 4. 実際のツール実行テスト
    if (results.perplexity && process.env.TEST_ACTUAL_TOOLS === 'true') {
      console.log('\n\n4️⃣ 実際のツール実行テスト（Perplexity）:');
      try {
        const { searchTaxInfoTool } = require('../src/mastra/agents/tools/mcp-accounting-tools');
        const result = await searchTaxInfoTool.handler({
          topic: 'インボイス制度',
          save_directory: '/tmp'
        });
        console.log('✅ 税制情報検索成功:', result);
      } catch (e) {
        console.error('❌ ツール実行エラー:', e);
      }
    }
    
  } catch (error) {
    console.error('\n❌ 致命的エラー:', error);
  } finally {
    console.log('\n\n🧹 クリーンアップ...');
    await mcpManager.shutdown();
    console.log('✅ 完了');
  }
}

// メイン実行
if (require.main === module) {
  verifyMCP()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}