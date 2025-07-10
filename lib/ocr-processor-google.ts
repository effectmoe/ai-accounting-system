import { ImageAnnotatorClient } from '@google-cloud/vision';
import { googleCloudConfig } from './google-cloud-config';
import { OCRResult } from './ocr-processor';

export class GoogleCloudOCRProcessor {
  private client: ImageAnnotatorClient;

  constructor() {
    // Google Cloud Vision クライアントの初期化
    this.client = new ImageAnnotatorClient({
      projectId: googleCloudConfig.projectId,
      keyFilename: googleCloudConfig.keyFilename,
      credentials: googleCloudConfig.credentials,
      apiEndpoint: googleCloudConfig.vision.apiEndpoint,
    });
  }

  async processReceiptImage(imageBuffer: Buffer): Promise<OCRResult> {
    try {
      // テキスト検出リクエスト
      const [result] = await this.client.textDetection({
        image: {
          content: imageBuffer,
        },
        imageContext: googleCloudConfig.vision.imageContext,
      });

      const detections = result.textAnnotations;
      if (!detections || detections.length === 0) {
        throw new Error('テキストが検出されませんでした');
      }

      // 全体のテキストを取得（最初の要素には全体のテキストが含まれる）
      const fullText = detections[0].description || '';
      const confidence = detections[0].confidence || 0;

      // OCR結果から構造化データを抽出
      const structuredData = this.extractStructuredData(fullText);

      return {
        text: fullText,
        confidence,
        ...structuredData,
      };
    } catch (error) {
      console.error('OCR処理エラー:', error);
      throw new Error(`OCR処理に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractStructuredData(text: string): Partial<OCRResult> {
    const result: Partial<OCRResult> = {
      items: []
    };

    // テキストを行ごとに分割
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    // 店舗名の抽出（通常最初の数行に含まれる）
    if (lines.length > 0) {
      // 日付や時刻、金額を含まない最初の行を店舗名として扱う
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        if (!this.isDateLine(line) && !this.isAmountLine(line) && !this.isTimeLine(line)) {
          result.vendor = line;
          break;
        }
      }
    }

    // 日付の抽出
    result.date = this.extractDate(text);

    // 合計金額の抽出
    const amounts = this.extractAmounts(text);
    if (amounts.total) {
      result.amount = amounts.total;
    }
    if (amounts.tax) {
      result.taxAmount = amounts.tax;
    }

    // 商品明細の抽出
    result.items = this.extractItems(lines);

    return result;
  }

  private isDateLine(line: string): boolean {
    return /\d{4}[年\/\-]\d{1,2}[月\/\-]\d{1,2}/.test(line) ||
           /\d{1,2}[月\/]\d{1,2}/.test(line);
  }

  private isTimeLine(line: string): boolean {
    return /\d{1,2}[:：]\d{2}/.test(line);
  }

  private isAmountLine(line: string): boolean {
    return /[¥￥]\s*[\d,]+/.test(line) || /[\d,]+\s*円/.test(line);
  }

  private extractDate(text: string): string | undefined {
    // 年月日形式
    const fullDateMatch = text.match(/(\d{4})[年\/\-](\d{1,2})[月\/\-](\d{1,2})/);
    if (fullDateMatch) {
      return `${fullDateMatch[1]}-${fullDateMatch[2].padStart(2, '0')}-${fullDateMatch[3].padStart(2, '0')}`;
    }

    // 月日形式（現在の年を使用）
    const monthDayMatch = text.match(/(\d{1,2})[月\/](\d{1,2})/);
    if (monthDayMatch) {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${monthDayMatch[1].padStart(2, '0')}-${monthDayMatch[2].padStart(2, '0')}`;
    }

    return undefined;
  }

  private extractAmounts(text: string): { total?: number; tax?: number; subtotal?: number } {
    const amounts: { total?: number; tax?: number; subtotal?: number } = {};

    // 合計金額のパターン
    const totalPatterns = [
      /合計\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
      /計\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
      /total\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
      /お会計\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
    ];

    for (const pattern of totalPatterns) {
      const match = text.match(pattern);
      if (match) {
        amounts.total = parseInt(match[1].replace(/,/g, ''));
        break;
      }
    }

    // 消費税のパターン
    const taxPatterns = [
      /(?:消費税|税)\s*(?:\(?\d+%\)?)?\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
      /内税\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
      /tax\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
    ];

    for (const pattern of taxPatterns) {
      const match = text.match(pattern);
      if (match) {
        amounts.tax = parseInt(match[1].replace(/,/g, ''));
        break;
      }
    }

    // 小計のパターン
    const subtotalPatterns = [
      /小計\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
      /subtotal\s*[:：]?\s*[¥￥]?\s*([\d,]+)/i,
    ];

    for (const pattern of subtotalPatterns) {
      const match = text.match(pattern);
      if (match) {
        amounts.subtotal = parseInt(match[1].replace(/,/g, ''));
        break;
      }
    }

    return amounts;
  }

  private extractItems(lines: string[]): Array<{ name: string; amount: number }> {
    const items: Array<{ name: string; amount: number }> = [];

    // 商品行のパターン（商品名と金額が同じ行にある場合）
    const itemPattern = /^(.+?)\s+[¥￥]?\s*([\d,]+)\s*円?$/;

    for (const line of lines) {
      const match = line.match(itemPattern);
      if (match) {
        const name = match[1].trim();
        const amount = parseInt(match[2].replace(/,/g, ''));
        
        // 合計や税などの行は除外
        if (!name.match(/合計|計|小計|税|total|subtotal|tax/i)) {
          items.push({ name, amount });
        }
      }
    }

    return items;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}