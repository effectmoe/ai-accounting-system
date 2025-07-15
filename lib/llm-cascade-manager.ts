import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// DeepSeek用のOpenAI互換クライアント
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

export class LLMCascadeManager {
  private providers: LLMProvider[] = [];
  private currentProviderIndex = 0;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // DeepSeek (メイン) - OpenAI互換API
    if (process.env.DEEPSEEK_API_KEY) {
      this.providers.push({
        name: 'deepseek',
        priority: 1,
        available: true,
        client: new OpenAI({
          apiKey: process.env.DEEPSEEK_API_KEY,
          baseURL: 'https://api.deepseek.com/v1',
        }),
        model: 'deepseek-chat',
        maxTokens: 4000,
        costPerToken: 0.00014, // DeepSeekの料金（参考値）
      });
    }

    // Anthropic Claude (フォールバック1)
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.push({
        name: 'anthropic',
        priority: 2,
        available: true,
        client: new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY,
        }),
        model: 'claude-3-sonnet-20240229',
        maxTokens: 4000,
        costPerToken: 0.003, // Claude 3 Sonnet料金
      });
    }

    // OpenAI GPT (フォールバック2)
    if (process.env.OPENAI_API_KEY) {
      this.providers.push({
        name: 'openai',
        priority: 3,
        available: true,
        client: new OpenAI({
          apiKey: process.env.OPENAI_API_KEY,
        }),
        model: 'gpt-4o-mini',
        maxTokens: 4000,
        costPerToken: 0.00015, // GPT-4o-mini料金
      });
    }

    // 優先度順にソート
    this.providers.sort((a, b) => a.priority - b.priority);
    
    console.log(`[LLM Cascade] Initialized ${this.providers.length} providers:`, 
      this.providers.map(p => `${p.name}(${p.priority})`).join(', '));
  }

  /**
   * カスケード形式でLLMを呼び出し、失敗時は次のプロバイダーを試行
   */
  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    let lastError: string | null = null;

    for (const provider of this.providers) {
      if (!provider.available) {
        continue;
      }

      try {
        console.log(`[LLM Cascade] Trying ${provider.name}...`);
        
        const response = await this.callProvider(provider, request);
        
        console.log(`[LLM Cascade] Success with ${provider.name} (${Date.now() - startTime}ms)`);
        
        return {
          ...response,
          provider: provider.name,
          latency: Date.now() - startTime,
          success: true,
        };

      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`[LLM Cascade] ${provider.name} failed:`, lastError);
        
        // プロバイダーを一時的に無効化（レート制限等の場合）
        if (lastError.includes('rate_limit') || lastError.includes('quota')) {
          provider.available = false;
          // 5分後に再有効化
          setTimeout(() => {
            provider.available = true;
            console.log(`[LLM Cascade] Re-enabled ${provider.name}`);
          }, 5 * 60 * 1000);
        }
        
        continue;
      }
    }

    // 全プロバイダーが失敗
    throw new Error(`All LLM providers failed. Last error: ${lastError}`);
  }

  /**
   * 特定のプロバイダーを呼び出し
   */
  private async callProvider(provider: LLMProvider, request: LLMRequest): Promise<Omit<LLMResponse, 'provider' | 'latency' | 'success'>> {
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

  /**
   * OpenAI互換API（DeepSeek、OpenAI）の呼び出し
   */
  private async callOpenAICompatible(provider: LLMProvider, request: LLMRequest, maxTokens: number): Promise<Omit<LLMResponse, 'provider' | 'latency' | 'success'>> {
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

  /**
   * Anthropic Claude APIの呼び出し
   */
  private async callAnthropic(provider: LLMProvider, request: LLMRequest, maxTokens: number): Promise<Omit<LLMResponse, 'provider' | 'latency' | 'success'>> {
    // メッセージをClaude形式に変換
    const systemMessage = request.messages.find(m => m.role === 'system')?.content || '';
    const messages = request.messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role as 'user' | 'assistant',
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

  /**
   * 利用可能なプロバイダーの状況を取得
   */
  getProviderStatus() {
    return this.providers.map(provider => ({
      name: provider.name,
      priority: provider.priority,
      available: provider.available,
      model: provider.model,
      costPerToken: provider.costPerToken,
    }));
  }

  /**
   * 特定のプロバイダーを一時的に無効化
   */
  disableProvider(providerName: string, durationMs: number = 5 * 60 * 1000) {
    const provider = this.providers.find(p => p.name === providerName);
    if (provider) {
      provider.available = false;
      setTimeout(() => {
        provider.available = true;
        console.log(`[LLM Cascade] Re-enabled ${providerName}`);
      }, durationMs);
    }
  }

  /**
   * コスト効率の良いプロバイダーを選択（デバッグ用）
   */
  getMostCostEffectiveProvider(): LLMProvider | null {
    const available = this.providers.filter(p => p.available);
    if (available.length === 0) return null;
    
    return available.reduce((prev, current) => 
      prev.costPerToken < current.costPerToken ? prev : current
    );
  }

  /**
   * 簡単なテキスト生成（問題解決エージェント用）
   */
  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: LLMRequest['messages'] = [];
    
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

  /**
   * 段階的思考用の特化プロンプト
   */
  async generateSequentialThinking(problem: string, context?: any): Promise<{
    analysis: string;
    steps: Array<{
      step: number;
      title: string;
      action: string;
      reasoning: string;
    }>;
    recommendations: string[];
  }> {
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
      // JSONレスポンスをパース
      const parsed = JSON.parse(response.content);
      return parsed;
    } catch (error) {
      // JSONパースに失敗した場合はテキストから構造化
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