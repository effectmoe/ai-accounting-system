// DeepSeek設定の完全検証
import { mastraAccountingAgent } from './src/agents/mastra-accounting-agent';
import { mastraCustomerAgent } from './src/agents/mastra-customer-agent';
import { mastraJapanTaxAgent } from './src/agents/mastra-japan-tax-agent';
import { mastraProductAgent } from './src/agents/mastra-product-agent';
import { mastraConstructionAgent } from './src/agents/mastra-construction-agent';
import { mastraDatabaseAgent } from './src/agents/mastra-database-agent';
import { mastraDeploymentAgent } from './src/agents/mastra-deployment-agent';
import { mastraOcrAgent } from './src/agents/mastra-ocr-agent';
import { mastraProblemSolvingAgent } from './src/agents/mastra-problem-solving-agent';
import { mastraRefactorAgent } from './src/agents/mastra-refactor-agent';
import { mastraUiAgent } from './src/agents/mastra-ui-agent';
import { createJournalEntryTool } from './src/agents/tools/accounting-tools';
import { MongoClient } from 'mongodb';

console.log('==========================================');
console.log('🔍 DeepSeek完全検証 - 証拠収集');
console.log('==========================================');
console.log('実行時刻:', new Date().toLocaleString('ja-JP'));
console.log('==========================================\n');

// 全11エージェントのリスト
const allAgents = [
  mastraAccountingAgent,
  mastraCustomerAgent,
  mastraJapanTaxAgent,
  mastraProductAgent,
  mastraConstructionAgent,
  mastraDatabaseAgent,
  mastraDeploymentAgent,
  mastraOcrAgent,
  mastraProblemSolvingAgent,
  mastraRefactorAgent,
  mastraUiAgent
];

// 1. エージェント設定の確認
console.log('【証拠1】全11エージェントの設定');
console.log('------------------------------------------');
allAgents.forEach((agent, index) => {
  console.log(`${index + 1}. ${agent.name}:`);
  console.log(`   - Provider: ${agent.model.provider}`);
  console.log(`   - Model: ${agent.model.name}`);
  console.log(`   - DeepSeek?: ${agent.model.provider === 'deepseek' ? '✅ YES' : '❌ NO'}`);
});

// 2. 実際の動作テスト
console.log('\n\n【証拠2】実際の動作確認');
console.log('------------------------------------------');

async function verifyOperation() {
  try {
    // MongoDBに実際に仕訳を作成
    const journalEntry = await createJournalEntryTool.handler({
      date: new Date().toISOString().split('T')[0],
      entries: [
        { account: '現金', debit: 1100000, credit: 0, description: 'DeepSeek検証売上' },
        { account: '売上高', debit: 0, credit: 1000000, description: '商品売上高' },
        { account: '仮受消費税', debit: 0, credit: 100000, description: '消費税10%' }
      ],
      description: 'DeepSeek完全検証テスト',
      reference: `VERIFY-${Date.now()}`
    });
    
    console.log('✅ 仕訳作成成功:');
    console.log(`   - ID: ${journalEntry.id}`);
    console.log(`   - 仕訳番号: ${journalEntry.entry_number}`);
    console.log(`   - 作成時刻: ${journalEntry.created_at}`);
    console.log(`   - ステータス: ${journalEntry.status}`);
    
    // MongoDBから実際に確認
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db('accounting');
    const savedEntry = await db.collection('journal_entries').findOne({ _id: journalEntry._id });
    
    console.log('\n✅ MongoDB保存確認:');
    console.log(`   - 保存済み: ${savedEntry ? 'YES' : 'NO'}`);
    console.log(`   - 説明: ${savedEntry?.description}`);
    console.log(`   - 参照番号: ${savedEntry?.reference}`);
    
    await client.close();
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

// 3. 環境変数の確認
console.log('\n\n【証拠3】環境変数の確認');
console.log('------------------------------------------');
console.log(`DeepSeek API Key設定: ${process.env.DEEPSEEK_API_KEY ? '✅ 設定済み' : '❌ 未設定'}`);
console.log(`MongoDB URI設定: ${process.env.MONGODB_URI ? '✅ 設定済み' : '❌ 未設定'}`);

// 4. ファイルシステムの確認
console.log('\n\n【証拠4】ツールファイルの存在確認');
console.log('------------------------------------------');
const fs = require('fs');
const toolsDir = './src/mastra/tools';
const toolFiles = fs.readdirSync(toolsDir);
console.log(`ツールファイル数: ${toolFiles.length}個`);
toolFiles.forEach(file => {
  console.log(`   - ${file}`);
});

// 実行
verifyOperation().then(() => {
  console.log('\n==========================================');
  console.log('検証完了');
  console.log('==========================================');
});