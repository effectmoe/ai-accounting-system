interface FirecrawlScrapeRequest {
    url: string;
    formats?: ('markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot')[];
    headers?: Record<string, string>;
    includeTags?: string[];
    excludeTags?: string[];
    onlyMainContent?: boolean;
    timeout?: number;
    waitFor?: number;
}
interface FirecrawlCrawlRequest {
    url: string;
    limit?: number;
    scrapeOptions?: Omit<FirecrawlScrapeRequest, 'url'>;
    allowBackwardLinks?: boolean;
    allowExternalLinks?: boolean;
    ignoreSitemap?: boolean;
    webhook?: string;
}
interface FirecrawlSearchRequest {
    query: string;
    pageOptions?: {
        onlyMainContent?: boolean;
        includeHtml?: boolean;
        fetchPageContent?: boolean;
    };
    searchOptions?: {
        limit?: number;
    };
}
interface ScrapeResult {
    success: boolean;
    data?: {
        content: string;
        markdown?: string;
        html?: string;
        rawHtml?: string;
        links?: Array<{
            text: string;
            href: string;
        }>;
        metadata: {
            title: string;
            description?: string;
            language?: string;
            sourceURL: string;
            statusCode: number;
            error?: string;
        };
        screenshot?: string;
    };
    error?: string;
}
interface CrawlResult {
    success: boolean;
    data?: Array<{
        content: string;
        markdown?: string;
        metadata: {
            title: string;
            description?: string;
            sourceURL: string;
            statusCode: number;
        };
    }>;
    total?: number;
    creditsUsed?: number;
    expiresAt?: string;
    error?: string;
}
interface SearchResult {
    success: boolean;
    data?: Array<{
        url: string;
        title: string;
        description: string;
        content?: string;
    }>;
    error?: string;
}
export declare class FirecrawlClient {
    private apiKey;
    private baseURL;
    constructor(apiKey?: string);
    scrape(request: FirecrawlScrapeRequest): Promise<ScrapeResult>;
    crawl(request: FirecrawlCrawlRequest): Promise<CrawlResult>;
    search(request: FirecrawlSearchRequest): Promise<SearchResult>;
    analyzeCompetitorSite(url: string): Promise<{
        success: boolean;
        analysis?: {
            content: string;
            title: string;
            description: string;
            links: Array<{
                text: string;
                href: string;
            }>;
            keyPages: string[];
            contentSummary: string;
            technicalInfo: {
                statusCode: number;
                language: string;
                wordCount: number;
                linkCount: number;
            };
        };
        error?: string;
    }>;
    crawlSitemap(sitemapUrl: string, options?: {
        limit?: number;
        includePatterns?: string[];
        excludePatterns?: string[];
    }): Promise<CrawlResult>;
    testConnection(): Promise<{
        available: boolean;
        error?: string;
    }>;
    getCreditBalance(): Promise<{
        balance?: number;
        error?: string;
    }>;
}
export {};
