import { LLMCascadeManager } from './llm-cascade-manager';
import { PerplexityClient } from './perplexity-client';
import { FirecrawlClient } from './firecrawl-client';
import { MLAnalyticsManager } from './ml-analytics-manager';
import { getWebSocketManager } from './websocket-manager';

import { logger } from '@/lib/logger';
interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  message: string;
  details?: any;
  responseTime?: number;
}

interface SystemHealthReport {
  overallStatus: 'healthy' | 'warning' | 'error';
  timestamp: Date;
  components: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    warnings: number;
    errors: number;
  };
  recommendations: string[];
}

export class AgentHealthCheck {
  private llmManager: LLMCascadeManager;
  private perplexityClient: PerplexityClient;
  private firecrawlClient: FirecrawlClient;
  private mlAnalytics: MLAnalyticsManager;

  constructor() {
    this.llmManager = new LLMCascadeManager();
    this.perplexityClient = new PerplexityClient();
    this.firecrawlClient = new FirecrawlClient();
    this.mlAnalytics = new MLAnalyticsManager();
  }

  /**
   * 全システムのヘルスチェックを実行
   */
  async performFullHealthCheck(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    const results: HealthCheckResult[] = [];

    logger.debug('🔍 Starting comprehensive system health check...');

    // 1. LLM Cascade Manager のチェック
    try {
      const llmCheck = await this.checkLLMCascade();
      results.push(llmCheck);
    } catch (error) {
      results.push({
        component: 'LLM Cascade Manager',
        status: 'error',
        message: error instanceof Error ? error.message : 'LLM check failed',
      });
    }

    // 2. Perplexity API のチェック
    try {
      const perplexityCheck = await this.checkPerplexityAPI();
      results.push(perplexityCheck);
    } catch (error) {
      results.push({
        component: 'Perplexity API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Perplexity check failed',
      });
    }

    // 3. Firecrawl API のチェック
    try {
      const firecrawlCheck = await this.checkFirecrawlAPI();
      results.push(firecrawlCheck);
    } catch (error) {
      results.push({
        component: 'Firecrawl API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Firecrawl check failed',
      });
    }

    // 4. ML Analytics のチェック
    try {
      const mlCheck = await this.checkMLAnalytics();
      results.push(mlCheck);
    } catch (error) {
      results.push({
        component: 'ML Analytics',
        status: 'error',
        message: error instanceof Error ? error.message : 'ML Analytics check failed',
      });
    }

    // 5. WebSocket Manager のチェック
    try {
      const wsCheck = await this.checkWebSocketManager();
      results.push(wsCheck);
    } catch (error) {
      results.push({
        component: 'WebSocket Manager',
        status: 'error',
        message: error instanceof Error ? error.message : 'WebSocket check failed',
      });
    }

    // 6. Database Connection のチェック
    try {
      const dbCheck = await this.checkDatabaseConnection();
      results.push(dbCheck);
    } catch (error) {
      results.push({
        component: 'Database Connection',
        status: 'error',
        message: error instanceof Error ? error.message : 'Database check failed',
      });
    }

    // 7. Environment Variables のチェック
    const envCheck = this.checkEnvironmentVariables();
    results.push(envCheck);

    // 結果の集計
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      warnings: results.filter(r => r.status === 'warning').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    // 全体ステータスの決定
    let overallStatus: 'healthy' | 'warning' | 'error';
    if (summary.errors > 0) {
      overallStatus = 'error';
    } else if (summary.warnings > 0) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'healthy';
    }

    // 推奨事項の生成
    const recommendations = this.generateRecommendations(results);

    const totalTime = Date.now() - startTime;
    logger.debug(`✅ Health check completed in ${totalTime}ms`);

    return {
      overallStatus,
      timestamp: new Date(),
      components: results,
      summary,
      recommendations,
    };
  }

  /**
   * LLM Cascade Manager のヘルスチェック
   */
  private async checkLLMCascade(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const providers = this.llmManager.getProviderStatus();
      const availableProviders = providers.filter(p => p.available);

      if (availableProviders.length === 0) {
        return {
          component: 'LLM Cascade Manager',
          status: 'error',
          message: 'No LLM providers available',
          details: { providers },
          responseTime: Date.now() - startTime,
        };
      }

      // 簡単なテスト実行
      const testResponse = await this.llmManager.generateText(
        'Say "Hello" in Japanese.',
        'You are a helpful assistant.'
      );

      if (testResponse.length > 0) {
        return {
          component: 'LLM Cascade Manager',
          status: 'healthy',
          message: `${availableProviders.length} provider(s) available and responsive`,
          details: {
            availableProviders: availableProviders.map(p => p.name),
            testResponse: testResponse.substring(0, 50),
          },
          responseTime: Date.now() - startTime,
        };
      } else {
        return {
          component: 'LLM Cascade Manager',
          status: 'warning',
          message: 'Providers available but response empty',
          details: { providers },
          responseTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      return {
        component: 'LLM Cascade Manager',
        status: 'error',
        message: error instanceof Error ? error.message : 'LLM test failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Perplexity API のヘルスチェック
   */
  private async checkPerplexityAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const testResult = await this.perplexityClient.testConnection();

      if (testResult.available) {
        return {
          component: 'Perplexity API',
          status: 'healthy',
          message: 'API connection successful',
          details: {
            model: testResult.model,
          },
          responseTime: Date.now() - startTime,
        };
      } else {
        return {
          component: 'Perplexity API',
          status: 'warning',
          message: testResult.error || 'API not available',
          responseTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      return {
        component: 'Perplexity API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection test failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Firecrawl API のヘルスチェック
   */
  private async checkFirecrawlAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const testResult = await this.firecrawlClient.testConnection();

      if (testResult.available) {
        return {
          component: 'Firecrawl API',
          status: 'healthy',
          message: 'API connection successful',
          responseTime: Date.now() - startTime,
        };
      } else {
        return {
          component: 'Firecrawl API',
          status: 'warning',
          message: testResult.error || 'API not available',
          responseTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      return {
        component: 'Firecrawl API',
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection test failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * ML Analytics のヘルスチェック
   */
  private async checkMLAnalytics(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const healthCheck = await this.mlAnalytics.healthCheck();

      if (healthCheck.available) {
        return {
          component: 'ML Analytics',
          status: 'healthy',
          message: 'ML capabilities available',
          details: {
            capabilities: healthCheck.capabilities,
            performance: healthCheck.performance,
          },
          responseTime: Date.now() - startTime,
        };
      } else {
        return {
          component: 'ML Analytics',
          status: 'error',
          message: healthCheck.error || 'ML Analytics not available',
          responseTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      return {
        component: 'ML Analytics',
        status: 'error',
        message: error instanceof Error ? error.message : 'ML health check failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * WebSocket Manager のヘルスチェック
   */
  private async checkWebSocketManager(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const wsManager = getWebSocketManager();
      const stats = wsManager.getStats();

      if (stats.isRunning) {
        return {
          component: 'WebSocket Manager',
          status: 'healthy',
          message: 'WebSocket server running',
          details: stats,
          responseTime: Date.now() - startTime,
        };
      } else {
        // WebSocketサーバーの開始を試行
        try {
          await wsManager.start();
          const newStats = wsManager.getStats();
          
          return {
            component: 'WebSocket Manager',
            status: 'healthy',
            message: 'WebSocket server started successfully',
            details: newStats,
            responseTime: Date.now() - startTime,
          };
        } catch (startError) {
          return {
            component: 'WebSocket Manager',
            status: 'warning',
            message: 'WebSocket server not running and failed to start',
            details: { error: startError instanceof Error ? startError.message : 'Unknown error' },
            responseTime: Date.now() - startTime,
          };
        }
      }
    } catch (error) {
      return {
        component: 'WebSocket Manager',
        status: 'error',
        message: error instanceof Error ? error.message : 'WebSocket check failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * データベース接続のヘルスチェック
   */
  private async checkDatabaseConnection(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // MongoDB接続テスト（DatabaseServiceを使用）
      const { DatabaseService } = await import('./mongodb-client');
      const db = DatabaseService.getInstance();
      
      // 簡単なクエリでDB接続をテスト
      const testResult = await db.findMany('audit_logs', {}, { limit: 1 });
      
      return {
        component: 'Database Connection',
        status: 'healthy',
        message: 'MongoDB connection successful',
        details: {
          connectionType: 'MongoDB Atlas',
          testQueryResult: testResult.length,
        },
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        component: 'Database Connection',
        status: 'error',
        message: error instanceof Error ? error.message : 'Database connection failed',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 環境変数のチェック
   */
  private checkEnvironmentVariables(): HealthCheckResult {
    const requiredVars = [
      'MONGODB_URI',
      'DEEPSEEK_API_KEY',
    ];

    const optionalVars = [
      'ANTHROPIC_API_KEY',
      'OPENAI_API_KEY',
      'PERPLEXITY_API_KEY',
      'FIRECRAWL_API_KEY',
      'WEBSOCKET_PORT',
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);
    const optionalMissing = optionalVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      return {
        component: 'Environment Variables',
        status: 'error',
        message: `Required environment variables missing: ${missing.join(', ')}`,
        details: {
          missing,
          optionalMissing,
          configured: requiredVars.filter(varName => process.env[varName]),
        },
      };
    } else if (optionalMissing.length > 0) {
      return {
        component: 'Environment Variables',
        status: 'warning',
        message: `Some optional features unavailable due to missing environment variables`,
        details: {
          optionalMissing,
          configured: [...requiredVars, ...optionalVars].filter(varName => process.env[varName]),
        },
      };
    } else {
      return {
        component: 'Environment Variables',
        status: 'healthy',
        message: 'All environment variables configured',
        details: {
          configured: [...requiredVars, ...optionalVars],
        },
      };
    }
  }

  /**
   * 推奨事項の生成
   */
  private generateRecommendations(results: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];

    const errorComponents = results.filter(r => r.status === 'error');
    const warningComponents = results.filter(r => r.status === 'warning');

    if (errorComponents.length > 0) {
      recommendations.push(`緊急: ${errorComponents.length}個のコンポーネントでエラーが発生しています`);
      errorComponents.forEach(comp => {
        recommendations.push(`- ${comp.component}: ${comp.message}`);
      });
    }

    if (warningComponents.length > 0) {
      recommendations.push(`注意: ${warningComponents.length}個のコンポーネントで警告があります`);
      warningComponents.forEach(comp => {
        recommendations.push(`- ${comp.component}: ${comp.message}`);
      });
    }

    // パフォーマンス推奨
    const slowComponents = results.filter(r => r.responseTime && r.responseTime > 5000);
    if (slowComponents.length > 0) {
      recommendations.push('パフォーマンス: 以下のコンポーネントが遅いです');
      slowComponents.forEach(comp => {
        recommendations.push(`- ${comp.component}: ${comp.responseTime}ms`);
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 全てのコンポーネントが正常に動作しています');
      recommendations.push('定期的なヘルスチェックを継続してください');
    }

    return recommendations;
  }

  /**
   * クイックヘルスチェック（軽量版）
   */
  async performQuickHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    message: string;
    componentCount: number;
    healthyCount: number;
  }> {
    try {
      const fullReport = await this.performFullHealthCheck();
      
      return {
        status: fullReport.overallStatus,
        message: `${fullReport.summary.healthy}/${fullReport.summary.total} components healthy`,
        componentCount: fullReport.summary.total,
        healthyCount: fullReport.summary.healthy,
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Health check failed',
        componentCount: 0,
        healthyCount: 0,
      };
    }
  }

  /**
   * コンポーネント別詳細ヘルスチェック
   */
  async checkComponent(componentName: string): Promise<HealthCheckResult | null> {
    const fullReport = await this.performFullHealthCheck();
    return fullReport.components.find(comp => 
      comp.component.toLowerCase().includes(componentName.toLowerCase())
    ) || null;
  }
}

// シングルトンインスタンス
let globalHealthChecker: AgentHealthCheck | null = null;

export function getHealthChecker(): AgentHealthCheck {
  if (!globalHealthChecker) {
    globalHealthChecker = new AgentHealthCheck();
  }
  return globalHealthChecker;
}

// 便利な関数をエクスポート
export async function quickHealthCheck() {
  const checker = getHealthChecker();
  return await checker.performQuickHealthCheck();
}

export async function fullHealthCheck() {
  const checker = getHealthChecker();
  return await checker.performFullHealthCheck();
}