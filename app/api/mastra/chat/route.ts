import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { message, agent = 'accountingAgent' } = await request.json();
    
    console.log('🤖 Mastraエージェントチャット:');
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
    
    // エージェントに自然言語でタスクを実行させる
    const result = await selectedAgent.execute({
      prompt: message,
      // DeepSeekの設定を含める
      model: {
        provider: 'deepseek',
        name: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY
      }
    });
    
    console.log('✅ エージェント応答:', result);
    
    return NextResponse.json({
      success: true,
      agent,
      response: result.text || result,
      metadata: result.metadata || {}
    });
    
  } catch (error) {
    console.error('❌ Mastraチャットエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}

// GET: 利用可能なエージェント一覧
export async function GET() {
  const agents = Object.keys(mastra.agents).map(key => ({
    id: key,
    name: mastra.agents[key].name,
    description: mastra.agents[key].description,
    tools: mastra.agents[key].tools?.map((t: any) => t.name) || []
  }));
  
  return NextResponse.json({
    agents,
    totalAgents: agents.length,
    examples: [
      "100万円の売上に対する消費税を計算してください",
      "売掛金10万円の仕訳を作成してください",
      "今月の財務レポートを生成してください"
    ]
  });
}