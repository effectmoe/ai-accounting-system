"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMCascadeManager = void 0;
const openai_1 = __importDefault(require("openai"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const logger_1 = require("@/lib/logger");
class LLMCascadeManager {
    static instance;
    providers = [];
    currentProviderIndex = 0;
    constructor() {
        this.initializeProviders();
    }
    static getInstance() {
        if (!LLMCascadeManager.instance) {
            LLMCascadeManager.instance = new LLMCascadeManager();
        }
        return LLMCascadeManager.instance;
    }
    initializeProviders() {
        if (process.env.DEEPSEEK_API_KEY) {
            this.providers.push({
                name: 'deepseek',
                priority: 1,
                available: true,
                client: new openai_1.default({
                    apiKey: process.env.DEEPSEEK_API_KEY,
                    baseURL: 'https://api.deepseek.com/v1',
                }),
                model: 'deepseek-chat',
                maxTokens: 4000,
                costPerToken: 0.00014,
            });
        }
        if (process.env.ANTHROPIC_API_KEY) {
            this.providers.push({
                name: 'anthropic',
                priority: 2,
                available: true,
                client: new sdk_1.default({
                    apiKey: process.env.ANTHROPIC_API_KEY,
                }),
                model: 'claude-3-sonnet-20240229',
                maxTokens: 4000,
                costPerToken: 0.003,
            });
        }
        if (process.env.OPENAI_API_KEY) {
            this.providers.push({
                name: 'openai',
                priority: 3,
                available: true,
                client: new openai_1.default({
                    apiKey: process.env.OPENAI_API_KEY,
                }),
                model: 'gpt-4o-mini',
                maxTokens: 4000,
                costPerToken: 0.00015,
            });
        }
        this.providers.sort((a, b) => a.priority - b.priority);
        logger_1.logger.debug(`[LLM Cascade] Initialized ${this.providers.length} providers:`, this.providers.map(p => `${p.name}(${p.priority})`).join(', '));
    }
    async generateResponse(request) {
        const startTime = Date.now();
        let lastError = null;
        for (const provider of this.providers) {
            if (!provider.available) {
                continue;
            }
            try {
                logger_1.logger.debug(`[LLM Cascade] Trying ${provider.name}...`);
                const response = await this.callProvider(provider, request);
                logger_1.logger.debug(`[LLM Cascade] Success with ${provider.name} (${Date.now() - startTime}ms)`);
                return {
                    ...response,
                    provider: provider.name,
                    latency: Date.now() - startTime,
                    success: true,
                };
            }
            catch (error) {
                lastError = error instanceof Error ? error.message : 'Unknown error';
                logger_1.logger.warn(`[LLM Cascade] ${provider.name} failed:`, lastError);
                if (lastError.includes('rate_limit') || lastError.includes('quota')) {
                    provider.available = false;
                    setTimeout(() => {
                        provider.available = true;
                        logger_1.logger.debug(`[LLM Cascade] Re-enabled ${provider.name}`);
                    }, 5 * 60 * 1000);
                }
                continue;
            }
        }
        throw new Error(`All LLM providers failed. Last error: ${lastError}`);
    }
    async callProvider(provider, request) {
        const maxTokens = Math.min(request.maxTokens || provider.maxTokens, provider.maxTokens);
        switch (provider.name) {
            case 'deepseek':
            case 'openai':
                return await this.callOpenAICompatible(provider, request, maxTokens);
            case 'anthropic':
                return await this.callAnthropic(provider, request, maxTokens);
            default:
                throw new Error(`Unknown provider: ${provider.name}`);
        }
    }
    async callOpenAICompatible(provider, request, maxTokens) {
        const response = await provider.client.chat.completions.create({
            model: provider.model,
            messages: request.messages,
            max_tokens: maxTokens,
            temperature: request.temperature || 0.7,
            stream: false,
        });
        const content = response.choices[0]?.message?.content || '';
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;
        const totalTokens = inputTokens + outputTokens;
        return {
            content,
            tokens: {
                input: inputTokens,
                output: outputTokens,
                total: totalTokens,
            },
            cost: totalTokens * provider.costPerToken,
        };
    }
    async callAnthropic(provider, request, maxTokens) {
        const systemMessage = request.messages.find(m => m.role === 'system')?.content || '';
        const messages = request.messages
            .filter(m => m.role !== 'system')
            .map(m => ({
            role: m.role,
            content: m.content,
        }));
        const response = await provider.client.messages.create({
            model: provider.model,
            system: systemMessage,
            messages,
            max_tokens: maxTokens,
            temperature: request.temperature || 0.7,
        });
        const content = response.content[0]?.text || '';
        const inputTokens = response.usage?.input_tokens || 0;
        const outputTokens = response.usage?.output_tokens || 0;
        const totalTokens = inputTokens + outputTokens;
        return {
            content,
            tokens: {
                input: inputTokens,
                output: outputTokens,
                total: totalTokens,
            },
            cost: totalTokens * provider.costPerToken,
        };
    }
    getProviderStatus() {
        return this.providers.map(provider => ({
            name: provider.name,
            priority: provider.priority,
            available: provider.available,
            model: provider.model,
            costPerToken: provider.costPerToken,
        }));
    }
    disableProvider(providerName, durationMs = 5 * 60 * 1000) {
        const provider = this.providers.find(p => p.name === providerName);
        if (provider) {
            provider.available = false;
            setTimeout(() => {
                provider.available = true;
                logger_1.logger.debug(`[LLM Cascade] Re-enabled ${providerName}`);
            }, durationMs);
        }
    }
    getMostCostEffectiveProvider() {
        const available = this.providers.filter(p => p.available);
        if (available.length === 0)
            return null;
        return available.reduce((prev, current) => prev.costPerToken < current.costPerToken ? prev : current);
    }
    async generateText(prompt, systemPrompt) {
        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });
        const response = await this.generateResponse({
            messages,
            maxTokens: 2000,
            temperature: 0.7,
        });
        return response.content;
    }
    async executeCascade(params) {
        const messages = [
            { role: 'system', content: params.instruction },
            { role: 'user', content: params.prompt }
        ];
        if (params.preferredProvider) {
            const preferredIndex = this.providers.findIndex(p => p.name === params.preferredProvider && p.available);
            if (preferredIndex !== -1) {
                const temp = this.providers[0];
                this.providers[0] = this.providers[preferredIndex];
                this.providers[preferredIndex] = temp;
            }
        }
        try {
            const response = await this.generateResponse({
                messages,
                maxTokens: params.maxTokens || 4000,
                temperature: params.temperature || 0.7,
            });
            return response.content;
        }
        finally {
            this.providers.sort((a, b) => a.priority - b.priority);
        }
    }
    async generateSequentialThinking(problem, context) {
        const systemPrompt = `あなたは問題解決専門の分析エージェントです。与えられた問題を段階的に分析し、構造化された解決策を提案してください。

出力は以下のJSON形式で返してください：
{
  "analysis": "問題の詳細分析",
  "steps": [
    {
      "step": 1,
      "title": "ステップのタイトル",
      "action": "具体的な行動",
      "reasoning": "そのアクションを選ぶ理由"
    }
  ],
  "recommendations": ["推奨事項1", "推奨事項2"]
}`;
        const prompt = `問題: ${problem}
${context ? `コンテキスト: ${JSON.stringify(context, null, 2)}` : ''}

この問題を段階的に分析し、実行可能な解決策を提案してください。`;
        const response = await this.generateResponse({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            maxTokens: 3000,
            temperature: 0.7,
        });
        try {
            const parsed = JSON.parse(response.content);
            return parsed;
        }
        catch (error) {
            return {
                analysis: response.content,
                steps: [
                    {
                        step: 1,
                        title: "問題分析",
                        action: "提供された分析を確認",
                        reasoning: "LLMからの詳細分析を活用"
                    }
                ],
                recommendations: ["LLMの提案を確認してください"]
            };
        }
    }
}
exports.LLMCascadeManager = LLMCascadeManager;
//# sourceMappingURL=llm-cascade-manager.js.map