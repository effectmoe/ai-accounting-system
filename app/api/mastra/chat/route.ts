import { NextRequest, NextResponse } from 'next/server';
import { getMastra, getMastraAgent, registerAgentTools } from '@/src/mastra/server-only';

export const dynamic = 'force-dynamic';

// エージェントツールの登録（初回のみ）
let toolsRegistered = false;
async function ensureToolsRegistered() {
  if (!toolsRegistered) {
    await registerAgentTools();
    toolsRegistered = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    // ツールを登録
    await ensureToolsRegistered();
    
    const { message, agent = 'accountingAgent', context } = await request.json();
    
    console.log('🤖 Mastraエージェントチャット:');
    console.log('- エージェント:', agent);
    console.log('- メッセージ:', message);
    console.log('- コンテキスト:', context);
    
    // Mastraエージェントを取得
    const selectedAgent = await getMastraAgent(agent);
    
    if (!selectedAgent) {
      const { mastra } = await getMastra();
      return NextResponse.json({
        success: false,
        error: `エージェント '${agent}' が見つかりません`,
        availableAgents: Object.keys(mastra.agents)
      }, { status: 400 });
    }
    
    // コンテキスト付きのプロンプトを構築
    let enhancedPrompt = message;
    if (context) {
      const contextInfo = [];
      if (context.page) contextInfo.push(`現在のページ: ${context.page}`);
      if (context.description) contextInfo.push(`コンテキスト: ${context.description}`);
      if (context.entityId) contextInfo.push(`対象ID: ${context.entityId}`);
      if (context.entityType) contextInfo.push(`エンティティタイプ: ${context.entityType}`);
      
      if (contextInfo.length > 0) {
        enhancedPrompt = `[コンテキスト情報]\n${contextInfo.join('\n')}\n\n[ユーザーの質問]\n${message}`;
      }
    }
    
    // エージェントに自然言語でタスクを実行させる
    const result = await selectedAgent.execute({
      prompt: enhancedPrompt,
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
  const { mastra } = await getMastra();
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