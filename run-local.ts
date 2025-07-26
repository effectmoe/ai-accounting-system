// シンプルにエージェントを実行するスクリプト
import { mastraAccountingAgent } from './src/agents/mastra-accounting-agent';
import { mastraCustomerAgent } from './src/agents/mastra-customer-agent';
import { mastraJapanTaxAgent } from './src/agents/mastra-japan-tax-agent';

async function testAgents() {
  console.log('🚀 Mastraエージェントのテスト実行\n');
  
  try {
    // 1. 会計エージェントのテスト
    console.log('📊 会計エージェントをテスト中...');
    const accountingResult = await mastraAccountingAgent.runTool(
      'create_journal_entry',
      {
        date: new Date().toISOString().split('T')[0],
        debitAccount: '現金',
        creditAccount: '売上高',
        amount: 10000,
        description: 'テスト取引'
      }
    );
    console.log('✅ 仕訳作成成功:', accountingResult);
    
    // 2. 顧客エージェントのテスト
    console.log('\n👥 顧客エージェントをテスト中...');
    const customerResult = await mastraCustomerAgent.runTool(
      'search_customers',
      { searchTerm: 'テスト' }
    );
    console.log('✅ 顧客検索成功:', customerResult);
    
    // 3. 税務エージェントのテスト
    console.log('\n🏛️ 税務エージェントをテスト中...');
    const taxResult = await mastraJapanTaxAgent.execute({
      prompt: '売上100万円の場合の消費税を計算してください'
    });
    console.log('✅ 税務計算成功:', taxResult);
    
    console.log('\n✨ すべてのテストが完了しました！');
    console.log('エージェントは正常に動作しています。');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// 実行
testAgents();