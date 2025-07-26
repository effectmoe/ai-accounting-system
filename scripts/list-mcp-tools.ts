#!/usr/bin/env tsx

import dotenv from 'dotenv';
import path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { mcpManager } from '../src/mastra/mcp/mcp-manager';
import { mcpClient } from '../src/mastra/mcp/mcp-client';

async function listAllTools() {
  console.log('🔍 各MCPサーバーの利用可能なツール一覧\n');
  
  try {
    // MCPマネージャーを初期化
    await mcpManager.initialize();
    const connectedServers = mcpManager.getConnectedServers();
    console.log('接続されたサーバー:', connectedServers);
    console.log('');
    
    // 各サーバーのツールをリスト
    for (const server of connectedServers) {
      console.log(`\n📦 ${server} のツール:`);
      console.log('='.repeat(50));
      
      try {
        const tools = await mcpClient.listTools(server);
        if (tools && tools.length > 0) {
          tools.forEach((tool: any) => {
            console.log(`- ${tool.name}`);
            if (tool.description) {
              console.log(`  説明: ${tool.description}`);
            }
          });
        } else {
          console.log('（ツールなし）');
        }
      } catch (e) {
        console.error(`❌ エラー: ${e}`);
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
  listAllTools()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}