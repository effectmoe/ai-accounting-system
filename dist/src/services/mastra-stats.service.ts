import { logger } from '@/lib/logger';

interface MastraExecutionStats {
  agentName: string;
  operation: string;
  success: boolean;
  executionTime: number;
  timestamp: Date;
  error?: string;
}

class MastraStatsService {
  private stats: MastraExecutionStats[] = [];
  private maxStatsSize = 1000; // メモリを節約するため最大1000件まで保持

  /**
   * エージェント実行の統計を記録
   */
  recordExecution(stats: MastraExecutionStats): void {
    this.stats.push(stats);
    
    // 最大件数を超えたら古いものから削除
    if (this.stats.length > this.maxStatsSize) {
      this.stats.shift();
    }
    
    // ログに記録
    if (stats.success) {
      logger.info(`Mastra agent executed successfully: ${stats.agentName}.${stats.operation} (${stats.executionTime}ms)`);
    } else {
      logger.error(`Mastra agent execution failed: ${stats.agentName}.${stats.operation} - ${stats.error}`);
    }
  }

  /**
   * エージェント別の実行統計を取得
   */
  getAgentStats(agentName?: string): any {
    const filteredStats = agentName 
      ? this.stats.filter(s => s.agentName === agentName)
      : this.stats;
    
    // エージェント別に集計
    const agentStats: Record<string, any> = {};
    
    filteredStats.forEach(stat => {
      if (!agentStats[stat.agentName]) {
        agentStats[stat.agentName] = {
          totalExecutions: 0,
          successCount: 0,
          failureCount: 0,
          averageExecutionTime: 0,
          operations: {}
        };
      }
      
      const agent = agentStats[stat.agentName];
      agent.totalExecutions++;
      
      if (stat.success) {
        agent.successCount++;
      } else {
        agent.failureCount++;
      }
      
      // 操作別の統計
      if (!agent.operations[stat.operation]) {
        agent.operations[stat.operation] = {
          count: 0,
          successCount: 0,
          failureCount: 0,
          totalTime: 0,
          averageTime: 0
        };
      }
      
      const operation = agent.operations[stat.operation];
      operation.count++;
      operation.totalTime += stat.executionTime;
      
      if (stat.success) {
        operation.successCount++;
      } else {
        operation.failureCount++;
      }
    });
    
    // 平均実行時間を計算
    Object.values(agentStats).forEach((agent: any) => {
      const totalTime = filteredStats
        .filter(s => s.agentName === agent.agentName && s.success)
        .reduce((sum, s) => sum + s.executionTime, 0);
      
      agent.averageExecutionTime = agent.successCount > 0 
        ? Math.round(totalTime / agent.successCount) 
        : 0;
      
      // 操作別の平均時間を計算
      Object.values(agent.operations).forEach((op: any) => {
        op.averageTime = op.count > 0 
          ? Math.round(op.totalTime / op.count) 
          : 0;
      });
    });
    
    return agentStats;
  }

  /**
   * 最近の実行履歴を取得
   */
  getRecentExecutions(limit: number = 50): MastraExecutionStats[] {
    return this.stats.slice(-limit).reverse();
  }

  /**
   * エラー統計を取得
   */
  getErrorStats(): any {
    const errors = this.stats.filter(s => !s.success);
    
    // エラーの種類別に集計
    const errorTypes: Record<string, number> = {};
    errors.forEach(error => {
      const errorType = error.error || 'Unknown error';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    
    return {
      totalErrors: errors.length,
      errorRate: this.stats.length > 0 
        ? ((errors.length / this.stats.length) * 100).toFixed(2) + '%'
        : '0%',
      errorTypes: errorTypes,
      recentErrors: errors.slice(-10).reverse()
    };
  }

  /**
   * 統計をクリア
   */
  clearStats(): void {
    this.stats = [];
    logger.info('Mastra execution stats cleared');
  }
}

// シングルトンインスタンスをエクスポート
export const mastraStatsService = new MastraStatsService();