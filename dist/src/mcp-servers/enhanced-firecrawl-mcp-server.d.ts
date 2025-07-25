#!/usr/bin/env node
declare class EnhancedFirecrawlMCPServer {
    private server;
    private firecrawlClient;
    constructor();
    private setupToolHandlers;
    private handleScrape;
    private handleCrawl;
    private handleSearch;
    private handleAnalyzeCompetitor;
    private handleCrawlSitemap;
    private handleBulkScrape;
    private handleGetCredits;
    private handleHealthCheck;
    private handleExtractData;
    private handleCompetitiveAnalysis;
    private extractPricingInfo;
    private extractFeatures;
    run(): Promise<void>;
}
export { EnhancedFirecrawlMCPServer };
