import { logger } from '@/lib/logger';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * MCPサーバー設定インターフェース
 */
export interface MCPServer {
  /** サーバー名（一意の識別子） */
  name: string;
  /** 実行コマンド */
  command: string;
  /** コマンドライン引数 */
  args?: string[];
  /** 環境変数 */
  env?: Record<string, string>;
}

/**
 * MCPツール呼び出し結果
 */
export interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * MCPエラークラス
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public readonly serverName?: string,
    public readonly toolName?: string,
    public readonly originalError?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * MCPクライアントクラス
 * Model Context Protocol (MCP) サーバーとの通信を管理
 */
export class MCPClient {
  private clients = new Map<string, Client>();
  private transports = new Map<string, StdioClientTransport>();
  
  // クライアント設定
  private readonly clientInfo = {
    name: 'mastra-mcp-client',
    version: '1.0.0',
  };

  /**
   * MCPサーバーに接続
   * @param server サーバー設定
   * @throws {MCPError} 接続エラー
   */
  async connect(server: MCPServer): Promise<void> {
    if (this.clients.has(server.name)) {
      logger.warn(`[MCPClient] ${server.name}は既に接続されています`);
      return;
    }

    try {
      logger.info(`[MCPClient] ${server.name}に接続中...`);

      // トランスポートを作成
      const transport = this.createTransport(server);
      
      // クライアントを作成
      const client = this.createClient(server.name);

      // 接続を確立
      await client.connect(transport);
      
      // 接続を保存
      this.clients.set(server.name, client);
      this.transports.set(server.name, transport);
      
      logger.info(`[MCPClient] ${server.name}への接続に成功`);
    } catch (error) {
      const mcpError = new MCPError(
        `${server.name}への接続に失敗しました`,
        server.name,
        undefined,
        error
      );
      logger.error(`[MCPClient] 接続エラー:`, mcpError);
      throw mcpError;
    }
  }

  /**
   * トランスポートを作成
   * @param server サーバー設定
   * @returns StdioClientTransport インスタンス
   */
  private createTransport(server: MCPServer): StdioClientTransport {
    return new StdioClientTransport({
      command: server.command,
      args: server.args || [],
      env: {
        ...process.env,
        ...server.env,
      },
    });
  }

  /**
   * クライアントを作成
   * @param serverName サーバー名
   * @returns Client インスタンス
   */
  private createClient(serverName: string): Client {
    return new Client(
      {
        ...this.clientInfo,
        name: `${this.clientInfo.name}-${serverName}`,
      },
      {
        capabilities: {
          tools: {},
          sampling: {},
        },
      }
    );
  }

  /**
   * ツールを呼び出す
   * @param serverName サーバー名
   * @param toolName ツール名
   * @param args ツール引数
   * @returns ツール実行結果
   * @throws {MCPError} ツール呼び出しエラー
   */
  async callTool(serverName: string, toolName: string, args: any): Promise<any> {
    const client = this.getClient(serverName);
    
    try {
      logger.debug(`[MCPClient] ${serverName}.${toolName}を呼び出し中:`, args);
      
      const result = await client.callTool({
        name: toolName,
        arguments: args,
      });

      // 結果を検証
      const parsed = CallToolResultSchema.safeParse(result);
      if (!parsed.success) {
        throw new MCPError(
          '無効なツール結果',
          serverName,
          toolName,
          parsed.error
        );
      }

      // エラーチェック
      if (parsed.data.isError) {
        const errorMessage = this.extractErrorMessage(parsed.data.content);
        throw new MCPError(errorMessage, serverName, toolName);
      }

      // コンテンツを抽出
      return this.extractContent(parsed.data.content);
    } catch (error) {
      if (error instanceof MCPError) {
        throw error;
      }
      
      const mcpError = new MCPError(
        `ツール呼び出しエラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        serverName,
        toolName,
        error
      );
      logger.error(`[MCPClient] ツール呼び出しエラー:`, mcpError);
      throw mcpError;
    }
  }

  /**
   * 利用可能なツールをリスト
   * @param serverName サーバー名
   * @returns ツールのリスト
   * @throws {MCPError} リスト取得エラー
   */
  async listTools(serverName: string): Promise<Tool[]> {
    const client = this.getClient(serverName);
    
    try {
      const result = await client.listTools();
      return result.tools || [];
    } catch (error) {
      const mcpError = new MCPError(
        'ツールリストの取得に失敗',
        serverName,
        undefined,
        error
      );
      logger.error(`[MCPClient] ツールリスト取得エラー:`, mcpError);
      throw mcpError;
    }
  }

  /**
   * サーバーから切断
   * @param serverName サーバー名
   */
  async disconnect(serverName: string): Promise<void> {
    try {
      const client = this.clients.get(serverName);
      const transport = this.transports.get(serverName);

      if (client) {
        await client.close();
        this.clients.delete(serverName);
      }

      if (transport) {
        await transport.close();
        this.transports.delete(serverName);
      }

      logger.info(`[MCPClient] ${serverName}から切断しました`);
    } catch (error) {
      logger.error(`[MCPClient] ${serverName}の切断中にエラー:`, error);
      // 切断エラーは無視（リソースのクリーンアップを継続）
    }
  }

  /**
   * すべてのサーバーから切断
   */
  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.clients.keys());
    
    // 並列で切断を実行
    await Promise.allSettled(
      serverNames.map(serverName => this.disconnect(serverName))
    );
    
    logger.info('[MCPClient] すべてのサーバーから切断しました');
  }

  /**
   * サーバーが接続されているか確認
   * @param serverName サーバー名
   * @returns 接続されている場合true
   */
  isConnected(serverName: string): boolean {
    return this.clients.has(serverName);
  }

  /**
   * 接続されているサーバーのリストを取得
   * @returns サーバー名の配列
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * クライアントを取得（エラーチェック付き）
   * @param serverName サーバー名
   * @returns Client インスタンス
   * @throws {MCPError} サーバー未接続エラー
   */
  private getClient(serverName: string): Client {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new MCPError(`サーバー ${serverName} は接続されていません`, serverName);
    }
    return client;
  }

  /**
   * エラーメッセージを抽出
   * @param content コンテンツ配列
   * @returns エラーメッセージ
   */
  private extractErrorMessage(content: any[]): string {
    const textContent = content.find(c => c.type === 'text');
    return textContent?.text || '不明なエラー';
  }

  /**
   * コンテンツを抽出
   * @param content コンテンツ配列
   * @returns 抽出されたコンテンツ
   */
  private extractContent(content: any[]): any {
    const textContent = content.find(c => c.type === 'text');
    if (!textContent?.text) {
      return content;
    }

    // JSONとして解析を試みる
    try {
      return JSON.parse(textContent.text);
    } catch {
      // JSONでない場合はテキストをそのまま返す
      return textContent.text;
    }
  }
}

// シングルトンインスタンス
export const mcpClient = new MCPClient();