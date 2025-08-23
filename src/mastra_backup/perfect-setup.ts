import { Mastra, Agent } from '@mastra/core';

// 税金計算ツールを作成
const calculateTaxTool = {
  name: 'calculate_tax',
  description: '日本の消費税を計算します',
  parameters: {
    type: 'object',
    properties: {
      amount: { 
        type: 'number', 
        description: '税抜き金額' 
      },
      taxRate: { 
        type: 'number', 
        description: '税率（デフォルト0.1）'
      }
    },
    required: ['amount']
  },
  handler: async (params: any) => {
    const { amount, taxRate = 0.1 } = params;
    const taxAmount = amount * taxRate;
    
    return {
      taxableAmount: amount,
      taxRate,
      taxAmount,
      totalAmount: amount + taxAmount,
      calculatedAt: new Date().toISOString()
    };
  }
};

// 仕訳作成ツール
const createJournalEntryTool = {
  name: 'create_journal_entry',
  description: '仕訳エントリを作成します',
  parameters: {
    type: 'object',
    properties: {
      description: { type: 'string', description: '摘要' },
      amount: { type: 'number', description: '金額' },
      debitAccount: { type: 'string', description: '借方勘定科目' },
      creditAccount: { type: 'string', description: '貸方勘定科目' },
      date: { type: 'string', description: '取引日' }
    },
    required: ['description', 'amount', 'debitAccount', 'creditAccount']
  },
  handler: async (params: any) => {
    const { getDatabase } = await import('@/lib/mongodb-client');
    const db = await getDatabase();
    const collection = db.collection('journal_entries');
    
    const journalEntry = {
      ...params,
      date: new Date(params.date || new Date()),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'posted',
      entryNumber: `JE-${Date.now()}`
    };
    
    const result = await collection.insertOne(journalEntry);
    
    return {
      success: true,
      id: result.insertedId.toString(),
      entryNumber: journalEntry.entryNumber,
      ...journalEntry
    };
  }
};

// 会計エージェントを作成
export const accountingAgent = new Agent({
  name: 'accounting-agent',
  description: '日本の会計基準に基づいた会計処理を行うAIエージェント',
  model: {
    provider: 'deepseek',
    name: 'deepseek-chat'
  },
  instructions: `あなたは日本の会計処理専門のAIエージェントです。

主な機能：
1. 消費税計算
2. 仕訳作成
3. 財務レポート生成

ユーザーの要求に応じて適切なツールを使用し、正確な会計処理を提供してください。
金額に関する言及があれば、必要に応じて税計算ツールを使用してください。`,
  tools: [calculateTaxTool, createJournalEntryTool]
});

// Mastraインスタンスを作成
export const mastra = new Mastra({
  name: 'accounting-automation',
  description: 'AI駆動の会計自動化システム',
  agents: {
    accountingAgent
  },
  telemetry: {
    enabled: false // テレメトリー無効化
  }
});

// エージェント実行関数
export async function executeAccountingAgent(prompt: string) {
  try {
    const result = await accountingAgent.execute({
      prompt,
      model: {
        provider: 'deepseek',
        name: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY
      }
    });

    return {
      success: true,
      response: result.text || result,
      toolCalls: result.toolCalls || []
    };
  } catch (error) {
    console.error('Agent execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}