import { Mastra } from '@mastra/core';
import { deepseekProvider } from './setup-deepseek';

// Mastraインスタンスを作成
export const mastra = new Mastra({
  name: 'accounting-automation',
  providers: {
    deepseek: deepseekProvider
  },
  telemetry: {
    enabled: false
  }
});

// エージェントとツールを登録する関数
export async function setupMastra() {
  // 会計エージェントを登録
  const { mastraAccountingAgent } = await import('./agents/mastra-accounting-agent');
  mastra.registerAgent(mastraAccountingAgent);
  
  // 他のエージェントも登録
  const { mastraCustomerAgent } = await import('./agents/mastra-customer-agent');
  mastra.registerAgent(mastraCustomerAgent);
  
  const { mastraDatabaseAgent } = await import('./agents/mastra-database-agent');
  mastra.registerAgent(mastraDatabaseAgent);
  
  const { mastraJapanTaxAgent } = await import('./agents/mastra-japan-tax-agent');
  mastra.registerAgent(mastraJapanTaxAgent);
  
  return mastra;
}