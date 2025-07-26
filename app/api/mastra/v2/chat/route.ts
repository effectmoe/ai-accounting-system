import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { message, agent = 'accountingAgent' } = await request.json();
    
    console.log('🤖 Mastra V2 本物のエージェント実行:');
    console.log('- エージェント:', agent);
    console.log('- メッセージ:', message);
    
    // Mastraエージェントを取得
    const selectedAgent = mastra.agents[agent];
    
    if (!selectedAgent) {
      return NextResponse.json({
        success: false,
        error: `エージェント '${agent}' が見つかりません`,
        availableAgents: Object.keys(mastra.agents)
      }, { status: 400 });
    }
    
    // Mastraエージェントのexecuteメソッドを使用
    const result = await selectedAgent.execute({
      prompt: message,
      model: {
        provider: 'deepseek',
        name: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY
      }
    });
    
    console.log('✅ Mastraエージェント実行結果:', result);
    
    return NextResponse.json({
      success: true,
      agent,
      response: result.text || result,
      metadata: result.metadata || {},
      toolsUsed: result.toolCalls || []
    });
    
  } catch (error) {
    console.error('❌ Mastra V2 エラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}

export async function GET() {
  const agents = Object.keys(mastra.agents).map(key => {
    const agent = mastra.agents[key];
    return {
      id: key,
      name: agent.name,
      description: agent.description,
      tools: agent.tools?.map((t: any) => t.name) || []
    };
  });
  
  return NextResponse.json({
    version: 'v2-mastra',
    framework: '@mastra/core',
    agents,
    totalAgents: agents.length,
    examples: [
      "100万円の売上に対する消費税を計算してください",
      "現金で商品を50万円販売した仕訳を作成してください",
      "今月の財務レポートを生成してください"
    ]
  });
}