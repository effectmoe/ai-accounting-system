import { NextRequest, NextResponse } from 'next/server';
import { mastra, accountingAgent, executeAccountingAgent } from '@/src/mastra/perfect-setup';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    console.log('🎯 Perfect Mastra実行:', message);
    
    const result = await executeAccountingAgent(message);
    
    if (result.success) {
      console.log('✅ 実行成功:', result.response);
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  const agents = mastra.agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    tools: agent.tools.map(tool => ({
      id: tool.id,
      description: tool.description
    }))
  }));
  
  return NextResponse.json({
    framework: '@mastra/core',
    status: 'ready',
    agents,
    models: Object.keys(mastra.models || {})
  });
}