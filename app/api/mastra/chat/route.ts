import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 環境変数のチェック
    if (!process.env.DEEPSEEK_API_KEY) {
      console.warn('⚠️ DEEPSEEK_API_KEY is not configured');
      return NextResponse.json({
        success: true,
        response: 'AIアシスタント機能は現在設定中です。基本的な会計機能は通常通りご利用いただけます。',
        agentName: 'system',
        timestamp: new Date().toISOString(),
        metadata: {
          fallback: true,
          reason: 'configuration-pending'
        }
      });
    }
    
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
      
      // API キーエラーまたはMastra初期化エラーの場合
      if (generateError?.message?.includes('DEEPSEEK_API_KEY') || 
          generateError?.message?.includes('API key') ||
          generateError?.message?.includes('init') || 
          generateError?.message?.includes('undefined')) {
        
        // デバッグ用の簡易応答を返す
        const debugResponses: Record<string, string> = {
          'accountingAgent': '現在、会計エージェントは一時的に利用できません。システムの設定を確認中です。',
          'customerAgent': '顧客管理エージェントは現在メンテナンス中です。',
          'ocrAgent': 'OCR処理エージェントは準備中です。',
          'databaseAgent': 'データベースエージェントは設定待ちです。',
          'general': 'AIエージェントは現在利用できません。しばらくお待ちください。'
        };
        
        // 環境変数の確認（デバッグ用）
        const hasApiKey = !!process.env.DEEPSEEK_API_KEY;
        console.log('DeepSeek API key configured:', hasApiKey);
        
        return NextResponse.json({
          success: true,
          response: debugResponses[agentName] || 'エージェントは現在利用できません。',
          agentName: agentName,
          timestamp: new Date().toISOString(),
          metadata: {
            fallback: true,
            reason: hasApiKey ? 'agent-initialization' : 'api-key-missing',
            debug: process.env.NODE_ENV === 'development' ? {
              hasApiKey,
              errorMessage: generateError?.message?.substring(0, 100)
            } : undefined
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