import dotenv from 'dotenv';
import path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { logger } from '@/lib/logger';
import { mcpClient } from './mcp-client';
import { MCP_SERVERS } from './mcp-servers';
import type { MCPServer } from './mcp-client';
import type { Tool } from '@mastra/core';
import {
  filesystemTools,
  githubTools,
  searchTools,
  vercelTools,
  perplexityTools,
  playwrightTools,
} from './mcp-tool-adapter';

// エージェントタイプの定義
type AgentType = 
  | 'accounting-agent'
  | 'customer-agent'
  | 'japan-tax-agent'
  | 'ocr-agent'
  | 'product-agent'
  | 'deployment-agent'
  | 'refactoring-agent'
  | 'general';

// ツールマッピングの型定義
interface ToolMapping {
  servers: string[];
  additionalTools?: string[];
}

/**
 * MCPサーバー管理クラス
 * Model Context Protocol (MCP) サーバーの接続、管理、ツール配布を行う
 */
export class MCPManager {
  private initialized = false;
  private connectedServers = new Set<string>();
  
  // エージェントごとのツールマッピング定義
  private readonly agentToolMappings: Record<AgentType, ToolMapping> = {
    'accounting-agent': {
      servers: ['filesystem', 'search', 'perplexity'],
      additionalTools: ['mcpAccountingTools']
    },
    'customer-agent': {
      servers: ['filesystem', 'search']
    },
    'japan-tax-agent': {
      servers: ['search', 'perplexity', 'playwright'],
      additionalTools: ['mcpTaxTools']
    },
    'ocr-agent': {
      servers: ['filesystem', 'playwright']
    },
    'product-agent': {
      servers: ['filesystem', 'search']
    },
    'deployment-agent': {
      servers: ['github', 'vercel', 'filesystem']
    },
    'refactoring-agent': {
      servers: ['github', 'filesystem']
    },
    'general': {
      servers: ['filesystem', 'github', 'search', 'vercel', 'perplexity', 'playwright']
    }
  };

  /**
   * MCPマネージャーを初期化
   * すべての設定されたMCPサーバーへの接続を試みる
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('[MCPManager] 既に初期化済みです');
      return;
    }

    logger.info('[MCPManager] MCPサーバーを初期化中...');

    // 各MCPサーバーに並列で接続を試みる
    const connectionPromises = Object.entries(MCP_SERVERS).map(
      async ([key, server]) => this.connectToServer(server)
    );

    // すべての接続試行を待つ
    await Promise.allSettled(connectionPromises);

    this.initialized = true;
    logger.info(`[MCPManager] 初期化完了 - 接続済みサーバー: ${this.connectedServers.size}個`);
  }

  /**
   * 個別のMCPサーバーに接続
   * @param server MCPサーバー設定
   */
  private async connectToServer(server: MCPServer): Promise<void> {
    try {
      // 必要な環境変数をチェック
      if (!this.validateEnvironmentVariables(server)) {
        return;
      }

      await mcpClient.connect(server);
      this.connectedServers.add(server.name);
      
      // 利用可能なツールをリスト
      const tools = await mcpClient.listTools(server.name);
      logger.info(`[MCPManager] ${server.name} - 利用可能なツール数: ${tools.length}`);
      logger.debug(`[MCPManager] ${server.name} ツール一覧:`, tools.map(t => t.name));
    } catch (error) {
      logger.error(`[MCPManager] ${server.name}への接続に失敗:`, error);
    }
  }

  /**
   * サーバーの環境変数を検証
   * @param server MCPサーバー設定
   * @returns 環境変数が有効な場合true
   */
  private validateEnvironmentVariables(server: MCPServer): boolean {
    if (!server.env) {
      return true;
    }

    const missingVars = Object.entries(server.env)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      logger.warn(
        `[MCPManager] ${server.name}をスキップ - 未設定の環境変数: ${missingVars.join(', ')}`
      );
      return false;
    }

    return true;
  }

  /**
   * すべてのMCPサーバーをシャットダウン
   */
  async shutdown(): Promise<void> {
    logger.info('[MCPManager] MCPサーバーをシャットダウン中...');
    await mcpClient.disconnectAll();
    this.connectedServers.clear();
    this.initialized = false;
    logger.info('[MCPManager] シャットダウン完了');
  }

  /**
   * サーバーが接続されているか確認
   * @param serverName サーバー名
   * @returns 接続されている場合true
   */
  isServerConnected(serverName: string): boolean {
    return this.connectedServers.has(serverName);
  }

  /**
   * 接続されているサーバーのリストを取得
   * @returns 接続済みサーバー名の配列
   */
  getConnectedServers(): string[] {
    return Array.from(this.connectedServers);
  }

  /**
   * エージェントタイプに応じたツールセットを取得
   * @param agentType エージェントのタイプ
   * @returns 利用可能なツールの配列
   */
  getToolsForAgent(agentType: AgentType): Tool[] {
    const tools: Tool[] = [];
    const mapping = this.agentToolMappings[agentType];

    if (!mapping) {
      logger.warn(`[MCPManager] 未知のエージェントタイプ: ${agentType}`);
      return tools;
    }

    // サーバーツールを追加
    const serverTools = this.getServerTools(mapping.servers);
    tools.push(...serverTools);

    // 追加ツールを動的にロード
    if (mapping.additionalTools) {
      const additionalTools = this.loadAdditionalTools(mapping.additionalTools);
      tools.push(...additionalTools);
    }

    logger.debug(`[MCPManager] ${agentType}に${tools.length}個のツールを提供`);
    return tools;
  }

  /**
   * 指定されたサーバーからツールを取得
   * @param servers サーバー名の配列
   * @returns ツールの配列
   */
  private getServerTools(servers: string[]): Tool[] {
    const tools: Tool[] = [];
    const toolMappings: Record<string, Tool[]> = {
      filesystem: filesystemTools,
      github: githubTools,
      search: searchTools,
      vercel: vercelTools,
      perplexity: perplexityTools,
      playwright: playwrightTools,
    };

    for (const server of servers) {
      if (this.isServerConnected(server) && toolMappings[server]) {
        tools.push(...toolMappings[server]);
      }
    }

    return tools;
  }

  /**
   * 追加ツールを動的にロード
   * @param toolNames ツール名の配列
   * @returns ツールの配列
   */
  private loadAdditionalTools(toolNames: string[]): Tool[] {
    const tools: Tool[] = [];

    for (const toolName of toolNames) {
      try {
        const modulePath = toolName === 'mcpAccountingTools' 
          ? '../agents/tools/mcp-accounting-tools'
          : '../agents/tools/mcp-tax-tools';
        
        const { [toolName]: loadedTools } = require(modulePath);
        if (Array.isArray(loadedTools)) {
          tools.push(...loadedTools);
        }
      } catch (error) {
        logger.error(`[MCPManager] ${toolName}のロードに失敗:`, error);
      }
    }

    return tools;
  }

  /**
   * MCPクライアントへの直接アクセス（テスト用）
   * @internal
   */
  get client() {
    return mcpClient;
  }
}

// シングルトンインスタンス
export const mcpManager = new MCPManager();