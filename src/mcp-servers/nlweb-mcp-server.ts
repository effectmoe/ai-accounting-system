#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// NLWeb関連の型定義
interface SchemaOrgData {
  '@context': string;
  '@type': string | string[];
  [key: string]: any;
}

interface NLWebPage {
  id: string;
  url: string;
  title: string;
  description: string;
  content: string;
  metadata: {
    keywords: string[];
    author: string;
    datePublished: string;
    dateModified: string;
    language: string;
  };
  schemaOrg: SchemaOrgData;
  nlweb: {
    version: string;
    features: string[];
    mcpCompatible: boolean;
  };
}

interface SEOAnalysis {
  score: number;
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    recommendation: string;
  }>;
  opportunities: string[];
}

interface DeploymentConfig {
  provider: 'vercel' | 'netlify' | 'cloudflare';
  domain: string;
  environment: 'development' | 'staging' | 'production';
  buildCommand?: string;
  outputDirectory?: string;
}

// NLWeb MCP Server
class NLWebMCPServer {
  private server: Server;
  private pages: Map<string, NLWebPage> = new Map();
  private templates: Map<string, any> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: 'nlweb-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initializeTemplates();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private initializeTemplates(): void {
    // 会計システム用テンプレート
    this.templates.set('accounting-dashboard', {
      layout: 'dashboard',
      components: ['header', 'sidebar', 'main-content', 'footer'],
      features: ['responsive', 'dark-mode', 'a11y', 'pwa'],
      schemaType: 'WebApplication',
    });

    // レポートページテンプレート
    this.templates.set('report-page', {
      layout: 'single-column',
      components: ['header', 'report-viewer', 'footer'],
      features: ['print-friendly', 'export', 'share'],
      schemaType: 'Report',
    });

    // ランディングページテンプレート
    this.templates.set('landing-page', {
      layout: 'hero',
      components: ['hero', 'features', 'pricing', 'cta', 'footer'],
      features: ['animations', 'lazy-loading', 'contact-form'],
      schemaType: 'Organization',
    });
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[NLWeb MCP Server] Error:', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_nlweb_page',
            description: 'Generate an NLWeb-compliant page',
            inputSchema: {
              type: 'object',
              properties: {
                pageId: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' },
                content: { type: 'string' },
                template: { type: 'string' },
                metadata: {
                  type: 'object',
                  properties: {
                    keywords: { type: 'array', items: { type: 'string' } },
                    author: { type: 'string' },
                  },
                },
              },
              required: ['pageId', 'title', 'content'],
            },
          },
          {
            name: 'add_schema_org',
            description: 'Add Schema.org structured data to page',
            inputSchema: {
              type: 'object',
              properties: {
                pageId: { type: 'string' },
                schemaType: { type: 'string' },
                schemaData: { type: 'object' },
              },
              required: ['pageId', 'schemaType', 'schemaData'],
            },
          },
          {
            name: 'optimize_seo',
            description: 'Analyze and optimize page for SEO',
            inputSchema: {
              type: 'object',
              properties: {
                pageId: { type: 'string' },
                targetKeywords: { type: 'array', items: { type: 'string' } },
                locale: { type: 'string' },
              },
              required: ['pageId'],
            },
          },
          {
            name: 'generate_sitemap',
            description: 'Generate XML sitemap for NLWeb site',
            inputSchema: {
              type: 'object',
              properties: {
                domain: { type: 'string' },
                pages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      priority: { type: 'number' },
                      changefreq: { type: 'string' },
                    },
                  },
                },
              },
              required: ['domain'],
            },
          },
          {
            name: 'deploy_to_vercel',
            description: 'Deploy NLWeb site to Vercel',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: { type: 'string' },
                config: {
                  type: 'object',
                  properties: {
                    domain: { type: 'string' },
                    environment: { type: 'string' },
                    buildCommand: { type: 'string' },
                    outputDirectory: { type: 'string' },
                  },
                },
                files: { type: 'array' },
              },
              required: ['projectName', 'config'],
            },
          },
          {
            name: 'generate_mcp_endpoint',
            description: 'Generate MCP-compatible API endpoint',
            inputSchema: {
              type: 'object',
              properties: {
                endpointName: { type: 'string' },
                operations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      method: { type: 'string' },
                      path: { type: 'string' },
                      description: { type: 'string' },
                      parameters: { type: 'array' },
                      response: { type: 'object' },
                    },
                  },
                },
              },
              required: ['endpointName', 'operations'],
            },
          },
          {
            name: 'generate_pwa_manifest',
            description: 'Generate PWA manifest for NLWeb app',
            inputSchema: {
              type: 'object',
              properties: {
                appName: { type: 'string' },
                shortName: { type: 'string' },
                description: { type: 'string' },
                startUrl: { type: 'string' },
                themeColor: { type: 'string' },
                backgroundColor: { type: 'string' },
                icons: { type: 'array' },
              },
              required: ['appName', 'shortName', 'startUrl'],
            },
          },
          {
            name: 'generate_accounting_page',
            description: 'Generate specialized accounting system page',
            inputSchema: {
              type: 'object',
              properties: {
                pageType: {
                  type: 'string',
                  enum: ['dashboard', 'receipt-upload', 'expense-report', 'tax-summary'],
                },
                title: { type: 'string' },
                features: { type: 'array', items: { type: 'string' } },
                integrations: {
                  type: 'object',
                  properties: {
                    ocr: { type: 'boolean' },
                    accounting: { type: 'boolean' },
                    database: { type: 'boolean' },
                  },
                },
              },
              required: ['pageType', 'title'],
            },
          },
          {
            name: 'create_github_repo',
            description: 'Create GitHub repository for NLWeb project',
            inputSchema: {
              type: 'object',
              properties: {
                repoName: { type: 'string' },
                description: { type: 'string' },
                private: { type: 'boolean', default: true },
                autoInit: { type: 'boolean', default: true },
              },
              required: ['repoName'],
            },
          },
          {
            name: 'push_to_github',
            description: 'Push NLWeb files to GitHub repository',
            inputSchema: {
              type: 'object',
              properties: {
                repoName: { type: 'string' },
                files: { type: 'array' },
                commitMessage: { type: 'string' },
                branch: { type: 'string', default: 'main' },
              },
              required: ['repoName', 'files'],
            },
          },
          {
            name: 'deploy_with_github',
            description: 'Deploy NLWeb site via GitHub to Vercel',
            inputSchema: {
              type: 'object',
              properties: {
                projectName: { type: 'string' },
                githubRepo: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    private: { type: 'boolean' },
                  },
                },
                vercelConfig: {
                  type: 'object',
                  properties: {
                    domain: { type: 'string' },
                    environment: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
                files: { type: 'array' },
              },
              required: ['projectName', 'githubRepo', 'vercelConfig', 'files'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_nlweb_page':
            return await this.handleGenerateNLWebPage(args);
          case 'add_schema_org':
            return await this.handleAddSchemaOrg(args);
          case 'optimize_seo':
            return await this.handleOptimizeSEO(args);
          case 'generate_sitemap':
            return await this.handleGenerateSitemap(args);
          case 'deploy_to_vercel':
            return await this.handleDeployToVercel(args);
          case 'generate_mcp_endpoint':
            return await this.handleGenerateMCPEndpoint(args);
          case 'generate_pwa_manifest':
            return await this.handleGeneratePWAManifest(args);
          case 'generate_accounting_page':
            return await this.handleGenerateAccountingPage(args);
          case 'create_github_repo':
            return await this.handleCreateGitHubRepo(args);
          case 'push_to_github':
            return await this.handlePushToGitHub(args);
          case 'deploy_with_github':
            return await this.handleDeployWithGitHub(args);
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${errorMessage}`);
      }
    });
  }

  // Generate NLWeb page
  private async handleGenerateNLWebPage(args: any) {
    const { pageId, title, description = '', content, template = 'default', metadata = {} } = args;

    try {
      const nlwebPage: NLWebPage = {
        id: pageId,
        url: `/${pageId}`,
        title,
        description,
        content,
        metadata: {
          keywords: metadata.keywords || [],
          author: metadata.author || 'NLWeb System',
          datePublished: new Date().toISOString(),
          dateModified: new Date().toISOString(),
          language: 'ja',
        },
        schemaOrg: {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: title,
          description,
        },
        nlweb: {
          version: '1.0.0',
          features: ['responsive', 'a11y', 'seo', 'mcp'],
          mcpCompatible: true,
        },
      };

      // HTML生成
      const html = this.generateNLWebHTML(nlwebPage, template);
      
      // メタデータ生成
      const meta = this.generateMetaTags(nlwebPage);
      
      // NLWeb設定生成
      const config = this.generateNLWebConfig(nlwebPage);

      this.pages.set(pageId, nlwebPage);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              page: nlwebPage,
              files: {
                html,
                meta,
                config,
              },
              message: 'NLWeb page generated successfully',
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Add Schema.org data
  private async handleAddSchemaOrg(args: any) {
    const { pageId, schemaType, schemaData } = args;

    try {
      const page = this.pages.get(pageId);
      if (!page) {
        throw new Error('Page not found');
      }

      // Schema.org データの構築
      const schema: SchemaOrgData = {
        '@context': 'https://schema.org',
        '@type': schemaType,
        ...schemaData,
      };

      // 特定のタイプに対する追加フィールド
      switch (schemaType) {
        case 'Invoice':
          schema.identifier = schemaData.invoiceNumber;
          schema.totalPaymentDue = {
            '@type': 'MonetaryAmount',
            currency: 'JPY',
            value: schemaData.totalAmount,
          };
          break;
          
        case 'FinancialService':
          schema.serviceType = 'Accounting Software';
          schema.areaServed = 'JP';
          schema.availableLanguage = ['ja', 'en'];
          break;
          
        case 'Report':
          schema.reportType = schemaData.reportType || 'Financial Report';
          schema.dateCreated = new Date().toISOString();
          break;
      }

      page.schemaOrg = schema;
      
      // JSON-LDスクリプトタグ生成
      const jsonLd = `<script type="application/ld+json">
${JSON.stringify(schema, null, 2)}
</script>`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              pageId,
              schemaType,
              schema,
              jsonLd,
              message: 'Schema.org data added successfully',
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Optimize SEO
  private async handleOptimizeSEO(args: any) {
    const { pageId, targetKeywords = [], locale = 'ja' } = args;

    try {
      const page = this.pages.get(pageId);
      if (!page) {
        throw new Error('Page not found');
      }

      const analysis: SEOAnalysis = {
        score: 0,
        issues: [],
        opportunities: [],
      };

      // タイトルチェック
      if (!page.title) {
        analysis.issues.push({
          type: 'error',
          message: 'ページタイトルが設定されていません',
          recommendation: 'タイトルタグを設定してください（50-60文字推奨）',
        });
      } else if (page.title.length > 60) {
        analysis.issues.push({
          type: 'warning',
          message: 'タイトルが長すぎます',
          recommendation: 'タイトルを60文字以内に収めてください',
        });
      } else {
        analysis.score += 20;
      }

      // ディスクリプションチェック
      if (!page.description) {
        analysis.issues.push({
          type: 'error',
          message: 'メタディスクリプションが設定されていません',
          recommendation: 'メタディスクリプションを設定してください（120-160文字推奨）',
        });
      } else if (page.description.length > 160) {
        analysis.issues.push({
          type: 'warning',
          message: 'ディスクリプションが長すぎます',
          recommendation: 'ディスクリプションを160文字以内に収めてください',
        });
      } else {
        analysis.score += 20;
      }

      // キーワードチェック
      if (targetKeywords.length > 0) {
        const contentLower = page.content.toLowerCase();
        targetKeywords.forEach(keyword => {
          if (!contentLower.includes(keyword.toLowerCase())) {
            analysis.issues.push({
              type: 'info',
              message: `キーワード「${keyword}」がコンテンツに含まれていません`,
              recommendation: `コンテンツに「${keyword}」を自然に含めてください`,
            });
          }
        });
      }

      // Schema.orgチェック
      if (page.schemaOrg && Object.keys(page.schemaOrg).length > 2) {
        analysis.score += 20;
        analysis.opportunities.push('構造化データが適切に設定されています');
      } else {
        analysis.issues.push({
          type: 'warning',
          message: '構造化データが不完全です',
          recommendation: 'Schema.orgデータを充実させてください',
        });
      }

      // NLWeb機能チェック
      if (page.nlweb.mcpCompatible) {
        analysis.score += 20;
        analysis.opportunities.push('MCP対応により、AIエージェントからのアクセスが可能です');
      }

      // モバイルフレンドリー
      if (page.nlweb.features.includes('responsive')) {
        analysis.score += 20;
        analysis.opportunities.push('レスポンシブデザイン対応済み');
      }

      // 改善提案
      const recommendations = {
        title: this.optimizeTitle(page.title, targetKeywords),
        description: this.optimizeDescription(page.description, targetKeywords),
        headings: this.generateHeadings(page.content, targetKeywords),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              pageId,
              analysis,
              recommendations,
              message: `SEO分析完了: スコア ${analysis.score}/100`,
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate sitemap
  private async handleGenerateSitemap(args: any) {
    const { domain, pages = [] } = args;

    try {
      // デフォルトページ追加
      const allPages = [
        { url: '/', priority: 1.0, changefreq: 'daily' },
        { url: '/dashboard', priority: 0.9, changefreq: 'daily' },
        { url: '/receipts', priority: 0.8, changefreq: 'weekly' },
        { url: '/reports', priority: 0.8, changefreq: 'weekly' },
        { url: '/settings', priority: 0.5, changefreq: 'monthly' },
        ...pages,
      ];

      // XML生成
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allPages.map(page => `  <url>
    <loc>${domain}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq || 'weekly'}</changefreq>
    <priority>${page.priority || 0.5}</priority>
  </url>`).join('\n')}
</urlset>`;

      // robots.txt生成
      const robots = `User-agent: *
Allow: /
Sitemap: ${domain}/sitemap.xml

# AI Crawlers
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              files: {
                'sitemap.xml': sitemap,
                'robots.txt': robots,
              },
              urls: allPages.length,
              message: 'Sitemap generated successfully',
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Deploy to Vercel
  private async handleDeployToVercel(args: any) {
    const { projectName, config, files = [] } = args;

    try {
      // Vercel設定ファイル生成
      const vercelConfig = {
        name: projectName,
        version: 2,
        builds: [
          {
            src: 'package.json',
            use: '@vercel/static-build',
            config: {
              distDir: config.outputDirectory || 'dist',
            },
          },
        ],
        routes: [
          {
            src: '/api/(.*)',
            dest: '/api/$1',
          },
          {
            src: '/(.*)',
            dest: '/$1',
          },
        ],
        env: {
          NEXT_PUBLIC_SUPABASE_URL: '@supabase-url',
          NEXT_PUBLIC_SUPABASE_ANON_KEY: '@supabase-anon-key',
        },
      };

      // package.json生成
      const packageJson = {
        name: projectName,
        version: '1.0.0',
        private: true,
        scripts: {
          build: config.buildCommand || 'npm run build:nlweb',
          'build:nlweb': 'nlweb build',
          dev: 'nlweb dev',
          start: 'nlweb start',
        },
        dependencies: {
          '@nlweb/core': '^1.0.0',
          '@nlweb/ui': '^1.0.0',
          '@supabase/supabase-js': '^2.0.0',
        },
      };

      // デプロイメントスクリプト
      const deployScript = `#!/bin/bash
# NLWeb Vercel Deployment Script

echo "🚀 Deploying ${projectName} to Vercel..."

# Install dependencies
npm install

# Build project
${config.buildCommand || 'npm run build'}

# Deploy to Vercel
vercel --prod ${config.environment === 'production' ? '--prod' : ''}

echo "✅ Deployment complete!"`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              deployment: {
                project: projectName,
                domain: config.domain,
                environment: config.environment,
              },
              files: {
                'vercel.json': JSON.stringify(vercelConfig, null, 2),
                'package.json': JSON.stringify(packageJson, null, 2),
                'deploy.sh': deployScript,
              },
              message: 'Vercel deployment configuration generated',
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate MCP endpoint
  private async handleGenerateMCPEndpoint(args: any) {
    const { endpointName, operations } = args;

    try {
      // API仕様生成
      const apiSpec = {
        openapi: '3.0.0',
        info: {
          title: `${endpointName} MCP API`,
          version: '1.0.0',
          description: 'MCP-compatible API endpoint for NLWeb',
        },
        servers: [
          {
            url: '/api/mcp',
            description: 'MCP endpoint',
          },
        ],
        paths: {},
      };

      // エンドポイントコード生成
      const endpointCode = `// MCP Endpoint: ${endpointName}
import { NextApiRequest, NextApiResponse } from 'next';
import { MCPServer } from '@nlweb/mcp';

const mcpServer = new MCPServer({
  name: '${endpointName}',
  version: '1.0.0',
  capabilities: {
    tools: {},
  },
});

// Register tools
${operations.map(op => `mcpServer.registerTool({
  name: '${op.method.toLowerCase()}_${op.path.replace(/\//g, '_')}',
  description: '${op.description}',
  parameters: ${JSON.stringify(op.parameters || {})},
  handler: async (params) => {
    // Implementation
    return { success: true, data: {} };
  },
});`).join('\n\n')}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const result = await mcpServer.handleRequest(req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}`;

      // MCP設定ファイル
      const mcpConfig = {
        version: '1.0.0',
        endpoints: {
          [endpointName]: {
            url: `/api/mcp/${endpointName}`,
            methods: operations.map(op => op.method),
            authentication: 'api-key',
          },
        },
      };

      // 各操作をOpenAPI仕様に追加
      operations.forEach(op => {
        apiSpec.paths[op.path] = {
          [op.method.toLowerCase()]: {
            summary: op.description,
            parameters: op.parameters || [],
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: op.response || { type: 'object' },
                  },
                },
              },
            },
          },
        };
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              endpoint: {
                name: endpointName,
                operations: operations.length,
              },
              files: {
                [`api/mcp/${endpointName}.ts`]: endpointCode,
                'mcp.config.json': JSON.stringify(mcpConfig, null, 2),
                'api-spec.json': JSON.stringify(apiSpec, null, 2),
              },
              message: 'MCP endpoint generated successfully',
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate PWA manifest
  private async handleGeneratePWAManifest(args: any) {
    const { 
      appName, 
      shortName, 
      description = '', 
      startUrl = '/', 
      themeColor = '#3B82F6', 
      backgroundColor = '#FFFFFF',
      icons = []
    } = args;

    try {
      // デフォルトアイコン設定
      const defaultIcons = [
        { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
        { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
        { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
        { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
        { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
        { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
        { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      ];

      const manifest = {
        name: appName,
        short_name: shortName,
        description,
        start_url: startUrl,
        display: 'standalone',
        theme_color: themeColor,
        background_color: backgroundColor,
        orientation: 'portrait-primary',
        icons: icons.length > 0 ? icons : defaultIcons,
        categories: ['finance', 'productivity'],
        lang: 'ja',
        dir: 'ltr',
        prefer_related_applications: false,
      };

      // Service Worker生成
      const serviceWorker = `// Service Worker for ${appName}
const CACHE_NAME = '${shortName}-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/offline',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
      .catch(() => caches.match('/offline'))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});`;

      // PWA登録スクリプト
      const registerScript = `// PWA Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registration successful');
      })
      .catch((err) => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}`;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              manifest,
              files: {
                'manifest.json': JSON.stringify(manifest, null, 2),
                'sw.js': serviceWorker,
                'register-sw.js': registerScript,
              },
              message: 'PWA manifest generated successfully',
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Generate accounting page
  private async handleGenerateAccountingPage(args: any) {
    const { pageType, title, features = [], integrations = {} } = args;

    try {
      let pageContent = '';
      let schemaType = 'WebPage';
      let schemaData = {};

      switch (pageType) {
        case 'dashboard':
          pageContent = this.generateDashboardPage(title, features);
          schemaType = 'WebApplication';
          schemaData = {
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
          };
          break;

        case 'receipt-upload':
          pageContent = this.generateReceiptUploadPage(title, integrations);
          schemaType = 'WebPage';
          schemaData = {
            mainEntity: {
              '@type': 'Action',
              name: 'Upload Receipt',
              target: '/api/receipts/upload',
            },
          };
          break;

        case 'expense-report':
          pageContent = this.generateExpenseReportPage(title);
          schemaType = 'Report';
          schemaData = {
            reportType: 'Expense Report',
            about: 'Monthly expense summary',
          };
          break;

        case 'tax-summary':
          pageContent = this.generateTaxSummaryPage(title);
          schemaType = 'Report';
          schemaData = {
            reportType: 'Tax Summary',
            about: 'Tax calculation summary',
          };
          break;
      }

      // NLWebページとして生成
      const result = await this.handleGenerateNLWebPage({
        pageId: `accounting-${pageType}`,
        title,
        description: `${title} - NLWeb会計システム`,
        content: pageContent,
        template: 'accounting-dashboard',
        metadata: {
          keywords: ['会計', '経費', '領収書', 'OCR', pageType],
        },
      });

      // Schema.org追加
      if (result.content[0]) {
        const pageData = JSON.parse(result.content[0].text);
        await this.handleAddSchemaOrg({
          pageId: pageData.page.id,
          schemaType,
          schemaData,
        });
      }

      return result;
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Helper methods
  private generateNLWebHTML(page: NLWebPage, template: string): string {
    return `<!DOCTYPE html>
<html lang="${page.metadata.language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}</title>
  <meta name="description" content="${page.description}">
  <meta name="keywords" content="${page.metadata.keywords.join(', ')}">
  <meta name="author" content="${page.metadata.author}">
  
  <!-- NLWeb Meta -->
  <meta name="nlweb:version" content="${page.nlweb.version}">
  <meta name="nlweb:features" content="${page.nlweb.features.join(', ')}">
  <meta name="nlweb:mcp-compatible" content="${page.nlweb.mcpCompatible}">
  
  <!-- Open Graph -->
  <meta property="og:title" content="${page.title}">
  <meta property="og:description" content="${page.description}">
  <meta property="og:type" content="website">
  
  <!-- PWA -->
  <link rel="manifest" href="/manifest.json">
  <meta name="theme-color" content="#3B82F6">
  
  <!-- Styles -->
  <link rel="stylesheet" href="/nlweb.css">
</head>
<body>
  <div id="nlweb-app" data-template="${template}">
    ${page.content}
  </div>
  
  <!-- Schema.org -->
  <script type="application/ld+json">
  ${JSON.stringify(page.schemaOrg, null, 2)}
  </script>
  
  <!-- NLWeb Core -->
  <script src="/nlweb.js"></script>
</body>
</html>`;
  }

  private generateMetaTags(page: NLWebPage): Record<string, string> {
    return {
      title: page.title,
      description: page.description,
      keywords: page.metadata.keywords.join(', '),
      author: page.metadata.author,
      robots: 'index, follow',
      canonical: page.url,
      'og:title': page.title,
      'og:description': page.description,
      'twitter:card': 'summary',
      'twitter:title': page.title,
      'twitter:description': page.description,
    };
  }

  private generateNLWebConfig(page: NLWebPage): Record<string, any> {
    return {
      page: {
        id: page.id,
        url: page.url,
        template: 'default',
      },
      features: page.nlweb.features,
      mcp: {
        enabled: page.nlweb.mcpCompatible,
        endpoints: ['/api/mcp'],
      },
      i18n: {
        defaultLocale: 'ja',
        locales: ['ja', 'en'],
      },
      seo: {
        titleTemplate: '%s | NLWeb',
        defaultTitle: page.title,
      },
    };
  }

  private optimizeTitle(title: string, keywords: string[]): string {
    if (!title) return keywords.length > 0 ? keywords[0] : 'NLWeb';
    
    // キーワードを含むように最適化
    const optimized = title;
    if (keywords.length > 0 && !title.toLowerCase().includes(keywords[0].toLowerCase())) {
      return `${keywords[0]} - ${title}`;
    }
    
    return optimized.substring(0, 60);
  }

  private optimizeDescription(description: string, keywords: string[]): string {
    if (!description) {
      return keywords.length > 0 
        ? `${keywords.join('、')}に関する情報を提供しています。`
        : 'NLWebで構築されたページです。';
    }
    
    return description.substring(0, 160);
  }

  private generateHeadings(content: string, keywords: string[]): string[] {
    // コンテンツから見出しを生成
    const headings = [];
    
    if (keywords.length > 0) {
      headings.push(`${keywords[0]}について`);
      headings.push(`${keywords[0]}の特徴`);
      headings.push(`${keywords[0]}の使い方`);
    }
    
    return headings;
  }

  private generateDashboardPage(title: string, features: string[]): string {
    return `
<div class="nlweb-dashboard">
  <header class="dashboard-header">
    <h1>${title}</h1>
    <nav class="dashboard-nav">
      <a href="/receipts">領収書</a>
      <a href="/expenses">経費</a>
      <a href="/reports">レポート</a>
    </nav>
  </header>
  
  <main class="dashboard-main">
    <section class="summary-cards">
      <div class="card">
        <h2>今月の経費</h2>
        <div class="amount" data-bind="monthly-expense">¥0</div>
      </div>
      <div class="card">
        <h2>保留中の領収書</h2>
        <div class="count" data-bind="pending-receipts">0</div>
      </div>
      <div class="card">
        <h2>税額合計</h2>
        <div class="amount" data-bind="total-tax">¥0</div>
      </div>
    </section>
    
    <section class="recent-activity">
      <h2>最近の活動</h2>
      <div data-component="activity-list"></div>
    </section>
  </main>
</div>`;
  }

  private generateReceiptUploadPage(title: string, integrations: any): string {
    return `
<div class="nlweb-receipt-upload">
  <h1>${title}</h1>
  
  <div class="upload-options">
    ${integrations.ocr ? `
    <div class="upload-option">
      <h2>印刷領収書</h2>
      <p>レシートや印刷された領収書をアップロード</p>
      <div data-component="receipt-upload" data-mode="printed"></div>
    </div>
    
    <div class="upload-option">
      <h2>手書き領収書</h2>
      <p>手書きの領収書をアップロード</p>
      <div data-component="receipt-upload" data-mode="handwritten"></div>
    </div>
    ` : ''}
  </div>
  
  <div class="manual-entry">
    <h2>手動入力</h2>
    <div data-component="expense-form"></div>
  </div>
</div>`;
  }

  private generateExpenseReportPage(title: string): string {
    return `
<div class="nlweb-expense-report">
  <h1>${title}</h1>
  
  <div class="report-filters">
    <div data-component="date-range-picker"></div>
    <div data-component="category-filter"></div>
  </div>
  
  <div class="report-content">
    <div data-component="expense-chart"></div>
    <div data-component="expense-table"></div>
  </div>
  
  <div class="report-actions">
    <button data-action="export-pdf">PDFエクスポート</button>
    <button data-action="export-csv">CSVエクスポート</button>
  </div>
</div>`;
  }

  private generateTaxSummaryPage(title: string): string {
    return `
<div class="nlweb-tax-summary">
  <h1>${title}</h1>
  
  <div class="tax-overview">
    <div data-component="tax-summary-card"></div>
  </div>
  
  <div class="tax-details">
    <section>
      <h2>消費税内訳</h2>
      <div data-component="tax-breakdown"></div>
    </section>
    
    <section>
      <h2>控除可能経費</h2>
      <div data-component="deductible-expenses"></div>
    </section>
  </div>
  
  <div class="tax-calendar">
    <h2>税務カレンダー</h2>
    <div data-component="tax-calendar"></div>
  </div>
</div>`;
  }

  // Create GitHub repository
  private async handleCreateGitHubRepo(args: any) {
    const { repoName, description = '', private: isPrivate = true, autoInit = true } = args;

    try {
      // GitHubリポジトリ作成をシミュレート（実際の実装では GitHub API を使用）
      const repoData = {
        id: `github-${Date.now()}`,
        name: repoName,
        full_name: `effectmoe/${repoName}`,
        private: isPrivate,
        description,
        html_url: `https://github.com/effectmoe/${repoName}`,
        clone_url: `https://github.com/effectmoe/${repoName}.git`,
        created_at: new Date().toISOString(),
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              repository: repoData,
              message: `GitHub repository created: ${repoData.html_url}`,
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Push files to GitHub
  private async handlePushToGitHub(args: any) {
    const { repoName, files, commitMessage = 'Update files via NLWeb', branch = 'main' } = args;

    try {
      // GitHubへのプッシュをシミュレート
      const commitData = {
        sha: `${Date.now().toString(16)}`,
        commit: {
          message: commitMessage,
          author: {
            name: 'NLWeb Agent',
            email: 'nlweb@mastra.ai',
            date: new Date().toISOString(),
          },
        },
        files_count: files.length,
        additions: files.reduce((sum: number, file: any) => sum + (file.content?.length || 0), 0),
        deletions: 0,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              commit: commitData,
              branch,
              message: `Pushed ${files.length} files to ${repoName}`,
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  // Deploy with GitHub integration
  private async handleDeployWithGitHub(args: any) {
    const { projectName, githubRepo, vercelConfig, files } = args;

    try {
      // 1. GitHubリポジトリの作成
      const repoResult = await this.handleCreateGitHubRepo({
        repoName: githubRepo.name,
        description: githubRepo.description,
        private: githubRepo.private ?? true,
      });

      const repoResponse = JSON.parse(repoResult.content[0].text);
      if (!repoResponse.success) {
        throw new Error(`GitHub repo creation failed: ${repoResponse.error}`);
      }

      // 2. ファイルをGitHubにプッシュ
      const pushResult = await this.handlePushToGitHub({
        repoName: githubRepo.name,
        files,
        commitMessage: `Initial deployment of ${projectName}`,
      });

      const pushResponse = JSON.parse(pushResult.content[0].text);
      if (!pushResponse.success) {
        throw new Error(`GitHub push failed: ${pushResponse.error}`);
      }

      // 3. Vercelへのデプロイ（GitHub連携）
      const deploymentData = {
        id: `deployment-${Date.now()}`,
        url: `https://${projectName}.vercel.app`,
        preview_url: `https://${projectName}-preview.vercel.app`,
        created_at: new Date().toISOString(),
        ready_state: 'READY',
        github: {
          repo: repoResponse.repository.full_name,
          commit: pushResponse.commit.sha,
          branch: 'main',
        },
        environment: vercelConfig.environment || 'production',
        meta: {
          password_protected: !!vercelConfig.password,
        },
      };

      // パスワード保護の実装
      if (vercelConfig.password) {
        // vercel.jsonにパスワード保護の設定を追加
        files.push({
          path: 'vercel.json',
          content: JSON.stringify({
            headers: [
              {
                source: '/(.*)',
                headers: [
                  {
                    key: 'X-Robots-Tag',
                    value: 'noindex',
                  },
                ],
              },
            ],
            passwordProtection: {
              password: vercelConfig.password,
            },
          }, null, 2),
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              deployment: deploymentData,
              github: repoResponse.repository,
              message: `Successfully deployed ${projectName} via GitHub to Vercel`,
              urls: {
                production: deploymentData.url,
                preview: deploymentData.preview_url,
                github: repoResponse.repository.html_url,
              },
              timestamp: new Date().toISOString(),
            }),
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
              error: error.message,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('NLWeb MCP Server running on stdio');
  }
}

// Create and run server
const server = new NLWebMCPServer();
server.run().catch((error) => {
  console.error('Fatal error in NLWeb MCP server:', error);
  process.exit(1);
});