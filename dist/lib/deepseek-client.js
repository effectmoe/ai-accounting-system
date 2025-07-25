"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepSeekClient = void 0;
exports.getDeepSeekClient = getDeepSeekClient;
const api_error_handler_1 = require("./api-error-handler");
const logger_1 = require("@/lib/logger");
class DeepSeekClient {
    apiKey;
    baseURL = 'https://api.deepseek.com';
    defaultTimeout = 10000; // 10秒
    constructor(apiKey) {
        const key = apiKey || process.env.DEEPSEEK_API_KEY;
        if (!key) {
            throw new Error('DeepSeek API key is not configured');
        }
        this.apiKey = key;
    }
    /**
     * チャット補完APIを呼び出す
     */
    async chat(messages, options = {}) {
        const { model = 'deepseek-chat', temperature = 0.7, maxTokens = 1000, topP, frequencyPenalty, presencePenalty, stop, stream = false, } = options;
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
            const response = await (0, api_error_handler_1.retryWithBackoff)(async () => {
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
                        logger_1.logger.error('DeepSeek API error response:', errorText);
                        // レート制限エラー
                        if (res.status === 429) {
                            throw new api_error_handler_1.ExternalAPIError('DeepSeek', 'Rate limit exceeded', 429);
                        }
                        // 認証エラー
                        if (res.status === 401) {
                            throw new api_error_handler_1.ExternalAPIError('DeepSeek', 'Invalid API key', 401);
                        }
                        throw new api_error_handler_1.ExternalAPIError('DeepSeek', `HTTP ${res.status}: ${errorText}`, res.status);
                    }
                    const data = await res.json();
                    return data;
                }
                finally {
                    clearTimeout(timeoutId);
                }
            }, 3, // 最大3回リトライ
            1000 // 初回遅延1秒
            );
            return response;
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new api_error_handler_1.TimeoutError('DeepSeek API request timeout');
            }
            throw error;
        }
    }
    /**
     * ストリーミングチャット補完
     */
    async *chatStream(messages, options = {}) {
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
                throw new api_error_handler_1.ExternalAPIError('DeepSeek', `HTTP ${response.status}`, response.status);
            }
            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('Response body is not readable');
            }
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
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
                        }
                        catch (e) {
                            logger_1.logger.error('Failed to parse SSE data:', e);
                        }
                    }
                }
            }
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * シンプルな補完リクエスト
     */
    async complete(prompt, options = {}) {
        const messages = [
            { role: 'user', content: prompt }
        ];
        const response = await this.chat(messages, options);
        return response.choices[0]?.message?.content || '';
    }
    /**
     * APIキーの検証
     */
    async validateApiKey() {
        try {
            await this.complete('Hello', { maxTokens: 5 });
            return true;
        }
        catch (error) {
            if (error instanceof api_error_handler_1.ExternalAPIError && error.statusCode === 401) {
                return false;
            }
            throw error;
        }
    }
}
exports.DeepSeekClient = DeepSeekClient;
// シングルトンインスタンス
let defaultClient = null;
function getDeepSeekClient() {
    if (!defaultClient) {
        defaultClient = new DeepSeekClient();
    }
    return defaultClient;
}
