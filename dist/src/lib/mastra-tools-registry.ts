import { accountingTools } from '@/src/agents/tools/accounting-tools';
import { customerTools } from '@/src/agents/tools/customer-tools';

/**
 * Mastraエージェントのツールレジストリ
 * エージェントからツールに直接アクセスできない問題を回避するため、
 * ツールを中央管理する
 */
export const toolsRegistry = {
  accountingAgent: accountingTools,
  customerAgent: customerTools,
  databaseAgent: [],
  deploymentAgent: [],
  japanTaxAgent: [],
  ocrAgent: [],
  problemSolvingAgent: [],
  productAgent: [],
  refactorAgent: [],
  uiAgent: [],
  constructionAgent: []
};

/**
 * エージェント名とツール名からツールを取得
 */
export function getTool(agentName: string, toolName: string) {
  const agentTools = toolsRegistry[agentName as keyof typeof toolsRegistry];
  if (!agentTools) {
    throw new Error(`Agent ${agentName} not found in registry`);
  }
  
  const tool = agentTools.find(t => t.name === toolName);
  if (!tool) {
    throw new Error(`Tool ${toolName} not found for agent ${agentName}`);
  }
  
  return tool;
}

/**
 * エージェントが持つツールの一覧を取得
 */
export function getAgentTools(agentName: string) {
  const agentTools = toolsRegistry[agentName as keyof typeof toolsRegistry];
  if (!agentTools) {
    return [];
  }
  
  return agentTools.map(t => ({
    name: t.name,
    description: t.description
  }));
}