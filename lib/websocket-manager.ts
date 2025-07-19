import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { parse } from 'url';

import { logger } from '@/lib/logger';
interface NotificationMessage {
  type: 'progress' | 'status' | 'result' | 'error' | 'log';
  sessionId: string;
  data: any;
  timestamp: Date;
  source?: string;
}

interface WebSocketConnection {
  ws: WebSocket;
  sessionId: string;
  subscriptions: string[];
  lastActivity: Date;
}

interface ProgressUpdate {
  sessionId: string;
  operation: string;
  progress: number; // 0-100
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  data?: any;
  error?: string;
}

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, WebSocketConnection[]> = new Map();
  private server: any = null;
  private port: number;
  private isRunning = false;

  constructor(port: number = 3001) {
    this.port = port;
  }

  /**
   * WebSocketサーバーを開始
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isRunning) {
        resolve();
        return;
      }

      try {
        this.server = createServer();
        this.wss = new WebSocketServer({ server: this.server });

        this.wss.on('connection', (ws, request) => {
          this.handleConnection(ws, request);
        });

        this.server.listen(this.port, () => {
          this.isRunning = true;
          logger.debug(`WebSocket server started on port ${this.port}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          logger.error('WebSocket server error:', error);
          reject(error);
        });

        // 定期的に古い接続をクリーンアップ
        setInterval(() => {
          this.cleanupConnections();
        }, 30000); // 30秒ごと

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * WebSocketサーバーを停止
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isRunning) {
        resolve();
        return;
      }

      // 全接続を閉じる
      this.connections.forEach(connections => {
        connections.forEach(conn => {
          if (conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.close();
          }
        });
      });
      this.connections.clear();

      if (this.wss) {
        this.wss.close(() => {
          if (this.server) {
            this.server.close(() => {
              this.isRunning = false;
              logger.debug('WebSocket server stopped');
              resolve();
            });
          } else {
            this.isRunning = false;
            resolve();
          }
        });
      } else {
        this.isRunning = false;
        resolve();
      }
    });
  }

  /**
   * 新しい接続を処理
   */
  private handleConnection(ws: WebSocket, request: any) {
    const url = parse(request.url, true);
    const sessionId = url.query.sessionId as string || 'default';
    const subscriptions = (url.query.subscribe as string)?.split(',') || ['progress', 'status'];

    const connection: WebSocketConnection = {
      ws,
      sessionId,
      subscriptions,
      lastActivity: new Date(),
    };

    // セッションIDごとに接続を管理
    if (!this.connections.has(sessionId)) {
      this.connections.set(sessionId, []);
    }
    this.connections.get(sessionId)!.push(connection);

    logger.debug(`WebSocket connected: sessionId=${sessionId}, subscriptions=${subscriptions.join(',')}`);

    // 接続確認メッセージを送信
    this.sendToConnection(connection, {
      type: 'status',
      sessionId,
      data: {
        status: 'connected',
        subscriptions,
        serverTime: new Date(),
      },
      timestamp: new Date(),
      source: 'websocket-manager',
    });

    // メッセージ受信処理
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(connection, message);
      } catch (error) {
        logger.error('Invalid WebSocket message:', error);
      }
    });

    // 接続終了処理
    ws.on('close', () => {
      this.removeConnection(sessionId, connection);
      logger.debug(`WebSocket disconnected: sessionId=${sessionId}`);
    });

    // エラー処理
    ws.on('error', (error) => {
      logger.error(`WebSocket error for session ${sessionId}:`, error);
      this.removeConnection(sessionId, connection);
    });

    // Ping/Pong for connection keep-alive
    ws.on('pong', () => {
      connection.lastActivity = new Date();
    });
  }

  /**
   * クライアントからのメッセージを処理
   */
  private handleClientMessage(connection: WebSocketConnection, message: any) {
    connection.lastActivity = new Date();

    switch (message.type) {
      case 'subscribe':
        if (message.topics && Array.isArray(message.topics)) {
          connection.subscriptions = Array.from(new Set([...connection.subscriptions, ...message.topics]));
          this.sendToConnection(connection, {
            type: 'status',
            sessionId: connection.sessionId,
            data: { subscriptions: connection.subscriptions },
            timestamp: new Date(),
            source: 'websocket-manager',
          });
        }
        break;

      case 'unsubscribe':
        if (message.topics && Array.isArray(message.topics)) {
          connection.subscriptions = connection.subscriptions.filter(
            sub => !message.topics.includes(sub)
          );
        }
        break;

      case 'ping':
        this.sendToConnection(connection, {
          type: 'status',
          sessionId: connection.sessionId,
          data: { type: 'pong', serverTime: new Date() },
          timestamp: new Date(),
          source: 'websocket-manager',
        });
        break;

      default:
        logger.warn('Unknown message type:', message.type);
    }
  }

  /**
   * 接続を削除
   */
  private removeConnection(sessionId: string, connection: WebSocketConnection) {
    const connections = this.connections.get(sessionId);
    if (connections) {
      const index = connections.indexOf(connection);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        this.connections.delete(sessionId);
      }
    }
  }

  /**
   * 古い接続をクリーンアップ
   */
  private cleanupConnections() {
    const now = new Date();
    const timeout = 5 * 60 * 1000; // 5分

    this.connections.forEach((connections, sessionId) => {
      const activeConnections = connections.filter(conn => {
        const inactive = now.getTime() - conn.lastActivity.getTime() > timeout;
        const disconnected = conn.ws.readyState !== WebSocket.OPEN;
        
        if (inactive || disconnected) {
          if (conn.ws.readyState === WebSocket.OPEN) {
            conn.ws.close();
          }
          return false;
        }
        
        // Ping to check connection
        if (conn.ws.readyState === WebSocket.OPEN) {
          conn.ws.ping();
        }
        
        return true;
      });

      if (activeConnections.length === 0) {
        this.connections.delete(sessionId);
      } else {
        this.connections.set(sessionId, activeConnections);
      }
    });
  }

  /**
   * 進捗更新を送信
   */
  sendProgress(update: ProgressUpdate) {
    this.broadcast(update.sessionId, {
      type: 'progress',
      sessionId: update.sessionId,
      data: update,
      timestamp: new Date(),
      source: 'problem-solving-agent',
    });
  }

  /**
   * ステータス更新を送信
   */
  sendStatus(sessionId: string, status: any, source?: string) {
    this.broadcast(sessionId, {
      type: 'status',
      sessionId,
      data: status,
      timestamp: new Date(),
      source: source || 'system',
    });
  }

  /**
   * 結果を送信
   */
  sendResult(sessionId: string, result: any, source?: string) {
    this.broadcast(sessionId, {
      type: 'result',
      sessionId,
      data: result,
      timestamp: new Date(),
      source: source || 'system',
    });
  }

  /**
   * エラーを送信
   */
  sendError(sessionId: string, error: any, source?: string) {
    this.broadcast(sessionId, {
      type: 'error',
      sessionId,
      data: error,
      timestamp: new Date(),
      source: source || 'system',
    });
  }

  /**
   * ログメッセージを送信
   */
  sendLog(sessionId: string, log: any, source?: string) {
    this.broadcast(sessionId, {
      type: 'log',
      sessionId,
      data: log,
      timestamp: new Date(),
      source: source || 'system',
    });
  }

  /**
   * 特定のセッションにブロードキャスト
   */
  private broadcast(sessionId: string, message: NotificationMessage) {
    const connections = this.connections.get(sessionId);
    if (!connections || connections.length === 0) {
      return;
    }

    connections.forEach(connection => {
      if (connection.subscriptions.includes(message.type) && 
          connection.ws.readyState === WebSocket.OPEN) {
        this.sendToConnection(connection, message);
      }
    });
  }

  /**
   * 特定の接続にメッセージを送信
   */
  private sendToConnection(connection: WebSocketConnection, message: NotificationMessage) {
    try {
      connection.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send WebSocket message:', error);
      this.removeConnection(connection.sessionId, connection);
    }
  }

  /**
   * 全てのセッションに送信
   */
  broadcastToAll(message: Omit<NotificationMessage, 'sessionId'>) {
    this.connections.forEach((connections, sessionId) => {
      this.broadcast(sessionId, { ...message, sessionId } as NotificationMessage);
    });
  }

  /**
   * アクティブな接続の統計を取得
   */
  getStats() {
    const totalConnections = Array.from(this.connections.values())
      .reduce((sum, connections) => sum + connections.length, 0);
    
    const sessionCount = this.connections.size;
    
    return {
      isRunning: this.isRunning,
      port: this.port,
      totalConnections,
      sessionCount,
      sessions: Array.from(this.connections.entries()).map(([sessionId, connections]) => ({
        sessionId,
        connectionCount: connections.length,
        subscriptions: connections[0]?.subscriptions || [],
      })),
    };
  }
}

// グローバルインスタンス
let globalWebSocketManager: WebSocketManager | null = null;

/**
 * WebSocketマネージャーのシングルトンインスタンスを取得
 */
export function getWebSocketManager(): WebSocketManager {
  if (!globalWebSocketManager) {
    const port = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);
    globalWebSocketManager = new WebSocketManager(port);
  }
  return globalWebSocketManager;
}

/**
 * 進捗更新の簡易ヘルパー
 */
export function updateProgress(sessionId: string, progress: Partial<ProgressUpdate>) {
  const wsManager = getWebSocketManager();
  wsManager.sendProgress({
    sessionId,
    operation: 'unknown',
    progress: 0,
    currentStep: '',
    totalSteps: 1,
    completedSteps: 0,
    status: 'in_progress',
    ...progress,
  });
}

/**
 * WebSocketサーバーを自動開始
 */
export async function startWebSocketServer(): Promise<WebSocketManager> {
  const wsManager = getWebSocketManager();
  if (!wsManager['isRunning']) {
    await wsManager.start();
  }
  return wsManager;
}