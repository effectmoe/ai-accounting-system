import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { messages, agentName = 'accountingAgent' } = await request.json();
    
    console.log('🤖 Mastraエージェントチャット:');
    console.log('- エージェント:', agentName);
    console.log('- メッセージ数:', messages?.length || 0);
    
    // Mastraエージェントを取得
    const agent = mastra.getAgent(agentName);
    
    if (!agent) {
      return NextResponse.json({
        success: false,
        error: `エージェント '${agentName}' が見つかりません`,
        availableAgents: Object.keys(mastra.agents || {})
      }, { status: 400 });
    }
    
    // エージェントでメッセージ処理
    const result = await agent.generate({
      messages: messages
    });
    
    console.log('✅ エージェント応答:', result.text?.substring(0, 100) + '...');
    
    return NextResponse.json({
      success: true,
      response: result.text || result,
      agentName: agentName,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Mastraチャットエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      availableAgents: Object.keys(mastra.agents || {}),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}