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
    
    console.log('🤖 Enhanced Mastraエージェントチャット:');
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
        availableAgents: Object.keys(mastra.agents),
        supportedAgents: ['accountingAgent', 'customerAgent', 'japanTaxAgent', 'ocrAgent', 'databaseAgent', 'productAgent', 'accountCodeAgent']
      }, { status: 400 });
    }
    
    // コンテキスト情報を詳細に構築
    let enhancedPrompt = message;
    if (context) {
      const contextInfo = [];
      
      // ページ情報
      if (context.page) contextInfo.push(`現在のページ: ${context.page}`);
      if (context.description) contextInfo.push(`ページコンテキスト: ${context.description}`);
      
      // エンティティ情報
      if (context.entityId) contextInfo.push(`対象ID: ${context.entityId}`);
      if (context.entityType) contextInfo.push(`エンティティタイプ: ${context.entityType}`);
      
      // 利用可能アクション
      if (context.availableActions && context.availableActions.length > 0) {
        contextInfo.push(`利用可能な機能: ${context.availableActions.join(', ')}`);
      }
      
      // データコンテキスト
      if (context.dataContext) {
        const dataInfo = Object.entries(context.dataContext)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join(', ');
        if (dataInfo) {
          contextInfo.push(`データコンテキスト: ${dataInfo}`);
        }
      }
      
      // セッション情報
      if (context.sessionId) contextInfo.push(`セッションID: ${context.sessionId}`);
      
      if (contextInfo.length > 0) {
        enhancedPrompt = `[システムコンテキスト]\n${contextInfo.join('\n')}\n\n[ユーザーのリクエスト]\n${message}\n\n上記のコンテキスト情報を考慮して、最適な支援を提供してください。`;
      }
    }
    
    // エージェントにコンテキストアウェアなタスクを実行させる
    const result = await selectedAgent.execute({
      prompt: enhancedPrompt,
      // DeepSeekの設定を含める
      model: {
        provider: 'deepseek',
        name: 'deepseek-chat',
        apiKey: process.env.DEEPSEEK_API_KEY,
        temperature: 0.1 // 正確性を重視
      },
      // コンテキスト情報をメタデータとして渡す
      metadata: {
        context,
        agent,
        timestamp: new Date().toISOString()
      }
    });
    
    console.log('✅ エージェント応答:', result);
    
    return NextResponse.json({
      success: true,
      agent,
      response: result.text || result,
      metadata: {
        ...result.metadata,
        context,
        processingTime: Date.now(),
        agentCapabilities: selectedAgent.description
      }
    });
    
  } catch (error) {
    console.error('❌ Enhanced Mastraチャットエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET: 強化されたエージェント一覧と機能
export async function GET() {
  try {
    const { mastra } = await getMastra();
    const agents = Object.keys(mastra.agents).map(key => {
      const agent = mastra.agents[key];
      return {
        id: key,
        name: agent.name,
        description: agent.description,
        tools: agent.tools?.map((t: any) => t.name) || [],
        capabilities: agent.instructions ? agent.instructions.split('\n').filter(line => line.includes('・') || line.includes('-')).slice(0, 5) : []
      };
    });
    
    return NextResponse.json({
      agents,
      totalAgents: agents.length,
      enhancedFeatures: [
        'コンテキスト認識機能',
        'ページ別自動エージェント選択',
        'クイックテンプレート機能',
        'チャット履歴管理',
        'リアルタイムデータ連携'
      ],
      agentExamples: {
        accountingAgent: [
          '100万円の売上に対する消費税を計算してください',
          '売掛金10万円の仕訳を作成してください',
          '今月の財務レポートを生成してください'
        ],
        customerAgent: [
          '主要顧客の売上分析を実行してください',
          '未回収の請求書一覧を表示してください',
          '新規顧客を登録したいです'
        ],
        ocrAgent: [
          'この領収書をOCR処理して仕訳を作成してください',
          'アップロードした書類の種別を判定してください'
        ],
        japanTaxAgent: [
          '消費税の特定特殊課税事業者の申告について教えてください',
          '今年度の法人税申告のスケジュールを教えてください'
        ]
      },
      systemInfo: {
        version: '2.0.0',
        lastUpdated: new Date().toISOString(),
        contextAware: true,
        multiAgent: true
      }
    });
  } catch (error) {
    console.error('❌ エージェント情報取得エラー:', error);
    return NextResponse.json({
      error: 'エージェント情報を取得できませんでした',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}