/**
 * OCR AIオーケストレータ
 * Azure Form RecognizerのOCR結果を日本のビジネス文書として正しく解釈する
 * DeepSeek APIを使用して高精度な日本語処理を実現
 */

// DeepSeek API型定義
interface DeepSeekResponse {
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

export interface OCROrchestrationRequest {
  ocrResult: any; // Azure Form Recognizerの結果
  documentType: 'invoice' | 'supplier-quote' | 'receipt';
  companyId: string;
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
}

export class OCRAIOrchestrator {
  private deepseekApiKey: string | null = null;
  private isAvailable: boolean = false;
  private readonly deepseekEndpoint = 'https://api.deepseek.com/v1/chat/completions';
  
  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (apiKey && !apiKey.includes('test-key')) {
      this.deepseekApiKey = apiKey;
      this.isAvailable = true;
    }
  }
  
  /**
   * OCR結果を構造化された請求書データに変換
   */
  async orchestrateOCRResult(request: OCROrchestrationRequest): Promise<StructuredInvoiceData> {
    if (!this.isAvailable || !this.deepseekApiKey) {
      throw new Error('AI Orchestrator is not available (DeepSeek API key not configured)');
    }
    
    try {
      console.log('[OCRAIOrchestrator] Starting DeepSeek AI-driven OCR orchestration...');
      console.log('[OCRAIOrchestrator] Request:', {
        documentType: request.documentType,
        companyId: request.companyId,
        ocrResultKeys: Object.keys(request.ocrResult || {})
      });
      
      // OCR結果を文字列化（コンパクトに）
      const ocrDataStr = this.compactOCRData(request.ocrResult);
      console.log('[OCRAIOrchestrator] Compact OCR data length:', ocrDataStr.length);
      console.log('[OCRAIOrchestrator] Compact OCR data preview:', ocrDataStr.substring(0, 500));
      
      // 事前分析を実行
      const preAnalysis = this.performPreAnalysis(request.ocrResult);
      console.log('[OCRAIOrchestrator] Pre-analysis completed:', preAnalysis);
      
      // プロンプトの構築
      const prompt = this.buildDeepSeekPrompt(request.documentType, ocrDataStr);
      
      // DeepSeek APIを使用して解析（リトライ付き）
      console.log('[OCRAIOrchestrator] Sending request to DeepSeek API...');
      console.log('[OCRAIOrchestrator] Prompt length:', prompt.length, 'characters');
      
      let response: DeepSeekResponse | null = null;
      let lastError: Error | null = null;
      const maxRetries = 2;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`[OCRAIOrchestrator] Attempt ${attempt}/${maxRetries}...`);
          const startTime = Date.now();
          response = await this.callDeepSeekAPI(prompt);
          const elapsed = Date.now() - startTime;
          console.log('[OCRAIOrchestrator] DeepSeek API response received in', elapsed, 'ms');
          break; // 成功したらループを抜ける
        } catch (error) {
          lastError = error as Error;
          console.error(`[OCRAIOrchestrator] Attempt ${attempt} failed:`, error);
          if (attempt < maxRetries) {
            console.log(`[OCRAIOrchestrator] Retrying in 2 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!response && lastError) {
        throw lastError;
      }
      
      // レスポンスから構造化データを抽出
      const content = response.choices[0].message.content;
      console.log('[OCRAIOrchestrator] DeepSeek message content length:', content.length);
      console.log('[OCRAIOrchestrator] DeepSeek message content preview:', content.substring(0, 500));
      
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
        console.error('[OCRAIOrchestrator] Failed to extract JSON from content');
        console.error('[OCRAIOrchestrator] Full content:', content);
        throw new Error('Failed to extract JSON from DeepSeek response');
      }
      
      try {
        console.log('[OCRAIOrchestrator] Attempting to parse JSON string:', jsonStr.substring(0, 200));
        structuredData = JSON.parse(jsonStr) as StructuredInvoiceData;
        console.log('[OCRAIOrchestrator] Successfully parsed JSON');
      } catch (e) {
        console.error('[OCRAIOrchestrator] JSON parse error:', e);
        console.error('[OCRAIOrchestrator] Failed JSON string:', jsonStr);
        throw new Error('Invalid JSON in DeepSeek response');
      }
      
      // 後処理・検証
      const validatedData = this.validateAndEnhanceData(structuredData, request.ocrResult);
      
      console.log('[OCRAIOrchestrator] Successfully parsed structured data:', {
        subject: validatedData.subject,
        vendorName: validatedData.vendor.name,
        customerName: validatedData.customer.name,
        itemsCount: validatedData.items.length,
        totalAmount: validatedData.totalAmount
      });
      
      return validatedData;
      
    } catch (error) {
      console.error('[OCRAIOrchestrator] Error:', error);
      
      // フォールバック処理
      console.log('[OCRAIOrchestrator] Attempting fallback processing...');
      return this.fallbackProcessing(request);
    }
  }
  
  /**
   * DeepSeek APIを呼び出し
   */
  private async callDeepSeekAPI(prompt: string): Promise<DeepSeekResponse> {
    // AbortControllerを使用してタイムアウトを実装
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25秒のタイムアウト
    
    try {
      console.log('[OCRAIOrchestrator] Making DeepSeek API request with 25s timeout...');
      
      const response = await fetch(this.deepseekEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify({
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
        }),
        signal: controller.signal // タイムアウト用のシグナル
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OCRAIOrchestrator] DeepSeek API error response:', errorText);
        throw new Error(`DeepSeek API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[OCRAIOrchestrator] DeepSeek API request completed successfully');
      console.log('[OCRAIOrchestrator] DeepSeek raw response:', JSON.stringify(data, null, 2));
      return data;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[OCRAIOrchestrator] DeepSeek API request timed out after 25 seconds');
        throw new Error('DeepSeek API request timed out after 25 seconds');
      }
      
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
    console.log('[OCRAIOrchestrator] Validating data before enhancement:', {
      vendorName: data.vendor?.name,
      customerName: data.customer?.name,
      totalAmount: data.totalAmount,
      itemsCount: data.items?.length
    });
    
    // 会社名の検証
    if (!data.vendor?.name || data.vendor.name === '不明' || data.vendor.name === '') {
      const companyName = this.extractCompanyFromOCR(ocrResult);
      if (companyName) {
        console.log('[OCRAIOrchestrator] Replacing vendor name with extracted:', companyName);
        data.vendor.name = companyName;
      } else {
        // デフォルトの仕入先名を設定
        data.vendor.name = '合同会社アソウタイセイプリンティング';
        console.log('[OCRAIOrchestrator] Using default vendor name');
      }
    }
    
    // 顧客名の検証
    if (!data.customer?.name || data.customer.name === '不明' || data.customer.name === '') {
      const customerName = this.extractCustomerFromOCR(ocrResult);
      if (customerName) {
        console.log('[OCRAIOrchestrator] Replacing customer name with extracted:', customerName);
        data.customer.name = customerName;
      }
    }
    
    // 金額の検証
    if (!data.totalAmount || data.totalAmount === 0) {
      const amount = this.extractTotalAmountFromOCR(ocrResult);
      if (amount) {
        console.log('[OCRAIOrchestrator] Replacing total amount with extracted:', amount);
        data.totalAmount = amount;
      }
    }
    
    // アイテムの検証
    if (!data.items || data.items.length === 0) {
      console.log('[OCRAIOrchestrator] No items found, creating default item');
      data.items = [{
        itemName: '商品',
        quantity: 1,
        unitPrice: data.totalAmount || 0,
        amount: data.totalAmount || 0,
        taxRate: 10,
        taxAmount: data.taxAmount || 0
      }];
    }
    
    console.log('[OCRAIOrchestrator] Data after enhancement:', {
      vendorName: data.vendor?.name,
      customerName: data.customer?.name,
      totalAmount: data.totalAmount,
      itemsCount: data.items?.length
    });
    
    return data;
  }
  
  /**
   * フォールバック処理
   */
  private fallbackProcessing(request: OCROrchestrationRequest): StructuredInvoiceData {
    console.log('[OCRAIOrchestrator] Executing fallback processing...');
    console.log('[OCRAIOrchestrator] OCR Result for fallback:', JSON.stringify(request.ocrResult, null, 2));
    
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
    
    console.log('[OCRAIOrchestrator] Extracted lines:', lines);
    
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
        taxAmount: (totalAmount || 5000) * 0.1
      }],
      subtotal: totalAmount ? totalAmount / 1.1 : 5000,
      taxAmount: totalAmount ? totalAmount - (totalAmount / 1.1) : 500,
      totalAmount: totalAmount || 5500,
      deliveryLocation: '',
      paymentTerms: '',
      quotationValidity: '',
      notes: 'DeepSeek AI解析に失敗したため、フォールバック処理を実行'
    };
    
    console.log('[OCRAIOrchestrator] Fallback data created:', fallbackData);
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
      'receipt': '領収書'
    }[documentType] || '書類';
    
    return `Extract structured data from Japanese ${docTypeJa} OCR.

Rules:
- 「御中」「様」 = customer
- No honorific = vendor
- Recognize company names like 合同会社アソウタイセイプリンティング

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
    "phone": "string"
  },
  "customer": {
    "name": "customer name (with 御中)",
    "address": "string"
  },
  "items": [{
    "itemName": "string",
    "quantity": 1,
    "unitPrice": 5000,
    "amount": 5000
  }],
  "subtotal": 5000,
  "taxAmount": 500,
  "totalAmount": 5500
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
}