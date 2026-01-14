/**
 * OCR Queue Worker with Durable Objects
 *
 * このWorkerはOCRリクエストのキュー管理とリトライ処理を担当します。
 * Durable Objectsを使用してジョブの状態を永続化し、
 * 指数バックオフによるリトライロジックを実装しています。
 */

export interface Env {
  OCR_QUEUE: DurableObjectNamespace;
  OLLAMA_URL: string;
  OLLAMA_VISION_MODEL?: string;
  CORS_ORIGIN: string;
  MAX_RETRIES: string;
  RETRY_DELAY_MS: string;
  REQUEST_TIMEOUT_MS: string;
}

// ジョブのステータス
type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';

// OCRジョブの型定義
interface OCRJob {
  id: string;
  imageBase64: string;
  fileName?: string;
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  result?: OCRResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

// OCR結果の型定義
interface OCRResult {
  issuerName?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issueDate?: string;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  accountCategory?: string;
  confidence?: number;
}

// APIレスポンスの型定義
interface SubmitJobResponse {
  success: boolean;
  jobId: string;
  message: string;
}

interface JobStatusResponse {
  success: boolean;
  job?: OCRJob;
  error?: string;
}

interface QueueStatsResponse {
  success: boolean;
  stats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  };
}

/**
 * OCR Queue Durable Object
 * ジョブの永続化とキュー管理を担当
 */
export class OCRQueueDO implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private jobs: Map<string, OCRJob> = new Map();
  private processingQueue: string[] = [];
  private isProcessing: boolean = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // 永続化されたデータを復元
    this.state.blockConcurrencyWhile(async () => {
      const storedJobs = await this.state.storage.get<Map<string, OCRJob>>('jobs');
      const storedQueue = await this.state.storage.get<string[]>('queue');

      if (storedJobs) {
        this.jobs = storedJobs;
      }
      if (storedQueue) {
        this.processingQueue = storedQueue;
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': this.env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      let response: Response;

      switch (path) {
        case '/submit':
          response = await this.handleSubmit(request);
          break;
        case '/status':
          response = await this.handleStatus(request);
          break;
        case '/result':
          response = await this.handleResult(request);
          break;
        case '/stats':
          response = await this.handleStats();
          break;
        case '/health':
          response = await this.handleHealth();
          break;
        default:
          response = new Response(JSON.stringify({ error: 'Not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
      }

      // Add CORS headers to response
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });

      return new Response(response.body, {
        status: response.status,
        headers: newHeaders,
      });
    } catch (error) {
      console.error('[OCRQueueDO] Error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Internal error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  }

  /**
   * ジョブを送信
   */
  private async handleSubmit(request: Request): Promise<Response> {
    const body = await request.json() as {
      imageBase64: string;
      fileName?: string;
    };

    if (!body.imageBase64) {
      return new Response(
        JSON.stringify({ success: false, error: 'imageBase64 is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const jobId = this.generateJobId();
    const maxRetries = parseInt(this.env.MAX_RETRIES || '3', 10);

    const job: OCRJob = {
      id: jobId,
      imageBase64: body.imageBase64,
      fileName: body.fileName,
      status: 'pending',
      retryCount: 0,
      maxRetries,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // ジョブを保存
    this.jobs.set(jobId, job);
    this.processingQueue.push(jobId);
    await this.persistState();

    // 処理を開始（非同期）
    this.processQueue();

    const response: SubmitJobResponse = {
      success: true,
      jobId,
      message: 'Job submitted successfully',
    };

    return new Response(JSON.stringify(response), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * ジョブのステータスを取得
   */
  private async handleStatus(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return new Response(
        JSON.stringify({ success: false, error: 'jobId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const job = this.jobs.get(jobId);

    if (!job) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // imageBase64は大きいのでステータス確認時には含めない
    const sanitizedJob = {
      ...job,
      imageBase64: '[REDACTED]',
    };

    const response: JobStatusResponse = {
      success: true,
      job: sanitizedJob,
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * ジョブの結果を取得（完了時）
   */
  private async handleResult(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');

    if (!jobId) {
      return new Response(
        JSON.stringify({ success: false, error: 'jobId is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const job = this.jobs.get(jobId);

    if (!job) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (job.status === 'pending' || job.status === 'processing' || job.status === 'retrying') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Job is still processing',
          status: job.status,
          retryCount: job.retryCount,
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: job.status === 'completed',
        result: job.result,
        error: job.error,
        status: job.status,
        retryCount: job.retryCount,
        processingTime: job.completedAt ? job.completedAt - job.createdAt : undefined,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * キューの統計情報
   */
  private async handleStats(): Promise<Response> {
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      total: this.jobs.size,
    };

    this.jobs.forEach((job) => {
      switch (job.status) {
        case 'pending':
          stats.pending++;
          break;
        case 'processing':
        case 'retrying':
          stats.processing++;
          break;
        case 'completed':
          stats.completed++;
          break;
        case 'failed':
          stats.failed++;
          break;
      }
    });

    const response: QueueStatsResponse = {
      success: true,
      stats,
    };

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * ヘルスチェック
   */
  private async handleHealth(): Promise<Response> {
    // LM Studio（OpenAI互換API）の接続確認
    let ollamaStatus = 'unknown';
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.env.OLLAMA_URL}/v1/models`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      ollamaStatus = response.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      ollamaStatus = 'unreachable';
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: 'healthy',
        ollama: ollamaStatus,
        queueSize: this.processingQueue.length,
        totalJobs: this.jobs.size,
        isProcessing: this.isProcessing,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * キューを処理
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.processingQueue.length > 0) {
        const jobId = this.processingQueue[0];
        const job = this.jobs.get(jobId);

        if (!job) {
          this.processingQueue.shift();
          continue;
        }

        // 処理中に更新
        job.status = 'processing';
        job.updatedAt = Date.now();
        await this.persistState();

        try {
          // OCR処理を実行
          const result = await this.processOCR(job);

          job.status = 'completed';
          job.result = result;
          job.completedAt = Date.now();
          job.updatedAt = Date.now();

          console.log(`[OCRQueueDO] Job ${jobId} completed successfully`);
        } catch (error) {
          console.error(`[OCRQueueDO] Job ${jobId} failed:`, error);

          job.retryCount++;

          if (job.retryCount < job.maxRetries) {
            // リトライ
            job.status = 'retrying';
            job.error = error instanceof Error ? error.message : 'Unknown error';
            job.updatedAt = Date.now();

            // 指数バックオフでキューの末尾に追加
            const delayMs = this.calculateBackoff(job.retryCount);
            console.log(`[OCRQueueDO] Job ${jobId} will retry in ${delayMs}ms (attempt ${job.retryCount + 1}/${job.maxRetries})`);

            // 現在のジョブをキューから削除し、遅延後に末尾に追加
            this.processingQueue.shift();
            await this.state.storage.setAlarm(Date.now() + delayMs);
            this.processingQueue.push(jobId);
          } else {
            // 最大リトライ回数に達した
            job.status = 'failed';
            job.error = error instanceof Error ? error.message : 'Unknown error';
            job.completedAt = Date.now();
            job.updatedAt = Date.now();

            console.error(`[OCRQueueDO] Job ${jobId} failed after ${job.maxRetries} retries`);
          }
        }

        // キューから削除（失敗またはリトライでない場合）
        if (job.status === 'completed' || job.status === 'failed') {
          this.processingQueue.shift();
        }

        await this.persistState();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Durable Objectのアラームハンドラ（リトライ用）
   */
  async alarm(): Promise<void> {
    console.log('[OCRQueueDO] Alarm triggered, processing queue...');
    await this.processQueue();
  }

  /**
   * OCR処理を実行
   */
  private async processOCR(job: OCRJob): Promise<OCRResult> {
    const timeoutMs = parseInt(this.env.REQUEST_TIMEOUT_MS || '180000', 10);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const systemPrompt = `あなたは領収書・レシートのOCR専門AIです。画像から情報を正確に読み取り、JSON形式で出力してください。`;

      const userPrompt = `この領収書/レシート画像を分析し、以下のJSON形式で情報を抽出してください。

必ず以下の形式でJSONのみを出力してください（説明文は不要）：
{
  "issuerName": "店舗名または会社名",
  "issuerAddress": "住所（わかる場合）",
  "issuerPhone": "電話番号（わかる場合）",
  "issueDate": "YYYY-MM-DD形式の日付",
  "subtotal": 税抜金額（数値のみ）,
  "taxAmount": 消費税額（数値のみ）,
  "totalAmount": 合計金額（数値のみ）,
  "accountCategory": "勘定科目"
}

勘定科目は以下から選択：
- 飲食でアルコールあり → "接待交際費"
- 飲食でアルコールなし → "会議費"
- 交通費 → "旅費交通費"
- 駐車場代 → "車両費"
- 文房具・消耗品 → "消耗品費"
- 通信関連 → "通信費"
- その他 → "雑費"

読み取れない項目は空文字""または0を設定してください。`;

      const visionModel = this.env.OLLAMA_VISION_MODEL || 'qwen3-vl-8b-instruct-mlx';

      // OpenAI互換API形式（LM Studio用）
      const imageBase64Clean = job.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const response = await fetch(`${this.env.OLLAMA_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: visionModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: userPrompt },
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64Clean}` } },
              ],
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vision API error: ${response.status} ${errorText}`);
      }

      const data = await response.json() as {
        choices: Array<{ message: { content: string } }>;
      };

      console.log('[OCRQueueDO] Raw API response:', JSON.stringify(data).substring(0, 500));

      const content = data.choices?.[0]?.message?.content || '';

      console.log('[OCRQueueDO] Extracted content:', content.substring(0, 300));

      if (!content || content.trim() === '') {
        throw new Error('Empty response from Vision model');
      }

      // JSONを抽出してパース
      const result = this.parseOCRResponse(content);
      console.log('[OCRQueueDO] Parsed result:', JSON.stringify(result));

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('OCR request timed out');
      }
      throw error;
    }
  }

  /**
   * OCRレスポンスをパース
   */
  private parseOCRResponse(response: string): OCRResult {
    try {
      // コードブロック内のJSONを抽出
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1].trim());
      }

      // コードブロックがない場合、直接JSONとしてパース
      const trimmed = response.trim();
      if (trimmed.startsWith('{')) {
        return JSON.parse(trimmed);
      }

      // JSON部分を探す
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        return JSON.parse(response.substring(jsonStart, jsonEnd + 1));
      }

      throw new Error('No valid JSON found in response');
    } catch (error) {
      console.error('[OCRQueueDO] Failed to parse OCR response:', error);
      throw new Error(`Failed to parse OCR result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 指数バックオフを計算
   */
  private calculateBackoff(retryCount: number): number {
    const baseDelay = parseInt(this.env.RETRY_DELAY_MS || '2000', 10);
    // 指数バックオフ: 2s, 4s, 8s, 16s...（最大30秒）
    const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), 30000);
    // ジッター追加（±10%）
    const jitter = delay * (0.9 + Math.random() * 0.2);
    return Math.floor(jitter);
  }

  /**
   * ジョブIDを生成
   */
  private generateJobId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `ocr-${timestamp}-${random}`;
  }

  /**
   * 状態を永続化
   */
  private async persistState(): Promise<void> {
    await this.state.storage.put('jobs', this.jobs);
    await this.state.storage.put('queue', this.processingQueue);
  }
}

/**
 * Workers Entry Point
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.CORS_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route to Durable Object
    const id = env.OCR_QUEUE.idFromName('global-queue');
    const stub = env.OCR_QUEUE.get(id);

    return stub.fetch(request);
  },
};
