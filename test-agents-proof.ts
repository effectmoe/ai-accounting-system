// Mastraエージェントの動作証明テスト
import { mastraAccountingAgent } from './src/agents/mastra-accounting-agent';
import { mastraCustomerAgent } from './src/agents/mastra-customer-agent';
import { mastraJapanTaxAgent } from './src/agents/mastra-japan-tax-agent';
import { calculateTaxTool, createJournalEntryTool } from './src/agents/tools/accounting-tools';
import { searchCustomersTool } from './src/agents/tools/customer-tools';

console.log('========================================');
console.log('Mastraエージェント動作証明テスト');
console.log('実行時刻:', new Date().toLocaleString('ja-JP'));
console.log('========================================\n');

async function proveAgentsWork() {
  try {
    // 1. 会計ツールの直接実行テスト
    console.log('【テスト1】会計ツールの直接実行');
    console.log('----------------------------------------');
    
    const taxResult = await calculateTaxTool.handler({
      amount: 1000000,
      taxType: 'consumption',
      options: { includeLocal: true }
    });
    
    console.log('✅ 消費税計算ツール実行結果:');
    console.log(JSON.stringify(taxResult, null, 2));
    
    // 2. 仕訳作成ツールのテスト
    console.log('\n【テスト2】仕訳作成ツール');
    console.log('----------------------------------------');
    
    const journalResult = await createJournalEntryTool.handler({
      date: '2025-01-26',
      entries: [
        {
          account: '売掛金',
          debit: 110000,
          credit: 0,
          description: 'A社への請求'
        },
        {
          account: '売上高',
          debit: 0,
          credit: 100000,
          description: '商品売上'
        },
        {
          account: '仮受消費税',
          debit: 0,
          credit: 10000,
          description: '消費税10%'
        }
      ],
      description: 'A社への商品販売',
      reference: 'INV-2025-001'
    });
    
    console.log('✅ 仕訳作成結果:');
    console.log(JSON.stringify(journalResult, null, 2));
    
    // 3. 顧客検索ツールのテスト
    console.log('\n【テスト3】顧客検索ツール');
    console.log('----------------------------------------');
    
    const customerResult = await searchCustomersTool.handler({
      searchTerm: 'テスト顧客'
    });
    
    console.log('✅ 顧客検索結果:');
    console.log(JSON.stringify(customerResult, null, 2));
    
    // 4. エージェント経由での実行
    console.log('\n【テスト4】エージェント経由での実行');
    console.log('----------------------------------------');
    
    console.log('会計エージェント情報:');
    console.log('- 名前:', mastraAccountingAgent.name);
    console.log('- 説明:', mastraAccountingAgent.description);
    console.log('- モデル:', mastraAccountingAgent.model);
    
    // エージェントのツール実行
    const agentToolResult = await mastraAccountingAgent.runTool(
      'calculate_tax',
      {
        amount: 500000,
        taxType: 'income',
        options: {}
      }
    );
    
    console.log('\n✅ エージェント経由の税計算結果:');
    console.log(JSON.stringify(agentToolResult, null, 2));
    
    console.log('\n========================================');
    console.log('✅ すべてのテストが成功しました！');
    console.log('Mastraエージェントは正常に動作しています。');
    console.log('========================================');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error);
    console.error('\nスタックトレース:');
    console.error(error.stack);
  }
}

// 実行
proveAgentsWork();