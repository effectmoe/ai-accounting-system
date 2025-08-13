#!/usr/bin/env node

/**
 * Mastra Docs MCP Server テストスクリプト
 */

import { spawn } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMastraDocsServer() {
  console.log('Mastra Docs MCPサーバーのテストを開始します...\n');

  // サーバープロセスを起動
  const serverProcess = spawn('npx', ['tsx', './src/mcp-servers/mastra-docs-mcp-server.ts'], {
    env: {
      ...process.env,
      MASTRA_DOCS_URL: 'https://mastra.ai/ja',
      CACHE_DURATION: '3600'
    }
  });

  // クライアントを作成
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', './src/mcp-servers/mastra-docs-mcp-server.ts'],
    env: {
      MASTRA_DOCS_URL: 'https://mastra.ai/ja',
      CACHE_DURATION: '3600'
    }
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  }, {
    capabilities: {}
  });

  try {
    // サーバーに接続
    await client.connect(transport);
    console.log('✅ サーバーへの接続に成功しました\n');

    // ツール一覧を取得
    console.log('📋 利用可能なツール:');
    const tools = await client.listTools();
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // 各ツールをテスト
    console.log('🧪 ツールのテストを実行します...\n');

    // 1. ドキュメント検索
    console.log('1️⃣ ドキュメント検索テスト');
    const searchResult = await client.callTool({
      name: 'mastra_search_docs',
      arguments: {
        query: 'agent',
        category: 'all'
      }
    });
    console.log('結果:', searchResult.content[0].text.substring(0, 200) + '...\n');

    // 2. リファレンス取得
    console.log('2️⃣ リファレンス取得テスト');
    const referenceResult = await client.callTool({
      name: 'mastra_get_reference',
      arguments: {
        topic: 'agents'
      }
    });
    console.log('結果:', referenceResult.content[0].text.substring(0, 200) + '...\n');

    // 3. サンプルコード取得
    console.log('3️⃣ サンプルコード取得テスト');
    const examplesResult = await client.callTool({
      name: 'mastra_get_examples',
      arguments: {
        feature: 'agent-creation',
        language: 'typescript'
      }
    });
    console.log('結果:', examplesResult.content[0].text.substring(0, 200) + '...\n');

    // 4. 変更履歴取得
    console.log('4️⃣ 変更履歴取得テスト');
    const changelogResult = await client.callTool({
      name: 'mastra_get_changelog',
      arguments: {}
    });
    console.log('結果:', changelogResult.content[0].text.substring(0, 200) + '...\n');

    console.log('✅ すべてのテストが正常に完了しました！');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  } finally {
    // クリーンアップ
    await client.close();
    serverProcess.kill();
  }
}

// テストを実行
testMastraDocsServer().catch(console.error);