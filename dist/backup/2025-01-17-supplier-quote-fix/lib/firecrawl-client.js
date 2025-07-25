"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirecrawlClient = void 0;
class FirecrawlClient {
    apiKey;
    baseURL = 'https://api.firecrawl.dev/v1';
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.FIRECRAWL_API_KEY || '';
        if (!this.apiKey) {
            console.warn('Firecrawl API key not provided. Web scraping functionality will be limited.');
        }
    }
    /**
     * 単一ページのスクレイピング
     */
    async scrape(request) {
        if (!this.apiKey) {
            return {
                success: false,
                error: 'Firecrawl API key not configured',
            };
        }
        try {
            const payload = {
                url: request.url,
                formats: request.formats || ['markdown', 'html'],
                headers: request.headers,
                includeTags: request.includeTags,
                excludeTags: request.excludeTags,
                onlyMainContent: request.onlyMainContent !== false,
                timeout: request.timeout || 30000,
                waitFor: request.waitFor || 0,
            };
            const response = await fetch(`${this.baseURL}/scrape`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Scraping failed');
            }
            return {
                success: true,
                data: {
                    content: result.data.content || '',
                    markdown: result.data.markdown || '',
                    html: result.data.html || '',
                    rawHtml: result.data.rawHtml || '',
                    links: result.data.links || [],
                    metadata: {
                        title: result.data.metadata?.title || '',
                        description: result.data.metadata?.description || '',
                        language: result.data.metadata?.language || '',
                        sourceURL: result.data.metadata?.sourceURL || request.url,
                        statusCode: result.data.metadata?.statusCode || 200,
                    },
                    screenshot: result.data.screenshot,
                },
            };
        }
        catch (error) {
            console.error('Firecrawl scrape error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Scraping failed',
            };
        }
    }
    /**
     * 複数ページのクロール
     */
    async crawl(request) {
        if (!this.apiKey) {
            return {
                success: false,
                error: 'Firecrawl API key not configured',
            };
        }
        try {
            const payload = {
                url: request.url,
                limit: request.limit || 100,
                scrapeOptions: {
                    formats: ['markdown', 'html'],
                    onlyMainContent: true,
                    ...request.scrapeOptions,
                },
                allowBackwardLinks: request.allowBackwardLinks || false,
                allowExternalLinks: request.allowExternalLinks || false,
                ignoreSitemap: request.ignoreSitemap || false,
                webhook: request.webhook,
            };
            const response = await fetch(`${this.baseURL}/crawl`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Crawling failed');
            }
            return {
                success: true,
                data: result.data || [],
                total: result.total || 0,
                creditsUsed: result.creditsUsed || 0,
                expiresAt: result.expiresAt,
            };
        }
        catch (error) {
            console.error('Firecrawl crawl error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Crawling failed',
            };
        }
    }
    /**
     * Web検索（FirecrawlのSearch機能）
     */
    async search(request) {
        if (!this.apiKey) {
            return {
                success: false,
                error: 'Firecrawl API key not configured',
            };
        }
        try {
            const payload = {
                query: request.query,
                pageOptions: {
                    onlyMainContent: true,
                    includeHtml: false,
                    fetchPageContent: true,
                    ...request.pageOptions,
                },
                searchOptions: {
                    limit: 10,
                    ...request.searchOptions,
                },
            };
            const response = await fetch(`${this.baseURL}/search`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Firecrawl API error: ${response.status} - ${errorText}`);
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Search failed');
            }
            return {
                success: true,
                data: result.data || [],
            };
        }
        catch (error) {
            console.error('Firecrawl search error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Search failed',
            };
        }
    }
    /**
     * 競合他社サイトの分析
     */
    async analyzeCompetitorSite(url) {
        try {
            // まずメインページをスクレイピング
            const scrapeResult = await this.scrape({
                url,
                formats: ['markdown', 'content', 'links'],
                onlyMainContent: true,
            });
            if (!scrapeResult.success || !scrapeResult.data) {
                return {
                    success: false,
                    error: scrapeResult.error || 'Failed to scrape main page',
                };
            }
            const data = scrapeResult.data;
            // 重要なリンクを抽出
            const importantLinks = data.links?.filter(link => link.text &&
                (link.text.toLowerCase().includes('about') ||
                    link.text.toLowerCase().includes('service') ||
                    link.text.toLowerCase().includes('product') ||
                    link.text.toLowerCase().includes('pricing') ||
                    link.text.toLowerCase().includes('contact') ||
                    link.href.includes('/about') ||
                    link.href.includes('/service') ||
                    link.href.includes('/product') ||
                    link.href.includes('/pricing'))) || [];
            // キーページのURLを抽出
            const keyPages = importantLinks.map(link => {
                if (link.href.startsWith('/')) {
                    const baseUrl = new URL(url);
                    return `${baseUrl.origin}${link.href}`;
                }
                return link.href;
            }).slice(0, 5); // 最大5ページ
            // コンテンツの要約
            const content = data.content || '';
            const wordCount = content.split(/\s+/).length;
            const contentSummary = content.length > 500 ?
                content.substring(0, 500) + '...' : content;
            return {
                success: true,
                analysis: {
                    content: data.content || '',
                    title: data.metadata.title,
                    description: data.metadata.description || '',
                    links: data.links || [],
                    keyPages,
                    contentSummary,
                    technicalInfo: {
                        statusCode: data.metadata.statusCode,
                        language: data.metadata.language || 'unknown',
                        wordCount,
                        linkCount: data.links?.length || 0,
                    },
                },
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Site analysis failed',
            };
        }
    }
    /**
     * サイトマップベースのクロール
     */
    async crawlSitemap(sitemapUrl, options) {
        try {
            // サイトマップをスクレイピング
            const sitemapResult = await this.scrape({
                url: sitemapUrl,
                formats: ['html'],
                onlyMainContent: false,
            });
            if (!sitemapResult.success) {
                throw new Error('Failed to fetch sitemap');
            }
            // サイトマップからURLを抽出（簡易実装）
            const content = sitemapResult.data?.content || '';
            const urlPattern = /<loc>(.*?)<\/loc>/g;
            const urls = [];
            let match;
            while ((match = urlPattern.exec(content)) !== null) {
                const url = match[1];
                // フィルタリング
                if (options?.includePatterns &&
                    !options.includePatterns.some(pattern => url.includes(pattern))) {
                    continue;
                }
                if (options?.excludePatterns &&
                    options.excludePatterns.some(pattern => url.includes(pattern))) {
                    continue;
                }
                urls.push(url);
                if (urls.length >= (options?.limit || 50)) {
                    break;
                }
            }
            // 各URLをスクレイピング
            const scrapePromises = urls.slice(0, Math.min(urls.length, options?.limit || 20))
                .map(url => this.scrape({ url, formats: ['markdown', 'html'] }));
            const results = await Promise.all(scrapePromises);
            const successfulResults = results
                .filter(result => result.success && result.data)
                .map(result => ({
                content: result.data.content,
                markdown: result.data.markdown,
                metadata: result.data.metadata,
            }));
            return {
                success: true,
                data: successfulResults,
                total: successfulResults.length,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Sitemap crawl failed',
            };
        }
    }
    /**
     * API接続状況のテスト
     */
    async testConnection() {
        if (!this.apiKey) {
            return {
                available: false,
                error: 'API key not configured',
            };
        }
        try {
            // シンプルなテストページをスクレイピング
            const result = await this.scrape({
                url: 'https://httpbin.org/html',
                formats: ['html'],
                timeout: 10000,
            });
            return {
                available: result.success,
                error: result.error,
            };
        }
        catch (error) {
            return {
                available: false,
                error: error instanceof Error ? error.message : 'Connection test failed',
            };
        }
    }
    /**
     * クレジット残高の確認
     */
    async getCreditBalance() {
        if (!this.apiKey) {
            return {
                error: 'API key not configured',
            };
        }
        try {
            const response = await fetch(`${this.baseURL}/credits`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                },
            });
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            const result = await response.json();
            return {
                balance: result.credits || result.balance,
            };
        }
        catch (error) {
            return {
                error: error instanceof Error ? error.message : 'Failed to fetch credits',
            };
        }
    }
}
exports.FirecrawlClient = FirecrawlClient;
