import { NextRequest, NextResponse } from 'next/server';
import { mastraStatsService } from '@/src/services/mastra-stats.service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agent') || undefined;
    const view = searchParams.get('view') || 'summary'; // summary, recent, errors
    
    let response: any = {};
    
    switch (view) {
      case 'summary':
        response = {
          agentStats: mastraStatsService.getAgentStats(agentName),
          timestamp: new Date().toISOString()
        };
        break;
        
      case 'recent':
        const limit = parseInt(searchParams.get('limit') || '50');
        response = {
          recentExecutions: mastraStatsService.getRecentExecutions(limit),
          timestamp: new Date().toISOString()
        };
        break;
        
      case 'errors':
        response = {
          errorStats: mastraStatsService.getErrorStats(),
          timestamp: new Date().toISOString()
        };
        break;
        
      default:
        // 全体的なサマリーを返す
        const allStats = mastraStatsService.getAgentStats();
        const errorStats = mastraStatsService.getErrorStats();
        const recentExecutions = mastraStatsService.getRecentExecutions(10);
        
        response = {
          summary: {
            totalAgents: Object.keys(allStats).length,
            totalExecutions: Object.values(allStats).reduce((sum: number, agent: any) => sum + agent.totalExecutions, 0),
            totalSuccess: Object.values(allStats).reduce((sum: number, agent: any) => sum + agent.successCount, 0),
            totalFailures: Object.values(allStats).reduce((sum: number, agent: any) => sum + agent.failureCount, 0),
            errorRate: errorStats.errorRate
          },
          agentStats: allStats,
          recentExecutions: recentExecutions,
          errorSummary: {
            totalErrors: errorStats.totalErrors,
            errorRate: errorStats.errorRate,
            topErrors: Object.entries(errorStats.errorTypes)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .slice(0, 5)
              .map(([error, count]) => ({ error, count }))
          },
          timestamp: new Date().toISOString()
        };
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    logger.error('Error fetching Mastra stats:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch Mastra statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 統計をクリアするエンドポイント
export async function DELETE(request: NextRequest) {
  try {
    mastraStatsService.clearStats();
    
    return NextResponse.json({
      success: true,
      message: 'Mastra statistics cleared successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error clearing Mastra stats:', error);
    
    return NextResponse.json({
      error: 'Failed to clear Mastra statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}