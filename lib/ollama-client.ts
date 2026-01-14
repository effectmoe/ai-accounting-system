import { logger } from '@/lib/logger';

/**
 * OpenAI互換 API クライアント
 * LM Studio + Qwen3-VL-8B との連携
 *
 * 重要: このクライアントはOpenAI互換API形式を使用します
 * - エンドポイント: /v1/models, /v1/chat/completions
 * - 画像形式: image_url: { url: "data:image/jpeg;base64,..." }
 *
 * クラウド対応:
 * - ローカル開発: http://localhost:1234 (LM Studio)
 * - クラウド本番: https://local-ollama.otona-off.style (Cloudflare Tunnel経由)
 *
 * 環境変数:
 * - OLLAMA_URL: LM StudioのベースURL
 * - OLLAMA_MODEL: デフォルトモデル（qwen3-vl-8b-instruct-mlx）
 * - OLLAMA_VISION_MODEL: Visionモデル（qwen3-vl-8b-instruct-mlx）
 * - OLLAMA_TIMEOUT: タイムアウト（ミリ秒、デフォルト: 120000）
 */

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

// OpenAI互換レスポンス形式
interface OllamaResponse {
  id?: string;
  object?: string;
  created?: number;
  model: string;
  choices?: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason?: string;
  }>;
  // 内部処理用（OpenAIレスポンスから変換後）
  message: {
    role: string;
    content: string;
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface OllamaOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number; // OpenAI互換形式
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  stream?: boolean;
}

// デフォルト設定（LM Studio互換）
const DEFAULT_LOCAL_URL = 'http://localhost:1234';
const DEFAULT_CLOUD_URL = 'https://local-lmstudio.otona-off.style';
const DEFAULT_TIMEOUT_LOCAL = 60000;  // ローカル: 60秒
const DEFAULT_TIMEOUT_CLOUD = 180000; // クラウド: 180秒（Tunnel経由のレイテンシを考慮）

export class OllamaClient {
  private baseURL: string;
  private defaultModel: string;
  private defaultTimeout: number;
  private isAvailable: boolean = false;
  private isCloudMode: boolean = false;

  constructor(baseURL?: string, model?: string) {
    // クラウド環境かローカル環境かを判定
    this.isCloudMode = process.env.VERCEL === '1' ||
                       process.env.CLOUDFLARE === '1' ||
                       process.env.NODE_ENV === 'production';

    // URL決定ロジック: 環境変数 > クラウド/ローカルデフォルト
    // 環境変数の値をtrimして改行文字を除去
    if (baseURL) {
      this.baseURL = baseURL.trim();
    } else if (process.env.OLLAMA_URL) {
      this.baseURL = process.env.OLLAMA_URL.trim();
    } else {
      this.baseURL = this.isCloudMode ? DEFAULT_CLOUD_URL : DEFAULT_LOCAL_URL;
    }

    // 2025-01: Command R廃止 → Qwen3-VL Thinkingに統合
    this.defaultModel = model || process.env.OLLAMA_MODEL || 'qwen3-vl';

    // タイムアウト設定: 環境変数 > クラウド/ローカルデフォルト
    const envTimeout = process.env.OLLAMA_TIMEOUT ? parseInt(process.env.OLLAMA_TIMEOUT, 10) : undefined;
    this.defaultTimeout = envTimeout || (this.isCloudMode ? DEFAULT_TIMEOUT_CLOUD : DEFAULT_TIMEOUT_LOCAL);

    logger.info('[OllamaClient] Initializing...', {
      baseURL: this.baseURL,
      model: this.defaultModel,
      isCloudMode: this.isCloudMode,
      timeout: this.defaultTimeout
    });
  }

  /**
   * Ollamaの利用可能性を確認
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒タイムアウト

      const response = await fetch(`${this.baseURL}/v1/models`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.debug('[OllamaClient] Ollama not available:', response.status);
        this.isAvailable = false;
        return false;
      }

      const data = await response.json();
      // OpenAI形式は data 配列、Ollama形式は models 配列
      const models = data.data || data.models || [];
      const hasModel = models.some((m: any) => {
        const modelId = m.id || m.name || '';
        return modelId.includes(this.defaultModel);
      });

      logger.debug('[OllamaClient] Available models:', models.map((m: any) => m.id || m.name));
      logger.debug('[OllamaClient] Target model available:', hasModel);

      this.isAvailable = hasModel;
      return hasModel;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug('[OllamaClient] Availability check timed out');
      } else {
        logger.debug('[OllamaClient] Availability check failed:', error);
      }
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * チャット補完APIを呼び出す
   */
  async chat(
    messages: OllamaMessage[],
    options: OllamaOptions = {}
  ): Promise<OllamaResponse> {
    const {
      model = this.defaultModel,
      temperature = 0,
      max_tokens = 4000,
      top_p,
      stream = false,
    } = options;

    // OpenAI互換形式のリクエストボディ
    const requestBody = {
      model,
      messages,
      stream,
      temperature,
      max_tokens,
      ...(top_p !== undefined && { top_p }),
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout);

      logger.debug('[OllamaClient] Sending request to Ollama...', {
        model,
        messagesCount: messages.length,
        temperature
      });

      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[OllamaClient] Ollama API error:', errorText);
        throw new Error(`Ollama API request failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      logger.debug('[OllamaClient] Response received successfully');

      // OpenAI互換形式のレスポンスを内部形式に変換
      const result: OllamaResponse = {
        ...data,
        message: {
          role: data.choices?.[0]?.message?.role || 'assistant',
          content: data.choices?.[0]?.message?.content || ''
        }
      };

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('[OllamaClient] Request timed out');
        throw new Error('Ollama request timed out');
      }
      throw error;
    }
  }

  /**
   * シンプルな補完リクエスト
   */
  async complete(prompt: string, options: OllamaOptions = {}): Promise<string> {
    const messages: OllamaMessage[] = [
      { role: 'user', content: prompt }
    ];

    const response = await this.chat(messages, options);
    return response.message.content || '';
  }

  /**
   * システムプロンプト付きの補完リクエスト
   */
  async completeWithSystem(
    systemPrompt: string,
    userPrompt: string,
    options: OllamaOptions = {}
  ): Promise<string> {
    const messages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.chat(messages, options);
    return response.message.content || '';
  }

  /**
   * 画像分析（Vision models用）
   * @param imageData - 画像データ（BufferまたはBase64文字列）
   * @param prompt - 分析指示プロンプト
   * @param visionModel - Vision model名（デフォルト: qwen3-vl）
   * @param options - Ollamaオプション
   */
  async analyzeImage(
    imageData: Buffer | string,
    prompt: string,
    visionModel: string = 'qwen3-vl',
    options: OllamaOptions = {}
  ): Promise<string> {
    // Base64エンコード（BufferならBase64に変換、文字列ならそのまま使用）
    const base64Image = Buffer.isBuffer(imageData)
      ? imageData.toString('base64')
      : imageData;

    logger.debug('[OllamaClient] Analyzing image with vision model...', {
      model: visionModel,
      imageSize: base64Image.length,
      promptLength: prompt.length
    });

    // OpenAI互換形式のメッセージ（image_url形式）
    const messages: any[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ];

    const response = await this.chat(messages, {
      ...options,
      model: visionModel
    });

    return response.message.content || '';
  }

  /**
   * 画像からJSON抽出（OCR用）
   * @param imageData - 画像データ（BufferまたはBase64文字列）
   * @param systemPrompt - システムプロンプト（現在は使用せず、userPromptに統合）
   * @param userPrompt - ユーザープロンプト
   * @param visionModel - Vision model名（デフォルト: qwen3-vl）
   * @param options - Ollamaオプション
   *
   * 注意: Qwen3-VLはシステムプロンプト付きの2メッセージ形式だと
   * 空レスポンスを返すことがあるため、シングルメッセージ形式を使用
   */
  async extractJSONFromImage(
    imageData: Buffer | string,
    systemPrompt: string,
    userPrompt: string,
    visionModel: string = 'qwen3-vl',
    options: OllamaOptions = {}
  ): Promise<string> {
    // Base64エンコード
    const base64Image = Buffer.isBuffer(imageData)
      ? imageData.toString('base64')
      : imageData;

    logger.debug('[OllamaClient] Extracting JSON from image...', {
      model: visionModel,
      imageSize: base64Image.length
    });

    // システムプロンプトとユーザープロンプトを統合
    const combinedPrompt = systemPrompt
      ? `${systemPrompt}\n\n${userPrompt}`
      : userPrompt;

    // OpenAI互換形式のメッセージ（image_url形式）
    const messages: any[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: combinedPrompt },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ];

    const response = await this.chat(messages, {
      ...options,
      model: visionModel,
      // temperatureはoptionsから渡された値を使用（デフォルトは0.3）
      temperature: options.temperature ?? 0.3
    });

    return response.message.content || '';
  }

  /**
   * Thinkingモード付きチャット（税務・会計相談、仕訳相談用）
   * Qwen3-VLのThinkingモードを有効化し、推論プロセスを含めた回答を生成
   *
   * @param systemPrompt - システムプロンプト
   * @param userPrompt - ユーザーの質問
   * @param conversationHistory - 会話履歴（省略可）
   * @param options - Ollamaオプション
   * @returns 回答テキスト（thinkingプロセスは内部で処理される）
   */
  async chatWithThinking(
    systemPrompt: string,
    userPrompt: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    options: OllamaOptions = {}
  ): Promise<{ content: string; thinking?: string }> {
    logger.debug('[OllamaClient] Starting Thinking mode chat...', {
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length,
      historyLength: conversationHistory.length
    });

    const messages: OllamaMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user', content: userPrompt }
    ];

    // Thinkingモードは推論に時間がかかるため、タイムアウトを延長
    const thinkingTimeout = Math.max(this.defaultTimeout, 180000); // 最低3分
    const originalTimeout = this.defaultTimeout;
    this.defaultTimeout = thinkingTimeout;

    try {
      const response = await this.chat(messages, {
        ...options,
        model: options.model || this.defaultModel,
        temperature: options.temperature ?? 0.7, // 相談系はやや高めの温度
        max_tokens: options.max_tokens ?? 2000, // 回答は長めに
      });

      logger.debug('[OllamaClient] Thinking mode response received:', {
        contentLength: response.message.content?.length || 0
      });

      return {
        content: response.message.content || ''
      };
    } finally {
      // タイムアウトを元に戻す
      this.defaultTimeout = originalTimeout;
    }
  }

  /**
   * 利用可能性のフラグを取得
   */
  getAvailability(): boolean {
    return this.isAvailable;
  }

  /**
   * 設定情報を取得
   */
  getConfig() {
    return {
      baseURL: this.baseURL,
      model: this.defaultModel,
      isAvailable: this.isAvailable,
      isCloudMode: this.isCloudMode,
      timeout: this.defaultTimeout
    };
  }

  /**
   * クラウドモードかどうかを取得
   */
  isCloud(): boolean {
    return this.isCloudMode;
  }
}

// シングルトンインスタンス
let defaultClient: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  if (!defaultClient) {
    defaultClient = new OllamaClient();
  }
  return defaultClient;
}

/**
 * Ollamaの利用可能性を確認するヘルパー関数
 */
export async function isOllamaAvailable(): Promise<boolean> {
  const client = getOllamaClient();
  return await client.checkAvailability();
}
