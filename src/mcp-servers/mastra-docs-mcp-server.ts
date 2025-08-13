#!/usr/bin/env node

/**
 * Mastra Documentation MCP Server
 * Mastraフレームワークのドキュメントへのアクセスを提供
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
  TextContent,
  ErrorContent
} from '@modelcontextprotocol/sdk/types.js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

// ツール定義
const MASTRA_DOCS_TOOLS: Tool[] = [
  {
    name: 'mastra_search_docs',
    description: 'Mastraドキュメント内を検索（エージェント、ワークフロー、ツール、MCPなどのキーワードで検索）',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '検索キーワード（例: agent, workflow, tool, mcp, provider）',
        },
        category: {
          type: 'string',
          enum: ['all', 'reference', 'guides', 'examples', 'api'],
          description: 'ドキュメントカテゴリで絞り込み',
          default: 'all'
        }
      },
      required: ['query'],
    },
  },
  {
    name: 'mastra_get_reference',
    description: '特定のMastra API/メソッドのリファレンスを取得',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'リファレンストピック（例: agents, workflows, tools, mcp-configuration）',
        },
        subtopic: {
          type: 'string',
          description: 'サブトピック（オプション）',
          optional: true
        }
      },
      required: ['topic'],
    },
  },
  {
    name: 'mastra_get_examples',
    description: 'Mastraの実装例やコードサンプルを取得',
    inputSchema: {
      type: 'object',
      properties: {
        feature: {
          type: 'string',
          description: '機能名（例: agent-creation, workflow-setup, tool-integration, mcp-setup）',
        },
        language: {
          type: 'string',
          enum: ['typescript', 'javascript'],
          description: 'プログラミング言語',
          default: 'typescript'
        }
      },
      required: ['feature'],
    },
  },
  {
    name: 'mastra_get_changelog',
    description: 'Mastraの最新の変更履歴や更新情報を取得',
    inputSchema: {
      type: 'object',
      properties: {
        version: {
          type: 'string',
          description: '特定のバージョン（オプション、指定しない場合は最新）',
          optional: true
        }
      },
    },
  },
];

// キャッシュ機能
interface CacheEntry {
  data: any;
  timestamp: number;
}

class DocumentationCache {
  private cache: Map<string, CacheEntry> = new Map();
  private cacheDuration: number;

  constructor(cacheDurationSeconds: number = 3600) {
    this.cacheDuration = cacheDurationSeconds * 1000; // ミリ秒に変換
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.cacheDuration) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

// メインサーバークラス
class MastraDocsServer {
  private server: Server;
  private cache: DocumentationCache;
  private baseUrl: string;

  constructor() {
    this.server = new Server(
      {
        name: 'mastra-docs-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // 環境変数から設定を読み込み
    this.baseUrl = process.env.MASTRA_DOCS_URL || 'https://mastra.ai';
    const cacheDuration = parseInt(process.env.CACHE_DURATION || '3600', 10);
    this.cache = new DocumentationCache(cacheDuration);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // ツール一覧の取得
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: MASTRA_DOCS_TOOLS,
    }));

    // ツールの実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result: CallToolResult;

        switch (name) {
          case 'mastra_search_docs':
            result = await this.searchDocs(args);
            break;
          case 'mastra_get_reference':
            result = await this.getReference(args);
            break;
          case 'mastra_get_examples':
            result = await this.getExamples(args);
            break;
          case 'mastra_get_changelog':
            result = await this.getChangelog(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return result;
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            } as ErrorContent,
          ],
        };
      }
    });
  }

  private async searchDocs(args: any): Promise<CallToolResult> {
    const { query, category = 'all' } = args;
    const cacheKey = `search:${query}:${category}`;
    
    // キャッシュチェック
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: cached,
          } as TextContent,
        ],
      };
    }

    // 実際の検索処理（簡易版）
    const searchUrls = {
      all: `${this.baseUrl}/ja/search?q=${encodeURIComponent(query)}`,
      reference: `${this.baseUrl}/ja/reference?q=${encodeURIComponent(query)}`,
      guides: `${this.baseUrl}/ja/guides?q=${encodeURIComponent(query)}`,
      examples: `${this.baseUrl}/ja/examples?q=${encodeURIComponent(query)}`,
      api: `${this.baseUrl}/ja/api?q=${encodeURIComponent(query)}`
    };

    const searchUrl = searchUrls[category as keyof typeof searchUrls] || searchUrls.all;

    try {
      // Note: 実際の実装では、Mastraのサイト構造に応じて適切なスクレイピングまたはAPIを使用
      const mockResults = this.getMockSearchResults(query, category);
      
      this.cache.set(cacheKey, mockResults);

      return {
        content: [
          {
            type: 'text',
            text: mockResults,
          } as TextContent,
        ],
      };
    } catch (error) {
      throw new Error(`Failed to search documentation: ${error}`);
    }
  }

  private async getReference(args: any): Promise<CallToolResult> {
    const { topic, subtopic } = args;
    const cacheKey = `reference:${topic}:${subtopic || 'main'}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: cached,
          } as TextContent,
        ],
      };
    }

    // リファレンス情報の取得（簡易版）
    const referenceInfo = this.getMockReferenceInfo(topic, subtopic);
    
    this.cache.set(cacheKey, referenceInfo);

    return {
      content: [
        {
          type: 'text',
          text: referenceInfo,
        } as TextContent,
      ],
    };
  }

  private async getExamples(args: any): Promise<CallToolResult> {
    const { feature, language = 'typescript' } = args;
    const cacheKey = `examples:${feature}:${language}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: cached,
          } as TextContent,
        ],
      };
    }

    // サンプルコードの取得（簡易版）
    const examples = this.getMockExamples(feature, language);
    
    this.cache.set(cacheKey, examples);

    return {
      content: [
        {
          type: 'text',
          text: examples,
        } as TextContent,
      ],
    };
  }

  private async getChangelog(args: any): Promise<CallToolResult> {
    const { version } = args;
    const cacheKey = `changelog:${version || 'latest'}`;
    
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        content: [
          {
            type: 'text',
            text: cached,
          } as TextContent,
        ],
      };
    }

    // 変更履歴の取得（簡易版）
    const changelog = this.getMockChangelog(version);
    
    this.cache.set(cacheKey, changelog);

    return {
      content: [
        {
          type: 'text',
          text: changelog,
        } as TextContent,
      ],
    };
  }

  // モックデータ生成メソッド（実際の実装では削除してAPI/スクレイピングに置き換え）
  private getMockSearchResults(query: string, category: string): string {
    return `# Mastraドキュメント検索結果

検索キーワード: "${query}"
カテゴリ: ${category}

## 検索結果:

### 1. エージェントの作成と設定
- パス: /ja/reference/agents
- 概要: Mastraでエージェントを作成し、ツールを追加する方法
- 関連: createAgent(), addTool(), executeAgent()

### 2. MCPサーバーの統合
- パス: /ja/reference/tools/mcp-configuration
- 概要: Model Context Protocol (MCP) サーバーをMastraに統合する方法
- 関連: MCPClient, getTools(), getToolsets()

### 3. ワークフローの構築
- パス: /ja/reference/workflows
- 概要: 複雑なタスクを処理するワークフローの作成方法
- 関連: createWorkflow(), addStep(), runWorkflow()

詳細は各ドキュメントページをご確認ください。`;
  }

  private getMockReferenceInfo(topic: string, subtopic?: string): string {
    const references: Record<string, string> = {
      'agents': `# Mastra エージェント リファレンス

## 概要
エージェントは、特定のタスクを実行するためのAIエンティティです。

## 主要メソッド

### createAgent(config)
新しいエージェントを作成します。

\`\`\`typescript
const agent = createAgent({
  name: 'my-agent',
  description: 'タスクを処理するエージェント',
  model: 'gpt-4',
  tools: [tool1, tool2]
});
\`\`\`

### agent.execute(input)
エージェントを実行します。

### agent.addTool(tool)
エージェントにツールを追加します。`,

      'mcp-configuration': `# MCP設定 リファレンス

## 概要
Model Context Protocol (MCP) を使用してツールサーバーを統合します。

## 設定例

\`\`\`typescript
const mcp = new MCPClient({
  servers: {
    myServer: {
      command: "npx",
      args: ["tsx", "my-server.ts"],
      env: { API_KEY: "..." }
    }
  }
});

// ツールの取得
const tools = await mcp.getTools();
\`\`\`

## メソッド
- getTools(): すべてのツールを取得
- getToolsets(): ツールセットのマッピングを取得
- disconnect(): 接続を切断`,

      'workflows': `# ワークフロー リファレンス

## 概要
ワークフローは複数のステップを順次または並列で実行します。

## 基本的な使用方法

\`\`\`typescript
const workflow = createWorkflow('my-workflow')
  .addStep('step1', agent1)
  .addStep('step2', agent2, { dependsOn: ['step1'] })
  .build();

const result = await workflow.run(input);
\`\`\``
    };

    return references[topic] || `トピック "${topic}" のリファレンスが見つかりません。`;
  }

  private getMockExamples(feature: string, language: string): string {
    const examples: Record<string, string> = {
      'agent-creation': `# エージェント作成の例

## ${language === 'typescript' ? 'TypeScript' : 'JavaScript'}

\`\`\`${language}
${language === 'typescript' ? 'import { createAgent, createTool } from "@mastra/core";' : 'const { createAgent, createTool } = require("@mastra/core");'}

// ツールの作成
const calculatorTool = createTool({
  name: 'calculator',
  description: '数値計算を実行',
  parameters: {
    type: 'object',
    properties: {
      operation: { type: 'string' },
      a: { type: 'number' },
      b: { type: 'number' }
    }
  },
  execute: async ({ operation, a, b }) => {
    switch (operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': return a / b;
    }
  }
});

// エージェントの作成
const mathAgent = createAgent({
  name: 'math-agent',
  description: '数学計算を行うエージェント',
  model: 'gpt-4',
  tools: [calculatorTool],
  systemPrompt: 'あなたは数学の専門家です。'
});

// 実行
const result = await mathAgent.execute({
  messages: [{ role: 'user', content: '25 × 4 を計算してください' }]
});
\`\`\``,

      'mcp-setup': `# MCP セットアップの例

## ${language === 'typescript' ? 'TypeScript' : 'JavaScript'}

\`\`\`${language}
${language === 'typescript' ? 'import { MCPClient } from "@mastra/mcp";' : 'const { MCPClient } = require("@mastra/mcp");'}
${language === 'typescript' ? 'import { createAgent } from "@mastra/core";' : 'const { createAgent } = require("@mastra/core");'}

// MCPクライアントの設定
const mcp = new MCPClient({
  servers: {
    weather: {
      command: "npx",
      args: ["tsx", "./weather-server.ts"],
      env: { WEATHER_API_KEY: process.env.WEATHER_API_KEY }
    },
    database: {
      url: new URL("http://localhost:8080/sse")
    }
  }
});

// MCPツールを使用するエージェント
const agent = createAgent({
  name: 'mcp-agent',
  description: 'MCPツールを使用するエージェント',
  model: 'gpt-4',
  tools: await mcp.getToolsets(),
});

// 使用例
const result = await agent.execute({
  messages: [{ role: 'user', content: '東京の天気を教えて' }]
});
\`\`\``
    };

    return examples[feature] || `機能 "${feature}" の例が見つかりません。`;
  }

  private getMockChangelog(version?: string): string {
    return `# Mastra 変更履歴

## ${version || '最新バージョン (v1.0.0)'}

### 新機能
- MCPサーバー統合のサポート
- エージェントの並列実行
- ワークフローのビジュアルエディタ

### 改善
- パフォーマンスの向上（2倍高速化）
- エラーハンドリングの改善
- TypeScript型定義の強化

### バグ修正
- メモリリークの修正
- 非同期処理のタイムアウト問題
- ツール実行時のエラー処理

### 破壊的変更
- createAgent APIの引数が変更されました
- 古いtool定義形式は廃止されました

詳細は公式ドキュメントをご確認ください。`;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Mastra Documentation MCP Server started');
  }
}

// サーバーの起動
const server = new MastraDocsServer();
server.run().catch(console.error);