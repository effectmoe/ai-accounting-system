/**
 * スキャン領収書処理サービス
 * scan-receipt/ フォルダのPDFをOCR処理して領収書として登録
 */

import * as fs from 'fs';
import * as path from 'path';
import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { OllamaClient } from '@/lib/ollama-client';
import { convertPdfToImage, cleanupTempDir, isValidPdf, isPdftoppmAvailable } from '@/lib/pdf-to-image';
import { logger } from '@/lib/logger';
import { CompanyInfoService } from './company-info.service';
import { Receipt, ReceiptItem, ReceiptStatus, AccountCategory, ACCOUNT_CATEGORIES } from '@/types/receipt';
import {
  ScanReceiptResult,
  ScanReceiptItemResult,
  ExtractedReceiptData,
  ScannedReceiptMetadata,
  ScanReceiptProcessRequest,
  ScanReceiptListParams,
} from '@/types/scan-receipt';

// デフォルトのスキャンフォルダパス
const DEFAULT_SCAN_DIR = path.join(process.cwd(), 'scan-receipt');
const PROCESSED_SUBDIR = 'processed';

export class ScanReceiptService {
  private scanDir: string;
  private processedDir: string;
  private ollamaClient: OllamaClient;
  private companyInfoService: CompanyInfoService;
  private visionModel: string;

  constructor() {
    this.scanDir = process.env.SCAN_RECEIPT_DIR || DEFAULT_SCAN_DIR;
    this.processedDir = path.join(this.scanDir, PROCESSED_SUBDIR);
    this.ollamaClient = new OllamaClient();
    this.companyInfoService = new CompanyInfoService();
    this.visionModel = process.env.OLLAMA_VISION_MODEL || 'qwen3-vl';
  }

  /**
   * scan-receiptフォルダ内の全PDFを処理
   */
  async processScanReceiptFolder(params: ScanReceiptProcessRequest = {}): Promise<ScanReceiptResult> {
    const result: ScanReceiptResult = {
      processedCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      results: [],
    };

    try {
      // pdftoppmの利用可能性を確認
      const pdftoppmAvailable = await isPdftoppmAvailable();
      if (!pdftoppmAvailable) {
        throw new Error('pdftoppm is not available. Please install poppler-utils.');
      }

      // Ollamaの利用可能性を確認
      const ollamaAvailable = await this.ollamaClient.checkAvailability();
      if (!ollamaAvailable) {
        logger.warn('[ScanReceiptService] Ollama is not available, using fallback methods');
      }

      // スキャンフォルダの存在確認
      if (!fs.existsSync(this.scanDir)) {
        logger.info(`[ScanReceiptService] Creating scan directory: ${this.scanDir}`);
        fs.mkdirSync(this.scanDir, { recursive: true });
      }

      // processedサブフォルダの作成
      if (!fs.existsSync(this.processedDir)) {
        fs.mkdirSync(this.processedDir, { recursive: true });
      }

      // PDFファイルをリスト
      const files = fs.readdirSync(this.scanDir);
      const pdfFiles = files.filter(f =>
        f.toLowerCase().endsWith('.pdf') &&
        !f.startsWith('.')
      );

      // 対象ファイルをフィルタ
      const targetFiles = params.targetFiles?.length
        ? pdfFiles.filter(f => params.targetFiles!.includes(f))
        : pdfFiles;

      logger.info(`[ScanReceiptService] Found ${targetFiles.length} PDF files to process`);

      // 各PDFを処理
      for (const pdfFile of targetFiles) {
        const itemResult = await this.processSinglePdf(pdfFile);
        result.results.push(itemResult);
        result.processedCount++;

        if (itemResult.status === 'success') {
          result.successCount++;
        } else if (itemResult.status === 'failed') {
          result.failedCount++;
        } else {
          result.skippedCount++;
        }
      }

      logger.info(`[ScanReceiptService] Processing complete:`, {
        processed: result.processedCount,
        success: result.successCount,
        failed: result.failedCount,
        skipped: result.skippedCount,
      });

      return result;
    } catch (error) {
      logger.error('[ScanReceiptService] Error processing scan receipt folder:', error);
      throw error;
    }
  }

  /**
   * 単一のPDFファイルを処理
   */
  async processSinglePdf(fileName: string): Promise<ScanReceiptItemResult> {
    const startTime = Date.now();
    const pdfPath = path.join(this.scanDir, fileName);

    logger.info(`[ScanReceiptService] Processing PDF: ${fileName}`);

    try {
      // PDFの有効性を確認
      const isValid = await isValidPdf(pdfPath);
      if (!isValid) {
        return {
          fileName,
          status: 'failed',
          error: 'Invalid PDF file',
          processingTime: Date.now() - startTime,
        };
      }

      // PDFを画像に変換
      const { imageBuffer, imagePath } = await convertPdfToImage(pdfPath, {
        dpi: 300,
        page: 1,
        format: 'png',
      });

      // Vision ModelでOCR処理
      const extractedData = await this.extractReceiptDataWithVision(imageBuffer);

      // 一時ファイルをクリーンアップ
      const tempDir = path.dirname(imagePath);
      await cleanupTempDir(tempDir);

      // 領収書を作成
      const receipt = await this.createReceiptFromExtractedData(extractedData, fileName);

      // PDFをprocessedフォルダに移動
      const processedPath = path.join(this.processedDir, fileName);
      fs.renameSync(pdfPath, processedPath);

      logger.info(`[ScanReceiptService] Successfully processed: ${fileName} -> ${receipt.receiptNumber}`);

      return {
        fileName,
        status: 'success',
        receiptId: receipt._id?.toString(),
        receiptNumber: receipt.receiptNumber,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error(`[ScanReceiptService] Error processing PDF ${fileName}:`, error);
      return {
        fileName,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Vision Modelで画像からレシートデータを抽出（リトライ付き）
   */
  async extractReceiptDataWithVision(imageBuffer: Buffer, maxRetries: number = 3): Promise<ExtractedReceiptData> {
    // 注意: Qwen3-VLは長いプロンプトで空レスポンスを返すことがある
    // ミニマルなプロンプトを使用
    const systemPrompt = ''; // システムプロンプトは使用しない

    // ミニマルプロンプト（Qwen3-VLで安定動作確認済み）
    const userPrompt = `領収書のJSON：{"issuerName":"店舗名", "issuerAddress":"住所", "issuerPhone":"電話", "issueDate":"YYYY-MM-DD", "subtotal":税抜金額, "taxAmount":消費税, "totalAmount":合計, "accountCategory":"接待交際費/会議費/旅費交通費/車両費/消耗品費/通信費/福利厚生費/新聞図書費/雑費から選択"}`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[ScanReceiptService] Vision model extraction attempt ${attempt}/${maxRetries}`);

        // Vision Modelを使用して画像を分析
        // temperature: 0.3 で安定性向上（低すぎると空レスポンスになることがある）
        const response = await this.ollamaClient.extractJSONFromImage(
          imageBuffer,
          systemPrompt,
          userPrompt,
          this.visionModel,
          {
            temperature: 0.3,
            num_predict: 2000,
          }
        );

        logger.debug('[ScanReceiptService] Vision model response:', response?.substring(0, 500));

        // 空のレスポンスチェック
        if (!response || response.trim() === '') {
          logger.warn(`[ScanReceiptService] Empty response on attempt ${attempt}`);
          lastError = new Error('Empty response from Vision model');
          continue;
        }

        // JSONを抽出
        const extractedData = this.parseJsonResponse(response);

        // 基本的なバリデーション
        if (!extractedData.totalAmount && !extractedData.issuerName) {
          logger.warn(`[ScanReceiptService] Incomplete data on attempt ${attempt}`);
          lastError = new Error('Incomplete data extracted');
          continue;
        }

        logger.info(`[ScanReceiptService] Successfully extracted data on attempt ${attempt}`, {
          issuerName: extractedData.issuerName,
          totalAmount: extractedData.totalAmount,
          accountCategory: extractedData.accountCategory,
        });

        return extractedData;
      } catch (error) {
        logger.error(`[ScanReceiptService] Vision model extraction failed on attempt ${attempt}:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // 最後の試行でなければ少し待機
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    logger.error('[ScanReceiptService] All extraction attempts failed:', lastError);

    // フォールバック: 空のデータを返す（手動で編集する必要がある）
    return {
      issuerName: '（読み取り失敗）',
      totalAmount: 0,
      issueDate: new Date().toISOString().split('T')[0],
      accountCategory: '未分類',
      accountCategoryReason: 'OCR処理に失敗したため自動判定できませんでした',
    };
  }

  /**
   * JSONレスポンスをパース
   */
  private parseJsonResponse(response: string): ExtractedReceiptData {
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
      logger.error('[ScanReceiptService] Failed to parse JSON response:', error);
      throw new Error(`Failed to parse OCR result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 抽出データから領収書を作成
   */
  async createReceiptFromExtractedData(
    extractedData: ExtractedReceiptData,
    originalFileName: string
  ): Promise<Receipt> {
    // 領収書番号を生成（SCAN-timestamp-random形式）
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptNumber = `SCAN-${timestamp}-${random}`;

    // 会社情報を取得（issuer情報がない場合のフォールバック）
    let companyInfo = null;
    try {
      companyInfo = await this.companyInfoService.getCompanyInfo();
    } catch (error) {
      logger.warn('[ScanReceiptService] Could not get company info for fallback');
    }

    // 明細を変換
    const items: ReceiptItem[] = (extractedData.items || []).map(item => ({
      itemName: item.itemName || '',
      description: item.itemName || '明細',
      quantity: item.quantity || 1,
      unit: item.unit || '式',
      unitPrice: item.unitPrice || item.amount || 0,
      amount: item.amount || 0,
    }));

    // 明細がない場合、合計金額から1つの明細を作成
    if (items.length === 0 && extractedData.totalAmount) {
      items.push({
        description: extractedData.subject || '購入代金',
        quantity: 1,
        unit: '式',
        unitPrice: extractedData.totalAmount,
        amount: extractedData.totalAmount,
      });
    }

    // スキャンメタデータ
    const scanMetadata: ScannedReceiptMetadata = {
      originalFileName,
      processedAt: new Date(),
      visionModelUsed: this.visionModel,
    };

    // 領収書データを作成
    const receiptData: Omit<Receipt, '_id' | 'createdAt' | 'updatedAt'> = {
      receiptNumber,
      // スキャン取込は請求書・顧客と紐付けない
      invoiceId: undefined,
      customerId: undefined,
      customerName: '（スキャン取込）',

      // 発行者情報（OCRで取得、またはフォールバック）
      issuerName: extractedData.issuerName || '（発行者不明）',
      issuerAddress: extractedData.issuerAddress,
      issuerPhone: extractedData.issuerPhone,
      issuerRegistrationNumber: extractedData.issuerRegistrationNumber,

      // 金額情報
      subtotal: extractedData.subtotal || extractedData.totalAmount || 0,
      taxAmount: extractedData.taxAmount || 0,
      totalAmount: extractedData.totalAmount || 0,
      taxRate: extractedData.taxRate || 0.1,

      // 明細
      items,

      // 日付情報
      issueDate: extractedData.issueDate
        ? new Date(extractedData.issueDate)
        : new Date(),

      // その他
      subject: extractedData.subject || '品代として',
      notes: extractedData.notes,
      status: 'issued' as ReceiptStatus, // 自動的に発行済みに

      // 勘定科目（AI推定）
      accountCategory: this.validateAccountCategory(extractedData.accountCategory),
      accountCategoryConfidence: extractedData.accountCategory ? 0.8 : 0, // AI推定の場合は0.8

      // スキャン取込フラグ
      scannedFromPdf: true,
      scanMetadata,
    };

    // 領収書を保存
    const receipt = await db.create<Receipt>(Collections.RECEIPTS, receiptData);

    logger.info(`[ScanReceiptService] Created receipt: ${receiptNumber}`, {
      totalAmount: receipt.totalAmount,
      issuerName: receipt.issuerName,
      accountCategory: receipt.accountCategory,
    });

    return receipt;
  }

  /**
   * 勘定科目をバリデート（AIの出力が有効な勘定科目かチェック）
   */
  private validateAccountCategory(category: string | undefined): AccountCategory {
    if (!category) {
      return '未分類';
    }

    // 有効な勘定科目リストを取得
    const validCategories = ACCOUNT_CATEGORIES.map(c => c.code);

    // 完全一致チェック
    if (validCategories.includes(category as AccountCategory)) {
      return category as AccountCategory;
    }

    // 部分一致チェック（AIが多少異なる表記を返した場合）
    const normalizedCategory = category.replace(/\s+/g, '');
    for (const validCat of validCategories) {
      if (normalizedCategory.includes(validCat) || validCat.includes(normalizedCategory)) {
        return validCat;
      }
    }

    logger.warn(`[ScanReceiptService] Invalid account category from AI: "${category}", using 未分類`);
    return '未分類';
  }

  /**
   * スキャン済み領収書一覧を取得
   */
  async getScannedReceipts(params: ScanReceiptListParams = {}): Promise<{
    receipts: Receipt[];
    total: number;
    hasMore: boolean;
  }> {
    const {
      limit = 20,
      skip = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const filter = {
      scannedFromPdf: true,
    };

    const sortObj: Record<string, 1 | -1> = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const receipts = await db.find<Receipt>(Collections.RECEIPTS, filter, {
      sort: sortObj,
      limit: limit + 1,
      skip,
    });

    const hasMore = receipts.length > limit;
    if (hasMore) {
      receipts.pop();
    }

    const total = await db.count(Collections.RECEIPTS, filter);

    return {
      receipts,
      total,
      hasMore,
    };
  }

  /**
   * 未処理のPDFファイル数を取得
   */
  async getPendingPdfCount(): Promise<number> {
    try {
      if (!fs.existsSync(this.scanDir)) {
        return 0;
      }

      const files = fs.readdirSync(this.scanDir);
      const pdfFiles = files.filter(f =>
        f.toLowerCase().endsWith('.pdf') &&
        !f.startsWith('.')
      );

      return pdfFiles.length;
    } catch (error) {
      logger.error('[ScanReceiptService] Error getting pending PDF count:', error);
      return 0;
    }
  }

  /**
   * 未処理のPDFファイル一覧を取得
   */
  async getPendingPdfFiles(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.scanDir)) {
        return [];
      }

      const files = fs.readdirSync(this.scanDir);
      return files.filter(f =>
        f.toLowerCase().endsWith('.pdf') &&
        !f.startsWith('.')
      );
    } catch (error) {
      logger.error('[ScanReceiptService] Error getting pending PDF files:', error);
      return [];
    }
  }
}
