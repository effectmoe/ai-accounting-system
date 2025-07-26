#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { mcpManager } from '../src/mastra/mcp/mcp-manager';
import { createMCPTool } from '../src/mastra/mcp/mcp-tool-adapter';

async function testAllMCP() {
  console.log('🔍 全MCPサーバーの機能テスト\n');
  
  const results = {
    filesystem: { connected: false, tested: false, error: null as any },
    github: { connected: false, tested: false, error: null as any },
    search: { connected: false, tested: false, error: null as any },
    vercel: { connected: false, tested: false, error: null as any },
    perplexity: { connected: false, tested: false, error: null as any },
    playwright: { connected: false, tested: false, error: null as any },
  };
  
  try {
    // MCPマネージャーを初期化
    console.log('📋 MCPマネージャーの初期化...');
    await mcpManager.initialize();
    const connectedServers = mcpManager.getConnectedServers();
    console.log('✅ 接続されたサーバー:', connectedServers);
    console.log('');
    
    // 各サーバーの接続状態を記録
    for (const server of connectedServers) {
      if (server in results) {
        results[server as keyof typeof results].connected = true;
      }
    }
    
    // 1. Filesystem テスト
    console.log('📁 1. Filesystem MCP テスト');
    if (mcpManager.isServerConnected('filesystem')) {
      try {
        const writeTool = createMCPTool('filesystem', 'write_file', 'Write file');
        await writeTool.handler({
          path: 'test-mcp.txt',
          content: `MCPテスト ${new Date().toISOString()}`
        });
        
        const readTool = createMCPTool('filesystem', 'read_file', 'Read file');
        const content = await readTool.handler({ path: 'test-mcp.txt' });
        
        console.log('✅ ファイル作成・読み込み成功');
        console.log('   内容:', content.substring(0, 50) + '...');
        results.filesystem.tested = true;
      } catch (e) {
        console.error('❌ エラー:', e);
        results.filesystem.error = e;
      }
    } else {
      console.log('⚠️  未接続');
    }
    console.log('');
    
    // 2. GitHub テスト
    console.log('🐙 2. GitHub MCP テスト');
    if (mcpManager.isServerConnected('github')) {
      try {
        const searchReposTool = createMCPTool('github', 'search_repositories', 'Search repos');
        const repos = await searchReposTool.handler({ 
          query: 'user:effectmoe',
          max_results: 3 
        });
        
        console.log('✅ リポジトリリスト取得成功');
        console.log('   リポジトリ数:', repos.length || 0);
        results.github.tested = true;
      } catch (e) {
        console.error('❌ エラー:', e);
        results.github.error = e;
      }
    } else {
      console.log('⚠️  未接続');
    }
    console.log('');
    
    // 3. Brave Search テスト
    console.log('🔍 3. Brave Search MCP テスト');
    if (mcpManager.isServerConnected('search')) {
      try {
        const searchTool = createMCPTool('search', 'brave_web_search', 'Web search');
        const searchResults = await searchTool.handler({
          query: 'MCP Model Context Protocol',
          max: 3
        });
        
        console.log('✅ Web検索成功');
        console.log('   結果数:', searchResults.web?.results?.length || 0);
        results.search.tested = true;
      } catch (e) {
        console.error('❌ エラー:', e);
        results.search.error = e;
      }
    } else {
      console.log('⚠️  未接続');
    }
    console.log('');
    
    // 4. Vercel テスト
    console.log('🚀 4. Vercel MCP テスト');
    if (mcpManager.isServerConnected('vercel')) {
      try {
        const listProjectsTool = createMCPTool('vercel', 'list_projects', 'List projects');
        const projects = await listProjectsTool.handler({});
        
        console.log('✅ プロジェクトリスト取得成功');
        console.log('   プロジェクト数:', projects.projects?.length || 0);
        results.vercel.tested = true;
      } catch (e) {
        console.error('❌ エラー:', e);
        results.vercel.error = e;
      }
    } else {
      console.log('⚠️  未接続');
    }
    console.log('');
    
    // 5. Perplexity テスト
    console.log('🤖 5. Perplexity MCP テスト');
    if (mcpManager.isServerConnected('perplexity')) {
      try {
        const perplexityTool = createMCPTool('perplexity', 'perplexity_search_web', 'Perplexity search');
        const result = await perplexityTool.handler({
          query: 'What is Mastra framework?'
        });
        
        console.log('✅ AI検索成功');
        console.log('   回答長さ:', result.answer?.length || 0, '文字');
        results.perplexity.tested = true;
      } catch (e) {
        console.error('❌ エラー:', e);
        results.perplexity.error = e;
      }
    } else {
      console.log('⚠️  未接続');
    }
    console.log('');
    
    // 6. Playwright テスト
    console.log('🎭 6. Playwright MCP テスト');
    if (mcpManager.isServerConnected('playwright')) {
      try {
        // ブラウザをナビゲート
        const navigateTool = createMCPTool('playwright', 'browser_navigate', 'Navigate');
        await navigateTool.handler({
          url: 'https://example.com'
        });
        
        const closeTool = createMCPTool('playwright', 'browser_close', 'Close');
        await closeTool.handler({});
        
        console.log('✅ ブラウザ操作成功');
        results.playwright.tested = true;
      } catch (e) {
        console.error('❌ エラー:', e);
        results.playwright.error = e;
      }
    } else {
      console.log('⚠️  未接続');
    }
    console.log('');
    
    // 結果サマリー
    console.log('📊 テスト結果サマリー');
    console.log('=====================================');
    Object.entries(results).forEach(([server, result]) => {
      const status = result.tested ? '✅ テスト成功' : 
                     result.connected ? '🔌 接続済み（未テスト）' : 
                     '❌ 未接続';
      console.log(`${server.padEnd(12)}: ${status}`);
      if (result.error) {
        console.log(`              エラー: ${result.error.message || result.error}`);
      }
    });
    console.log('=====================================');
    
    const testedCount = Object.values(results).filter(r => r.tested).length;
    const connectedCount = Object.values(results).filter(r => r.connected).length;
    console.log(`テスト成功: ${testedCount}/6`);
    console.log(`接続済み: ${connectedCount}/6`);
    
  } catch (error) {
    console.error('\n❌ 致命的エラー:', error);
  } finally {
    console.log('\n🧹 クリーンアップ...');
    
    // テストファイルを削除
    try {
      const deleteTool = createMCPTool('filesystem', 'delete', 'Delete file');
      await deleteTool.handler({ path: 'test-mcp.txt' });
    } catch (e) {
      // エラーを無視
    }
    
    await mcpManager.shutdown();
    console.log('✅ 完了');
  }
}

// メイン実行
if (require.main === module) {
  testAllMCP()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}