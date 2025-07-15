#!/usr/bin/env node

/**
 * Enhanced Firecrawl MCP Server
 * Firecrawl Web Scraping機能をMCPプロトコル経由で提供（拡張版）
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
  CallToolResult,
} from '@modelcontextprotocol/sdk/types.js';
import { FirecrawlClient } from '../../lib/firecrawl-client';

const ENHANCED_FIRECRAWL_TOOLS: Tool[] = [
  {
    name: 'firecrawl_scrape',
    description: 'Webページをスクレイピング（基本機能）',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'スクレイピング対象のURL',
        },
        formats: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['markdown', 'html', 'rawHtml', 'content', 'links', 'screenshot'],
          },
          optional: true,
          description: '取得形式（デフォルト: ["markdown", "content"]）',
        },
        onlyMainContent: {
          type: 'boolean',
          optional: true,
          description: 'メインコンテンツのみ取得（デフォルト: true）',
        },
        includeTags: {
          type: 'array',
          items: { type: 'string' },
          optional: true,
          description: '含めるHTMLタグ',
        },
        excludeTags: {
          type: 'array',
          items: { type: 'string' },
          optional: true,
          description: '除外するHTMLタグ',
        },
        timeout: {
          type: 'number',
          optional: true,
          description: 'タイムアウト（ミリ秒）',
        },
        waitFor: {
          type: 'number',
          optional: true,
          description: '待機時間（ミリ秒）',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'firecrawl_crawl',
    description: '複数ページのクロール',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'クロール開始URL',
        },
        limit: {
          type: 'number',
          optional: true,
          description: 'クロールページ数制限（デフォルト: 100）',
        },
        allowBackwardLinks: {
          type: 'boolean',
          optional: true,
          description: '逆方向リンクを許可',
        },
        allowExternalLinks: {
          type: 'boolean',
          optional: true,
          description: '外部リンクを許可',
        },
        ignoreSitemap: {
          type: 'boolean',
          optional: true,
          description: 'サイトマップを無視',
        },
        webhook: {
          type: 'string',
          optional: true,
          description: 'Webhook URL',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'firecrawl_search',
    description: 'Web検索（Firecrawl Search機能）',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '検索クエリ',
        },
        pageOptions: {
          type: 'object',
          optional: true,
          properties: {
            onlyMainContent: { type: 'boolean', optional: true },
            includeHtml: { type: 'boolean', optional: true },
            fetchPageContent: { type: 'boolean', optional: true },
          },
        },
        searchOptions: {
          type: 'object',
          optional: true,
          properties: {
            limit: { type: 'number', optional: true },
          },
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'firecrawl_analyze_competitor',
    description: '競合他社サイトの分析',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '分析対象サイトのURL',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'firecrawl_crawl_sitemap',
    description: 'サイトマップベースのクロール',
    inputSchema: {
      type: 'object',
      properties: {
        sitemapUrl: {
          type: 'string',
          description: 'サイトマップのURL',
        },
        limit: {
          type: 'number',
          optional: true,
          description: 'クロール制限（デフォルト: 20）',
        },
        includePatterns: {
          type: 'array',
          items: { type: 'string' },
          optional: true,
          description: '含めるURLパターン',
        },
        excludePatterns: {
          type: 'array',
          items: { type: 'string' },
          optional: true,
          description: '除外するURLパターン',
        },
      },
      required: ['sitemapUrl'],
    },
  },
  {
    name: 'firecrawl_bulk_scrape',
    description: '複数URLの一括スクレイピング',
    inputSchema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          description: 'スクレイピング対象のURLリスト（最大10件）',
        },
        dataTargets: {
          type: 'array',
          items: { type: 'string' },
          description: '抽出したいデータの種類（例: pricing, contact, features）',
        },
        format: {
          type: 'string',
          enum: ['structured', 'raw', 'summary'],
          optional: true,
          description: '出力形式（デフォルト: structured）',
        },
      },
      required: ['urls', 'dataTargets'],
    },
  },
  {
    name: 'firecrawl_get_credits',
    description: 'Firecrawl APIクレジット残高確認',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'firecrawl_health_check',
    description: 'Firecrawl API接続テスト',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'firecrawl_extract_data',
    description: '特定データの抽出（価格、連絡先、機能等）',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'データ抽出対象のURL',
        },
        extractionTargets: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['pricing', 'contact', 'features', 'products', 'services', 'about', 'team', 'testimonials'],
          },
          description: '抽出対象データの種類',
        },
        customTargets: {
          type: 'array',
          items: { type: 'string' },
          optional: true,
          description: 'カスタム抽出対象（キーワード）',
        },
      },
      required: ['url', 'extractionTargets'],
    },
  },
  {
    name: 'firecrawl_competitive_analysis',
    description: '競合比較分析',
    inputSchema: {
      type: 'object',
      properties: {
        competitorUrls: {
          type: 'array',
          items: { type: 'string' },
          description: '競合サイトのURLリスト（最大5件）',
        },
        analysisAspects: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['pricing', 'features', 'content', 'design', 'performance', 'seo'],
          },
          description: '分析観点',
        },
        includeScreenshots: {
          type: 'boolean',
          optional: true,
          description: 'スクリーンショットを含める',
        },
      },
      required: ['competitorUrls', 'analysisAspects'],
    },
  },
];

class EnhancedFirecrawlMCPServer {
  private server: Server;
  private firecrawlClient: FirecrawlClient;

  constructor() {
    this.server = new Server(
      {
        name: 'enhanced-firecrawl-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.firecrawlClient = new FirecrawlClient();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: ENHANCED_FIRECRAWL_TOOLS,
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'firecrawl_scrape':
            return await this.handleScrape(args);
          case 'firecrawl_crawl':
            return await this.handleCrawl(args);
          case 'firecrawl_search':
            return await this.handleSearch(args);
          case 'firecrawl_analyze_competitor':
            return await this.handleAnalyzeCompetitor(args);
          case 'firecrawl_crawl_sitemap':
            return await this.handleCrawlSitemap(args);
          case 'firecrawl_bulk_scrape':
            return await this.handleBulkScrape(args);
          case 'firecrawl_get_credits':
            return await this.handleGetCredits(args);
          case 'firecrawl_health_check':
            return await this.handleHealthCheck(args);
          case 'firecrawl_extract_data':
            return await this.handleExtractData(args);
          case 'firecrawl_competitive_analysis':
            return await this.handleCompetitiveAnalysis(args);
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

  private async handleScrape(args: any): Promise<CallToolResult> {
    const result = await this.firecrawlClient.scrape(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            url: args.url,
            data: result.data,
            error: result.error,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleCrawl(args: any): Promise<CallToolResult> {
    const result = await this.firecrawlClient.crawl(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            url: args.url,
            total: result.total,
            creditsUsed: result.creditsUsed,
            expiresAt: result.expiresAt,
            pages: result.data?.length || 0,
            data: result.data?.slice(0, 5), // 最初の5件のみ表示
            error: result.error,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleSearch(args: any): Promise<CallToolResult> {
    const result = await this.firecrawlClient.search(args);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            query: args.query,
            results: result.data?.length || 0,
            data: result.data,
            error: result.error,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleAnalyzeCompetitor(args: any): Promise<CallToolResult> {
    const { url } = args;
    const result = await this.firecrawlClient.analyzeCompetitorSite(url);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            url,
            analysis: result.analysis,
            error: result.error,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleCrawlSitemap(args: any): Promise<CallToolResult> {
    const { sitemapUrl, limit = 20, includePatterns, excludePatterns } = args;
    
    const result = await this.firecrawlClient.crawlSitemap(sitemapUrl, {
      limit,
      includePatterns,
      excludePatterns,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: result.success,
            sitemapUrl,
            total: result.total,
            pages: result.data?.length || 0,
            data: result.data?.slice(0, 10), // 最初の10件のみ表示
            error: result.error,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleBulkScrape(args: any): Promise<CallToolResult> {
    const { urls, dataTargets, format = 'structured' } = args;

    if (urls.length > 10) {
      throw new Error('Maximum 10 URLs allowed for bulk scraping');
    }

    const scrapePromises = urls.map((url: string) => 
      this.firecrawlClient.scrape({
        url,
        formats: ['content', 'links'],
        onlyMainContent: true,
      })
    );

    const results = await Promise.all(scrapePromises);
    const successfulResults = results.filter(result => result.success);

    // データターゲットに基づく情報抽出
    const extractedData = successfulResults.map(result => {
      const content = result.data?.content || '';
      const links = result.data?.links || [];
      
      const extracted: Record<string, any> = {
        url: result.data?.metadata.sourceURL,
        title: result.data?.metadata.title,
      };

      dataTargets.forEach((target: string) => {
        switch (target.toLowerCase()) {
          case 'pricing':
          case '価格':
            const priceMatches = content.match(/[\$¥€]\s*[\d,]+(?:\.\d{2})?|\d+\s*円/g);
            extracted.pricing = priceMatches?.slice(0, 5) || [];
            break;
            
          case 'contact':
          case '連絡先':
            const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
            const phoneMatches = content.match(/\+?[\d\-\(\)\s]{10,}/g);
            extracted.contact = {
              emails: emailMatches?.slice(0, 3) || [],
              phones: phoneMatches?.slice(0, 3) || [],
            };
            break;
            
          case 'features':
          case '機能':
            const featureKeywords = ['feature', 'function', '機能', '特徴', 'benefit', 'advantage'];
            const featureLines = content.split('\n').filter(line => 
              featureKeywords.some(keyword => line.toLowerCase().includes(keyword))
            );
            extracted.features = featureLines.slice(0, 10);
            break;
            
          case 'links':
          case 'リンク':
            extracted.links = links.slice(0, 20);
            break;
            
          default:
            // カスタムキーワード検索
            const customMatches = content.match(new RegExp(target, 'gi'));
            extracted[target] = customMatches?.slice(0, 5) || [];
        }
      });

      return extracted;
    });

    let finalResult;
    switch (format) {
      case 'structured':
        finalResult = {
          summary: {
            totalUrls: urls.length,
            successfulScrapes: successfulResults.length,
            dataTargets,
          },
          data: extractedData,
        };
        break;
        
      case 'raw':
        finalResult = {
          rawData: successfulResults.map(result => ({
            url: result.data?.metadata.sourceURL,
            content: result.data?.content,
            metadata: result.data?.metadata,
          })),
        };
        break;
        
      case 'summary':
        const allContent = successfulResults.map(r => r.data?.content).join('\n\n');
        finalResult = {
          summary: {
            totalUrls: urls.length,
            successfulScrapes: successfulResults.length,
            totalWordCount: allContent.split(/\s+/).length,
            contentPreview: allContent.substring(0, 1000) + '...',
          },
          keyFindings: extractedData,
        };
        break;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            format,
            dataTargets,
            result: finalResult,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleGetCredits(args: any): Promise<CallToolResult> {
    const result = await this.firecrawlClient.getCreditBalance();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            balance: result.balance,
            error: result.error,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleHealthCheck(args: any): Promise<CallToolResult> {
    const result = await this.firecrawlClient.testConnection();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            available: result.available,
            error: result.error,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleExtractData(args: any): Promise<CallToolResult> {
    const { url, extractionTargets, customTargets = [] } = args;

    const scrapeResult = await this.firecrawlClient.scrape({
      url,
      formats: ['content', 'links'],
      onlyMainContent: true,
    });

    if (!scrapeResult.success) {
      throw new Error(scrapeResult.error || 'Failed to scrape URL');
    }

    const content = scrapeResult.data?.content || '';
    const links = scrapeResult.data?.links || [];
    const extractedData: Record<string, any> = {};

    // 標準抽出対象
    extractionTargets.forEach((target: string) => {
      switch (target) {
        case 'pricing':
          const priceMatches = content.match(/[\$¥€]\s*[\d,]+(?:\.\d{2})?|\d+\s*円/g);
          extractedData.pricing = priceMatches?.slice(0, 10) || [];
          break;
          
        case 'contact':
          const emailMatches = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
          const phoneMatches = content.match(/\+?[\d\-\(\)\s]{10,}/g);
          extractedData.contact = {
            emails: emailMatches?.slice(0, 5) || [],
            phones: phoneMatches?.slice(0, 5) || [],
          };
          break;
          
        case 'features':
          const featureKeywords = ['feature', 'function', '機能', '特徴', 'benefit', 'advantage'];
          const featureLines = content.split('\n').filter(line => 
            featureKeywords.some(keyword => line.toLowerCase().includes(keyword))
          );
          extractedData.features = featureLines.slice(0, 15);
          break;
          
        case 'products':
        case 'services':
          const productKeywords = target === 'products' ? 
            ['product', 'item', '商品', '製品'] : 
            ['service', 'solution', 'サービス', 'ソリューション'];
          const productLines = content.split('\n').filter(line => 
            productKeywords.some(keyword => line.toLowerCase().includes(keyword))
          );
          extractedData[target] = productLines.slice(0, 15);
          break;
          
        case 'about':
          const aboutSection = content.match(/about.{0,500}/gi);
          extractedData.about = aboutSection?.slice(0, 3) || [];
          break;
          
        case 'team':
          const teamKeywords = ['team', 'staff', 'member', 'チーム', 'スタッフ', 'メンバー'];
          const teamLines = content.split('\n').filter(line => 
            teamKeywords.some(keyword => line.toLowerCase().includes(keyword))
          );
          extractedData.team = teamLines.slice(0, 10);
          break;
          
        case 'testimonials':
          const testimonialKeywords = ['testimonial', 'review', 'feedback', 'お客様の声', 'レビュー'];
          const testimonialLines = content.split('\n').filter(line => 
            testimonialKeywords.some(keyword => line.toLowerCase().includes(keyword))
          );
          extractedData.testimonials = testimonialLines.slice(0, 10);
          break;
      }
    });

    // カスタム抽出対象
    customTargets.forEach((target: string) => {
      const customMatches = content.match(new RegExp(target, 'gi'));
      extractedData[`custom_${target}`] = customMatches?.slice(0, 10) || [];
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            url,
            extractionTargets,
            customTargets,
            extractedData,
            metadata: {
              title: scrapeResult.data?.metadata.title,
              description: scrapeResult.data?.metadata.description,
              contentLength: content.length,
              linkCount: links.length,
            },
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private async handleCompetitiveAnalysis(args: any): Promise<CallToolResult> {
    const { competitorUrls, analysisAspects, includeScreenshots = false } = args;

    if (competitorUrls.length > 5) {
      throw new Error('Maximum 5 competitor URLs allowed');
    }

    const analysisPromises = competitorUrls.map(async (url: string) => {
      try {
        const analysis = await this.firecrawlClient.analyzeCompetitorSite(url);
        return {
          url,
          success: analysis.success,
          analysis: analysis.analysis,
          error: analysis.error,
        };
      } catch (error) {
        return {
          url,
          success: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
        };
      }
    });

    const results = await Promise.all(analysisPromises);
    const successfulAnalyses = results.filter(r => r.success);

    // 比較分析の実行
    const comparison: Record<string, any> = {};

    analysisAspects.forEach((aspect: string) => {
      switch (aspect) {
        case 'pricing':
          comparison.pricing = successfulAnalyses.map(result => ({
            url: result.url,
            pricing: this.extractPricingInfo(result.analysis?.content || ''),
          }));
          break;
          
        case 'features':
          comparison.features = successfulAnalyses.map(result => ({
            url: result.url,
            features: this.extractFeatures(result.analysis?.content || ''),
          }));
          break;
          
        case 'content':
          comparison.content = successfulAnalyses.map(result => ({
            url: result.url,
            wordCount: result.analysis?.technicalInfo?.wordCount || 0,
            title: result.analysis?.title || '',
            description: result.analysis?.description || '',
          }));
          break;
          
        case 'design':
          comparison.design = successfulAnalyses.map(result => ({
            url: result.url,
            linkCount: result.analysis?.technicalInfo?.linkCount || 0,
            keyPages: result.analysis?.keyPages?.length || 0,
          }));
          break;
          
        case 'performance':
          comparison.performance = successfulAnalyses.map(result => ({
            url: result.url,
            statusCode: result.analysis?.technicalInfo?.statusCode || 0,
            language: result.analysis?.technicalInfo?.language || 'unknown',
          }));
          break;
          
        case 'seo':
          comparison.seo = successfulAnalyses.map(result => ({
            url: result.url,
            title: result.analysis?.title || '',
            description: result.analysis?.description || '',
            contentLength: result.analysis?.technicalInfo?.wordCount || 0,
          }));
          break;
      }
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            competitorUrls,
            analysisAspects,
            summary: {
              totalCompetitors: competitorUrls.length,
              successfulAnalyses: successfulAnalyses.length,
              failedAnalyses: results.length - successfulAnalyses.length,
            },
            comparison,
            rawResults: results,
            timestamp: new Date().toISOString(),
          }, null, 2),
        },
      ],
    };
  }

  private extractPricingInfo(content: string): string[] {
    const priceMatches = content.match(/[\$¥€]\s*[\d,]+(?:\.\d{2})?|\d+\s*円/g);
    return priceMatches?.slice(0, 5) || [];
  }

  private extractFeatures(content: string): string[] {
    const featureKeywords = ['feature', 'function', '機能', '特徴', 'benefit', 'advantage'];
    const featureLines = content.split('\n').filter(line => 
      featureKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    return featureLines.slice(0, 10);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Enhanced Firecrawl MCP Server running on stdio');
  }
}

// メイン実行
if (require.main === module) {
  const server = new EnhancedFirecrawlMCPServer();
  server.run().catch((error) => {
    console.error('Failed to run Enhanced Firecrawl MCP Server:', error);
    process.exit(1);
  });
}

export { EnhancedFirecrawlMCPServer };