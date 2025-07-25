import { NextRequest, NextResponse } from 'next/server';
import { mastra } from '@/src/mastra';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Mastraエージェントの状態を確認
    const agents = await mastra.getAgents();
    const agentNames = Object.keys(agents);
    const agentCount = agentNames.length;
    
    // 各エージェントの詳細情報を取得
    const agentDetails = agentNames.map(name => {
      const agent = agents[name];
      return {
        name: name,
        description: agent.description || 'No description',
        model: agent.model || 'Not specified',
        toolCount: Array.isArray(agent.tools) ? agent.tools.length : 0,
        tools: Array.isArray(agent.tools) ? agent.tools.map((tool: any) => tool.name || tool) : []
      };
    });
    
    // システムステータスを構築
    const status = {
      healthy: agentCount === 11, // 11個のエージェントが期待される
      timestamp: new Date().toISOString(),
      processingTime: Date.now() - startTime,
      mastra: {
        status: agentCount > 0 ? 'operational' : 'degraded',
        agentCount: agentCount,
        expectedAgentCount: 11,
        agents: agentDetails
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasMongoDbUri: !!process.env.MONGODB_URI,
        hasOpenAiKey: !!process.env.OPENAI_API_KEY,
        hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        hasAzureFormRecognizer: !!process.env.AZURE_FORM_RECOGNIZER_KEY
      },
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
        arrayBuffers: process.memoryUsage().arrayBuffers
      },
      uptime: process.uptime()
    };
    
    // ステータスコードを決定
    const statusCode = status.healthy ? 200 : 503;
    
    logger.info(`Mastra health check completed in ${status.processingTime}ms`);
    
    return NextResponse.json(status, { status: statusCode });
    
  } catch (error) {
    logger.error('Error performing Mastra health check:', error);
    
    return NextResponse.json({
      healthy: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      mastra: {
        status: 'error',
        agentCount: 0,
        expectedAgentCount: 11
      }
    }, { status: 503 });
  }
}