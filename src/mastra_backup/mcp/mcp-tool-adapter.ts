import { logger } from '@/lib/logger';
import { mcpClient, MCPError } from './mcp-client';
import { z } from 'zod';
import type { Tool } from '@mastra/core';

/**
 * MCPツール定義インターフェース
 */
interface MCPToolDefinition {
  serverName: string;
  toolName: string;
  description: string;
  schema?: z.ZodObject<any>;
}

/**
 * MCPツールのメタデータ
 */
interface MCPToolMetadata {
  server: string;
  originalName: string;
  category?: string;
}

/**
 * MCPツールをMastraツールフォーマットに変換
 * @param definition ツール定義
 * @returns Mastraツール
 */
export function createMCPTool(definition: MCPToolDefinition): Tool & { metadata: MCPToolMetadata } {
  const { serverName, toolName, description, schema } = definition;
  
  // ツール名を生成（サーバー名_ツール名）
  const mastraToolName = `${serverName}_${toolName}`;
  
  return {
    name: mastraToolName,
    description,
    parameters: schema ? zodToJsonSchema(schema) : { type: 'object', properties: {}, required: [] },
    handler: createToolHandler(serverName, toolName, mastraToolName),
    metadata: {
      server: serverName,
      originalName: toolName,
      category: getToolCategory(serverName),
    },
  };
}

/**
 * ツールハンドラーを作成
 * @param serverName サーバー名
 * @param toolName ツール名
 * @param mastraToolName Mastra形式のツール名
 * @returns ハンドラー関数
 */
function createToolHandler(serverName: string, toolName: string, mastraToolName: string) {
  return async (params: any) => {
    const startTime = Date.now();
    
    try {
      logger.info(`[MCPTool] ${mastraToolName} 実行開始`, { params });
      
      // パラメータ検証（スキーマがある場合）
      const validatedParams = validateParams(params, serverName, toolName);
      
      // ツール実行
      const result = await mcpClient.callTool(serverName, toolName, validatedParams);
      
      const duration = Date.now() - startTime;
      logger.info(`[MCPTool] ${mastraToolName} 実行完了`, { duration, success: true });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`[MCPTool] ${mastraToolName} 実行エラー`, { 
        duration, 
        error: error instanceof Error ? error.message : error 
      });
      
      // エラーを再スロー（MCPErrorとして）
      if (error instanceof MCPError) {
        throw error;
      }
      throw new MCPError(
        `ツール実行エラー: ${error instanceof Error ? error.message : 'Unknown error'}`,
        serverName,
        toolName,
        error
      );
    }
  };
}

/**
 * パラメータを検証
 * @param params パラメータ
 * @param serverName サーバー名
 * @param toolName ツール名
 * @returns 検証済みパラメータ
 */
function validateParams(params: any, serverName: string, toolName: string): any {
  // 現在は検証なし（将来的にスキーマベースの検証を追加）
  return params;
}

/**
 * ツールカテゴリを取得
 * @param serverName サーバー名
 * @returns カテゴリ名
 */
function getToolCategory(serverName: string): string {
  const categories: Record<string, string> = {
    filesystem: 'ファイル操作',
    github: 'ソースコード管理',
    search: 'Web検索',
    vercel: 'デプロイメント',
    perplexity: 'AI検索',
    playwright: 'ブラウザ自動化',
  };
  
  return categories[serverName] || '未分類';
}

/**
 * Zodスキーマを JSON Schema に変換
 * @param schema Zodスキーマ
 * @returns JSON Schema
 */
function zodToJsonSchema(schema: z.ZodObject<any>): any {
  // 簡易実装（実際のプロジェクトではzod-to-json-schemaを使用）
  const shape = schema.shape;
  const properties: any = {};
  const required: string[] = [];
  
  for (const [key, value] of Object.entries(shape)) {
    if (value instanceof z.ZodString) {
      properties[key] = { type: 'string' };
    } else if (value instanceof z.ZodNumber) {
      properties[key] = { type: 'number' };
    } else if (value instanceof z.ZodBoolean) {
      properties[key] = { type: 'boolean' };
    } else if (value instanceof z.ZodArray) {
      properties[key] = { type: 'array' };
    } else if (value instanceof z.ZodObject) {
      properties[key] = { type: 'object' };
    }
    
    // 必須チェック（簡易版）
    if (!value.isOptional()) {
      required.push(key);
    }
  }
  
  return {
    type: 'object',
    properties,
    required,
  };
}

/**
 * ファイルシステムツール定義
 */
const filesystemDefinitions: MCPToolDefinition[] = [
  {
    serverName: 'filesystem',
    toolName: 'read_file',
    description: 'ファイルの内容を読み込みます',
    schema: z.object({
      path: z.string().describe('読み込むファイルのパス'),
    }),
  },
  {
    serverName: 'filesystem',
    toolName: 'write_file',
    description: 'ファイルに内容を書き込みます',
    schema: z.object({
      path: z.string().describe('書き込むファイルのパス'),
      content: z.string().describe('書き込む内容'),
    }),
  },
  {
    serverName: 'filesystem',
    toolName: 'list_directory',
    description: 'ディレクトリの内容をリストします',
    schema: z.object({
      path: z.string().describe('リストするディレクトリのパス'),
    }),
  },
  {
    serverName: 'filesystem',
    toolName: 'create_directory',
    description: 'ディレクトリを作成します',
    schema: z.object({
      path: z.string().describe('作成するディレクトリのパス'),
    }),
  },
  {
    serverName: 'filesystem',
    toolName: 'move_file',
    description: 'ファイルを移動または名前変更します',
    schema: z.object({
      source: z.string().describe('移動元のパス'),
      destination: z.string().describe('移動先のパス'),
    }),
  },
  {
    serverName: 'filesystem',
    toolName: 'delete',
    description: 'ファイルまたはディレクトリを削除します',
    schema: z.object({
      path: z.string().describe('削除するパス'),
    }),
  },
];

/**
 * GitHubツール定義
 */
const githubDefinitions: MCPToolDefinition[] = [
  {
    serverName: 'github',
    toolName: 'search_repositories',
    description: 'GitHubリポジトリを検索します',
    schema: z.object({
      query: z.string().describe('検索クエリ'),
      max_results: z.number().optional().describe('最大結果数'),
    }),
  },
  {
    serverName: 'github',
    toolName: 'create_issue',
    description: 'GitHubイシューを作成します',
    schema: z.object({
      owner: z.string().describe('リポジトリオーナー'),
      repo: z.string().describe('リポジトリ名'),
      title: z.string().describe('イシューのタイトル'),
      body: z.string().optional().describe('イシューの本文'),
    }),
  },
  {
    serverName: 'github',
    toolName: 'push_files',
    description: 'ファイルをGitHubにプッシュします',
    schema: z.object({
      owner: z.string().describe('リポジトリオーナー'),
      repo: z.string().describe('リポジトリ名'),
      branch: z.string().describe('ブランチ名'),
      message: z.string().describe('コミットメッセージ'),
      files: z.array(z.object({
        path: z.string(),
        content: z.string(),
      })).describe('プッシュするファイルの配列'),
    }),
  },
];

/**
 * Brave Searchツール定義
 */
const searchDefinitions: MCPToolDefinition[] = [
  {
    serverName: 'search',
    toolName: 'brave_web_search',
    description: 'Brave Search APIを使用してWeb検索を実行します',
    schema: z.object({
      query: z.string().describe('検索クエリ'),
      max: z.number().optional().describe('最大結果数（デフォルト: 10）'),
      offset: z.number().optional().describe('結果のオフセット'),
    }),
  },
  {
    serverName: 'search',
    toolName: 'brave_local_search',
    description: 'ローカルビジネスや場所を検索します',
    schema: z.object({
      query: z.string().describe('検索クエリ（場所やビジネス名）'),
    }),
  },
];

/**
 * Vercelツール定義
 */
const vercelDefinitions: MCPToolDefinition[] = [
  {
    serverName: 'vercel',
    toolName: 'list_projects',
    description: 'Vercelプロジェクトをリストします',
  },
  {
    serverName: 'vercel',
    toolName: 'create_deployment',
    description: 'デプロイメントを作成します',
    schema: z.object({
      projectId: z.string().describe('プロジェクトID'),
      branch: z.string().optional().describe('デプロイするブランチ'),
    }),
  },
];

/**
 * Perplexityツール定義
 */
const perplexityDefinitions: MCPToolDefinition[] = [
  {
    serverName: 'perplexity',
    toolName: 'perplexity_search_web',
    description: 'Perplexity AIを使用して高度なWeb検索を実行します',
    schema: z.object({
      query: z.string().describe('検索クエリ'),
    }),
  },
];

/**
 * Playwrightツール定義
 */
const playwrightDefinitions: MCPToolDefinition[] = [
  {
    serverName: 'playwright',
    toolName: 'browser_navigate',
    description: '指定されたURLにナビゲートします',
    schema: z.object({
      url: z.string().url().describe('ナビゲート先のURL'),
    }),
  },
  {
    serverName: 'playwright',
    toolName: 'browser_screenshot',
    description: 'ページのスクリーンショットを撮影します',
    schema: z.object({
      path: z.string().optional().describe('保存先パス'),
      fullPage: z.boolean().optional().describe('フルページスクリーンショット'),
    }),
  },
  {
    serverName: 'playwright',
    toolName: 'browser_click',
    description: '要素をクリックします',
    schema: z.object({
      selector: z.string().describe('クリックする要素のセレクター'),
    }),
  },
  {
    serverName: 'playwright',
    toolName: 'browser_type',
    description: 'テキストを入力します',
    schema: z.object({
      text: z.string().describe('入力するテキスト'),
      selector: z.string().optional().describe('入力先のセレクター'),
    }),
  },
  {
    serverName: 'playwright',
    toolName: 'browser_close',
    description: 'ブラウザを閉じます',
  },
];

// エクスポート用のツール配列を生成
export const filesystemTools = filesystemDefinitions.map(createMCPTool);
export const githubTools = githubDefinitions.map(createMCPTool);
export const searchTools = searchDefinitions.map(createMCPTool);
export const vercelTools = vercelDefinitions.map(createMCPTool);
export const perplexityTools = perplexityDefinitions.map(createMCPTool);
export const playwrightTools = playwrightDefinitions.map(createMCPTool);

// すべてのツールをまとめてエクスポート
export const allMCPTools = [
  ...filesystemTools,
  ...githubTools,
  ...searchTools,
  ...vercelTools,
  ...perplexityTools,
  ...playwrightTools,
];

// サーバー別にツールを取得する関数
export function getToolsByServer(serverName: string): Tool[] {
  const serverTools: Record<string, Tool[]> = {
    filesystem: filesystemTools,
    github: githubTools,
    search: searchTools,
    vercel: vercelTools,
    perplexity: perplexityTools,
    playwright: playwrightTools,
  };
  
  return serverTools[serverName] || [];
}

// カテゴリ別にツールを取得する関数
export function getToolsByCategory(category: string): Tool[] {
  return allMCPTools.filter(tool => 
    (tool as any).metadata?.category === category
  );
}

// 後方互換性のためのヘルパー関数
export function createMCPToolLegacy(
  serverName: string, 
  toolName: string, 
  description: string, 
  schema?: any
): Tool {
  return createMCPTool({
    serverName,
    toolName,
    description,
    schema: schema ? schemaToZod(schema) : undefined,
  });
}

// レガシースキーマをZodスキーマに変換
function schemaToZod(schema: any): z.ZodObject<any> {
  if (!schema || !schema.properties) {
    return z.object({});
  }
  
  const shape: any = {};
  
  for (const [key, prop] of Object.entries(schema.properties as any)) {
    const propDef = prop as any;
    
    if (propDef.type === 'string') {
      shape[key] = schema.required?.includes(key) 
        ? z.string() 
        : z.string().optional();
    } else if (propDef.type === 'number') {
      shape[key] = schema.required?.includes(key)
        ? z.number()
        : z.number().optional();
    } else if (propDef.type === 'boolean') {
      shape[key] = schema.required?.includes(key)
        ? z.boolean()
        : z.boolean().optional();
    } else if (propDef.type === 'array') {
      shape[key] = schema.required?.includes(key)
        ? z.array(z.any())
        : z.array(z.any()).optional();
    } else {
      shape[key] = z.any();
    }
  }
  
  return z.object(shape);
}