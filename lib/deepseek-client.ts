import { ExternalAPIError, TimeoutError, createTimeoutPromise, retryWithBackoff } from './api-error-handler';

import { logger } from '@/lib/logger';
interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface DeepSeekOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  stream?: boolean;
}

export class DeepSeekClient {
  private apiKey: string;
  private baseURL: string = 'https://api.deepseek.com';
  private defaultTimeout: number = 10000; // 10秒

  constructor(apiKey?: string) {
    const key = apiKey || process.env.DEEPSEEK_API_KEY;
    if (!key) {
      throw new Error('DeepSeek API key is not configured');
    }
    this.apiKey = key;
  }

  /**
   * チャット補完APIを呼び出す
   */
  async chat(
    messages: DeepSeekMessage[],
    options: DeepSeekOptions = {}
  ): Promise<DeepSeekResponse> {
    const {
      model = 'deepseek-chat',
      temperature = 0.7,
      maxTokens = 1000,
      topP,
      frequencyPenalty,
      presencePenalty,
      stop,
      stream = false,
    } = options;

    const requestBody = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      ...(topP !== undefined && { top_p: topP }),
      ...(frequencyPenalty !== undefined && { frequency_penalty: frequencyPenalty }),
      ...(presencePenalty !== undefined && { presence_penalty: presencePenalty }),
      ...(stop !== undefined && { stop }),
      stream,
    };

    try {
      // リトライ付きでAPIを呼び出す
      const response = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

          try {
            const res = await fetch(`${this.baseURL}/chat/completions`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
              const errorText = await res.text();
              logger.error('DeepSeek API error response:', errorText);
              
              // レート制限エラー
              if (res.status === 429) {
                throw new ExternalAPIError('DeepSeek', 'Rate limit exceeded', 429);
              }
              
              // 認証エラー
              if (res.status === 401) {
                throw new ExternalAPIError('DeepSeek', 'Invalid API key', 401);
              }
              
              throw new ExternalAPIError('DeepSeek', `HTTP ${res.status}: ${errorText}`, res.status);
            }

            const data = await res.json();
            return data as DeepSeekResponse;
          } finally {
            clearTimeout(timeoutId);
          }
        },
        3, // 最大3回リトライ
        1000 // 初回遅延1秒
      );

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError('DeepSeek API request timeout');
      }
      throw error;
    }
  }

  /**
   * ストリーミングチャット補完
   */
  async *chatStream(
    messages: DeepSeekMessage[],
    options: DeepSeekOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const streamOptions = { ...options, stream: true };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // ストリーミングは30秒タイムアウト

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: streamOptions.model || 'deepseek-chat',
          messages,
          temperature: streamOptions.temperature || 0.7,
          max_tokens: streamOptions.maxTokens || 1000,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new ExternalAPIError('DeepSeek', `HTTP ${response.status}`, response.status);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              logger.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * シンプルな補完リクエスト
   */
  async complete(prompt: string, options: DeepSeekOptions = {}): Promise<string> {
    const messages: DeepSeekMessage[] = [
      { role: 'user', content: prompt }
    ];

    const response = await this.chat(messages, options);
    return response.choices[0]?.message?.content || '';
  }

  /**
   * APIキーの検証
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.complete('Hello', { maxTokens: 5 });
      return true;
    } catch (error) {
      if (error instanceof ExternalAPIError && error.statusCode === 401) {
        return false;
      }
      throw error;
    }
  }
}

// シングルトンインスタンス
let defaultClient: DeepSeekClient | null = null;

export function getDeepSeekClient(): DeepSeekClient {
  if (!defaultClient) {
    defaultClient = new DeepSeekClient();
  }
  return defaultClient;
}