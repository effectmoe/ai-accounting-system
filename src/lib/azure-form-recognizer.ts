import { AzureKeyCredential, DocumentAnalysisClient } from '@azure/ai-form-recognizer';
import { GridFSBucket } from 'mongodb';
import { getDatabase } from './mongodb-client';

export interface FormRecognizerConfig {
  endpoint: string;
  apiKey: string;
}

export interface AnalysisResult {
  documentType: 'invoice' | 'receipt' | 'purchaseOrder' | 'unknown';
  confidence: number;
  fields: Record<string, any>;
  tables?: any[];
  pages?: any[];
  rawResult?: any;
}

export class FormRecognizerService {
  private client: DocumentAnalysisClient;
  private gridFsBucket: GridFSBucket | null = null;

  constructor(config: FormRecognizerConfig) {
    const { endpoint, apiKey } = config;
    if (!endpoint || !apiKey) {
      throw new Error('Azure Form Recognizer endpoint and API key are required');
    }
    
    this.client = new DocumentAnalysisClient(
      endpoint,
      new AzureKeyCredential(apiKey)
    );
  }

  private async getGridFsBucket(): Promise<GridFSBucket> {
    if (!this.gridFsBucket) {
      const db = await getDatabase();
      // デフォルトのバケット名を使用（'fs'）
      this.gridFsBucket = new GridFSBucket(db);
    }
    return this.gridFsBucket;
  }

  /**
   * 請求書の分析
   */
  async analyzeInvoice(fileBuffer: Buffer, fileName: string): Promise<AnalysisResult> {
    try {
      const poller = await this.client.beginAnalyzeDocument(
        'prebuilt-invoice',
        fileBuffer,
        {
          locale: 'ja-JP', // 日本語対応
        }
      );

      const result = await poller.pollUntilDone();
      
      if (!result || !result.documents || result.documents.length === 0) {
        throw new Error('No invoice data extracted');
      }

      const document = result.documents[0];
      const fields = document.fields || {};

      // 標準フィールドの抽出
      const extractedData: AnalysisResult = {
        documentType: 'invoice',
        confidence: document.confidence || 0,
        fields: {
          invoiceId: fields.InvoiceId?.content,
          invoiceDate: fields.InvoiceDate?.content,
          dueDate: fields.DueDate?.content,
          vendorName: fields.VendorName?.content,
          vendorAddress: fields.VendorAddress?.content,
          vendorTaxId: fields.VendorTaxId?.content,
          customerName: fields.CustomerName?.content,
          customerAddress: fields.CustomerAddress?.content,
          customerTaxId: fields.CustomerTaxId?.content,
          purchaseOrder: fields.PurchaseOrder?.content,
          totalAmount: fields.TotalAmount?.value || fields.InvoiceTotal?.value,
          subTotal: fields.SubTotal?.value,
          totalTax: fields.TotalTax?.value,
          // InvoiceTotalも含める（文字列の場合もあるため両方チェック）
          InvoiceTotal: fields.InvoiceTotal?.content || fields.InvoiceTotal?.value,
          amountDue: fields.AmountDue?.value,
          previousUnpaidBalance: fields.PreviousUnpaidBalance?.value,
          billingAddress: fields.BillingAddress?.content,
          shippingAddress: fields.ShippingAddress?.content,
          paymentTerm: fields.PaymentTerm?.content,
          items: this.extractLineItems(fields.Items),
          // カスタムフィールド
          customFields: this.extractCustomFields(fields),
        },
        tables: result.tables,
        pages: result.pages,
        rawResult: result,
      };

      return extractedData;
    } catch (error) {
      console.error('Invoice analysis error:', error);
      throw new Error(`Failed to analyze invoice: ${error.message}`);
    }
  }

  /**
   * 領収書の分析（強化版：完全な会社名抽出）
   */
  async analyzeReceipt(fileBuffer: Buffer, fileName: string): Promise<AnalysisResult> {
    try {
      // ファイルサイズチェック
      if (fileBuffer.length < 1024) {
        console.warn(`File ${fileName} is very small (${fileBuffer.length} bytes), might cause issues`);
      }

      console.log(`Starting receipt analysis for ${fileName} (${fileBuffer.length} bytes)`);
      
      // Step 1: prebuilt-receiptモデルで基本情報を抽出
      const receiptPoller = await this.client.beginAnalyzeDocument(
        'prebuilt-receipt',
        fileBuffer,
        {
          locale: 'ja-JP',
          contentType: 'application/octet-stream'
        }
      );

      const receiptResult = await receiptPoller.pollUntilDone();
      
      if (!receiptResult || !receiptResult.documents || receiptResult.documents.length === 0) {
        throw new Error('No receipt data extracted');
      }

      const receiptDocument = receiptResult.documents[0];
      const receiptFields = receiptDocument.fields || {};

      // Step 2: prebuilt-layoutモデルで詳細なテキスト情報を抽出
      console.log(`Starting layout analysis for enhanced company name extraction...`);
      const layoutPoller = await this.client.beginAnalyzeDocument(
        'prebuilt-layout',
        fileBuffer,
        {
          locale: 'ja-JP',
          contentType: 'application/octet-stream'
        }
      );

      const layoutResult = await layoutPoller.pollUntilDone();
      
      // Step 3: レイアウト分析から完全な会社名を抽出
      const enhancedMerchantName = this.extractEnhancedMerchantName(
        layoutResult, 
        receiptFields.MerchantName?.content
      );

      const extractedData: AnalysisResult = {
        documentType: 'receipt',
        confidence: receiptDocument.confidence || 0,
        fields: {
          // 強化された会社名を使用
          merchantName: enhancedMerchantName || receiptFields.MerchantName?.content,
          merchantAddress: receiptFields.MerchantAddress?.content,
          merchantPhoneNumber: receiptFields.MerchantPhoneNumber?.content,
          transactionDate: receiptFields.TransactionDate?.content,
          transactionTime: receiptFields.TransactionTime?.content,
          total: receiptFields.Total?.value,
          subtotal: receiptFields.Subtotal?.value,
          tax: receiptFields.TotalTax?.value,
          tip: receiptFields.Tip?.value,
          items: this.extractReceiptItems(receiptFields.Items),
          // 日本特有のフィールド
          receiptNumber: receiptFields.ReceiptNumber?.content,
          cashier: receiptFields.Cashier?.content,
          paymentMethod: receiptFields.PaymentMethod?.content,
          // カスタムフィールド（レイアウト分析結果も含む）
          customFields: {
            ...this.extractCustomFields(receiptFields),
            layoutAnalysis: {
              fullText: layoutResult.content,
              paragraphs: layoutResult.paragraphs?.map(p => p.content),
              lines: layoutResult.pages?.[0]?.lines?.map(l => l.content)
            }
          },
        },
        tables: receiptResult.tables,
        pages: receiptResult.pages,
        rawResult: receiptResult,
      };

      return extractedData;
    } catch (error) {
      console.error('Receipt analysis error:', error);
      
      // Azure固有のエラー情報を取得
      if (error.response) {
        console.error('Azure API Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
        });
        
        if (error.response.status === 400) {
          throw new Error('Invalid request: File may be too small or in an unsupported format. Minimum file size is typically 4KB for Azure Form Recognizer.');
        } else if (error.response.status === 401) {
          throw new Error('Authentication failed: Please check your Azure Form Recognizer API key.');
        } else if (error.response.status === 404) {
          throw new Error('Endpoint not found: Please check your Azure Form Recognizer endpoint URL.');
        }
      }
      
      throw new Error(`Failed to analyze receipt: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * 汎用ドキュメントの分析（レイアウト分析）
   */
  async analyzeDocument(fileBuffer: Buffer, fileName: string): Promise<AnalysisResult> {
    try {
      const poller = await this.client.beginAnalyzeDocument(
        'prebuilt-layout',
        fileBuffer
      );

      const result = await poller.pollUntilDone();

      const extractedData: AnalysisResult = {
        documentType: 'unknown',
        confidence: 0.5, // レイアウト分析には信頼度スコアがないため
        fields: {
          tables: result.tables,
          paragraphs: result.paragraphs,
          styles: result.styles,
        },
        tables: result.tables,
        pages: result.pages,
        rawResult: result,
      };

      return extractedData;
    } catch (error) {
      console.error('Document analysis error:', error);
      throw new Error(`Failed to analyze document: ${error.message}`);
    }
  }

  /**
   * バッチ処理（複数ファイルの並列処理）
   */
  async batchProcess(
    files: Array<{ buffer: Buffer; fileName: string; type?: string }>,
    maxConcurrent: number = 5
  ): Promise<Array<{ fileName: string; result?: AnalysisResult; error?: string }>> {
    const results: Array<{ fileName: string; result?: AnalysisResult; error?: string }> = [];
    
    // バッチを maxConcurrent のサイズに分割
    for (let i = 0; i < files.length; i += maxConcurrent) {
      const batch = files.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (file) => {
        try {
          let result: AnalysisResult;
          
          // ファイルタイプに基づいて適切な分析メソッドを選択
          switch (file.type) {
            case 'invoice':
              result = await this.analyzeInvoice(file.buffer, file.fileName);
              break;
            case 'receipt':
              result = await this.analyzeReceipt(file.buffer, file.fileName);
              break;
            default:
              // タイプが不明な場合は、ファイル名から推測
              if (file.fileName.toLowerCase().includes('invoice') || 
                  file.fileName.toLowerCase().includes('請求')) {
                result = await this.analyzeInvoice(file.buffer, file.fileName);
              } else if (file.fileName.toLowerCase().includes('receipt') || 
                         file.fileName.toLowerCase().includes('領収')) {
                result = await this.analyzeReceipt(file.buffer, file.fileName);
              } else {
                result = await this.analyzeDocument(file.buffer, file.fileName);
              }
          }
          
          return { fileName: file.fileName, result };
        } catch (error) {
          return { fileName: file.fileName, error: error.message };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * ファイルをGridFSに保存
   */
  async saveToGridFS(fileBuffer: Buffer, fileName: string, metadata?: any): Promise<string> {
    const bucket = await this.getGridFsBucket();
    
    return new Promise((resolve, reject) => {
      const uploadStream = bucket.openUploadStream(fileName, {
        metadata: {
          ...metadata,
          uploadedAt: new Date(),
        },
      });
      
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve(uploadStream.id.toString()));
      
      uploadStream.end(fileBuffer);
    });
  }

  /**
   * 明細行の抽出（請求書用）
   */
  private extractLineItems(itemsField: any): any[] {
    if (!itemsField || !itemsField.values) return [];
    
    return itemsField.values.map((item: any) => {
      const itemFields = item.fields || {};
      return {
        description: itemFields.Description?.content,
        quantity: itemFields.Quantity?.value,
        unitPrice: itemFields.UnitPrice?.value,
        amount: itemFields.Amount?.value,
        productCode: itemFields.ProductCode?.content,
        unit: itemFields.Unit?.content,
        date: itemFields.Date?.content,
        tax: itemFields.Tax?.value,
      };
    });
  }

  /**
   * 明細行の抽出（領収書用）
   */
  private extractReceiptItems(itemsField: any): any[] {
    if (!itemsField || !itemsField.values) return [];
    
    return itemsField.values.map((item: any) => {
      const itemFields = item.fields || {};
      return {
        name: itemFields.Name?.content,
        quantity: itemFields.Quantity?.value || 1,
        price: itemFields.Price?.value,
        totalPrice: itemFields.TotalPrice?.value,
      };
    });
  }

  /**
   * カスタムフィールドの抽出
   */
  private extractCustomFields(fields: Record<string, any>): Record<string, any> {
    const standardFields = [
      'InvoiceId', 'InvoiceDate', 'DueDate', 'VendorName', 'VendorAddress',
      'CustomerName', 'CustomerAddress', 'TotalAmount', 'SubTotal', 'TotalTax',
      'Items', 'MerchantName', 'MerchantAddress', 'TransactionDate', 'Total',
      'Subtotal', 'Tax', 'Tip'
    ];
    
    const customFields: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(fields)) {
      if (!standardFields.includes(key) && value) {
        customFields[key] = value.content || value.value;
      }
    }
    
    // InvoiceTotalは重要なフィールドなので、標準フィールドとしても扱う
    if (fields.InvoiceTotal) {
      customFields.InvoiceTotal = fields.InvoiceTotal.content || fields.InvoiceTotal.value;
    }
    
    return customFields;
  }

  /**
   * レイアウト分析から強化された会社名を抽出
   */
  private extractEnhancedMerchantName(layoutResult: any, originalMerchantName?: string): string | null {
    try {
      if (!layoutResult || !layoutResult.pages || layoutResult.pages.length === 0) {
        return null;
      }

      const page = layoutResult.pages[0];
      if (!page.lines || page.lines.length === 0) {
        return null;
      }

      // 上部3行のテキストを解析対象とする（会社名は通常最上部に記載）
      const topLines = page.lines.slice(0, 3).map(line => line.content);
      
      // 会社名候補を抽出するパターン（より厳密に）
      const companyPatterns = [
        // 株式会社パターン（単独）
        /^(株式会社[^\s\d]{2,10})$/,
        /^([^\s\d]{2,10}株式会社)$/,
        // 有限会社パターン（単独）
        /^(有限会社[^\s\d]{2,10})$/,
        /^([^\s\d]{2,10}有限会社)$/,
        // 企業名＋数字パターン（タイムズ24など）
        /^([^\s]{2,8}(?:24|２４))$/,
        // 元の会社名をベースに拡張（完全一致優先）
        originalMerchantName ? new RegExp(`^(${originalMerchantName}[^\s]{0,10})$`) : null,
        originalMerchantName ? new RegExp(`^([^\s]{0,10}${originalMerchantName}[^\s]{0,10})$`) : null,
      ].filter(Boolean);

      // 各行で会社名候補を検索
      for (const line of topLines) {
        const trimmedLine = line.trim();
        
        // 空行や明らかに会社名でない行をスキップ
        if (!trimmedLine || 
            trimmedLine.length < 2 || 
            trimmedLine.length > 30 || // 長すぎる行は除外
            /^\d+$/.test(trimmedLine) ||
            /^[\d\-\s:：]+$/.test(trimmedLine) ||
            /^[時間|日付|tel|phone|fax|email|営業|住所|address|〒|zip]/i.test(trimmedLine) ||
            /[0-9]{4}/.test(trimmedLine) || // 4桁以上の数字を含む行は除外
            /[a-zA-Z]{5,}/.test(trimmedLine) || // 長い英語文字列は除外
            /[，。、！？]/.test(trimmedLine)) { // 句読点を含む行は除外
          continue;
        }

        // パターンマッチング
        for (const pattern of companyPatterns) {
          const match = trimmedLine.match(pattern);
          if (match && match[1]) {
            const candidateName = match[1].trim();
            
            // 候補の品質チェック
            if (this.isValidCompanyName(candidateName, originalMerchantName)) {
              console.log(`Enhanced merchant name found: "${candidateName}" (from line: "${trimmedLine}")`);
              return candidateName;
            }
          }
        }
      }

      // パターンマッチングで見つからない場合、元の会社名を拡張
      if (originalMerchantName) {
        for (const line of topLines) {
          const trimmedLine = line.trim();
          
          // 元の会社名を含む行を探す
          if (trimmedLine.includes(originalMerchantName) && 
              trimmedLine.length > originalMerchantName.length &&
              trimmedLine.length <= 20 && // 適度な長さ
              this.isValidCompanyName(trimmedLine, originalMerchantName)) {
            console.log(`Enhanced merchant name from expansion: "${trimmedLine}"`);
            return trimmedLine;
          }
        }
      }

      // 最終的に見つからない場合は元の会社名を返す
      return originalMerchantName || null;
    } catch (error) {
      console.error('Error extracting enhanced merchant name:', error);
      return originalMerchantName || null;
    }
  }

  /**
   * 会社名候補の妥当性をチェック
   */
  private isValidCompanyName(candidate: string, originalName?: string): boolean {
    if (!candidate || candidate.length < 2 || candidate.length > 30) {
      return false;
    }

    // 明らかに会社名でない文字列を除外
    const invalidPatterns = [
      /^[時間|日付|tel|phone|fax|email|url|http|www]/i,
      /^[\d\-\s:：]+$/,
      /^[営業|店舗|住所|address|〒|zip]/i,
      /^[領収書|レシート|receipt]/i,
      /^[ありがとう|thank|合計|total|税込|税抜]/i,
      /[0-9]{4,}/, // 4桁以上の数字を含む場合は除外
      /[a-zA-Z]{5,}/, // 長い英語文字列は除外
      /[，。、！？]/, // 句読点を含む場合は除外
      /^\d+$/, // 数字のみは除外
      /^[A-Z]{2,}$/, // 大文字のみは除外
      /^[T][0-9]+/, // T4010... のようなIDは除外
      /^[n][0-9]+/, // n4010... のようなIDは除外
      /^[#]+/, // ハッシュ記号から始まるものは除外
      /出庫|入庫|駐車|時刻|分|料金|円|￥|税/, // 駐車場関連の詳細情報は除外
      /登録|番号|精算|発券|No\./, // 管理番号系は除外
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(candidate)) {
        return false;
      }
    }

    // 元の会社名がある場合、それを含むか類似していることを確認
    if (originalName && !candidate.includes(originalName) && originalName.length > 2) {
      // 元の会社名と全く異なる場合は無効とする
      return false;
    }

    return true;
  }

  /**
   * 分析結果の信頼度チェック
   */
  validateConfidence(result: AnalysisResult, minConfidence: number = 0.8): boolean {
    return result.confidence >= minConfidence;
  }

  /**
   * エラーハンドリングとリトライ
   */
  async analyzeWithRetry(
    fileBuffer: Buffer,
    fileName: string,
    documentType: 'invoice' | 'receipt' | 'document',
    maxRetries: number = 3
  ): Promise<AnalysisResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        switch (documentType) {
          case 'invoice':
            return await this.analyzeInvoice(fileBuffer, fileName);
          case 'receipt':
            return await this.analyzeReceipt(fileBuffer, fileName);
          default:
            return await this.analyzeDocument(fileBuffer, fileName);
        }
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          // 指数バックオフ
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}

// シングルトンインスタンスのエクスポート
let formRecognizerInstance: FormRecognizerService | null = null;

export function getFormRecognizerService(): FormRecognizerService {
  if (!formRecognizerInstance) {
    const endpoint = process.env.AZURE_FORM_RECOGNIZER_ENDPOINT;
    const apiKey = process.env.AZURE_FORM_RECOGNIZER_KEY;
    
    if (!endpoint || !apiKey) {
      console.error('Azure Form Recognizer configuration missing:', {
        endpoint: endpoint ? 'Present' : 'Missing',
        apiKey: apiKey ? 'Present' : 'Missing',
      });
      throw new Error('Azure Form Recognizer configuration is missing. Please check AZURE_FORM_RECOGNIZER_ENDPOINT and AZURE_FORM_RECOGNIZER_KEY environment variables.');
    }
    
    try {
      formRecognizerInstance = new FormRecognizerService({
        endpoint,
        apiKey,
      });
      console.log('Azure Form Recognizer service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Azure Form Recognizer:', error);
      throw new Error(`Failed to initialize Azure Form Recognizer: ${error.message}`);
    }
  }
  
  return formRecognizerInstance;
}