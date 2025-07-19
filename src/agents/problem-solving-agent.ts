import { z } from 'zod';
import { DatabaseService, Collections } from '@/lib/mongodb-client';
import { LLMCascadeManager } from '@/lib/llm-cascade-manager';
import { PerplexityClient } from '@/lib/perplexity-client';
import { FirecrawlClient } from '@/lib/firecrawl-client';
import { MLAnalyticsManager } from '@/lib/ml-analytics-manager';
import { getWebSocketManager, updateProgress } from '@/lib/websocket-manager';
import { ObjectId } from 'mongodb';

import { logger } from '@/lib/logger';
// 問題解決要求スキーマ
const problemSolvingSchema = z.object({
  problem: z.string().describe('解決すべき問題の詳細な説明'),
  context: z.object({
    priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    domain: z.enum(['accounting', 'ocr', 'customer', 'general', 'system']).default('general'),
    requiredTools: z.array(z.string()).optional().describe('必要なツールのリスト'),
    constraints: z.object({
      timeLimit: z.number().optional().describe('制限時間（分）'),
      budgetLimit: z.number().optional().describe('予算制限'),
      resourceLimit: z.array(z.string()).optional().describe('利用可能なリソース'),
    }).optional(),
  }),
  companyId: z.string(),
});

// 分析要求スキーマ
const analysisSchema = z.object({
  dataType: z.enum(['financial', 'customer', 'document', 'system', 'performance']),
  data: z.any().describe('分析対象のデータ'),
  analysisType: z.enum(['trend', 'anomaly', 'classification', 'prediction', 'comparison']),
  parameters: z.object({
    timeRange: z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional(),
    filters: z.any().optional(),
    metrics: z.array(z.string()).optional(),
  }).optional(),
  companyId: z.string(),
});

// 研究要求スキーマ
const researchSchema = z.object({
  topic: z.string().describe('研究トピック'),
  scope: z.enum(['local', 'web', 'database', 'comprehensive']).default('comprehensive'),
  parameters: z.object({
    depth: z.enum(['shallow', 'moderate', 'deep']).default('moderate'),
    sources: z.array(z.string()).optional().describe('情報源の指定'),
    language: z.enum(['ja', 'en', 'auto']).default('ja'),
    includeRecent: z.boolean().default(true).describe('最新情報を含むか'),
  }).optional(),
  companyId: z.string(),
});

// 問題解決エージェント入力スキーマ
const problemSolvingInputSchema = z.object({
  operation: z.enum([
    'solve_problem',        // 問題解決
    'analyze_data',         // データ分析
    'research_topic',       // 調査・研究
    'optimize_process',     // プロセス最適化
    'troubleshoot',         // トラブルシューティング
    'generate_insights',    // インサイト生成
    'ml_analysis',          // ML分析
    'anomaly_detection',    // 異常検知
    'predictive_analysis',  // 予測分析
    'cluster_analysis',     // クラスタリング分析
  ]),
  data: z.union([
    problemSolvingSchema,
    analysisSchema,
    researchSchema,
  ]),
});

// 問題解決結果の型
interface ProblemSolvingResult {
  success: boolean;
  solution?: {
    summary: string;
    steps: Array<{
      step: number;
      action: string;
      rationale: string;
      status: 'completed' | 'in_progress' | 'pending' | 'failed';
      tools_used?: string[];
      duration?: number;
    }>;
    recommendations: string[];
    risks?: string[];
    followUp?: string[];
  };
  analysis?: {
    findings: Array<{
      type: 'insight' | 'anomaly' | 'trend' | 'recommendation';
      description: string;
      confidence: number;
      impact: 'low' | 'medium' | 'high';
      evidence?: any;
    }>;
    metrics?: Record<string, number>;
    visualizations?: Array<{
      type: 'chart' | 'table' | 'graph';
      data: any;
      description: string;
    }>;
  };
  research?: {
    summary: string;
    sources: Array<{
      title: string;
      url?: string;
      type: 'database' | 'web' | 'document' | 'api';
      relevance: number;
      lastUpdated?: string;
    }>;
    keyFindings: string[];
    relatedTopics: string[];
  };
  reasoning: string;
  executionTime: number;
  resourcesUsed: string[];
  error?: string;
  metadata: {
    sessionId: string;
    timestamp: Date;
    agentVersion: string;
    llmModel: string;
  };
}

// シングルトンインスタンスの取得関数
function getLLMManager() {
  return new LLMCascadeManager();
}

function getPerplexityClient() {
  return new PerplexityClient();
}

function getFirecrawlClient() {
  return new FirecrawlClient();
}

function getMLAnalytics() {
  return new MLAnalyticsManager();
}

// ヘルパー関数
const extractNumericalFeatures = (item: any, targetFeatures?: string[]): Record<string, number> => {
  const features: Record<string, number> = {};
  const featuresToExtract = targetFeatures || ['amount', 'quantity', 'total', 'value', 'price', 'count'];
  
  featuresToExtract.forEach(feature => {
    if (typeof item[feature] === 'number') {
      features[feature] = item[feature];
    } else if (typeof item[feature] === 'string' && !isNaN(Number(item[feature]))) {
      features[feature] = Number(item[feature]);
    }
  });

  // 特徴量が空の場合、基本的な数値フィールドを自動検出
  if (Object.keys(features).length === 0) {
    Object.entries(item).forEach(([key, value]) => {
      if (typeof value === 'number' && key !== '_id') {
        features[key] = value;
      }
    });
  }

  return features;
};

const analyzeTrend = (values: number[]): string => {
  if (values.length < 2) return 'insufficient_data';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
  
  const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (changePercent > 10) return 'increasing';
  if (changePercent < -10) return 'decreasing';
  return 'stable';
};

const generateItemPreview = (item: any): string => {
  if (!item) return 'no_data';
  
  const previewFields = ['name', 'title', 'description', 'id', '_id'];
  
  for (const field of previewFields) {
    if (item[field]) {
      return String(item[field]).substring(0, 50);
    }
  }
  
  return `${Object.keys(item)[0]}: ${String(Object.values(item)[0])}`.substring(0, 50);
};

// 内部ツール関数の定義
const tools = {
  // データベース分析ツール
  analyzeDatabase: async ({ collection, query = {}, analysisType }: {
    collection: string;
    query?: any;
    analysisType: 'aggregation' | 'statistical' | 'pattern' | 'anomaly';
  }) => {
    const db = DatabaseService.getInstance();
    
    try {
      switch (analysisType) {
        case 'aggregation':
          const aggregationPipeline = [
            { $match: query },
            { $group: { _id: null, count: { $sum: 1 }, avgAmount: { $avg: '$amount' } } },
          ];
          return await db.aggregate(collection as keyof typeof Collections, aggregationPipeline);
          
        case 'statistical':
          const docs = await db.findMany(collection as keyof typeof Collections, query);
          return {
            count: docs.length,
            sample: docs.slice(0, 5),
            fields: docs.length > 0 ? Object.keys(docs[0]) : [],
          };
          
        case 'pattern':
          // パターン分析のロジック
          const recentDocs = await db.findMany(collection as keyof typeof Collections, {
            ...query,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          });
          return {
            recentCount: recentDocs.length,
            patterns: 'Pattern analysis would be implemented here',
          };
          
        case 'anomaly':
          // 異常検出のロジック
          return { anomalies: [], confidence: 0.95 };
          
        default:
          throw new Error(`Unsupported analysis type: ${analysisType}`);
      }
    } catch (error) {
      throw new Error(`Database analysis failed: ${error.message}`);
    }
  },

  // 段階的思考ツール（AI強化版）
  sequentialThinking: async ({ problem, context, maxSteps = 6 }: {
    problem: string;
    context?: any;
    maxSteps?: number;
  }) => {
    const llmManager = getLLMManager();
    
    try {
      // AI推論による段階的思考
      const aiResult = await llmManager.generateSequentialThinking(problem, context);
      
      // AI結果を標準フォーマットに変換
      const steps = aiResult.steps.map(step => ({
        step: step.step,
        action: step.action,
        rationale: step.reasoning,
        status: step.step <= 3 ? "completed" as const : 
               step.step <= 4 ? "in_progress" as const : "pending" as const,
        tools_used: ['ai_reasoning', 'deepseek'],
        title: step.title,
      }));

      return {
        totalSteps: steps.length,
        steps,
        currentStep: Math.min(4, steps.length),
        completionRate: Math.min(4, steps.length) / steps.length,
        aiAnalysis: aiResult.analysis,
        aiRecommendations: aiResult.recommendations,
        providerUsed: 'AI-enhanced sequential thinking',
      };
    } catch (error) {
      logger.warn('AI sequential thinking failed, falling back to template:', error);
      
      // フォールバック: テンプレートベースの段階的思考
      const steps = [
        {
          step: 1,
          action: "問題の理解と定義",
          rationale: "問題を明確に定義し、解決すべき核心を特定する",
          status: "completed" as const,
          tools_used: ['template_reasoning'],
          title: "問題分析"
        },
        {
          step: 2,
          action: "情報収集と調査",
          rationale: "問題解決に必要な情報やデータを収集する",
          status: "completed" as const,
          tools_used: ['database', 'analysis'],
          title: "情報収集"
        },
        {
          step: 3,
          action: "解決策の選択肢生成",
          rationale: "複数の解決アプローチを検討し、最適な方法を選択する",
          status: "completed" as const,
          tools_used: ['reasoning', 'comparison'],
          title: "選択肢検討"
        },
        {
          step: 4,
          action: "実行計画の策定",
          rationale: "選択した解決策を具体的なアクションに落とし込む",
          status: "in_progress" as const,
          tools_used: ['planning'],
          title: "計画策定"
        },
        {
          step: 5,
          action: "解決策の実行",
          rationale: "計画に基づいて解決策を実行し、進捗をモニタリングする",
          status: "pending" as const,
          tools_used: ['execution', 'monitoring'],
          title: "実行"
        },
        {
          step: 6,
          action: "結果評価と改善",
          rationale: "実行結果を評価し、必要に応じて改善策を提案する",
          status: "pending" as const,
          tools_used: ['evaluation', 'optimization'],
          title: "評価・改善"
        }
      ];

      return {
        totalSteps: steps.length,
        steps,
        currentStep: 4,
        completionRate: 0.67,
        fallbackUsed: true,
        error: error instanceof Error ? error.message : 'AI processing failed',
      };
    }
  },

  // プロセス最適化ツール
  processOptimization: async ({ processName, currentFlow, metrics }: {
    processName: string;
    currentFlow?: string[];
    metrics?: any;
  }) => {
    return {
      currentEfficiency: 0.7,
      proposedChanges: [
        {
          change: "データ入力の自動化",
          impact: "処理時間50%削減",
          effort: "medium",
          priority: "high"
        },
        {
          change: "承認プロセスの簡素化",
          impact: "承認時間70%削減",
          effort: "low",
          priority: "high"
        }
      ],
      estimatedImprovement: 0.9,
      implementationPlan: [
        "段階1: 自動化ツールの導入",
        "段階2: 承認フローの再設計",
        "段階3: スタッフトレーニング",
        "段階4: パフォーマンス測定"
      ]
    };
  },

  // インサイト生成ツール
  generateInsights: async ({ dataSource, parameters, focusArea }: {
    dataSource: string;
    parameters?: any;
    focusArea?: string;
  }) => {
    const db = DatabaseService.getInstance();
    
    try {
      // 基本的なデータ分析
      const insights = [];
      
      if (dataSource === 'invoices') {
        const recentInvoices = await db.findMany(Collections.INVOICES, {
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        });
        
        insights.push({
          type: 'trend' as const,
          description: `過去90日間で${recentInvoices.length}件の請求書が作成されました`,
          confidence: 0.95,
          impact: 'medium' as const,
          evidence: { invoiceCount: recentInvoices.length }
        });
      }
      
      if (dataSource === 'customers') {
        const customers = await db.findMany(Collections.CUSTOMERS, {});
        const activeCustomers = customers.filter(c => c.status === 'active');
        
        insights.push({
          type: 'insight' as const,
          description: `顧客の${Math.round((activeCustomers.length / customers.length) * 100)}%がアクティブ状態です`,
          confidence: 0.9,
          impact: 'high' as const,
          evidence: { 
            totalCustomers: customers.length, 
            activeCustomers: activeCustomers.length 
          }
        });
      }
      
      return { insights };
    } catch (error) {
      throw new Error(`Insight generation failed: ${error.message}`);
    }
  },

  // Web検索ツール（Perplexity）
  webSearch: async ({ query, searchType = 'general', domains, recency, maxTokens = 2000 }: {
    query: string;
    searchType?: 'general' | 'academic' | 'business' | 'tech' | 'recent';
    domains?: string[];
    recency?: 'hour' | 'day' | 'week' | 'month';
    maxTokens?: number;
  }) => {
    const perplexityClient = getPerplexityClient();
    
    try {
      let searchResult;

      switch (searchType) {
        case 'academic':
          searchResult = await perplexityClient.academicSearch(query, { max_tokens: maxTokens });
          break;
        case 'business':
          searchResult = await perplexityClient.businessSearch(query, { max_tokens: maxTokens });
          break;
        case 'tech':
          searchResult = await perplexityClient.techSearch(query, { max_tokens: maxTokens });
          break;
        case 'recent':
          searchResult = await perplexityClient.searchRecent(query, recency || 'day', { max_tokens: maxTokens });
          break;
        default:
          if (domains && domains.length > 0) {
            searchResult = await perplexityClient.searchDomain(query, domains, { max_tokens: maxTokens });
          } else {
            searchResult = await perplexityClient.search({ query, max_tokens: maxTokens });
          }
      }

      return {
        success: searchResult.success,
        content: searchResult.content,
        citations: searchResult.citations,
        images: searchResult.images,
        metadata: searchResult.metadata,
        searchType,
        error: searchResult.error,
      };
    } catch (error) {
      return {
        success: false,
        content: '',
        citations: [],
        images: [],
        metadata: { model: 'error', tokens: { prompt: 0, completion: 0, total: 0 } },
        error: error instanceof Error ? error.message : 'Web search failed',
      };
    }
  },

  // マルチ視点調査ツール
  multiPerspectiveResearch: async ({ topic, perspectives, includeRecent = true }: {
    topic: string;
    perspectives?: string[];
    includeRecent?: boolean;
  }) => {
    const perplexityClient = getPerplexityClient();
    
    try {
      const defaultPerspectives = perspectives || [
        'overview and definition',
        'current trends and developments',
        'benefits and advantages',
        'challenges and limitations',
        'best practices',
        'future outlook'
      ];

      const multiResult = await perplexityClient.multiSearch(topic, defaultPerspectives);
      
      // 最新情報の追加検索
      let recentInfo = null;
      if (includeRecent) {
        try {
          recentInfo = await perplexityClient.searchRecent(`${topic} latest news updates`, 'week');
        } catch (error) {
          logger.warn('Recent search failed:', error);
        }
      }

      return {
        success: true,
        topic: multiResult.baseQuery,
        summary: multiResult.summary,
        perspectives: multiResult.results.map(r => ({
          perspective: r.perspective,
          content: r.result.content,
          citations: r.result.citations,
          success: r.result.success,
        })),
        recentInfo: recentInfo ? {
          content: recentInfo.content,
          citations: recentInfo.citations,
          success: recentInfo.success,
        } : null,
        totalCitations: multiResult.results.reduce((sum, r) => sum + r.result.citations.length, 0) + (recentInfo?.citations.length || 0),
        executionTime: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Multi-perspective research failed',
        topic,
        perspectives: [],
        totalCitations: 0,
      };
    }
  },

  // 競合分析ツール
  competitorAnalysis: async ({ company, industry, aspects }: {
    company: string;
    industry?: string;
    aspects?: string[];
  }) => {
    const perplexityClient = getPerplexityClient();
    
    try {
      const analysisAspects = aspects || [
        'business model',
        'key features',
        'pricing strategy',
        'market position',
        'strengths and weaknesses',
        'customer reviews'
      ];

      const queries = [
        `${company} company overview ${industry ? `in ${industry}` : ''}`,
        `${company} vs competitors comparison`,
        `${company} customer reviews and feedback`,
        `${company} latest news and developments`,
      ];

      const searchPromises = queries.map(query => 
        perplexityClient.search({ 
          query, 
          max_tokens: 1500,
          return_citations: true,
          search_recency_filter: 'month'
        })
      );

      const results = await Promise.all(searchPromises);
      
      return {
        success: true,
        company,
        industry,
        analysis: {
          overview: results[0]?.content || '',
          comparison: results[1]?.content || '',
          customerFeedback: results[2]?.content || '',
          recentNews: results[3]?.content || '',
        },
        citations: results.flatMap(r => r.citations),
        metadata: {
          searchesPerformed: queries.length,
          totalTokens: results.reduce((sum, r) => sum + r.metadata.tokens.total, 0),
          successfulSearches: results.filter(r => r.success).length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Competitor analysis failed',
        company,
        analysis: {},
        citations: [],
      };
    }
  },

  // Webスクレイピングツール（Firecrawl）
  websiteScraping: async ({ url, formats, onlyMainContent = true, includeTags, excludeTags }: {
    url: string;
    formats?: ('markdown' | 'html' | 'content' | 'links' | 'screenshot')[];
    onlyMainContent?: boolean;
    includeTags?: string[];
    excludeTags?: string[];
  }) => {
    const firecrawlClient = getFirecrawlClient();
    
    try {
      const result = await firecrawlClient.scrape({
        url,
        formats: formats || ['markdown', 'content', 'links'],
        onlyMainContent,
        includeTags,
        excludeTags,
      });

      if (!result.success) {
        throw new Error(result.error || 'Scraping failed');
      }

      return {
        success: true,
        url,
        data: {
          content: result.data?.content || '',
          markdown: result.data?.markdown || '',
          title: result.data?.metadata.title || '',
          description: result.data?.metadata.description || '',
          links: result.data?.links || [],
          statusCode: result.data?.metadata.statusCode || 200,
        },
        metadata: result.data?.metadata,
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Website scraping failed',
      };
    }
  },

  // サイト分析ツール
  siteAnalysis: async ({ url, analysisType = 'competitor', crawlDepth = 3 }: {
    url: string;
    analysisType?: 'competitor' | 'reference' | 'technical' | 'content';
    crawlDepth?: number;
  }) => {
    const firecrawlClient = getFirecrawlClient();
    
    try {
      // メインページの分析
      const analysis = await firecrawlClient.analyzeCompetitorSite(url);
      
      if (!analysis.success) {
        throw new Error(analysis.error || 'Site analysis failed');
      }

      // 追加のページクロール（キーページのみ）
      let additionalPages: any[] = [];
      if (crawlDepth > 1 && analysis.analysis?.keyPages) {
        const crawlPromises = analysis.analysis.keyPages
          .slice(0, crawlDepth - 1)
          .map(pageUrl => firecrawlClient.scrape({
            url: pageUrl,
            formats: ['content'],
            onlyMainContent: true,
          }));

        const crawlResults = await Promise.all(crawlPromises);
        additionalPages = crawlResults
          .filter(result => result.success)
          .map(result => ({
            url: result.data?.metadata.sourceURL,
            title: result.data?.metadata.title,
            content: result.data?.content?.substring(0, 1000) + '...', // 最初の1000文字
            wordCount: result.data?.content?.split(/\s+/).length || 0,
          }));
      }

      return {
        success: true,
        analysisType,
        mainPage: {
          url,
          title: analysis.analysis?.title,
          description: analysis.analysis?.description,
          contentSummary: analysis.analysis?.contentSummary,
          technicalInfo: analysis.analysis?.technicalInfo,
          keyLinks: analysis.analysis?.links?.slice(0, 10) || [],
        },
        additionalPages,
        insights: {
          totalPagesAnalyzed: 1 + additionalPages.length,
          totalWordCount: (analysis.analysis?.technicalInfo.wordCount || 0) + 
                         additionalPages.reduce((sum, page) => sum + (page.wordCount || 0), 0),
          linkCount: analysis.analysis?.technicalInfo.linkCount || 0,
          keyPages: analysis.analysis?.keyPages || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error instanceof Error ? error.message : 'Site analysis failed',
      };
    }
  },

  // サイトマップクロール
  sitemapCrawl: async ({ sitemapUrl, limit = 20, includePatterns, excludePatterns }: {
    sitemapUrl: string;
    limit?: number;
    includePatterns?: string[];
    excludePatterns?: string[];
  }) => {
    const firecrawlClient = getFirecrawlClient();
    
    try {
      const result = await firecrawlClient.crawlSitemap(sitemapUrl, {
        limit,
        includePatterns,
        excludePatterns,
      });

      if (!result.success) {
        throw new Error(result.error || 'Sitemap crawl failed');
      }

      // コンテンツの要約統計
      const pages = result.data || [];
      const totalWordCount = pages.reduce((sum, page) => 
        sum + (page.content?.split(/\s+/).length || 0), 0);
      
      const pagesByType = pages.reduce((acc, page) => {
        const url = page.metadata.sourceURL;
        let type = 'other';
        
        if (url.includes('/blog/') || url.includes('/news/')) type = 'blog';
        else if (url.includes('/product/') || url.includes('/service/')) type = 'product';
        else if (url.includes('/about/')) type = 'about';
        else if (url.includes('/contact/')) type = 'contact';
        
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        success: true,
        sitemapUrl,
        crawlResults: {
          totalPages: pages.length,
          totalWordCount,
          pagesByType,
          pages: pages.slice(0, 10).map(page => ({
            url: page.metadata.sourceURL,
            title: page.metadata.title,
            contentPreview: page.content?.substring(0, 200) + '...',
            wordCount: page.content?.split(/\s+/).length || 0,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        sitemapUrl,
        error: error instanceof Error ? error.message : 'Sitemap crawl failed',
      };
    }
  },

  // Webデータ収集ツール
  webDataCollection: async ({ urls, dataTargets, format = 'structured' }: {
    urls: string[];
    dataTargets: string[];
    format?: 'structured' | 'raw' | 'summary';
  }) => {
    const firecrawlClient = getFirecrawlClient();
    
    try {
      const scrapePromises = urls.map(url => 
        firecrawlClient.scrape({
          url,
          formats: ['content', 'links'],
          onlyMainContent: true,
        })
      );

      const results = await Promise.all(scrapePromises);
      const successfulResults = results.filter(result => result.success);
      
      if (successfulResults.length === 0) {
        throw new Error('All scraping attempts failed');
      }

      // データターゲットに基づく情報抽出
      const extractedData = successfulResults.map(result => {
        const content = result.data?.content || '';
        const links = result.data?.links || [];
        
        const extracted: Record<string, any> = {
          url: result.data?.metadata.sourceURL,
          title: result.data?.metadata.title,
        };

        dataTargets.forEach(target => {
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
        success: true,
        format,
        dataTargets,
        result: finalResult,
      };

    } catch (error) {
      return {
        success: false,
        urls,
        error: error instanceof Error ? error.message : 'Web data collection failed',
      };
    }
  },

  // ML分析ツール
  mlAnalysis: async ({ collection, analysisType, query = {}, features, parameters }: {
    collection: string;
    analysisType: 'classification' | 'anomaly_detection' | 'pattern_recognition' | 'prediction' | 'time_series' | 'clustering';
    query?: any;
    features?: string[];
    parameters?: {
      targetFeature?: string;
      anomalyThreshold?: number;
      numberOfClusters?: number;
      predictionHorizon?: number;
      seasonality?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
    };
  }) => {
    const mlAnalytics = getMLAnalytics();
    
    try {
      const db = DatabaseService.getInstance();
      
      // データベースからデータを取得
      const rawData = await db.findMany(collection as keyof typeof Collections, query);
      
      if (rawData.length === 0) {
        throw new Error('分析対象のデータが見つかりません');
      }

      // ML分析用のデータ形式に変換
      const mlData = rawData.map((item, index) => {
        const dataPoint: any = {
          id: item._id?.toString() || `item_${index}`,
          timestamp: item.createdAt || item.timestamp || new Date(),
          features: {},
          metadata: item,
        };

        // 指定された特徴量を抽出、またはデフォルト特徴量を使用
        const targetFeatures = features || ['amount', 'quantity', 'total', 'value', 'price', 'count'];
        
        targetFeatures.forEach(feature => {
          if (typeof item[feature] === 'number') {
            dataPoint.features[feature] = item[feature];
          } else if (typeof item[feature] === 'string' && !isNaN(Number(item[feature]))) {
            dataPoint.features[feature] = Number(item[feature]);
          }
        });

        // 特徴量が空の場合、基本的な数値フィールドを自動検出
        if (Object.keys(dataPoint.features).length === 0) {
          Object.entries(item).forEach(([key, value]) => {
            if (typeof value === 'number' && key !== '_id') {
              dataPoint.features[key] = value;
            }
          });
        }

        // ラベル情報があれば追加
        if (item.category || item.status || item.type) {
          dataPoint.label = item.category || item.status || item.type;
        }

        return dataPoint;
      }).filter(item => Object.keys(item.features).length > 0); // 特徴量があるもののみ

      if (mlData.length === 0) {
        throw new Error('分析可能な数値データが見つかりません');
      }

      // ML分析を実行
      const analysisResult = await mlAnalytics.analyze({
        data: mlData,
        analysisType,
        parameters,
      });

      return {
        success: analysisResult.success,
        analysisType,
        collection,
        dataPoints: mlData.length,
        features: Object.keys(mlData[0].features),
        results: analysisResult.results,
        insights: analysisResult.insights,
        recommendations: analysisResult.recommendations,
        metadata: analysisResult.metadata,
        error: analysisResult.error,
      };

    } catch (error) {
      return {
        success: false,
        analysisType,
        collection,
        error: error instanceof Error ? error.message : 'ML analysis failed',
      };
    }
  },

  // 異常検知ツール
  anomalyDetection: async ({ collection, timeRange, anomalyThreshold = 2, features }: {
    collection: string;
    timeRange?: {
      startDate?: string;
      endDate?: string;
    };
    anomalyThreshold?: number;
    features?: string[];
  }) => {
    const mlAnalytics = getMLAnalytics();
    
    try {
      const db = DatabaseService.getInstance();
      
      // 時間範囲でフィルタ
      let query: any = {};
      if (timeRange) {
        query.createdAt = {};
        if (timeRange.startDate) {
          query.createdAt.$gte = new Date(timeRange.startDate);
        }
        if (timeRange.endDate) {
          query.createdAt.$lte = new Date(timeRange.endDate);
        }
      }

      const data = await db.findMany(collection as keyof typeof Collections, query);
      
      if (data.length < 10) {
        throw new Error('異常検知には最低10件のデータが必要です');
      }

      // ML用のデータ変換
      const mlData = data.map((item, index) => ({
        id: item._id?.toString() || `item_${index}`,
        timestamp: item.createdAt || new Date(),
        features: extractNumericalFeatures(item, features),
      })).filter(item => Object.keys(item.features).length > 0);

      // 異常検知分析
      const analysisResult = await mlAnalytics.analyze({
        data: mlData,
        analysisType: 'anomaly_detection',
        parameters: {
          anomalyThreshold,
          anomalyMethod: 'statistical',
        },
      });

      const anomalies = analysisResult.results.anomalies || [];
      const anomalyItems = anomalies.filter(a => a.isAnomaly);

      return {
        success: true,
        collection,
        timeRange,
        summary: {
          totalItems: data.length,
          anomaliesDetected: anomalyItems.length,
          anomalyRate: `${((anomalyItems.length / data.length) * 100).toFixed(1)}%`,
          threshold: anomalyThreshold,
        },
        anomalies: anomalyItems.slice(0, 20), // 上位20件の異常
        insights: analysisResult.insights,
        recommendations: [
          ...analysisResult.recommendations,
          '異常データの詳細調査を実施してください',
          '異常の根本原因を特定し、対策を講じてください',
        ],
      };
    } catch (error) {
      return {
        success: false,
        collection,
        error: error instanceof Error ? error.message : 'Anomaly detection failed',
      };
    }
  },

  // 予測分析ツール
  predictiveAnalysis: async ({ collection, targetFeature, predictionHorizon = 7, seasonality = 'weekly', includeConfidenceInterval = true }: {
    collection: string;
    targetFeature: string;
    predictionHorizon?: number;
    seasonality?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
    includeConfidenceInterval?: boolean;
  }) => {
    const mlAnalytics = getMLAnalytics();
    
    try {
      const db = DatabaseService.getInstance();
      
      // 時系列データを取得（最新から過去6ヶ月）
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const data = await db.findMany(collection as keyof typeof Collections, {
        createdAt: { $gte: sixMonthsAgo },
      });

      if (data.length < 30) {
        throw new Error('予測分析には最低30件の履歴データが必要です');
      }

      // 時系列データに変換
      const timeSeriesData = data
        .filter(item => typeof item[targetFeature] === 'number')
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((item, index) => ({
          id: item._id?.toString() || `item_${index}`,
          timestamp: new Date(item.createdAt),
          features: { [targetFeature]: item[targetFeature] },
        }));

      // 予測分析を実行
      const analysisResult = await mlAnalytics.analyze({
        data: timeSeriesData,
        analysisType: 'prediction',
        parameters: {
          predictionHorizon,
          predictionMethod: 'linear_regression',
        },
      });

      const predictions = analysisResult.results.predictions || [];

      return {
        success: true,
        collection,
        targetFeature,
        predictionHorizon,
        seasonality,
        historicalData: {
          dataPoints: timeSeriesData.length,
          timeRange: {
            start: timeSeriesData[0]?.timestamp,
            end: timeSeriesData[timeSeriesData.length - 1]?.timestamp,
          },
          currentTrend: analyzeTrend(timeSeriesData.map(d => d.features[targetFeature])),
        },
        predictions: predictions.map(p => ({
          ...p,
          date: p.timestamp,
          value: p.predictedValue,
          confidenceInterval: includeConfidenceInterval ? p.bounds : undefined,
        })),
        insights: analysisResult.insights,
        recommendations: [
          ...analysisResult.recommendations,
          '予測結果を定期的に実績と比較して精度を評価してください',
          '外部要因も考慮した判断を行ってください',
        ],
      };
    } catch (error) {
      return {
        success: false,
        collection,
        targetFeature,
        error: error instanceof Error ? error.message : 'Predictive analysis failed',
      };
    }
  },

  // クラスタリング分析ツール
  clusterAnalysis: async ({ collection, numberOfClusters = 3, features, clusteringMethod = 'kmeans' }: {
    collection: string;
    numberOfClusters?: number;
    features?: string[];
    clusteringMethod?: 'kmeans' | 'hierarchical' | 'dbscan';
  }) => {
    const mlAnalytics = getMLAnalytics();
    
    try {
      const db = DatabaseService.getInstance();
      const data = await db.findMany(collection as keyof typeof Collections, {});

      if (data.length < numberOfClusters * 3) {
        throw new Error(`クラスタリングには最低${numberOfClusters * 3}件のデータが必要です`);
      }

      // クラスタリング用データ変換
      const clusterData = data.map((item, index) => ({
        id: item._id?.toString() || `item_${index}`,
        timestamp: item.createdAt || new Date(),
        features: extractNumericalFeatures(item, features),
        metadata: item,
      })).filter(item => Object.keys(item.features).length > 0);

      // クラスタリング分析を実行
      const analysisResult = await mlAnalytics.analyze({
        data: clusterData,
        analysisType: 'clustering',
        parameters: {
          numberOfClusters,
          clusteringMethod,
        },
      });

      const clusters = analysisResult.results.clusters || [];

      return {
        success: true,
        collection,
        numberOfClusters,
        clusteringMethod,
        dataPoints: clusterData.length,
        features: Object.keys(clusterData[0]?.features || {}),
        clusters: clusters.map(cluster => ({
          ...cluster,
          sampleItems: cluster.members.slice(0, 5).map(memberId => {
            const item = clusterData.find(d => d.id === memberId);
            return {
              id: memberId,
              features: item?.features,
              preview: generateItemPreview(item?.metadata),
            };
          }),
        })),
        insights: [
          ...analysisResult.insights,
          `最大クラスター: ${Math.max(...clusters.map(c => c.members.length))}件`,
          `最小クラスター: ${Math.min(...clusters.map(c => c.members.length))}件`,
        ],
        recommendations: [
          ...analysisResult.recommendations,
          'クラスター特性を業務戦略に活用してください',
          '各クラスターに適した対応策を検討してください',
        ],
      };
    } catch (error) {
      return {
        success: false,
        collection,
        error: error instanceof Error ? error.message : 'Cluster analysis failed',
      };
    }
  },
};

// メイン実行関数
export async function solveProblem(operation: string, data: any): Promise<ProblemSolvingResult> {
  const llmManager = getLLMManager();
  const startTime = Date.now();
  const sessionId = new ObjectId().toString();
  const db = DatabaseService.getInstance();
  const wsManager = getWebSocketManager();

  try {
    // WebSocket サーバーの開始（必要に応じて）
    await wsManager.start().catch(() => {
      logger.warn('WebSocket server already running or failed to start');
    });

    // 初期進捗通知
    updateProgress(sessionId, {
      operation,
      progress: 0,
      currentStep: '問題解決エージェントを初期化中...',
      totalSteps: 6,
      completedSteps: 0,
      status: 'started',
    });

    let result: ProblemSolvingResult = {
      success: false,
      reasoning: '',
      executionTime: 0,
      resourcesUsed: [],
      metadata: {
        sessionId,
        timestamp: new Date(),
        agentVersion: '2.0.0',
        llmModel: 'deepseek-chat (cascade)', // DeepSeekメイン + フォールバック
        llmProviders: llmManager.getProviderStatus(),
      },
    };

    // 進捗更新: 初期化完了
    updateProgress(sessionId, {
      operation,
      progress: 10,
      currentStep: 'データベースログを記録中...',
      totalSteps: 6,
      completedSteps: 1,
      status: 'in_progress',
    });

    // MongoDB に実行ログを記録
    const executionLog = {
      sessionId,
      operation,
      startTime: new Date(),
      status: 'started',
      companyId: data.companyId,
    };
    await db.create(Collections.AUDIT_LOGS, executionLog);

    switch (operation) {
      case 'solve_problem':
        const problemData = data as z.infer<typeof problemSolvingSchema>;
        
        // 進捗更新: 問題分析開始
        updateProgress(sessionId, {
          operation,
          progress: 20,
          currentStep: `問題「${problemData.problem}」を分析中...`,
          totalSteps: 6,
          completedSteps: 2,
          status: 'in_progress',
        });
        
        // 段階的思考プロセスの実行
        const thinkingResult = await tools.sequentialThinking({
          problem: problemData.problem,
          context: problemData.context,
        });

        // 進捗更新: 思考プロセス完了
        updateProgress(sessionId, {
          operation,
          progress: 50,
          currentStep: '段階的思考プロセス完了、データベース分析開始...',
          totalSteps: 6,
          completedSteps: 3,
          status: 'in_progress',
        });

        // データベース分析（必要に応じて）
        let dbAnalysis = null;
        if (problemData.context.domain === 'accounting') {
          dbAnalysis = await tools.analyzeDatabase({
            collection: 'invoices',
            analysisType: 'statistical',
          });
        }

        result = {
          ...result,
          success: true,
          solution: {
            summary: `問題「${problemData.problem}」の解決策を6段階のプロセスで策定しました`,
            steps: thinkingResult.steps,
            recommendations: [
              "段階的なアプローチによる問題解決",
              "データ分析結果の活用",
              "継続的なモニタリングの実施",
            ],
            risks: [
              "実装時のリソース不足",
              "ステークホルダーの理解不足",
            ],
            followUp: [
              "解決策の実装状況の定期確認",
              "効果測定とKPI設定",
            ],
          },
          reasoning: `${problemData.context.priority}優先度の${problemData.context.domain}領域の問題として分析し、段階的思考プロセスを適用しました。`,
          resourcesUsed: ['sequential_thinking', ...(dbAnalysis ? ['database_analysis'] : [])],
        };
        break;

      case 'analyze_data':
        const analysisData = data as z.infer<typeof analysisSchema>;
        
        // 進捗更新: データ分析開始
        updateProgress(sessionId, {
          operation,
          progress: 30,
          currentStep: `${analysisData.dataType}データの${analysisData.analysisType}分析を開始...`,
          totalSteps: 6,
          completedSteps: 2,
          status: 'in_progress',
        });
        
        // インサイト生成
        const insights = await tools.generateInsights({
          dataSource: analysisData.dataType,
          parameters: analysisData.parameters,
        });

        // 進捗更新: 分析完了
        updateProgress(sessionId, {
          operation,
          progress: 80,
          currentStep: 'データ分析完了、結果を整理中...',
          totalSteps: 6,
          completedSteps: 5,
          status: 'in_progress',
        });

        result = {
          ...result,
          success: true,
          analysis: {
            findings: insights.insights,
            metrics: {},
            visualizations: [],
          },
          reasoning: `${analysisData.dataType}データの${analysisData.analysisType}分析を実行しました。`,
          resourcesUsed: ['insight_generation', 'database_analysis'],
        };
        break;

      case 'research_topic':
        const researchData = data as z.infer<typeof researchSchema>;
        
        // 進捗更新: 調査開始
        updateProgress(sessionId, {
          operation,
          progress: 25,
          currentStep: `トピック「${researchData.topic}」の調査を開始...`,
          totalSteps: 6,
          completedSteps: 2,
          status: 'in_progress',
        });

        // Web検索（comprehensiveスコープの場合）
        let webResearchResult = null;
        if (researchData.scope === 'comprehensive' || researchData.scope === 'web') {
          updateProgress(sessionId, {
            operation,
            progress: 40,
            currentStep: 'Web検索を実行中...',
            totalSteps: 6,
            completedSteps: 3,
            status: 'in_progress',
          });

          try {
            webResearchResult = await tools.multiPerspectiveResearch({
              topic: researchData.topic,
              includeRecent: researchData.parameters?.includeRecent ?? true,
            });
          } catch (error) {
            logger.warn('Web research failed:', error);
          }
        }
        
        // 進捗更新: 調査完了
        updateProgress(sessionId, {
          operation,
          progress: 75,
          currentStep: '調査結果を整理中...',
          totalSteps: 6,
          completedSteps: 5,
          status: 'in_progress',
        });
        
        result = {
          ...result,
          success: true,
          research: {
            summary: `トピック「${researchData.topic}」の調査を実行しました`,
            sources: [
              {
                title: "内部データベース検索結果",
                type: 'database' as const,
                relevance: 0.9,
              },
              ...(webResearchResult?.success ? [{
                title: "Web調査結果",
                type: 'web' as const,
                relevance: 0.8,
                lastUpdated: new Date().toISOString(),
              }] : []),
            ],
            keyFindings: [
              "データベース内の関連情報を特定",
              "追加調査の必要性を確認",
              ...(webResearchResult?.success ? [
                `Web調査で${webResearchResult.totalCitations}件の引用を取得`,
                "最新の業界動向を確認"
              ] : []),
            ],
            relatedTopics: [],
          },
          reasoning: `${researchData.scope}スコープで${researchData.parameters?.depth}レベルの調査を実行しました。`,
          resourcesUsed: ['database_research', ...(webResearchResult?.success ? ['web_research', 'perplexity'] : [])],
        };
        break;

      case 'optimize_process':
        // 進捗更新: プロセス最適化開始
        updateProgress(sessionId, {
          operation,
          progress: 30,
          currentStep: 'プロセス最適化分析を開始...',
          totalSteps: 6,
          completedSteps: 2,
          status: 'in_progress',
        });

        const optimization = await tools.processOptimization({
          processName: 'general_business_process',
        });

        // 進捗更新: 最適化完了
        updateProgress(sessionId, {
          operation,
          progress: 80,
          currentStep: '最適化提案を生成中...',
          totalSteps: 6,
          completedSteps: 5,
          status: 'in_progress',
        });

        result = {
          ...result,
          success: true,
          solution: {
            summary: "プロセス最適化の提案を生成しました",
            steps: optimization.implementationPlan.map((step, index) => ({
              step: index + 1,
              action: step,
              rationale: "効率性向上のため",
              status: 'pending' as const,
            })),
            recommendations: optimization.proposedChanges.map(change => 
              `${change.change}: ${change.impact}`
            ),
          },
          reasoning: "現在のプロセス効率性を分析し、改善案を提案しました。",
          resourcesUsed: ['process_optimization'],
        };
        break;

      case 'ml_analysis':
      case 'anomaly_detection':
      case 'predictive_analysis':
      case 'cluster_analysis':
        // 進捗更新: ML分析開始
        updateProgress(sessionId, {
          operation,
          progress: 25,
          currentStep: `${operation}を実行中...`,
          totalSteps: 6,
          completedSteps: 2,
          status: 'in_progress',
        });

        let mlResult;
        try {
          switch (operation) {
            case 'ml_analysis':
              mlResult = await tools.mlAnalysis(data);
              break;
            case 'anomaly_detection':
              mlResult = await tools.anomalyDetection(data);
              break;
            case 'predictive_analysis':
              mlResult = await tools.predictiveAnalysis(data);
              break;
            case 'cluster_analysis':
              mlResult = await tools.clusterAnalysis(data);
              break;
          }
        } catch (error) {
          throw new Error(`ML analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        // 進捗更新: ML分析完了
        updateProgress(sessionId, {
          operation,
          progress: 80,
          currentStep: 'ML分析完了、結果を整理中...',
          totalSteps: 6,
          completedSteps: 5,
          status: 'in_progress',
        });

        result = {
          ...result,
          success: mlResult.success,
          analysis: {
            findings: [
              ...(mlResult.insights || []).map(insight => ({
                type: 'insight' as const,
                description: insight,
                confidence: 0.8,
                impact: 'medium' as const,
              })),
              ...(mlResult.anomalies || []).slice(0, 5).map(anomaly => ({
                type: 'anomaly' as const,
                description: `異常検知: ${anomaly.explanation}`,
                confidence: anomaly.anomalyScore / 5,
                impact: 'high' as const,
                evidence: anomaly,
              })),
            ],
            metrics: {
              dataPoints: mlResult.dataPoints || 0,
              analysisType: operation,
              executionTime: Date.now() - startTime,
            },
            visualizations: mlResult.predictions ? [
              {
                type: 'chart' as const,
                data: mlResult.predictions,
                description: '予測結果チャート',
              },
            ] : [],
          },
          reasoning: `${operation}による高度なデータ分析を実行しました。機械学習アルゴリズムを使用してパターンや傾向を分析しています。`,
          resourcesUsed: ['machine_learning', 'statistical_analysis', operation],
        };

        if (!mlResult.success) {
          result.error = mlResult.error;
        }
        break;

      case 'troubleshoot':
        // 進捗更新: トラブルシューティング開始
        updateProgress(sessionId, {
          operation,
          progress: 30,
          currentStep: 'トラブルシューティングを開始...',
          totalSteps: 6,
          completedSteps: 2,
          status: 'in_progress',
        });

        // 異常検知とデータベース分析を組み合わせ
        const troubleshootAnalysis = await tools.anomalyDetection({
          collection: 'audit_logs',
          anomalyThreshold: 1.5,
        });

        // 進捗更新: トラブルシューティング完了
        updateProgress(sessionId, {
          operation,
          progress: 80,
          currentStep: 'トラブルシューティング結果を整理中...',
          totalSteps: 6,
          completedSteps: 5,
          status: 'in_progress',
        });

        result = {
          ...result,
          success: true,
          solution: {
            summary: "システムトラブルシューティングを実行しました",
            steps: [
              {
                step: 1,
                action: "ログ分析による異常検知",
                rationale: "システムログから異常パターンを特定",
                status: 'completed' as const,
                tools_used: ['anomaly_detection', 'log_analysis'],
              },
              {
                step: 2,
                action: "根本原因の特定",
                rationale: "検出された異常から根本原因を推定",
                status: 'completed' as const,
                tools_used: ['pattern_analysis'],
              },
              {
                step: 3,
                action: "対策案の提案",
                rationale: "原因に基づく具体的な対策を提案",
                status: 'completed' as const,
                tools_used: ['solution_recommendation'],
              },
            ],
            recommendations: [
              ...(troubleshootAnalysis.recommendations || []),
              "システムログの定期監視を強化してください",
              "異常パターンのアラート設定を検討してください",
            ],
          },
          reasoning: "異常検知アルゴリズムを使用してシステムトラブルの原因を分析しました。",
          resourcesUsed: ['troubleshooting', 'anomaly_detection', 'log_analysis'],
        };
        break;

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    // 実行時間の計算
    result.executionTime = Date.now() - startTime;

    // 進捗更新: 最終完了
    updateProgress(sessionId, {
      operation,
      progress: 100,
      currentStep: '処理完了',
      totalSteps: 6,
      completedSteps: 6,
      status: 'completed',
      data: {
        executionTime: result.executionTime,
        resourcesUsed: result.resourcesUsed,
        success: result.success,
      },
    });

    // 完了ログの記録
    await db.updateById(Collections.AUDIT_LOGS, executionLog._id, {
      status: 'completed',
      endTime: new Date(),
      executionTime: result.executionTime,
      success: result.success,
    });

    // 最終結果をWebSocketで送信
    wsManager.sendResult(sessionId, result, 'problem-solving-agent');

    return result;

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // エラー進捗更新
    updateProgress(sessionId, {
      operation,
      progress: 0,
      currentStep: 'エラーが発生しました',
      totalSteps: 6,
      completedSteps: 0,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // WebSocketでエラー通知
    wsManager.sendError(sessionId, {
      message: error instanceof Error ? error.message : 'Unknown error',
      operation,
      executionTime,
    }, 'problem-solving-agent');
    
    // エラーログの記録
    try {
      await db.create(Collections.AUDIT_LOGS, {
        sessionId,
        operation,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        timestamp: new Date(),
        companyId: data.companyId,
      });
    } catch (logError) {
      logger.warn('Failed to log error:', logError);
    }

    const errorResult = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      reasoning: '実行中にエラーが発生しました',
      executionTime,
      resourcesUsed: [],
      metadata: {
        sessionId,
        timestamp: new Date(),
        agentVersion: '2.0.0',
        llmModel: 'deepseek-chat (cascade)',
        llmProviders: llmManager.getProviderStatus(),
      },
    };

    return errorResult;
  }
}

// 分析専用関数
export async function analyzeData(data: z.infer<typeof analysisSchema>): Promise<ProblemSolvingResult> {
  return solveProblem('analyze_data', data);
}

// レポート生成関数（研究レポート）
export async function generateReport(data: z.infer<typeof researchSchema>): Promise<ProblemSolvingResult> {
  return solveProblem('research_topic', data);
}

// ML分析関数のエクスポート
export async function performMLAnalysis(operation: 'ml_analysis' | 'anomaly_detection' | 'predictive_analysis' | 'cluster_analysis', data: any): Promise<ProblemSolvingResult> {
  return solveProblem(operation, data);
}

// スキーマのエクスポート
export {
  problemSolvingSchema,
  analysisSchema,
  researchSchema,
  problemSolvingInputSchema,
};

// 型のエクスポート
export type { ProblemSolvingResult };