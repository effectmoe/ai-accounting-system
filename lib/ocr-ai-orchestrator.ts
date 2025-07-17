/**
 * OCR AIオーケストレータ
 * Azure Form RecognizerのOCR結果を日本のビジネス文書として正しく解釈する
 */

import { Anthropic } from '@anthropic-ai/sdk';

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
  private anthropic: Anthropic | null = null;
  private isAvailable: boolean = false;
  
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && !apiKey.includes('test-key')) {
      this.anthropic = new Anthropic({ apiKey });
      this.isAvailable = true;
    }
  }
  
  /**
   * OCR結果を構造化された請求書データに変換
   */
  async orchestrateOCRResult(request: OCROrchestrationRequest): Promise<StructuredInvoiceData> {
    if (!this.isAvailable || !this.anthropic) {
      throw new Error('AI Orchestrator is not available (API key not configured)');
    }
    
    try {
      // OCR結果を文字列化
      const ocrDataStr = JSON.stringify(request.ocrResult, null, 2);
      
      // プロンプトの構築
      const prompt = this.buildPrompt(request.documentType, ocrDataStr);
      
      // Claude APIを使用して解析
      console.log('[OCRAIOrchestrator] Sending request to Claude API...');
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4000,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });
      
      // レスポンスから構造化データを抽出
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude API');
      }
      
      // JSONを抽出
      const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from Claude response');
      }
      
      const structuredData = JSON.parse(jsonMatch[1]) as StructuredInvoiceData;
      
      console.log('[OCRAIOrchestrator] Successfully parsed structured data:', {
        subject: structuredData.subject,
        vendorName: structuredData.vendor.name,
        customerName: structuredData.customer.name,
        itemsCount: structuredData.items.length,
        totalAmount: structuredData.totalAmount
      });
      
      return structuredData;
      
    } catch (error) {
      console.error('[OCRAIOrchestrator] Error:', error);
      throw error;
    }
  }
  
  /**
   * プロンプトの構築
   */
  private buildPrompt(documentType: string, ocrData: string): string {
    const docTypeJa = {
      'invoice': '請求書',
      'supplier-quote': '見積書',
      'receipt': '領収書'
    }[documentType] || '書類';
    
    return `あなたは日本のビジネス文書を理解する専門家です。以下のOCR結果から、${docTypeJa}の情報を正確に抽出し、構造化されたJSONで返してください。

## 重要な注意事項：
1. **仕入先と顧客の判別**
   - 「御中」がついているのは顧客（宛先）
   - 「御中」がついていないのは仕入先（発行元）
   - 住所・電話番号は通常、仕入先（発行元）のもの

2. **件名と商品名の区別**
   - 「件名」欄にあるものが件名（例：「印刷物」）
   - 商品テーブルの行が実際の商品（例：「領収書（3枚複写・1冊50組）」）

3. **商品明細の理解**
   - 数量・単価・金額が揃っている行が商品行
   - それ以外の詳細テキストは備考（remarks）として扱う
   - 商品の詳細説明が別セルにある場合は、descriptionまたはremarksに含める

4. **日付の処理**
   - 日本語形式（令和、平成、2024年8月28日など）を正しくISO形式に変換

## OCR結果：
${ocrData}

## 出力形式：
以下の形式でJSONを返してください。不明な項目はnullまたは空文字列にしてください。

\`\`\`json
{
  "documentNumber": "見積書番号または請求書番号",
  "issueDate": "YYYY-MM-DD形式",
  "validityDate": "YYYY-MM-DD形式（有効期限がある場合）",
  "subject": "件名（例：印刷物）",
  "vendor": {
    "name": "仕入先名（御中がつかない方）",
    "address": "仕入先住所",
    "phone": "仕入先電話番号",
    "email": "仕入先メールアドレス",
    "fax": "仕入先FAX番号"
  },
  "customer": {
    "name": "顧客名（御中がつく方）",
    "address": "顧客住所（あれば）"
  },
  "items": [
    {
      "itemName": "商品名",
      "description": "商品の説明",
      "quantity": 数量（数値）,
      "unitPrice": 単価（数値）,
      "amount": 金額（数値）,
      "taxRate": 税率（数値、%）,
      "taxAmount": 税額（数値）,
      "remarks": "備考や詳細説明"
    }
  ],
  "subtotal": 小計（数値）,
  "taxAmount": 税額合計（数値）,
  "totalAmount": 総額（数値）,
  "deliveryLocation": "納入場所",
  "paymentTerms": "支払条件",
  "quotationValidity": "見積有効期限",
  "notes": "備考"
}
\`\`\`

必ず上記の形式に従ってJSONを出力してください。`;
  }
}