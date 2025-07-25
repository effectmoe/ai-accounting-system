interface PerplexitySearchRequest {
    query: string;
    max_tokens?: number;
    temperature?: number;
    top_p?: number;
    stream?: boolean;
    return_citations?: boolean;
    search_domain_filter?: string[];
    return_images?: boolean;
    search_recency_filter?: 'month' | 'week' | 'day' | 'hour';
}
interface SearchResult {
    content: string;
    citations: string[];
    images: string[];
    metadata: {
        model: string;
        tokens: {
            prompt: number;
            completion: number;
            total: number;
        };
        searchFilters?: {
            domain?: string[];
            recency?: string;
        };
    };
    success: boolean;
    error?: string;
}
export declare class PerplexityClient {
    private apiKey;
    private baseURL;
    private model;
    constructor(apiKey?: string);
    search(request: PerplexitySearchRequest): Promise<SearchResult>;
    searchDomain(query: string, domains: string[], options?: Partial<PerplexitySearchRequest>): Promise<SearchResult>;
    searchRecent(query: string, recency?: 'hour' | 'day' | 'week' | 'month', options?: Partial<PerplexitySearchRequest>): Promise<SearchResult>;
    academicSearch(query: string, options?: Partial<PerplexitySearchRequest>): Promise<SearchResult>;
    businessSearch(query: string, options?: Partial<PerplexitySearchRequest>): Promise<SearchResult>;
    techSearch(query: string, options?: Partial<PerplexitySearchRequest>): Promise<SearchResult>;
    multiSearch(baseQuery: string, perspectives?: string[]): Promise<{
        baseQuery: string;
        results: Array<{
            perspective: string;
            query: string;
            result: SearchResult;
        }>;
        summary: string;
    }>;
    testConnection(): Promise<{
        available: boolean;
        model: string;
        error?: string;
    }>;
}
export {};
