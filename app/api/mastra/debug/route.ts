import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';
import { mastraAccountingAgent } from '@/src/agents/mastra-accounting-agent';
import { accountingTools } from '@/src/agents/tools/accounting-tools';

export async function GET() {
  try {
    // 直接エージェントとツールの情報を確認
    const agents = await mastra.getAgents();
    
    const debugInfo = {
      mastraAccountingAgent: {
        name: mastraAccountingAgent.name,
        description: mastraAccountingAgent.description,
        hasTools: !!mastraAccountingAgent.tools,
        toolsType: typeof mastraAccountingAgent.tools,
        toolsIsArray: Array.isArray(mastraAccountingAgent.tools),
        toolsLength: Array.isArray(mastraAccountingAgent.tools) ? mastraAccountingAgent.tools.length : 0,
        agentKeys: Object.keys(mastraAccountingAgent)
      },
      accountingTools: {
        isArray: Array.isArray(accountingTools),
        length: accountingTools.length,
        toolNames: accountingTools.map(t => t.name)
      },
      registeredAgents: {
        count: Object.keys(agents).length,
        names: Object.keys(agents),
        accountingAgentInfo: agents.accountingAgent ? {
          hasTools: !!agents.accountingAgent.tools,
          type: typeof agents.accountingAgent,
          keys: Object.keys(agents.accountingAgent)
        } : null
      }
    };
    
    return NextResponse.json(debugInfo);
    
  } catch (error) {
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}