import { z } from 'zod';
import { Agent } from '@mastra/core';
import { spawn } from 'child_process';
import path from 'path';

// NLWeb操作結果のスキーマ
const nlwebResultSchema = z.object({
  success: z.boolean(),
  operation: z.string(),
  page: z.any().optional(),
  files: z.any().optional(),
  deployment: z.any().optional(),
  analysis: z.any().optional(),
  endpoint: z.any().optional(),
  manifest: z.any().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.string(),
});

// NLWebエージェントの入力スキーマ
const nlwebInputSchema = z.object({
  operation: z.enum([
    'generate_page',
    'add_schema',
    'optimize_seo',
    'generate_sitemap',
    'deploy',
    'generate_mcp_endpoint',
    'generate_pwa',
    'generate_accounting_page',
    'publish_content',
    'deploy_with_github'
  ]),
  
  // ページ生成用
  pageConfig: z.object({
    pageId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    content: z.string(),
    template: z.string().optional(),
    metadata: z.object({
      keywords: z.array(z.string()).optional(),
      author: z.string().optional(),
    }).optional(),
  }).optional(),
  
  // Schema.org追加用
  schemaConfig: z.object({
    pageId: z.string(),
    schemaType: z.string(),
    schemaData: z.any(),
  }).optional(),
  
  // SEO最適化用
  seoConfig: z.object({
    pageId: z.string(),
    targetKeywords: z.array(z.string()).optional(),
    locale: z.string().optional(),
  }).optional(),
  
  // サイトマップ生成用
  sitemapConfig: z.object({
    domain: z.string(),
    pages: z.array(z.object({
      url: z.string(),
      priority: z.number().optional(),
      changefreq: z.string().optional(),
    })).optional(),
  }).optional(),
  
  // デプロイ用
  deployConfig: z.object({
    projectName: z.string(),
    config: z.object({
      domain: z.string(),
      environment: z.enum(['development', 'staging', 'production']),
      buildCommand: z.string().optional(),
      outputDirectory: z.string().optional(),
    }),
    files: z.array(z.any()).optional(),
  }).optional(),
  
  // MCPエンドポイント生成用
  mcpEndpointConfig: z.object({
    endpointName: z.string(),
    operations: z.array(z.object({
      method: z.string(),
      path: z.string(),
      description: z.string(),
      parameters: z.array(z.any()).optional(),
      response: z.any().optional(),
    })),
  }).optional(),
  
  // PWA生成用
  pwaConfig: z.object({
    appName: z.string(),
    shortName: z.string(),
    description: z.string().optional(),
    startUrl: z.string().optional(),
    themeColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    icons: z.array(z.any()).optional(),
  }).optional(),
  
  // 会計ページ生成用
  accountingPageConfig: z.object({
    pageType: z.enum(['dashboard', 'receipt-upload', 'expense-report', 'tax-summary']),
    title: z.string(),
    features: z.array(z.string()).optional(),
    integrations: z.object({
      ocr: z.boolean().optional(),
      accounting: z.boolean().optional(),
      database: z.boolean().optional(),
    }).optional(),
  }).optional(),
  
  // コンテンツ公開用（処理結果から）
  publishConfig: z.object({
    contentType: z.enum(['receipt_result', 'expense_report', 'tax_summary']),
    data: z.any(),
    targetUrl: z.string().optional(),
    autoPublish: z.boolean().default(false),
  }).optional(),
  
  // GitHub統合デプロイ用
  deployWithGitHubConfig: z.object({
    projectName: z.string(),
    githubRepo: z.object({
      name: z.string(),
      description: z.string().optional(),
      private: z.boolean().default(true),
    }),
    vercelConfig: z.object({
      domain: z.string(),
      environment: z.enum(['development', 'staging', 'production']).default('production'),
      password: z.string().optional(),
    }),
    files: z.array(z.object({
      path: z.string(),
      content: z.string(),
    })),
  }).optional(),
});

// MCP Client for NLWeb MCP Server
class NLWebMCPClient {
  async callTool(toolName: string, args: any): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const mcpServerPath = path.join(__dirname, '../mcp-servers/nlweb-mcp-server.ts');
        
        // Start MCP server process
        const mcpProcess = spawn('npx', ['tsx', mcpServerPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let responseData = '';
        let errorData = '';

        // Prepare MCP request
        const request = {
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: toolName,
            arguments: args,
          },
        };

        // Send request to MCP server
        mcpProcess.stdin.write(JSON.stringify(request) + '\n');
        mcpProcess.stdin.end();

        // Handle response
        mcpProcess.stdout.on('data', (data) => {
          responseData += data.toString();
        });

        mcpProcess.stderr.on('data', (data) => {
          errorData += data.toString();
        });

        mcpProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`NLWeb MCP Server exited with code ${code}: ${errorData}`));
            return;
          }

          try {
            // Parse response
            const lines = responseData.trim().split('\n');
            let result = null;

            for (const line of lines) {
              try {
                const parsed = JSON.parse(line);
                if (parsed.result) {
                  result = parsed.result;
                  break;
                }
              } catch (e) {
                continue;
              }
            }

            if (result && result.content && result.content[0]) {
              const content = JSON.parse(result.content[0].text);
              resolve(content);
            } else {
              reject(new Error('Invalid MCP response format'));
            }
          } catch (error) {
            reject(new Error(`Failed to parse MCP response: ${error.message}`));
          }
        });

        mcpProcess.on('error', (error) => {
          reject(new Error(`NLWeb MCP Server process error: ${error.message}`));
        });

        // Timeout
        setTimeout(() => {
          mcpProcess.kill();
          reject(new Error('NLWeb MCP Server request timeout'));
        }, 30000);

      } catch (error) {
        reject(new Error(`NLWeb MCP Client error: ${error.message}`));
      }
    });
  }
}

// NLWebエージェント定義
export const nlwebAgent = new Agent({
  id: 'nlweb-agent',
  name: 'NLWeb Framework Agent with MCP Integration',
  description: 'Generate and manage NLWeb-compliant websites',
  model: {
    provider: 'OPENAI',
    name: 'gpt-4',
    toolChoice: 'auto',
  },
  inputSchema: nlwebInputSchema,
  outputSchema: nlwebResultSchema,
  
  tools: {
    // ページ生成
    generatePage: {
      description: 'Generate an NLWeb-compliant page',
      execute: async (config) => {
        const mcpClient = new NLWebMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_nlweb_page', config);
          return result;
        } catch (error) {
          throw new Error(`Page generation failed: ${error.message}`);
        }
      },
    },

    // Schema.org追加
    addSchemaOrg: {
      description: 'Add Schema.org structured data',
      execute: async (config) => {
        const mcpClient = new NLWebMCPClient();
        
        try {
          const result = await mcpClient.callTool('add_schema_org', config);
          return result;
        } catch (error) {
          throw new Error(`Schema.org addition failed: ${error.message}`);
        }
      },
    },

    // SEO最適化
    optimizeSEO: {
      description: 'Optimize page for SEO',
      execute: async (config) => {
        const mcpClient = new NLWebMCPClient();
        
        try {
          const result = await mcpClient.callTool('optimize_seo', config);
          return result;
        } catch (error) {
          throw new Error(`SEO optimization failed: ${error.message}`);
        }
      },
    },

    // サイトマップ生成
    generateSitemap: {
      description: 'Generate XML sitemap',
      execute: async (config) => {
        const mcpClient = new NLWebMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_sitemap', config);
          return result;
        } catch (error) {
          throw new Error(`Sitemap generation failed: ${error.message}`);
        }
      },
    },

    // Vercelデプロイ
    deployToVercel: {
      description: 'Deploy to Vercel',
      execute: async (config) => {
        const mcpClient = new NLWebMCPClient();
        
        try {
          const result = await mcpClient.callTool('deploy_to_vercel', config);
          return result;
        } catch (error) {
          throw new Error(`Vercel deployment failed: ${error.message}`);
        }
      },
    },

    // MCPエンドポイント生成
    generateMCPEndpoint: {
      description: 'Generate MCP-compatible endpoint',
      execute: async (config) => {
        const mcpClient = new NLWebMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_mcp_endpoint', config);
          return result;
        } catch (error) {
          throw new Error(`MCP endpoint generation failed: ${error.message}`);
        }
      },
    },

    // PWAマニフェスト生成
    generatePWAManifest: {
      description: 'Generate PWA manifest',
      execute: async (config) => {
        const mcpClient = new NLWebMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_pwa_manifest', config);
          return result;
        } catch (error) {
          throw new Error(`PWA manifest generation failed: ${error.message}`);
        }
      },
    },

    // 会計ページ生成
    generateAccountingPage: {
      description: 'Generate accounting system page',
      execute: async (config) => {
        const mcpClient = new NLWebMCPClient();
        
        try {
          const result = await mcpClient.callTool('generate_accounting_page', config);
          return result;
        } catch (error) {
          throw new Error(`Accounting page generation failed: ${error.message}`);
        }
      },
    },

    // 処理結果公開
    publishProcessingResult: {
      description: 'Publish processing result to NLWeb',
      execute: async ({ contentType, data, targetUrl, autoPublish }) => {
        // 処理結果をNLWebページとして公開
        const mcpClient = new NLWebMCPClient();
        
        try {
          let pageContent = '';
          let pageTitle = '';
          let schemaType = 'WebPage';
          let schemaData = {};

          switch (contentType) {
            case 'receipt_result':
              pageTitle = `領収書処理結果 - ${data.vendor_name}`;
              pageContent = `
<div class="receipt-result">
  <h1>${pageTitle}</h1>
  <div class="result-summary">
    <dl>
      <dt>店舗名</dt><dd>${data.vendor_name}</dd>
      <dt>日付</dt><dd>${data.date}</dd>
      <dt>金額</dt><dd>¥${data.total_amount.toLocaleString()}</dd>
      <dt>カテゴリ</dt><dd>${data.category}</dd>
    </dl>
  </div>
  <div class="journal-entries">
    <h2>仕訳</h2>
    ${data.journal_entries ? JSON.stringify(data.journal_entries) : ''}
  </div>
</div>`;
              schemaType = 'Invoice';
              schemaData = {
                identifier: data.receipt_id,
                totalPaymentDue: data.total_amount,
                paymentDueDate: data.date,
              };
              break;

            case 'expense_report':
              pageTitle = `経費レポート - ${data.period}`;
              pageContent = `
<div class="expense-report">
  <h1>${pageTitle}</h1>
  <div class="report-content">
    ${JSON.stringify(data)}
  </div>
</div>`;
              schemaType = 'Report';
              schemaData = {
                reportType: 'ExpenseReport',
                temporalCoverage: data.period,
              };
              break;

            case 'tax_summary':
              pageTitle = `税務サマリー - ${data.period}`;
              pageContent = `
<div class="tax-summary">
  <h1>${pageTitle}</h1>
  <div class="summary-content">
    ${JSON.stringify(data)}
  </div>
</div>`;
              schemaType = 'Report';
              schemaData = {
                reportType: 'TaxReport',
                temporalCoverage: data.period,
              };
              break;
          }

          // NLWebページ生成
          const pageResult = await mcpClient.callTool('generate_nlweb_page', {
            pageId: `${contentType}-${Date.now()}`,
            title: pageTitle,
            content: pageContent,
            template: 'report-page',
            metadata: {
              keywords: [contentType, '会計', 'レポート'],
            },
          });

          if (pageResult.success && pageResult.page) {
            // Schema.org追加
            await mcpClient.callTool('add_schema_org', {
              pageId: pageResult.page.id,
              schemaType,
              schemaData,
            });

            // 自動公開が有効な場合
            if (autoPublish && targetUrl) {
              // デプロイ設定を生成
              const deployResult = await mcpClient.callTool('deploy_to_vercel', {
                projectName: 'accounting-reports',
                config: {
                  domain: targetUrl,
                  environment: 'production',
                },
                files: pageResult.files,
              });

              return {
                success: true,
                page: pageResult.page,
                deployment: deployResult.deployment,
                message: 'Content published successfully',
              };
            }
          }

          return {
            success: pageResult.success,
            page: pageResult.page,
            files: pageResult.files,
            message: 'Content prepared for publishing',
          };

        } catch (error) {
          throw new Error(`Content publishing failed: ${error.message}`);
        }
      },
    },

    // GitHub→Vercel統合デプロイ
    deployWithGitHub: {
      description: 'Deploy via GitHub to Vercel',
      execute: async ({ projectName, githubRepo, vercelConfig, files }) => {
        const mcpClient = new NLWebMCPClient();
        
        try {
          const result = await mcpClient.callTool('deploy_with_github', {
            projectName,
            githubRepo,
            vercelConfig,
            files,
          });

          return result;
        } catch (error) {
          throw new Error(`GitHub deployment failed: ${error.message}`);
        }
      },
    },
  },
  
  // メイン実行ロジック
  execute: async ({ input, tools }) => {
    try {
      console.log('🌐 [NLWeb Agent] Starting NLWeb operation:', input.operation);

      switch (input.operation) {
        case 'generate_page': {
          if (!input.pageConfig) {
            throw new Error('Page configuration is required');
          }

          const result = await tools.generatePage(input.pageConfig);

          return {
            success: result.success,
            operation: 'generate_page',
            page: result.page,
            files: result.files,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'add_schema': {
          if (!input.schemaConfig) {
            throw new Error('Schema configuration is required');
          }

          const result = await tools.addSchemaOrg(input.schemaConfig);

          return {
            success: result.success,
            operation: 'add_schema',
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'optimize_seo': {
          if (!input.seoConfig) {
            throw new Error('SEO configuration is required');
          }

          const result = await tools.optimizeSEO(input.seoConfig);

          return {
            success: result.success,
            operation: 'optimize_seo',
            analysis: result.analysis,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_sitemap': {
          if (!input.sitemapConfig) {
            throw new Error('Sitemap configuration is required');
          }

          const result = await tools.generateSitemap(input.sitemapConfig);

          return {
            success: result.success,
            operation: 'generate_sitemap',
            files: result.files,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'deploy': {
          if (!input.deployConfig) {
            throw new Error('Deploy configuration is required');
          }

          const result = await tools.deployToVercel(input.deployConfig);

          return {
            success: result.success,
            operation: 'deploy',
            deployment: result.deployment,
            files: result.files,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_mcp_endpoint': {
          if (!input.mcpEndpointConfig) {
            throw new Error('MCP endpoint configuration is required');
          }

          const result = await tools.generateMCPEndpoint(input.mcpEndpointConfig);

          return {
            success: result.success,
            operation: 'generate_mcp_endpoint',
            endpoint: result.endpoint,
            files: result.files,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_pwa': {
          if (!input.pwaConfig) {
            throw new Error('PWA configuration is required');
          }

          const result = await tools.generatePWAManifest(input.pwaConfig);

          return {
            success: result.success,
            operation: 'generate_pwa',
            manifest: result.manifest,
            files: result.files,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'generate_accounting_page': {
          if (!input.accountingPageConfig) {
            throw new Error('Accounting page configuration is required');
          }

          const result = await tools.generateAccountingPage(input.accountingPageConfig);

          return {
            success: result.success,
            operation: 'generate_accounting_page',
            page: result.page,
            files: result.files,
            message: result.message,
            timestamp: result.timestamp,
            error: result.error,
          };
        }

        case 'publish_content': {
          if (!input.publishConfig) {
            throw new Error('Publish configuration is required');
          }

          const result = await tools.publishProcessingResult({
            contentType: input.publishConfig.contentType,
            data: input.publishConfig.data,
            targetUrl: input.publishConfig.targetUrl,
            autoPublish: input.publishConfig.autoPublish,
          });

          return {
            success: result.success,
            operation: 'publish_content',
            page: result.page,
            deployment: result.deployment,
            files: result.files,
            message: result.message,
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        case 'deploy_with_github': {
          if (!input.deployWithGitHubConfig) {
            throw new Error('Deploy with GitHub configuration is required');
          }

          const result = await tools.deployWithGitHub({
            projectName: input.deployWithGitHubConfig.projectName,
            githubRepo: input.deployWithGitHubConfig.githubRepo,
            vercelConfig: input.deployWithGitHubConfig.vercelConfig,
            files: input.deployWithGitHubConfig.files,
          });

          return {
            success: result.success,
            operation: 'deploy_with_github',
            deployment: result.deployment,
            message: result.message,
            timestamp: new Date().toISOString(),
            error: result.error,
          };
        }

        default:
          throw new Error(`Unknown operation: ${input.operation}`);
      }

    } catch (error) {
      console.error('❌ [NLWeb Agent] Operation failed:', error);
      return {
        success: false,
        operation: input.operation || 'unknown',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  },
});

export default nlwebAgent;