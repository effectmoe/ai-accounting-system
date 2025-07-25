interface LLMProvider {
    name: string;
    priority: number;
    available: boolean;
    client: any;
    model: string;
    maxTokens: number;
    costPerToken: number;
}
interface LLMRequest {
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
}
interface LLMResponse {
    content: string;
    provider: string;
    tokens: {
        input: number;
        output: number;
        total: number;
    };
    cost: number;
    latency: number;
    success: boolean;
    error?: string;
}
export declare class LLMCascadeManager {
    private static instance;
    private providers;
    private currentProviderIndex;
    private constructor();
    static getInstance(): LLMCascadeManager;
    private initializeProviders;
    generateResponse(request: LLMRequest): Promise<LLMResponse>;
    private callProvider;
    private callOpenAICompatible;
    private callAnthropic;
    getProviderStatus(): {
        name: string;
        priority: number;
        available: boolean;
        model: string;
        costPerToken: number;
    }[];
    disableProvider(providerName: string, durationMs?: number): void;
    getMostCostEffectiveProvider(): LLMProvider | null;
    generateText(prompt: string, systemPrompt?: string): Promise<string>;
    executeCascade(params: {
        instruction: string;
        prompt: string;
        preferredProvider?: string;
        maxTokens?: number;
        temperature?: number;
    }): Promise<string>;
    generateSequentialThinking(problem: string, context?: any): Promise<{
        analysis: string;
        steps: Array<{
            step: number;
            title: string;
            action: string;
            reasoning: string;
        }>;
        recommendations: string[];
    }>;
}
export {};
