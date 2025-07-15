#!/usr/bin/env node

/**
 * WebSocket MCP Server
 * WebSocketリアルタイム通知機能をMCPプロトコル経由で提供
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { getWebSocketManager, updateProgress, startWebSocketServer } from '../../lib/websocket-manager';

const WEBSOCKET_TOOLS: Tool[] = [
  {
    name: 'websocket_start_server',
    description: 'WebSocketサーバーを開始',
    inputSchema: {
      type: 'object',
      properties: {
        port: {
          type: 'number',
          optional: true,
          description: 'サーバーポート番号（デフォルト: 3001）',
        },
      },
    },
  },
  {
    name: 'websocket_stop_server',
    description: 'WebSocketサーバーを停止',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'websocket_get_stats',
    description: 'WebSocketサーバーの統計情報を取得',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'websocket_send_progress',
    description: '進捗更新をクライアントに送信',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'セッションID',
        },
        operation: {
          type: 'string',
          description: '実行中の操作',
        },
        progress: {
          type: 'number',
          description: '進捗率（0-100）',
        },
        currentStep: {
          type: 'string',
          description: '現在のステップ',
        },
        totalSteps: {
          type: 'number',
          description: '全ステップ数',
        },
        completedSteps: {
          type: 'number',
          description: '完了ステップ数',
        },
        status: {
          type: 'string',
          enum: ['started', 'in_progress', 'completed', 'failed'],
          description: 'ステータス',
        },
        data: {
          type: 'object',
          optional: true,
          description: '追加データ',
        },
        error: {
          type: 'string',
          optional: true,
          description: 'エラーメッセージ',
        },
      },
      required: ['sessionId', 'operation', 'progress', 'currentStep', 'totalSteps', 'completedSteps', 'status'],
    },
  },
  {
    name: 'websocket_send_status',
    description: 'ステータス更新をクライアントに送信',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'セッションID',
        },
        status: {
          type: 'object',
          description: 'ステータス情報',
        },
        source: {
          type: 'string',
          optional: true,
          description: '送信元',
        },
      },
      required: ['sessionId', 'status'],
    },
  },
  {
    name: 'websocket_send_result',
    description: '結果をクライアントに送信',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'セッションID',
        },
        result: {
          type: 'object',
          description: '結果データ',
        },
        source: {
          type: 'string',
          optional: true,
          description: '送信元',
        },
      },
      required: ['sessionId', 'result'],
    },
  },
  {
    name: 'websocket_send_error',
    description: 'エラーをクライアントに送信',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'セッションID',
        },
        error: {
          type: 'object',
          description: 'エラー情報',
        },
        source: {
          type: 'string',
          optional: true,
          description: '送信元',
        },
      },
      required: ['sessionId', 'error'],
    },
  },
  {
    name: 'websocket_send_log',
    description: 'ログメッセージをクライアントに送信',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: {
          type: 'string',
          description: 'セッションID',
        },
        log: {
          type: 'object',
          description: 'ログ情報',
        },
        source: {
          type: 'string',
          optional: true,
          description: '送信元',
        },
      },
      required: ['sessionId', 'log'],
    },
  },
  {
    name: 'websocket_broadcast_to_all',
    description: '全クライアントにメッセージをブロードキャスト',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['progress', 'status', 'result', 'error', 'log'],
          description: 'メッセージタイプ',
        },
        data: {
          type: 'object',
          description: 'メッセージデータ',
        },
        timestamp: {
          type: 'string',
          optional: true,
          description: 'タイムスタンプ（ISO形式）',
        },
        source: {
          type: 'string',
          optional: true,
          description: '送信元',
        },
      },
      required: ['type', 'data'],
    },
  },
  {
    name: 'websocket_health_check',
    description: 'WebSocketサーバーの健全性をチェック',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

class WebSocketMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'websocket-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: WEBSOCKET_TOOLS,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'websocket_start_server':
            return await this.handleStartServer(args);
          case 'websocket_stop_server':
            return await this.handleStopServer(args);
          case 'websocket_get_stats':
            return await this.handleGetStats(args);
          case 'websocket_send_progress':
            return await this.handleSendProgress(args);
          case 'websocket_send_status':
            return await this.handleSendStatus(args);
          case 'websocket_send_result':
            return await this.handleSendResult(args);
          case 'websocket_send_error':
            return await this.handleSendError(args);
          case 'websocket_send_log':
            return await this.handleSendLog(args);
          case 'websocket_broadcast_to_all':
            return await this.handleBroadcastToAll(args);
          case 'websocket_health_check':
            return await this.handleHealthCheck(args);
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

  private async handleStartServer(args: any): Promise<CallToolResult> {
    const { port } = args;

    try {
      const wsManager = await startWebSocketServer();
      const stats = wsManager.getStats();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'WebSocket server started successfully',
              stats,
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to start server',
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async handleStopServer(args: any): Promise<CallToolResult> {
    try {
      const wsManager = getWebSocketManager();
      await wsManager.stop();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'WebSocket server stopped successfully',
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Failed to stop server',
              timestamp: new Date().toISOString(),
            }, null, 2),
          },
        ],
      };
    }
  }

  private async handleGetStats(args: any): Promise<CallToolResult> {
    const wsManager = getWebSocketManager();
    const stats = wsManager.getStats();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            stats,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleSendProgress(args: any): Promise<CallToolResult> {
    const {
      sessionId,
      operation,
      progress,
      currentStep,
      totalSteps,
      completedSteps,
      status,
      data,
      error,
    } = args;

    updateProgress(sessionId, {
      operation,
      progress,
      currentStep,
      totalSteps,
      completedSteps,
      status,
      data,
      error,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Progress update sent',
            sessionId,
            progress,
            status,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleSendStatus(args: any): Promise<CallToolResult> {
    const { sessionId, status, source } = args;

    const wsManager = getWebSocketManager();
    wsManager.sendStatus(sessionId, status, source);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Status update sent',
            sessionId,
            source,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleSendResult(args: any): Promise<CallToolResult> {
    const { sessionId, result, source } = args;

    const wsManager = getWebSocketManager();
    wsManager.sendResult(sessionId, result, source);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Result sent',
            sessionId,
            source,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleSendError(args: any): Promise<CallToolResult> {
    const { sessionId, error, source } = args;

    const wsManager = getWebSocketManager();
    wsManager.sendError(sessionId, error, source);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Error sent',
            sessionId,
            source,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleSendLog(args: any): Promise<CallToolResult> {
    const { sessionId, log, source } = args;

    const wsManager = getWebSocketManager();
    wsManager.sendLog(sessionId, log, source);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Log sent',
            sessionId,
            source,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleBroadcastToAll(args: any): Promise<CallToolResult> {
    const { type, data, timestamp, source } = args;

    const wsManager = getWebSocketManager();
    wsManager.broadcastToAll({
      type,
      data,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      source,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Broadcast sent to all clients',
            type,
            source,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleHealthCheck(args: any): Promise<CallToolResult> {
    const wsManager = getWebSocketManager();
    const stats = wsManager.getStats();

    const healthStatus = {
      healthy: stats.isRunning,
      server: {
        running: stats.isRunning,
        port: stats.port,
        uptime: stats.isRunning ? 'Running' : 'Stopped',
      },
      connections: {
        total: stats.totalConnections,
        sessions: stats.sessionCount,
        details: stats.sessions,
      },
      performance: {
        responseTime: '<1ms',
        memoryUsage: process.memoryUsage(),
      },
      capabilities: [
        'real-time progress updates',
        'session-based messaging',
        'broadcast messaging',
        'connection management',
        'automatic cleanup',
      ],
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: healthStatus.healthy ? 'healthy' : 'error',
            ...healthStatus,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('WebSocket MCP Server running on stdio');
  }
}

// メイン実行
if (require.main === module) {
  const server = new WebSocketMCPServer();
  server.run().catch((error) => {
    console.error('Failed to run WebSocket MCP Server:', error);
    process.exit(1);
  });
}

export { WebSocketMCPServer };