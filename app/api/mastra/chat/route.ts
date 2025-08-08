import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, agent: agentName = 'accountingAgent', message, context } = body;
    
    // messagesまたはmessageから統一フォーマットへ変換
    const chatMessages = messages || (message ? [{ role: 'user', content: message }] : []);
    
    console.log('🤖 Mastraエージェントチャット:');
    console.log('- エージェント:', agentName);
    console.log('- メッセージ数:', chatMessages?.length || 0);
    console.log('- コンテキスト:', context);
    
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
    try {
      const result = await agent.generate({
        messages: chatMessages
      });
      
      console.log('✅ エージェント応答:', result.text?.substring(0, 100) + '...');
      
      return NextResponse.json({
        success: true,
        response: result.text || result,
        agentName: agentName,
        timestamp: new Date().toISOString()
      });
    } catch (generateError: any) {
      console.error('❌ エージェント生成エラー:', generateError);
      
      // Mastra初期化エラーの場合、フォールバック応答を返す
      if (generateError?.message?.includes('init') || generateError?.message?.includes('undefined')) {
        const fallbackResponses: Record<string, string> = {
          'accountingAgent': '申し訳ございません。会計システムの初期化中です。しばらくお待ちください。',
          'customerAgent': '顧客管理システムを準備中です。少々お待ちください。',
          'ocrAgent': 'OCR処理システムを初期化中です。',
          'databaseAgent': 'データベース接続を確立中です。',
          'general': 'システムを初期化中です。もう少しお待ちください。'
        };
        
        return NextResponse.json({
          success: true,
          response: fallbackResponses[agentName] || 'システムを準備中です。',
          agentName: agentName,
          timestamp: new Date().toISOString(),
          metadata: {
            fallback: true,
            reason: 'initialization'
          }
        });
      }
      
      throw generateError;
    }
    
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