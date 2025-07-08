import { AzureKeyCredential, DocumentAnalysisClient } from '@azure/ai-form-recognizer';
import { GridFSBucket } from 'mongodb';
import { mongoClient } from './mongodb-client';

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
      const db = mongoClient.db('accounting');
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
          totalAmount: fields.TotalAmount?.value,
          subTotal: fields.SubTotal?.value,
          totalTax: fields.TotalTax?.value,
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
   * 領収書の分析
   */
  async analyzeReceipt(fileBuffer: Buffer, fileName: string): Promise<AnalysisResult> {
    try {
      const poller = await this.client.beginAnalyzeDocument(
        'prebuilt-receipt',
        fileBuffer,
        {
          locale: 'ja-JP',
        }
      );

      const result = await poller.pollUntilDone();
      
      if (!result || !result.documents || result.documents.length === 0) {
        throw new Error('No receipt data extracted');
      }

      const document = result.documents[0];
      const fields = document.fields || {};

      const extractedData: AnalysisResult = {
        documentType: 'receipt',
        confidence: document.confidence || 0,
        fields: {
          merchantName: fields.MerchantName?.content,
          merchantAddress: fields.MerchantAddress?.content,
          merchantPhoneNumber: fields.MerchantPhoneNumber?.content,
          transactionDate: fields.TransactionDate?.content,
          transactionTime: fields.TransactionTime?.content,
          total: fields.Total?.value,
          subtotal: fields.Subtotal?.value,
          tax: fields.TotalTax?.value,
          tip: fields.Tip?.value,
          items: this.extractReceiptItems(fields.Items),
          // 日本特有のフィールド
          receiptNumber: fields.ReceiptNumber?.content,
          cashier: fields.Cashier?.content,
          paymentMethod: fields.PaymentMethod?.content,
          // カスタムフィールド
          customFields: this.extractCustomFields(fields),
        },
        tables: result.tables,
        pages: result.pages,
        rawResult: result,
      };

      return extractedData;
    } catch (error) {
      console.error('Receipt analysis error:', error);
      throw new Error(`Failed to analyze receipt: ${error.message}`);
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
    
    return customFields;
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
      throw new Error('Azure Form Recognizer configuration is missing');
    }
    
    formRecognizerInstance = new FormRecognizerService({
      endpoint,
      apiKey,
    });
  }
  
  return formRecognizerInstance;
}