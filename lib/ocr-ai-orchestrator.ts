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
      
      // OCR結果を文字列化
      const ocrDataStr = JSON.stringify(request.ocrResult, null, 2);
      
      // 事前分析を実行
      const preAnalysis = this.performPreAnalysis(request.ocrResult);
      console.log('[OCRAIOrchestrator] Pre-analysis completed:', preAnalysis);
      
      // プロンプトの構築
      const prompt = this.buildDeepSeekPrompt(request.documentType, ocrDataStr);
      
      // DeepSeek APIを使用して解析
      console.log('[OCRAIOrchestrator] Sending request to DeepSeek API...');
      const response = await this.callDeepSeekAPI(prompt);
      
      // レスポンスから構造化データを抽出
      const content = response.choices[0].message.content;
      
      // JSONを抽出
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        console.error('[OCRAIOrchestrator] Failed to extract JSON, raw response:', content);
        throw new Error('Failed to extract JSON from DeepSeek response');
      }
      
      const structuredData = JSON.parse(jsonMatch[1]) as StructuredInvoiceData;
      
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
    const response = await fetch(this.deepseekEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.deepseekApiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-coder', // 日本語とコード生成に最適化されたモデル
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 8000,
        temperature: 0,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
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
    // 会社名の検証
    if (!data.vendor.name || data.vendor.name === '不明') {
      const companyName = this.extractCompanyFromOCR(ocrResult);
      if (companyName) {
        data.vendor.name = companyName;
      }
    }
    
    // 顧客名の検証
    if (!data.customer.name || data.customer.name === '不明') {
      const customerName = this.extractCustomerFromOCR(ocrResult);
      if (customerName) {
        data.customer.name = customerName;
      }
    }
    
    // 金額の検証
    if (!data.totalAmount || data.totalAmount === 0) {
      const amount = this.extractTotalAmountFromOCR(ocrResult);
      if (amount) {
        data.totalAmount = amount;
      }
    }
    
    return data;
  }
  
  /**
   * フォールバック処理
   */
  private fallbackProcessing(request: OCROrchestrationRequest): StructuredInvoiceData {
    console.log('[OCRAIOrchestrator] Executing fallback processing...');
    
    // 基本的な構造を作成
    const fallbackData: StructuredInvoiceData = {
      documentNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      subject: '',
      vendor: {
        name: this.extractCompanyFromOCR(request.ocrResult) || 'AI解析失敗',
        address: '',
        phone: '',
        email: '',
        fax: ''
      },
      customer: {
        name: this.extractCustomerFromOCR(request.ocrResult) || 'AI解析失敗',
        address: ''
      },
      items: [],
      subtotal: 0,
      taxAmount: 0,
      totalAmount: this.extractTotalAmountFromOCR(request.ocrResult) || 0,
      deliveryLocation: '',
      paymentTerms: '',
      quotationValidity: '',
      notes: 'AI解析に失敗したため、フォールバック処理を実行'
    };
    
    return fallbackData;
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
   * DeepSeek用プロンプトの構築
   */
  private buildDeepSeekPrompt(documentType: string, ocrData: string): string {
    const docTypeJa = {
      'invoice': '請求書',
      'supplier-quote': '見積書',
      'receipt': '領収書'
    }[documentType] || '書類';
    
    return `你是一个专门处理日本商务文档的AI专家。请从以下OCR结果中准确提取${docTypeJa}的信息，并以结构化的JSON格式返回。

## 🎯 任务目标
你需要解析日本商务文档的OCR结果，特别关注以下几个关键点：
1. **准确识别供应商和客户**：通过「御中」「様」等敬语来区分
2. **正确提取会社名称**：特别注意「合同会社アソウタイセイプリンティング」这类特殊公司名
3. **结构化商品明细**：从表格中提取品名、数量、单价、金额等信息
4. **计算金额验证**：确保小计、税额、总额的数值准确性

## 📋 日本见积书・请求书的结构理解

### 1. **文档布局的基本结构**
- **右上**: 发行方（供应商）信息 - 公司名、地址、电话、邮件
- **左上**: 收件方（客户）信息 - 「○○様」「○○御中」
- **中央**: 主题 - 「件名：印刷物」等形式明确标记
- **表格形式**: 商品明细 - 品名、数量、单价、金额
- **右下**: 合计金额 - 小计、税额、总额

### 2. **重要的判别规则**
- **「御中」「様」**: 必须表示客户（收件方）
- **没有「御中」「様」**: 表示发行方（供应商）
- **地址・电话号码**: 通常是发行方（供应商）的信息
- **公司形态**: 株式会社、合同会社、有限会社等

### 3. **特殊公司名模式**
- 「合同会社アソウタイセイプリンティング」
- 「アソウタイセイプリンティング」
- 「アソウタイセイ」
- 「ピアソラ」
- 这些都要作为正确的公司名来识别

### 4. **主题的准确提取**
- 「件名：」后面的内容是真正的主题
- 「○○様分」是面向客户的表记，不是主题
- 单纯的「印刷物」「系统开发」等是合适的主题

### 5. **商品明细的解析**
- **品名**: 「領収書（3枚複写・1冊50組）」等具体的商品名
- **数量**: 「1式」「10冊」「5个」等
- **单价**: 个别的单价
- **金额**: 数量×单价的结果
- **备注**: 详细规格或交期等

### 6. **金额的理解**
- **小计**: 税前合计
- **消费税**: 10%或8%（轻减税率）
- **总额**: 含税合计

### 7. **日期的处理**
- 「令和6年8月28日」→「2024-08-28」
- 「2024年8月28日」→「2024-08-28」
- 「H31.4.1」→「2019-04-01」
- 「R6.8.28」→「2024-08-28」

## 🔍 OCR结果的分析

以下是要基于上述知识进行分析的OCR结果：

${ocrData}

## 📊 必要的处理步骤

1. **理解文档整体结构**
2. **活用位置信息（boundingBox）来判别右上・左上**
3. **通过「御中」「様」特定客户**
4. **通过公司形态模式特定供应商**
5. **通过「件名：」标签提取主题**
6. **从表格结构提取商品明细**
7. **理解金额的层次结构**

## 🎯 期望的输出

\`\`\`json
{
  "documentNumber": "见积书号码或请求书号码",
  "issueDate": "YYYY-MM-DD格式",
  "validityDate": "YYYY-MM-DD格式（有有效期限的情况下）",
  "subject": "主题（例：印刷物）",
  "vendor": {
    "name": "供应商名（没有御中的一方）",
    "address": "供应商地址",
    "phone": "供应商电话号码",
    "email": "供应商邮件地址",
    "fax": "供应商FAX号码"
  },
  "customer": {
    "name": "客户名（有御中的一方）",
    "address": "客户地址（如果有的话）"
  },
  "items": [
    {
      "itemName": "商品名",
      "description": "商品说明",
      "quantity": 数量（数值）,
      "unitPrice": 单价（数值）,
      "amount": 金额（数值）,
      "taxRate": 税率（数值、%）,
      "taxAmount": 税额（数值）,
      "remarks": "备注或详细说明"
    }
  ],
  "subtotal": 小计（数值）,
  "taxAmount": 税额合计（数值）,
  "totalAmount": 总额（数值）,
  "deliveryLocation": "交货地点",
  "paymentTerms": "支付条件",
  "quotationValidity": "见积有效期限",
  "notes": "备注"
}
\`\`\`

## ⚠️ 重要注意事项

1. **必须理解日本商务文档的结构**进行解析
2. **优先判别「御中」「様」**
3. **活用位置信息**来区别发行方和收件方
4. **准确提取公司名**（即使是部分字符串也要正确补全）
5. **金额的数值化**（正确将逗号分隔转换为数值）
6. **未知项目必须设为null或空字符串**

请按照上述规则进行准确且详细的分析。

## 🚀 特别提醒
- 使用你的深度学习能力来理解日本商务文档的结构
- 利用位置信息和上下文来做出正确的判断
- 对于不确定的信息，请标记为null而不是猜测
- 确保返回的JSON格式完全符合要求

现在开始分析：`;
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