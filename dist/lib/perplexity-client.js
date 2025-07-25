"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerplexityClient = void 0;
const logger_1 = require("@/lib/logger");
class PerplexityClient {
    apiKey;
    baseURL = 'https://api.perplexity.ai';
    model = 'sonar';
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.PERPLEXITY_API_KEY || '';
        if (!this.apiKey) {
            logger_1.logger.warn('Perplexity API key not provided. Web search functionality will be limited.');
        }
    }
    async search(request) {
        if (!this.apiKey) {
            return {
                content: 'Perplexity API key not configured. Web search is unavailable.',
                citations: [],
                images: [],
                metadata: {
                    model: 'unavailable',
                    tokens: { prompt: 0, completion: 0, total: 0 },
                },
                success: false,
                error: 'API key not configured',
            };
        }
        try {
            const payload = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful research assistant. Provide accurate, well-cited information based on current web sources. Always include relevant citations for your statements.',
                    },
                    {
                        role: 'user',
                        content: request.query,
                    },
                ],
                max_tokens: request.max_tokens || 2000,
                temperature: request.temperature || 0.2,
                top_p: request.top_p || 0.9,
                return_citations: request.return_citations !== false,
                return_images: request.return_images || false,
                search_domain_filter: request.search_domain_filter,
                search_recency_filter: request.search_recency_filter,
            };
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Perplexity API error: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            const choice = data.choices[0];
            if (!choice) {
                throw new Error('No response from Perplexity API');
            }
            return {
                content: choice.message.content,
                citations: data.citations || [],
                images: data.images || [],
                metadata: {
                    model: data.model,
                    tokens: {
                        prompt: data.usage.prompt_tokens,
                        completion: data.usage.completion_tokens,
                        total: data.usage.total_tokens,
                    },
                    searchFilters: {
                        domain: request.search_domain_filter,
                        recency: request.search_recency_filter,
                    },
                },
                success: true,
            };
        }
        catch (error) {
            logger_1.logger.error('Perplexity search error:', error);
            return {
                content: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                citations: [],
                images: [],
                metadata: {
                    model: this.model,
                    tokens: { prompt: 0, completion: 0, total: 0 },
                },
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    async searchDomain(query, domains, options) {
        return this.search({
            query,
            search_domain_filter: domains,
            return_citations: true,
            ...options,
        });
    }
    async searchRecent(query, recency = 'day', options) {
        return this.search({
            query,
            search_recency_filter: recency,
            return_citations: true,
            ...options,
        });
    }
    async academicSearch(query, options) {
        const academicDomains = [
            'scholar.google.com',
            'arxiv.org',
            'pubmed.ncbi.nlm.nih.gov',
            'jstor.org',
            'ieee.org',
            'acm.org',
            'nature.com',
            'science.org',
            'springer.com',
            'elsevier.com',
        ];
        return this.search({
            query: `Academic research: ${query}`,
            search_domain_filter: academicDomains,
            return_citations: true,
            temperature: 0.1,
            ...options,
        });
    }
    async businessSearch(query, options) {
        const businessDomains = [
            'bloomberg.com',
            'reuters.com',
            'wsj.com',
            'ft.com',
            'forbes.com',
            'harvard.edu',
            'mckinsey.com',
            'bcg.com',
            'deloitte.com',
            'pwc.com',
        ];
        return this.search({
            query: `Business analysis: ${query}`,
            search_domain_filter: businessDomains,
            return_citations: true,
            search_recency_filter: 'month',
            ...options,
        });
    }
    async techSearch(query, options) {
        const techDomains = [
            'github.com',
            'stackoverflow.com',
            'medium.com',
            'dev.to',
            'techcrunch.com',
            'ycombinator.com',
            'arxiv.org',
            'docs.microsoft.com',
            'developer.mozilla.org',
            'aws.amazon.com',
        ];
        return this.search({
            query: `Technical information: ${query}`,
            search_domain_filter: techDomains,
            return_citations: true,
            search_recency_filter: 'month',
            ...options,
        });
    }
    async multiSearch(baseQuery, perspectives = ['overview', 'benefits', 'challenges', 'latest trends']) {
        const searchPromises = perspectives.map(async (perspective) => {
            const enhancedQuery = `${baseQuery} ${perspective}`;
            const result = await this.search({
                query: enhancedQuery,
                max_tokens: 1000,
                return_citations: true,
            });
            return {
                perspective,
                query: enhancedQuery,
                result,
            };
        });
        const results = await Promise.all(searchPromises);
        const successfulResults = results.filter(r => r.result.success);
        const allContent = successfulResults.map(r => r.result.content).join('\n\n');
        let summary = `Multiple perspective search for "${baseQuery}":\n`;
        summary += `- Successfully searched ${successfulResults.length}/${perspectives.length} perspectives\n`;
        summary += `- Total citations: ${successfulResults.reduce((sum, r) => sum + r.result.citations.length, 0)}\n`;
        summary += `- Key insights gathered from: ${successfulResults.map(r => r.perspective).join(', ')}`;
        return {
            baseQuery,
            results,
            summary,
        };
    }
    async testConnection() {
        if (!this.apiKey) {
            return {
                available: false,
                model: 'unavailable',
                error: 'API key not configured',
            };
        }
        try {
            const result = await this.search({
                query: 'test connection',
                max_tokens: 50,
                return_citations: false,
            });
            return {
                available: result.success,
                model: result.metadata.model,
                error: result.error,
            };
        }
        catch (error) {
            return {
                available: false,
                model: this.model,
                error: error instanceof Error ? error.message : 'Connection test failed',
            };
        }
    }
}
exports.PerplexityClient = PerplexityClient;
//# sourceMappingURL=perplexity-client.js.map