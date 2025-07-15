#!/usr/bin/env node

/**
 * ML Analytics MCP Server
 * 機械学習分析機能をMCPプロトコル経由で提供
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { MLAnalyticsManager } from '../../lib/ml-analytics-manager';

const ML_ANALYTICS_TOOLS: Tool[] = [
  {
    name: 'ml_analyze',
    description: '機械学習を使用したデータ分析（分類、異常検知、予測、クラスタリング等）',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: 'ML分析対象のデータポイント',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              timestamp: { type: 'string' },
              features: { 
                type: 'object',
                additionalProperties: { type: 'number' }
              },
              label: { type: 'string', optional: true },
              metadata: { type: 'object', optional: true },
            },
            required: ['id', 'timestamp', 'features'],
          },
        },
        analysisType: {
          type: 'string',
          enum: ['classification', 'anomaly_detection', 'pattern_recognition', 'prediction', 'time_series', 'clustering'],
          description: '分析種類',
        },
        parameters: {
          type: 'object',
          optional: true,
          properties: {
            targetFeature: { type: 'string', optional: true },
            anomalyThreshold: { type: 'number', optional: true },
            numberOfClusters: { type: 'number', optional: true },
            predictionHorizon: { type: 'number', optional: true },
            seasonality: { 
              type: 'string', 
              enum: ['daily', 'weekly', 'monthly', 'yearly', 'none'],
              optional: true 
            },
          },
        },
      },
      required: ['data', 'analysisType'],
    },
  },
  {
    name: 'ml_health_check',
    description: 'ML Analytics システムの健全性をチェック',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'ml_quick_analysis',
    description: 'データの簡易ML分析（異常検知 + 基本統計）',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: '分析対象データ',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              timestamp: { type: 'string' },
              features: { 
                type: 'object',
                additionalProperties: { type: 'number' }
              },
            },
            required: ['id', 'timestamp', 'features'],
          },
        },
        anomalyThreshold: {
          type: 'number',
          optional: true,
          description: '異常検知閾値（デフォルト: 2.0）',
        },
      },
      required: ['data'],
    },
  },
  {
    name: 'ml_predict',
    description: '時系列データの予測分析',
    inputSchema: {
      type: 'object',
      properties: {
        historicalData: {
          type: 'array',
          description: '履歴データ',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string' },
              value: { type: 'number' },
            },
            required: ['timestamp', 'value'],
          },
        },
        predictionHorizon: {
          type: 'number',
          description: '予測期間',
          default: 7,
        },
        includeConfidenceInterval: {
          type: 'boolean',
          description: '信頼区間を含めるか',
          default: true,
        },
      },
      required: ['historicalData'],
    },
  },
  {
    name: 'ml_detect_anomalies',
    description: 'データの異常検知',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: '検査対象データ',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              timestamp: { type: 'string' },
              features: { 
                type: 'object',
                additionalProperties: { type: 'number' }
              },
            },
            required: ['id', 'timestamp', 'features'],
          },
        },
        threshold: {
          type: 'number',
          description: '異常検知閾値（1-5）',
          default: 2.0,
        },
        method: {
          type: 'string',
          enum: ['statistical', 'isolation_forest', 'one_class_svm'],
          description: '異常検知手法',
          default: 'statistical',
        },
      },
      required: ['data'],
    },
  },
  {
    name: 'ml_cluster',
    description: 'データのクラスタリング分析',
    inputSchema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: 'クラスタリング対象データ',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              features: { 
                type: 'object',
                additionalProperties: { type: 'number' }
              },
            },
            required: ['id', 'features'],
          },
        },
        numberOfClusters: {
          type: 'number',
          description: 'クラスター数（2-10）',
          default: 3,
        },
        method: {
          type: 'string',
          enum: ['kmeans', 'hierarchical', 'dbscan'],
          description: 'クラスタリング手法',
          default: 'kmeans',
        },
      },
      required: ['data'],
    },
  },
];

class MLAnalyticsMCPServer {
  private server: Server;
  private mlAnalytics: MLAnalyticsManager;

  constructor() {
    this.server = new Server(
      {
        name: 'ml-analytics-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.mlAnalytics = new MLAnalyticsManager();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: ML_ANALYTICS_TOOLS,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'ml_analyze':
            return await this.handleMLAnalyze(args);
          case 'ml_health_check':
            return await this.handleHealthCheck(args);
          case 'ml_quick_analysis':
            return await this.handleQuickAnalysis(args);
          case 'ml_predict':
            return await this.handlePredict(args);
          case 'ml_detect_anomalies':
            return await this.handleDetectAnomalies(args);
          case 'ml_cluster':
            return await this.handleCluster(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleMLAnalyze(args: any): Promise<CallToolResult> {
    const { data, analysisType, parameters } = args;

    const result = await this.mlAnalytics.analyze({
      data,
      analysisType,
      parameters,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            analysisType: result.analysisType,
            results: result.results,
            insights: result.insights,
            recommendations: result.recommendations,
            metadata: result.metadata,
            error: result.error,
          }, null, 2),
        },
      ],
    };
  }

  private async handleHealthCheck(args: any): Promise<CallToolResult> {
    const result = await this.mlAnalytics.healthCheck();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            available: result.available,
            capabilities: result.capabilities,
            performance: result.performance,
            error: result.error,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleQuickAnalysis(args: any): Promise<CallToolResult> {
    const { data, anomalyThreshold = 2.0 } = args;

    // 異常検知分析
    const anomalyResult = await this.mlAnalytics.analyze({
      data,
      analysisType: 'anomaly_detection',
      parameters: {
        anomalyThreshold,
        anomalyMethod: 'statistical',
      },
    });

    // 基本統計の計算
    const values = data.flatMap((item: any) => Object.values(item.features));
    const basicStats = {
      count: values.length,
      mean: values.reduce((sum: number, val: number) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            summary: 'Quick ML Analysis Results',
            dataPoints: data.length,
            basicStats,
            anomalyDetection: {
              anomaliesFound: anomalyResult.results.anomalies?.filter((a: any) => a.isAnomaly).length || 0,
              threshold: anomalyThreshold,
              insights: anomalyResult.insights,
            },
            recommendations: anomalyResult.recommendations,
          }, null, 2),
        },
      ],
    };
  }

  private async handlePredict(args: any): Promise<CallToolResult> {
    const { historicalData, predictionHorizon = 7, includeConfidenceInterval = true } = args;

    // 時系列データを変換
    const timeSeriesData = historicalData.map((item: any, index: number) => ({
      id: `ts_${index}`,
      timestamp: new Date(item.timestamp),
      features: { value: item.value },
    }));

    const result = await this.mlAnalytics.analyze({
      data: timeSeriesData,
      analysisType: 'prediction',
      parameters: {
        predictionHorizon,
        predictionMethod: 'linear_regression',
      },
    });

    const predictions = result.results.predictions || [];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            historicalDataPoints: historicalData.length,
            predictionHorizon,
            predictions: predictions.map((p: any) => ({
              timestamp: p.timestamp,
              predictedValue: p.predictedValue,
              confidence: p.confidence,
              bounds: includeConfidenceInterval ? p.bounds : undefined,
            })),
            insights: result.insights,
            recommendations: result.recommendations,
          }, null, 2),
        },
      ],
    };
  }

  private async handleDetectAnomalies(args: any): Promise<CallToolResult> {
    const { data, threshold = 2.0, method = 'statistical' } = args;

    const result = await this.mlAnalytics.analyze({
      data,
      analysisType: 'anomaly_detection',
      parameters: {
        anomalyThreshold: threshold,
        anomalyMethod: method,
      },
    });

    const anomalies = result.results.anomalies || [];
    const detectedAnomalies = anomalies.filter((a: any) => a.isAnomaly);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            totalDataPoints: data.length,
            anomaliesDetected: detectedAnomalies.length,
            anomalyRate: `${((detectedAnomalies.length / data.length) * 100).toFixed(1)}%`,
            threshold,
            method,
            anomalies: detectedAnomalies.slice(0, 10), // 上位10件
            insights: result.insights,
            recommendations: result.recommendations,
          }, null, 2),
        },
      ],
    };
  }

  private async handleCluster(args: any): Promise<CallToolResult> {
    const { data, numberOfClusters = 3, method = 'kmeans' } = args;

    const clusterData = data.map((item: any, index: number) => ({
      id: item.id,
      timestamp: new Date(),
      features: item.features,
    }));

    const result = await this.mlAnalytics.analyze({
      data: clusterData,
      analysisType: 'clustering',
      parameters: {
        numberOfClusters,
        clusteringMethod: method,
      },
    });

    const clusters = result.results.clusters || [];

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            dataPoints: data.length,
            numberOfClusters,
            method,
            clusters: clusters.map((cluster: any) => ({
              clusterId: cluster.clusterId,
              memberCount: cluster.members.length,
              center: cluster.center,
              characteristics: cluster.characteristics,
              sampleMembers: cluster.members.slice(0, 3),
            })),
            insights: result.insights,
            recommendations: result.recommendations,
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('ML Analytics MCP Server running on stdio');
  }
}

// メイン実行
if (require.main === module) {
  const server = new MLAnalyticsMCPServer();
  server.run().catch((error) => {
    console.error('Failed to run ML Analytics MCP Server:', error);
    process.exit(1);
  });
}

export { MLAnalyticsMCPServer };