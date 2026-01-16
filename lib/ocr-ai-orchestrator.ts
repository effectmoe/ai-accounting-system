import { logger } from '@/lib/logger';
import { OllamaClient } from '@/lib/ollama-client';

/**
 * OCR AIオーケストレータ
 * Azure Form RecognizerのOCR結果を日本のビジネス文書として正しく解釈する
 * Ollama（Qwen3-VL）を優先的に使用し、利用できない場合はDeepSeek APIにフォールバック
 *
 * 2025-01: Command R廃止 → Qwen3-VL Thinkingに統合
 */

// LLM API型定義（Ollama/DeepSeek共通）
interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// DeepSeek API型定義（後方互換性のため残す）
interface DeepSeekResponse extends LLMResponse {}

export interface OCROrchestrationRequest {
  ocrResult: any; // Azure Form Recognizerの結果
  documentType: 'invoice' | 'supplier-quote' | 'receipt' | 'purchase-invoice' | 'parking-receipt';
  companyId: string;
  imageData?: Buffer | string; // 画像データ（Vision model用、オプショナル）
}

export interface StructuredInvoiceData {
  // 基本情報
  documentNumber: string;
  issueDate: string;
  validityDate?: string;
  
  // 件名
  subject: string;
  
  // 仕入先情報（発行元）
  vendor: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    fax?: string;
  };
  
  // 顧客情報（宛先）
  customer: {
    name: string;
    address?: string;
  };
  
  // 商品明細
  items: Array<{
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    taxRate?: number;
    taxAmount?: number;
    remarks?: string; // 備考・詳細説明
  }>;
  
  // 金額情報
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  
  // 追加情報
  deliveryLocation?: string;
  paymentTerms?: string;
  quotationValidity?: string;
  notes?: string;
  
  // 振込先情報
  bankTransferInfo?: {
    bankName?: string;
    branchName?: string;
    accountType?: string;
    accountNumber?: string;
    accountName?: string;
    swiftCode?: string;
    additionalInfo?: string;
  };
  
  // 駐車場領収書専用フィールド
  receiptType?: 'parking' | 'general';
  companyName?: string; // 運営会社名（タイムズ24株式会社など）
  facilityName?: string; // 施設名（駐車場名）
  entryTime?: string; // 入庫時刻
  exitTime?: string; // 出庫時刻
  parkingDuration?: string; // 駐車時間
  baseFee?: number; // 基本料金
  additionalFee?: number; // 追加料金
}

export class OCRAIOrchestrator {
  private ollamaClient: OllamaClient | null = null;
  private deepseekApiKey: string | null = null;
  private isOllamaAvailable: boolean = false;
  private isOllamaVisionAvailable: boolean = false; // Vision model専用フラグ
  private isDeepSeekAvailable: boolean = false;
  private readonly deepseekEndpoint = 'https://api.deepseek.com/v1/chat/completions';
  private readonly visionModel: string; // Vision model名

  constructor() {
    // Vision modelの設定
    this.visionModel = process.env.OLLAMA_VISION_MODEL || 'qwen3-vl';

    // Ollamaクライアントの初期化
    try {
      this.ollamaClient = new OllamaClient();
      logger.debug('[OCRAIOrchestrator] Ollama client initialized');
    } catch (error) {
      logger.debug('[OCRAIOrchestrator] Ollama client initialization failed:', error);
    }

    // DeepSeek APIキーの確認
    const apiKey = process.env.DEEPSEEK_API_KEY;
    logger.debug('[OCRAIOrchestrator] Initializing LLM providers...');
    logger.debug('[OCRAIOrchestrator] DeepSeek API Key:', apiKey ? `Present (${apiKey.substring(0, 10)}...)` : 'Not found');
    logger.debug('[OCRAIOrchestrator] Vision Model:', this.visionModel);

    if (apiKey && !apiKey.includes('test-key')) {
      this.deepseekApiKey = apiKey;
      this.isDeepSeekAvailable = true;
      logger.debug('[OCRAIOrchestrator] DeepSeek API is available (fallback)');
    } else {
      logger.debug('[OCRAIOrchestrator] DeepSeek API is NOT available');
    }
  }
  
  /**
   * OCR結果を構造化された請求書データに変換
   * 2段階優先順位:
   * 1. Qwen3-VL (Vision model) - 画像直接処理 + テキスト処理
   * 2. DeepSeek API - クラウドフォールバック（緊急時のみ）
   *
   * 2025-01: Command R廃止 → Qwen3-VL Thinkingに統合
   */
  async orchestrateOCRResult(request: OCROrchestrationRequest): Promise<StructuredInvoiceData> {
    // Ollamaの利用可能性を確認
    if (this.ollamaClient) {
      try {
        this.isOllamaAvailable = await this.ollamaClient.checkAvailability();
        logger.debug('[OCRAIOrchestrator] Ollama Text model availability:', this.isOllamaAvailable);

        // Vision modelの利用可能性を確認（OpenAI互換API形式）
        if (this.isOllamaAvailable) {
          try {
            const response = await fetch(`${process.env.OLLAMA_URL || 'http://localhost:1234'}/v1/models`);
            if (response.ok) {
              const data = await response.json();
              // OpenAI形式は data 配列、Ollama形式は models 配列
              const models = data.data || data.models || [];
              this.isOllamaVisionAvailable = models.some((m: any) => {
                const modelId = m.id || m.name || '';
                return modelId.includes(this.visionModel) ||
                  modelId.includes('qwen') ||
                  modelId.includes('llava');
              });
              logger.debug('[OCRAIOrchestrator] Vision model availability:', this.isOllamaVisionAvailable);
              logger.debug('[OCRAIOrchestrator] Vision model name:', this.visionModel);
            }
          } catch (error) {
            logger.debug('[OCRAIOrchestrator] Vision model check failed:', error);
            this.isOllamaVisionAvailable = false;
          }
        }
      } catch (error) {
        logger.debug('[OCRAIOrchestrator] Ollama availability check failed:', error);
        this.isOllamaAvailable = false;
        this.isOllamaVisionAvailable = false;
      }
    }

    // 🎯 優先順位1: Vision model（画像データがある場合）
    if (request.imageData && this.isOllamaVisionAvailable && this.ollamaClient) {
      logger.debug('[OCRAIOrchestrator] 🎯 Priority 1: Trying Vision model (Qwen3-VL) with image data...');
      try {
        const result = await this.processWithVisionModel(request);
        logger.debug('[OCRAIOrchestrator] ✅ Vision model succeeded!');
        return result;
      } catch (error) {
        logger.warn('[OCRAIOrchestrator] ⚠️  Vision model failed, falling back to text models:', error);
        // フォールバックして次の優先順位に進む
      }
    }

    // LLMが1つも利用できない場合はエラー
    if (!this.isOllamaAvailable && !this.isDeepSeekAvailable) {
      throw new Error('AI Orchestrator is not available (No LLM provider configured)');
    }

    // 🎯 優先順位2: Text models（Ollama Qwen3-VL → DeepSeek API）
    // 2025-01: Command R廃止 → Qwen3-VL Thinkingに統合
    const llmProvider = this.isOllamaAvailable ? 'Ollama (Qwen3-VL)' : 'DeepSeek API (fallback)';
    logger.debug('[OCRAIOrchestrator] 🎯 Priority 2: Using text-based LLM:', llmProvider);

    try {
      logger.debug('[OCRAIOrchestrator] Starting AI-driven OCR orchestration...');
      logger.debug('[OCRAIOrchestrator] Request:', {
        documentType: request.documentType,
        companyId: request.companyId,
        ocrResultKeys: Object.keys(request.ocrResult || {}),
        llmProvider
      });
      
      // OCR結果を文字列化（コンパクトに）
      const ocrDataStr = this.compactOCRData(request.ocrResult);
      logger.debug('[OCRAIOrchestrator] Compact OCR data length:', ocrDataStr.length);
      logger.debug('[OCRAIOrchestrator] Compact OCR data preview:', ocrDataStr.substring(0, 500));
      
      // 事前分析を実行
      const preAnalysis = this.performPreAnalysis(request.ocrResult);
      logger.debug('[OCRAIOrchestrator] Pre-analysis completed:', preAnalysis);
      
      // プロンプトの構築
      const prompt = this.buildDeepSeekPrompt(request.documentType, ocrDataStr);
      
      // 駐車場領収書の判定結果をログ出力
      if (request.documentType === 'receipt') {
        const isParkingReceipt = this.isParkingReceiptFromOCR(ocrDataStr);
        logger.debug('[OCRAIOrchestrator] Receipt type detection:', {
          documentType: request.documentType,
          isParkingReceipt: isParkingReceipt,
          ocrDataPreview: ocrDataStr.substring(0, 200)
        });
      }
      
      // LLM APIを使用して解析（Ollama優先、リトライ付き）
      logger.debug('[OCRAIOrchestrator] Sending request to LLM API...');
      logger.debug('[OCRAIOrchestrator] Prompt length:', prompt.length, 'characters');

      let response: LLMResponse | null = null;
      let lastError: Error | null = null;
      const maxRetries = 2;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.debug(`[OCRAIOrchestrator] Attempt ${attempt}/${maxRetries} with ${llmProvider}...`);
          const startTime = Date.now();

          // Ollama優先、DeepSeekフォールバック
          if (this.isOllamaAvailable && this.ollamaClient) {
            response = await this.callOllamaAPI(prompt);
          } else if (this.isDeepSeekAvailable && this.deepseekApiKey) {
            response = await this.callDeepSeekAPI(prompt);
          }

          const elapsed = Date.now() - startTime;
          logger.debug('[OCRAIOrchestrator] LLM API response received in', elapsed, 'ms');
          break; // 成功したらループを抜ける
        } catch (error) {
          lastError = error as Error;
          logger.error(`[OCRAIOrchestrator] Attempt ${attempt} failed:`, error);

          // Ollamaが失敗した場合、DeepSeekにフォールバック
          if (this.isOllamaAvailable && this.isDeepSeekAvailable && attempt === 1) {
            logger.debug('[OCRAIOrchestrator] Ollama failed, falling back to DeepSeek...');
            this.isOllamaAvailable = false; // 次回からDeepSeekを使う
          }

          if (attempt < maxRetries) {
            logger.debug(`[OCRAIOrchestrator] Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      if (!response && lastError) {
        throw lastError;
      }
      
      // レスポンスから構造化データを抽出
      const content = response.choices[0].message.content;
      logger.debug('[OCRAIOrchestrator] DeepSeek message content length:', content.length);
      logger.debug('[OCRAIOrchestrator] DeepSeek message content preview:', content.substring(0, 500));
      
      // JSONを抽出
      let structuredData: StructuredInvoiceData;
      
      // 複数のパターンでJSONを探す
      const jsonPatterns = [
        /```json\n([\s\S]*?)\n```/,  // 標準的なコードブロック
        /```\n([\s\S]*?)\n```/,      // 言語指定なしのコードブロック
        /\{[\s\S]*\}/                 // 直接のJSONオブジェクト
      ];
      
      let jsonStr: string | null = null;
      for (const pattern of jsonPatterns) {
        const match = content.match(pattern);
        if (match) {
          jsonStr = match[1] || match[0];
          break;
        }
      }
      
      if (!jsonStr) {
        logger.error('[OCRAIOrchestrator] Failed to extract JSON from content');
        logger.error('[OCRAIOrchestrator] Full content:', content);
        throw new Error('Failed to extract JSON from DeepSeek response');
      }
      
      try {
        logger.debug('[OCRAIOrchestrator] Attempting to parse JSON string:', jsonStr.substring(0, 200));
        structuredData = JSON.parse(jsonStr) as StructuredInvoiceData;
        logger.debug('[OCRAIOrchestrator] Successfully parsed JSON');
      } catch (e) {
        logger.error('[OCRAIOrchestrator] JSON parse error:', e);
        logger.error('[OCRAIOrchestrator] Failed JSON string:', jsonStr);
        throw new Error('Invalid JSON in DeepSeek response');
      }
      
      // 後処理・検証
      const validatedData = this.validateAndEnhanceData(structuredData, request.ocrResult);
      
      logger.debug('[OCRAIOrchestrator] Successfully parsed structured data:', {
        subject: validatedData.subject,
        vendorName: validatedData.vendor.name,
        customerName: validatedData.customer.name,
        itemsCount: validatedData.items.length,
        totalAmount: validatedData.totalAmount,
        hasBankTransferInfo: !!validatedData.bankTransferInfo,
        bankTransferInfo: validatedData.bankTransferInfo,
        hasCarryoverInfo: !!(validatedData.previousBalance || validatedData.currentPayment || validatedData.carryoverAmount),
        carryoverInfo: {
          previousBalance: validatedData.previousBalance,
          currentPayment: validatedData.currentPayment,
          carryoverAmount: validatedData.carryoverAmount,
          currentSales: validatedData.currentSales,
          currentInvoiceAmount: validatedData.currentInvoiceAmount
        }
      });
      
      return validatedData;
      
    } catch (error) {
      logger.error('[OCRAIOrchestrator] Error:', error);
      
      // フォールバック処理
      logger.debug('[OCRAIOrchestrator] Attempting fallback processing...');
      return this.fallbackProcessing(request);
    }
  }
  
  /**
   * Ollama APIを呼び出し
   */
  private async callOllamaAPI(prompt: string): Promise<LLMResponse> {
    if (!this.ollamaClient) {
      throw new Error('Ollama client is not initialized');
    }

    try {
      logger.debug('[OCRAIOrchestrator] Calling Ollama API...');

      const systemPrompt = 'You are a JSON extraction expert. Always return valid JSON in code blocks.';

      const response = await this.ollamaClient.completeWithSystem(
        systemPrompt,
        prompt,
        {
          temperature: 0,
          num_predict: 4000
        }
      );

      logger.debug('[OCRAIOrchestrator] Ollama API response received');

      // OllamaのレスポンスをDeepSeek互換形式に変換
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: response
          },
          finish_reason: 'stop'
        }]
      };
    } catch (error) {
      logger.error('[OCRAIOrchestrator] Ollama API error:', error);
      throw error;
    }
  }

  /**
   * DeepSeek APIを呼び出し
   */
  private async callDeepSeekAPI(prompt: string): Promise<LLMResponse> {
    // AbortControllerを使用してタイムアウトを実装
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒のタイムアウト
    
    try {
      logger.debug('[OCRAIOrchestrator] Making DeepSeek API request with 25s timeout...');
      logger.debug('[OCRAIOrchestrator] DeepSeek API endpoint:', this.deepseekEndpoint);
      logger.debug('[OCRAIOrchestrator] API Key present:', !!this.deepseekApiKey);
      logger.debug('[OCRAIOrchestrator] API Key prefix:', this.deepseekApiKey?.substring(0, 10));
      
      const requestBody = {
        model: 'deepseek-chat', // より汎用的なチャットモデル
        messages: [
          {
            role: 'system',
            content: 'You are a JSON extraction expert. Always return valid JSON in code blocks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0,
        stream: false
      };
      
      logger.debug('[OCRAIOrchestrator] Request body (without content):', {
        ...requestBody,
        messages: requestBody.messages.map(m => ({ role: m.role, contentLength: m.content.length }))
      });
      
      const response = await fetch(this.deepseekEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal // タイムアウト用のシグナル
      });

      clearTimeout(timeoutId);

      logger.debug('[OCRAIOrchestrator] Response status:', response.status);
      logger.debug('[OCRAIOrchestrator] Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[OCRAIOrchestrator] DeepSeek API error response:', errorText);
        logger.error('[OCRAIOrchestrator] Full error details:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          errorBody: errorText
        });
        throw new Error(`DeepSeek API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      logger.debug('[OCRAIOrchestrator] DeepSeek API request completed successfully');
      logger.debug('[OCRAIOrchestrator] DeepSeek response structure:', {
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length,
        hasUsage: !!data.usage,
        firstChoiceHasMessage: !!data.choices?.[0]?.message,
        firstChoiceMessageContentLength: data.choices?.[0]?.message?.content?.length
      });
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('[OCRAIOrchestrator] DeepSeek API request timed out after 25 seconds');
        throw new Error('DeepSeek API request timed out after 25 seconds');
      }
      
      logger.error('[OCRAIOrchestrator] Unexpected error:', error);
      logger.error('[OCRAIOrchestrator] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      throw error;
    }
  }

  /**
   * 事前分析を実行
   */
  private performPreAnalysis(ocrResult: any): any {
    const analysis = {
      hasFields: !!ocrResult.fields,
      hasTables: !!ocrResult.tables && ocrResult.tables.length > 0,
      hasPages: !!ocrResult.pages && ocrResult.pages.length > 0,
      companiesFound: [],
      honorificsFound: [],
      amountsFound: [],
      datesFound: []
    };
    
    // 会社名と敬語の検出
    if (ocrResult.pages) {
      for (const page of ocrResult.pages) {
        if (page.lines) {
          for (const line of page.lines) {
            const content = line.content || '';
            
            // 会社名パターン
            if (this.isCompanyName(content)) {
              analysis.companiesFound.push(content);
            }
            
            // 敬語パターン
            if (content.includes('御中') || content.includes('様')) {
              analysis.honorificsFound.push(content);
            }
            
            // 金額パターン
            const amountMatch = content.match(/[\d,]+円?/g);
            if (amountMatch) {
              analysis.amountsFound.push(...amountMatch);
            }
            
            // 日付パターン
            const dateMatch = content.match(/\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}/);
            if (dateMatch) {
              analysis.datesFound.push(dateMatch[0]);
            }
          }
        }
      }
    }
    
    return analysis;
  }
  
  /**
   * データの検証と拡張
   */
  private validateAndEnhanceData(data: StructuredInvoiceData, ocrResult: any): StructuredInvoiceData {
    logger.debug('[OCRAIOrchestrator] Validating data before enhancement:', {
      vendorName: data.vendor?.name,
      customerName: data.customer?.name,
      totalAmount: data.totalAmount,
      itemsCount: data.items?.length,
      items: data.items
    });
    
    // 会社名の検証
    if (!data.vendor?.name || data.vendor.name === '不明' || data.vendor.name === '') {
      const companyName = this.extractCompanyFromOCR(ocrResult);
      if (companyName) {
        logger.debug('[OCRAIOrchestrator] Replacing vendor name with extracted:', companyName);
        data.vendor.name = companyName;
      } else {
        // デフォルトの仕入先名を設定
        data.vendor.name = '合同会社アソウタイセイプリンティング';
        logger.debug('[OCRAIOrchestrator] Using default vendor name');
      }
    }
    
    // 顧客名の検証
    if (!data.customer?.name || data.customer.name === '不明' || data.customer.name === '') {
      const customerName = this.extractCustomerFromOCR(ocrResult);
      if (customerName) {
        logger.debug('[OCRAIOrchestrator] Replacing customer name with extracted:', customerName);
        data.customer.name = customerName;
      }
    }
    
    // 金額の検証
    if (!data.totalAmount || data.totalAmount === 0) {
      const amount = this.extractTotalAmountFromOCR(ocrResult);
      if (amount) {
        logger.debug('[OCRAIOrchestrator] Replacing total amount with extracted:', amount);
        data.totalAmount = amount;
      }
    }
    
    // アイテムの検証と備考の処理
    if (data.items && data.items.length > 0) {
      const validItems: any[] = [];
      const remarksTexts: string[] = [];
      
      // 各アイテムを検証
      data.items.forEach((item: any, index: number) => {
        logger.debug(`[OCRAIOrchestrator] Checking item ${index}:`, {
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount
        });
        
        // 数量、単価、金額が全て空または0の場合は備考として扱う
        if ((!item.quantity || item.quantity === 0) && 
            (!item.unitPrice || item.unitPrice === 0) && 
            (!item.amount || item.amount === 0)) {
          logger.debug(`[OCRAIOrchestrator] Item ${index} "${item.itemName}" is a remark (no numeric data)`);
          if (item.itemName && item.itemName.trim()) {
            remarksTexts.push(item.itemName);
          }
        } else {
          // 有効な商品として追加
          validItems.push(item);
        }
      });
      
      // 有効な商品のみをitemsに設定
      data.items = validItems;
      
      // 備考をnotesに追加
      if (remarksTexts.length > 0) {
        const additionalNotes = remarksTexts.join('\n');
        data.notes = data.notes ? `${data.notes}\n\n${additionalNotes}` : additionalNotes;
        logger.debug('[OCRAIOrchestrator] Added remarks to notes:', additionalNotes);
      }
    }
    
    // アイテムが空になった場合のフォールバック
    if (!data.items || data.items.length === 0) {
      logger.debug('[OCRAIOrchestrator] No valid items found, creating default item');
      data.items = [{
        itemName: '商品',
        quantity: 1,
        unitPrice: data.totalAmount || 0,
        amount: data.totalAmount || 0,
        taxRate: 10,
        taxAmount: data.taxAmount || 0
      }];
    }
    
    logger.debug('[OCRAIOrchestrator] Data after enhancement:', {
      vendorName: data.vendor?.name,
      customerName: data.customer?.name,
      totalAmount: data.totalAmount,
      itemsCount: data.items?.length,
      hasNotes: !!data.notes
    });
    
    // 駐車場領収書の場合、駐車場フィールドを強制的に追加
    if (this.isParkingReceiptFromOCR(JSON.stringify(ocrResult))) {
      logger.debug('[OCRAIOrchestrator] Detected parking receipt, enhancing parking fields...');
      
      // receiptTypeを設定
      data.receiptType = 'parking';
      
      // facilityNameが空の場合、vendorNameから抽出
      if (!data.facilityName && data.vendor?.name) {
        data.facilityName = data.vendor.name;
      }
      
      // companyNameを設定
      if (!data.companyName) {
        data.companyName = 'タイムズ24株式会社';
      }
      
      // notesから駐車場情報を抽出
      if (data.notes) {
        // 駐車時間
        const parkingTimeMatch = data.notes.match(/駐車時間[:：]?\s*([^,、\n]+)/);
        if (parkingTimeMatch && !data.parkingDuration) {
          data.parkingDuration = parkingTimeMatch[1].trim();
        }
        
        // 入庫時刻
        const entryTimeMatch = data.notes.match(/入庫[:：]?\s*(\d+[:：]\d+)/);
        if (entryTimeMatch && !data.entryTime) {
          data.entryTime = entryTimeMatch[1].replace('：', ':');
        }
        
        // 出庫時刻
        const exitTimeMatch = data.notes.match(/出庫[:：]?\s*(\d+[:：]\d+)/);
        if (exitTimeMatch && !data.exitTime) {
          data.exitTime = exitTimeMatch[1].replace('：', ':');
        }
      }
      
      logger.debug('[OCRAIOrchestrator] Enhanced parking fields:', {
        receiptType: data.receiptType,
        facilityName: data.facilityName,
        companyName: data.companyName,
        entryTime: data.entryTime,
        exitTime: data.exitTime,
        parkingDuration: data.parkingDuration
      });
    }
    
    return data;
  }
  
  /**
   * フォールバック処理
   */
  private fallbackProcessing(request: OCROrchestrationRequest): StructuredInvoiceData {
    logger.debug('[OCRAIOrchestrator] Executing fallback processing...');
    logger.debug('[OCRAIOrchestrator] OCR Result for fallback:', JSON.stringify(request.ocrResult, null, 2));
    
    // OCRの生データから基本的な情報を抽出
    const lines: string[] = [];
    if (request.ocrResult?.pages) {
      for (const page of request.ocrResult.pages) {
        if (page.lines) {
          for (const line of page.lines) {
            if (line.content) {
              lines.push(line.content);
            }
          }
        }
      }
    }
    
    logger.debug('[OCRAIOrchestrator] Extracted lines:', lines);
    
    // 基本的な情報の抽出
    let vendorName = this.extractCompanyFromOCR(request.ocrResult) || '合同会社アソウタイセイプリンティング';
    let customerName = this.extractCustomerFromOCR(request.ocrResult) || '顧客名不明';
    let subject = '';
    let totalAmount = this.extractTotalAmountFromOCR(request.ocrResult) || 0;
    
    // 件名の抽出
    for (const line of lines) {
      if (line.includes('件名') && line.includes(':')) {
        subject = line.split(':')[1].trim();
        break;
      }
    }
    
    // 商品情報の簡易抽出
    const items = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 数量と金額のパターンを探す
      if (line.match(/^\d+$/) && i > 0) { // 数量らしきもの
        const prevLine = lines[i - 1];
        const nextLine = lines[i + 1];
        const quantity = parseInt(line);
        
        // 金額を探す
        let amount = 0;
        if (nextLine && nextLine.match(/[\d,]+/)) {
          amount = parseInt(nextLine.replace(/,/g, ''));
        }
        
        if (prevLine && quantity > 0 && amount > 0) {
          items.push({
            itemName: prevLine,
            description: '',
            quantity: quantity,
            unitPrice: Math.floor(amount / quantity),
            amount: amount,
            taxRate: 10,
            taxAmount: Math.floor(amount * 0.1)
          });
        }
      }
    }
    
    // 基本的な構造を作成
    const fallbackData: StructuredInvoiceData = {
      documentNumber: `FALLBACK-${Date.now()}`,
      issueDate: new Date().toISOString().split('T')[0],
      subject: subject || '印刷物',
      vendor: {
        name: vendorName,
        address: '',
        phone: '',
        email: '',
        fax: ''
      },
      customer: {
        name: customerName,
        address: ''
      },
      items: items.length > 0 ? items : [{
        itemName: '商品名不明',
        description: '',
        quantity: 1,
        unitPrice: totalAmount || 5000,
        amount: totalAmount || 5000,
        taxRate: 10,
        taxAmount: (totalAmount || 5000) * 0.1,
        remarks: ''
      }],
      subtotal: totalAmount ? totalAmount / 1.1 : 5000,
      taxAmount: totalAmount ? totalAmount - (totalAmount / 1.1) : 500,
      totalAmount: totalAmount || 5500,
      deliveryLocation: '',
      paymentTerms: '',
      quotationValidity: '',
      notes: 'DeepSeek AI解析に失敗したため、フォールバック処理を実行'
    };
    
    logger.debug('[OCRAIOrchestrator] Fallback data created:', fallbackData);
    return fallbackData;
  }
  
  /**
   * OCRデータをコンパクトに変換
   */
  private compactOCRData(ocrResult: any): string {
    // 必要な情報のみを抽出
    const compactData: any = {
      content: ocrResult.content || '',
      pages: []
    };
    
    if (ocrResult.pages) {
      for (const page of ocrResult.pages) {
        const compactPage: any = {
          pageNumber: page.pageNumber,
          lines: []
        };
        
        if (page.lines) {
          for (const line of page.lines) {
            // contentのみを保持（boundingBoxなどは除外）
            compactPage.lines.push({
              content: line.content || ''
            });
          }
        }
        
        compactData.pages.push(compactPage);
      }
    }
    
    // テーブルデータがある場合は簡潔に含める
    if (ocrResult.tables && ocrResult.tables.length > 0) {
      compactData.tables = ocrResult.tables.map((table: any) => ({
        rowCount: table.rowCount,
        columnCount: table.columnCount,
        cells: table.cells?.map((cell: any) => ({
          content: cell.content,
          rowIndex: cell.rowIndex,
          columnIndex: cell.columnIndex
        })) || []
      }));
    }
    
    return JSON.stringify(compactData, null, 2);
  }
  
  /**
   * 会社名かどうかを判定
   */
  private isCompanyName(text: string): boolean {
    const companyPatterns = [
      /株式会社/,
      /有限会社/,
      /合同会社/,
      /一般社団法人/,
      /Corporation/,
      /Corp/,
      /LLC/,
      /Inc/,
      /\(株\)/,
      /\(有\)/,
      /アソウタイセイ/,
      /ピアソラ/
    ];
    
    return companyPatterns.some(pattern => pattern.test(text)) && !text.includes('御中');
  }
  
  /**
   * OCRから会社名を抽出
   */
  private extractCompanyFromOCR(ocrResult: any): string | null {
    if (!ocrResult.pages) return null;
    
    for (const page of ocrResult.pages) {
      if (page.lines) {
        for (const line of page.lines) {
          const content = line.content || '';
          if (this.isCompanyName(content)) {
            return content.trim();
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * OCRから顧客名を抽出
   */
  private extractCustomerFromOCR(ocrResult: any): string | null {
    if (!ocrResult.pages) return null;
    
    for (const page of ocrResult.pages) {
      if (page.lines) {
        for (const line of page.lines) {
          const content = line.content || '';
          if (content.includes('御中') || content.includes('様')) {
            return content.trim();
          }
        }
      }
    }
    
    return null;
  }
  
  /**
   * OCRから総額を抽出
   */
  private extractTotalAmountFromOCR(ocrResult: any): number | null {
    if (!ocrResult.pages) return null;
    
    const amounts: number[] = [];
    
    for (const page of ocrResult.pages) {
      if (page.lines) {
        for (const line of page.lines) {
          const content = line.content || '';
          const amountMatch = content.match(/[\d,]+/g);
          if (amountMatch) {
            for (const match of amountMatch) {
              const num = parseInt(match.replace(/,/g, ''));
              if (!isNaN(num) && num > 1000) {
                amounts.push(num);
              }
            }
          }
        }
      }
    }
    
    // 最大値を総額と仮定
    return amounts.length > 0 ? Math.max(...amounts) : null;
  }
  
  /**
   * DeepSeek用プロンプトの構築（簡潔版）
   */
  private buildDeepSeekPrompt(documentType: string, ocrData: string): string {
    const docTypeJa = {
      'invoice': '請求書',
      'supplier-quote': '見積書',
      'receipt': '領収書',
      'purchase-invoice': '仕入請求書',
      'parking-receipt': '駐車場領収書'
    }[documentType] || '書類';
    
    // 領収書の場合、OCRデータから駐車場領収書かどうかを判定
    const isParkingReceipt = documentType === 'parking-receipt' || 
      (documentType === 'receipt' && this.isParkingReceiptFromOCR(ocrData));
    
    // 駐車場領収書の場合は特別なプロンプトを使用
    if (isParkingReceipt) {
      return `Extract structured data from Japanese 駐車場領収書 (parking receipt) OCR.

CRITICAL RULES FOR PARKING RECEIPTS:
1. タイムズ24株式会社 = companyName (the operating company)
2. タイムズ[場所名] = facilityName (parking facility name) 
3. Extract parking-specific information:
   - 入庫/入庫時刻 = entryTime
   - 出庫/出庫時刻 = exitTime
   - 駐車時間 = parkingDuration
   - 基本料金 = baseFee
   - 追加料金 = additionalFee
   - 合計/駐車料金 = totalAmount
4. receiptType = "parking" (always for parking receipts)
5. vendor should be set to facilityName for compatibility
6. Tax is usually included (内税) so taxAmount = 0

OCR data:
${ocrData}

Return ONLY JSON:
\`\`\`json
{
  "documentNumber": "string",
  "issueDate": "YYYY-MM-DD",
  "receiptType": "parking",
  "companyName": "タイムズ24株式会社",
  "facilityName": "タイムズ[場所名]",
  "vendor": {
    "name": "same as facilityName"
  },
  "customer": {
    "name": "顧客名（あれば）"
  },
  "entryTime": "HH:MM",
  "exitTime": "HH:MM", 
  "parkingDuration": "X時間Y分",
  "baseFee": 0,
  "additionalFee": 0,
  "items": [{
    "itemName": "駐車料金",
    "amount": 0
  }],
  "subtotal": 0,
  "taxAmount": 0,
  "totalAmount": 0,
  "notes": "any additional notes"
}
\`\`\``;
    }
    
    return `Extract structured data from Japanese ${docTypeJa} OCR.

CRITICAL RULES:
1. 「御中」「様」 = customer (the recipient)
2. No honorific = vendor (the issuer)
3. Recognize company names like 合同会社アソウタイセイプリンティング, アソウタイセイプリンティング, アソウタイセイ
4. IMPORTANT: Rows in product table with text in name column but EMPTY quantity, unit price, AND amount are NOT products - these are remarks/notes
5. Only treat rows as products if they have at least ONE of: quantity, unit price, or amount
6. Extract content from 備考 columns as notes
7. For receipts (領収書), check if it's a parking receipt:
   - If contains タイムズ, パーキング, 駐車場, 入庫/出庫 = parking receipt
   - Set receiptType = "parking" and extract parking-specific fields
   - Otherwise set receiptType = "general"
8. CRITICAL - Amount keyword recognition for receipts (領収書):

   【subtotal（税抜金額）に該当するキーワード】→ subtotal フィールドに格納
   - 「小計」「小計額」「税抜金額」「税抜合計」「本体価格」
   - これは支払金額（totalAmount）ではない

   【totalAmount（税込金額・支払金額）に該当するキーワード】→ totalAmount フィールドに格納
   - 「合計」「合計額」「税込合計」「総合計」「お支払い」「お支払金額」「ご請求額」「領収金額」
   - これが実際の支払金額である
   - ⚠️ 絶対に taxAmount を追加してはいけない（既に税込）

   【taxAmount（消費税額）に該当するキーワード】→ taxAmount フィールドに格納
   - 「外税」「外税額」「10%外税」「8%外税」「10%外税額」「8%外税額」
   - 「消費税」「消費税額」「税額」
   - 「TAX」「税TAX計」「(税TAX 計)」
   - 「内税」「内税額」（合計に含まれている税金の内訳）

   【計算ルール】
   - totalAmount = subtotal + taxAmount（この関係を確認）
   - totalAmount には taxAmount を加算しない（二重課税防止）
   - 「合計」の値をそのまま totalAmount として使用する

   【例】
   - 小計 ¥7,272 → subtotal: 7272
   - 10%外税額 ¥727 → taxAmount: 727
   - 合計 ¥7,999 → totalAmount: 7999
   - ✅ 正解: totalAmount = 7999（合計をそのまま使用）
   - ❌ 間違い: totalAmount = 7272 + 727 + 727 = 8726（税を二重追加）
9. For invoices (請求書), extract balance/carryover information:
   - 前回請求額 = previousBalance
   - 今回入金額 = currentPayment  
   - 繰越金額 = carryoverAmount
   - 今回売上高 = currentSales
   - 今回請求額 = currentInvoiceAmount
10. Extract bank transfer information (振込先) - IMPORTANT: Look for these patterns:
   - "振込先", "お振込先", "振込先情報", "銀行口座"
   - Bank names often end with "銀行", "信用金庫", "信用組合"
   - Branch names often end with "支店", "本店"
   - Account types: "普通", "当座", "普通預金", "当座預金"
   - Account numbers are typically 7 digits
   - Look in footer area, notes section, or separate box
   - Extract as:
     - 銀行名 = bankName (e.g., "三菱UFJ銀行")
     - 支店名 = branchName (e.g., "新宿支店")
     - 口座種別 = accountType (e.g., "普通")
     - 口座番号 = accountNumber (e.g., "1234567")
     - 口座名義 = accountName (e.g., "カ）アソウタイセイプリンティング")
     - Additional info = additionalInfo (e.g., "振込手数料はお客様負担")

Example:
- "CROP様分" with no quantity/price/amount → This is a REMARK, not a product
- "領収書（3枚複写・1冊50組）" with quantity=200, price=570, amount=114,000 → This is a PRODUCT
- Long specification text with no quantity/price/amount → This is a REMARK, not a product

OCR data:
${ocrData}

Return ONLY JSON:
\`\`\`json
{
  "documentNumber": "string",
  "issueDate": "YYYY-MM-DD",
  "subject": "string",
  "vendor": {
    "name": "vendor name (no 御中)",
    "address": "string",
    "phone": "string",
    "email": "string",
    "fax": "string"
  },
  "customer": {
    "name": "customer name (with 御中)",
    "address": "string"
  },
  "items": [{
    "itemName": "string",
    "description": "string",
    "quantity": 1,
    "unitPrice": 5000,
    "amount": 5000,
    "remarks": "string"
  }],
  "previousBalance": 25260,
  "currentPayment": 2250,
  "carryoverAmount": 23010,
  "currentSales": 107863,
  "currentInvoiceAmount": 130873,
  "subtotal": 5000,
  "taxAmount": 500,
  "totalAmount": 5500,
  "notes": "string (combined remarks/notes from non-product rows and 備考 column)",
  "deliveryLocation": "string",
  "paymentTerms": "string",
  "quotationValidity": "string",
  "bankTransferInfo": {
    "bankName": "銀行名",
    "branchName": "支店名",
    "accountType": "普通",
    "accountNumber": "1234567",
    "accountName": "口座名義",
    "additionalInfo": "振込手数料はお客様負担"
  },
  "receiptType": "general or parking",
  "companyName": "for parking receipts only",
  "facilityName": "for parking receipts only",
  "entryTime": "for parking receipts only",
  "exitTime": "for parking receipts only",
  "parkingDuration": "for parking receipts only",
  "baseFee": 0,
  "additionalFee": 0
}
\`\`\``;
  }

  /**
   * プロンプトの構築（Claude用・フォールバック用）
   */
  private buildPrompt(documentType: string, ocrData: string): string {
    const docTypeJa = {
      'invoice': '請求書',
      'supplier-quote': '見積書',
      'receipt': '領収書'
    }[documentType] || '書類';
    
    return `あなたは日本のビジネス文書処理の専門家です。以下のOCR結果から、${docTypeJa}の情報を正確に抽出し、構造化されたJSONで返してください。

## 📋 日本の見積書・請求書の基本理解

### 重要な判別ルール
1. **「御中」「様」**: 必ず顧客（宛先）を示す
2. **「御中」「様」なし**: 発行元（仕入先）を示す
3. **住所・電話番号**: 通常は発行元（仕入先）のもの

### 特殊な会社名パターン
- 「合同会社アソウタイセイプリンティング」
- 「アソウタイセイプリンティング」
- 「アソウタイセイ」
- 「ピアソラ」
これらは全て正しい会社名として認識すること

## 🔍 OCR結果の分析

${ocrData}

## 🎯 期待される出力

\`\`\`json
{
  "documentNumber": "見積書番号または請求書番号",
  "issueDate": "YYYY-MM-DD形式",
  "subject": "件名",
  "vendor": {
    "name": "仕入先名（御中がつかない方）",
    "address": "仕入先住所",
    "phone": "仕入先電話番号"
  },
  "customer": {
    "name": "顧客名（御中がつく方）",
    "address": "顧客住所"
  },
  "items": [
    {
      "itemName": "商品名",
      "quantity": 数量,
      "unitPrice": 単価,
      "amount": 金額
    }
  ],
  "subtotal": 小計,
  "taxAmount": 税額,
  "totalAmount": 総額
}
\`\`\`

正確な日本語の商習慣を理解して解析してください。`;
  }
  
  /**
   * Vision modelで画像を直接処理（優先順位1）
   */
  private async processWithVisionModel(request: OCROrchestrationRequest): Promise<StructuredInvoiceData> {
    if (!this.ollamaClient || !request.imageData) {
      throw new Error('Vision model processing requires Ollama client and image data');
    }

    logger.debug('[OCRAIOrchestrator] Processing with Vision model:', this.visionModel);

    // ドキュメントタイプに応じたプロンプト
    const systemPrompt = `あなたは日本のビジネス文書処理の専門家です。画像から ${
      {
        'invoice': '請求書',
        'supplier-quote': '見積書',
        'receipt': '領収書',
        'purchase-invoice': '購入請求書',
        'parking-receipt': '駐車場領収書'
      }[request.documentType] || '書類'
    } の情報を正確に抽出し、JSON形式で返してください。

## 重要な判別ルール
1. **「御中」「様」**: 必ず顧客（宛先）を示す
2. **「御中」「様」なし**: 発行元（仕入先）を示す
3. **住所・電話番号**: 通常は発行元（仕入先）のもの
4. **日付**: YYYY-MM-DD形式に統一
5. **金額**: 数値のみ（カンマなし）

## 期待されるJSON形式
必ず \`\`\`json ブロックで囲んでください。`;

    const userPrompt = `この画像から、以下のJSON形式でデータを抽出してください:

\`\`\`json
{
  "documentNumber": "文書番号",
  "issueDate": "YYYY-MM-DD",
  "subject": "件名",
  "vendor": {
    "name": "仕入先名（御中がつかない方）",
    "address": "仕入先住所",
    "phone": "仕入先電話番号"
  },
  "customer": {
    "name": "顧客名（御中がつく方）",
    "address": "顧客住所"
  },
  "items": [
    {
      "itemName": "商品名",
      "quantity": 1,
      "unitPrice": 1000,
      "amount": 1000
    }
  ],
  "subtotal": 小計,
  "taxAmount": 税額,
  "totalAmount": 総額
}
\`\`\``;

    // Vision modelで画像を処理
    const responseText = await this.ollamaClient.extractJSONFromImage(
      request.imageData,
      systemPrompt,
      userPrompt,
      this.visionModel,
      {
        temperature: 0,
        num_predict: 4000
      }
    );

    logger.debug('[OCRAIOrchestrator] Vision model response length:', responseText.length);

    // JSON抽出
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Vision model response');
    }

    const extractedData = JSON.parse(jsonMatch[1]);
    logger.debug('[OCRAIOrchestrator] Vision model extracted data:', extractedData);

    // 必要なフィールドを補完
    return this.normalizeExtractedData(extractedData, request.documentType);
  }

  /**
   * 抽出されたデータを正規化
   */
  private normalizeExtractedData(data: any, documentType: string): StructuredInvoiceData {
    return {
      documentNumber: data.documentNumber || '',
      issueDate: data.issueDate || new Date().toISOString().split('T')[0],
      validityDate: data.validityDate,
      subject: data.subject || '',
      vendor: {
        name: data.vendor?.name || '',
        address: data.vendor?.address,
        phone: data.vendor?.phone,
        email: data.vendor?.email,
        fax: data.vendor?.fax
      },
      customer: {
        name: data.customer?.name || '',
        address: data.customer?.address
      },
      items: (data.items || []).map((item: any) => ({
        itemName: item.itemName || '',
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        amount: Number(item.amount) || 0,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        remarks: item.remarks
      })),
      subtotal: Number(data.subtotal) || 0,
      taxAmount: Number(data.taxAmount) || 0,
      totalAmount: Number(data.totalAmount) || 0,
      deliveryLocation: data.deliveryLocation,
      paymentTerms: data.paymentTerms,
      quotationValidity: data.quotationValidity,
      notes: data.notes,
      bankTransferInfo: data.bankTransferInfo,
      // 駐車場領収書専用フィールド
      receiptType: data.receiptType,
      companyName: data.companyName,
      facilityName: data.facilityName,
      entryTime: data.entryTime,
      exitTime: data.exitTime,
      parkingDuration: data.parkingDuration,
      baseFee: data.baseFee,
      additionalFee: data.additionalFee
    };
  }

  /**
   * OCRデータから駐車場領収書かどうかを判定
   */
  private isParkingReceiptFromOCR(ocrData: string): boolean {
    const parkingKeywords = [
      'タイムズ',
      'times',
      'TIMES',
      'パーキング',
      'parking',
      'PARKING',
      '駐車場',
      '入庫',
      '出庫',
      '駐車時間',
      '駐車料金',
      'パーク24',
      'タイムズ24株式会社'
    ];

    const lowerData = ocrData.toLowerCase();
    return parkingKeywords.some(keyword => lowerData.includes(keyword.toLowerCase()));
  }
}