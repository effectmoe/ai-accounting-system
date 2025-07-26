#!/usr/bin/env tsx

import { logger } from '../lib/logger';
import { mcpManager } from '../src/mastra/mcp/mcp-manager';
import { mcpAccountingTools } from '../src/mastra/agents/tools/mcp-accounting-tools';
import { mcpTaxTools } from '../src/mastra/agents/tools/mcp-tax-tools';

async function testMCPTools() {
  console.log('🚀 MCPツールテスト開始...\n');
  
  try {
    // 1. MCPマネージャーを初期化
    console.log('1️⃣ MCPマネージャーを初期化中...');
    await mcpManager.initialize();
    console.log('✅ 初期化完了');
    console.log('接続されたサーバー:', mcpManager.getConnectedServers());
    console.log('');
    
    // 2. 会計ツールのテスト
    console.log('2️⃣ 会計MCPツールのテスト');
    console.log('利用可能な会計ツール:');
    mcpAccountingTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');
    
    // 3. 税務ツールのテスト
    console.log('3️⃣ 税務MCPツールのテスト');
    console.log('利用可能な税務ツール:');
    mcpTaxTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');
    
    // 4. 実際のツール実行テスト（環境変数が設定されている場合のみ）
    if (process.env.TEST_MCP_TOOLS === 'true') {
      console.log('4️⃣ 実際のツール実行テスト');
      
      // 税制情報検索のテスト
      console.log('\n📋 税制情報検索テスト...');
      try {
        const searchResult = await mcpAccountingTools[1].handler({
          topic: 'インボイス制度',
          save_directory: '/tmp',
        });
        console.log('✅ 検索結果:', JSON.stringify(searchResult, null, 2));
      } catch (error) {
        console.error('❌ 検索エラー:', error);
      }
      
      // 税法調査のテスト
      console.log('\n📋 税法調査テスト...');
      try {
        const researchResult = await mcpTaxTools[1].handler({
          tax_topic: '電子帳簿保存法',
          specific_questions: ['保存要件は何ですか？', 'いつから適用されますか？'],
          include_examples: true,
        });
        console.log('✅ 調査結果:', JSON.stringify(researchResult, null, 2));
      } catch (error) {
        console.error('❌ 調査エラー:', error);
      }
    } else {
      console.log('\n💡 実際のツール実行をテストするには、以下を実行してください:');
      console.log('   TEST_MCP_TOOLS=true npm run test:mcp-tools');
    }
    
    // 5. エージェント別のツール数を表示
    console.log('\n5️⃣ エージェント別MCPツール数:');
    const agentTypes = [
      'accounting-agent',
      'customer-agent',
      'japan-tax-agent',
      'ocr-agent',
      'product-agent',
      'deployment-agent',
      'refactoring-agent',
      'general',
    ];
    
    for (const agentType of agentTypes) {
      const tools = mcpManager.getToolsForAgent(agentType);
      console.log(`  ${agentType}: ${tools.length}個のツール`);
    }
    
  } catch (error) {
    console.error('❌ テストエラー:', error);
  } finally {
    // クリーンアップ
    console.log('\n🧹 クリーンアップ中...');
    await mcpManager.shutdown();
    console.log('✅ 完了');
  }
}

// メイン実行
if (require.main === module) {
  testMCPTools()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}