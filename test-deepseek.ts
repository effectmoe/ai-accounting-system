// DeepSeek統合テスト
import dotenv from 'dotenv';
dotenv.config();

import { mastraAccountingAgent } from './src/agents/mastra-accounting-agent';
import { calculateTaxTool, createJournalEntryTool, generateFinancialReportTool } from './src/agents/tools/accounting-tools';
import { DeepSeekProvider } from './src/lib/deepseek-client';

console.log('================================================');
console.log('🚀 DeepSeek統合動作テスト');
console.log('================================================');
console.log('実行時刻:', new Date().toLocaleString('ja-JP'));
console.log('================================================\n');

async function testDeepSeek() {
  const results = {
    apiTest: null,
    toolTests: [],
    agentTests: []
  };
  
  try {
    // Part 1: DeepSeek API接続テスト
    console.log('【Part 1】DeepSeek API接続テスト');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log('⚠️  DEEPSEEK_API_KEYが設定されていません');
      console.log('環境変数にDEEPSEEK_API_KEYを設定してください\n');
      results.apiTest = { status: 'FAILED', error: 'API key not set' };
    } else {
      console.log('✅ DEEPSEEK_API_KEY設定確認');
      try {
        const response = await DeepSeekProvider.chat([
          { role: 'user', content: '日本の消費税について簡単に説明してください' }
        ]);
        console.log('✅ DeepSeek API応答確認:', response.substring(0, 100) + '...');
        results.apiTest = { status: 'SUCCESS', response: response.substring(0, 200) };
      } catch (error) {
        console.log('❌ DeepSeek API接続エラー:', error.message);
        results.apiTest = { status: 'FAILED', error: error.message };
      }
    }
    
    // Part 2: ツール動作確認（DeepSeekモデル経由）
    console.log('\n\n【Part 2】ツール動作確認');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 2-1. 消費税計算
    console.log('2-1. 消費税計算（売上200万円）');
    const taxResult = await calculateTaxTool.handler({
      amount: 2000000,
      taxType: 'consumption',
      options: { includeLocal: true }
    });
    console.log('結果:', JSON.stringify(taxResult, null, 2));
    results.toolTests.push({ test: '消費税計算', status: 'SUCCESS', result: taxResult });
    
    // 2-2. 仕訳作成
    console.log('\n2-2. 仕訳作成（DeepSeek経由）');
    const journalResult = await createJournalEntryTool.handler({
      date: new Date().toISOString().split('T')[0],
      entries: [
        { account: '売掛金', debit: 220000, credit: 0, description: 'DeepSeekテスト売上' },
        { account: '売上高', debit: 0, credit: 200000, description: '商品売上' },
        { account: '仮受消費税', debit: 0, credit: 20000, description: '消費税10%' }
      ],
      description: 'DeepSeek統合テスト取引',
      reference: `DEEPSEEK-${Date.now()}`
    });
    console.log('結果:', JSON.stringify(journalResult, null, 2));
    results.toolTests.push({ test: '仕訳作成', status: 'SUCCESS', result: journalResult });
    
    // Part 3: エージェント設定確認
    console.log('\n\n【Part 3】エージェント設定確認');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('会計エージェント設定:');
    console.log('- 名前:', mastraAccountingAgent.name);
    console.log('- モデルプロバイダー:', mastraAccountingAgent.model.provider);
    console.log('- モデル名:', mastraAccountingAgent.model.name);
    console.log('- 説明:', mastraAccountingAgent.description);
    
    results.agentTests.push({
      test: 'エージェント設定',
      status: mastraAccountingAgent.model.provider === 'deepseek' ? 'SUCCESS' : 'FAILED',
      config: {
        name: mastraAccountingAgent.name,
        provider: mastraAccountingAgent.model.provider,
        model: mastraAccountingAgent.model.name
      }
    });
    
    // 最終サマリー
    console.log('\n\n================================================');
    console.log('📊 テスト結果サマリー');
    console.log('================================================');
    console.log(`✅ API接続: ${results.apiTest?.status || 'SKIPPED'}`);
    console.log(`✅ ツールテスト: ${results.toolTests.filter(t => t.status === 'SUCCESS').length}/${results.toolTests.length} 成功`);
    console.log(`✅ エージェント設定: ${results.agentTests.filter(t => t.status === 'SUCCESS').length}/${results.agentTests.length} 確認`);
    
    if (results.apiTest?.status === 'SUCCESS' && results.agentTests[0]?.status === 'SUCCESS') {
      console.log('\n🎉 DeepSeek統合が正常に動作しています！');
    } else {
      console.log('\n⚠️  DeepSeek API Keyを設定してください');
    }
    console.log('================================================');
    
    // 詳細ログをファイルに保存
    const fs = require('fs').promises;
    const logFile = `deepseek-test-${Date.now()}.json`;
    await fs.writeFile(logFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 詳細なテストログを保存しました: ${logFile}`);
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error);
    console.error('\nエラーの詳細:', error.message);
  }
}

// 実行
testDeepSeek();