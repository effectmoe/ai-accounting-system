/**
 * スキャン領収書処理サービス
 * scan-receipt/ フォルダのPDF/JPG/PNGをOCR処理して領収書として登録
 */

import * as fs from 'fs';
import * as path from 'path';
import { db, Collections } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { OllamaClient } from '@/lib/ollama-client';
import { convertPdfToImage, cleanupTempDir, isValidPdf, isPdftoppmAvailable } from '@/lib/pdf-to-image';
import { logger } from '@/lib/logger';
import { CompanyInfoService } from './company-info.service';
import { convertToWebp, ConversionResult } from '@/lib/image-converter';
import { uploadToR2, generateReceiptImageKey, UploadResult } from '@/lib/r2-client';
import { Receipt, ReceiptItem, ReceiptStatus, AccountCategory, ACCOUNT_CATEGORIES } from '@/types/receipt';
import {
  ScanReceiptResult,
  ScanReceiptItemResult,
  ExtractedReceiptData,
  ScannedReceiptMetadata,
  ScanReceiptProcessRequest,
  ScanReceiptListParams,
} from '@/types/scan-receipt';
import { getLearningRuleService } from './learning-rule.service';

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

      // サポートする拡張子（JPG/PNG優先、PDF対応）
      const supportedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      const files = fs.readdirSync(this.scanDir);
      const receiptFiles = files.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return supportedExtensions.includes(ext) && !f.startsWith('.');
      });

      // 対象ファイルをフィルタ
      const targetFiles = params.targetFiles?.length
        ? receiptFiles.filter(f => params.targetFiles!.includes(f))
        : receiptFiles;

      logger.info(`[ScanReceiptService] Found ${targetFiles.length} receipt files to process`);

      // 各ファイルを処理
      for (const receiptFile of targetFiles) {
        const ext = path.extname(receiptFile).toLowerCase();
        const itemResult = ext === '.pdf'
          ? await this.processSinglePdf(receiptFile)
          : await this.processSingleImage(receiptFile);
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

      // 仮の領収書IDを生成（R2パス用）
      const tempReceiptId = new ObjectId().toString();

      // WEBP変換とR2アップロード
      let imageUploadResult: { url: string; metadata: ConversionResult & { key: string } } | null = null;
      try {
        imageUploadResult = await this.convertAndUploadToR2(imageBuffer, tempReceiptId);
        logger.info(`[ScanReceiptService] Image uploaded to R2: ${imageUploadResult.url}`);
      } catch (uploadError) {
        // R2アップロードが失敗しても領収書登録は続行
        logger.warn(`[ScanReceiptService] Image upload failed, continuing without image:`, uploadError);
      }

      // 領収書を作成
      const receipt = await this.createReceiptFromExtractedData(
        extractedData,
        fileName,
        imageUploadResult
      );

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
   * 単一の画像ファイル（JPG/PNG）を処理
   */
  async processSingleImage(fileName: string): Promise<ScanReceiptItemResult> {
    const startTime = Date.now();
    const imagePath = path.join(this.scanDir, fileName);

    logger.info(`[ScanReceiptService] Processing image: ${fileName}`);

    try {
      // ファイルの存在確認
      if (!fs.existsSync(imagePath)) {
        return {
          fileName,
          status: 'failed',
          error: 'File not found',
          processingTime: Date.now() - startTime,
        };
      }

      // 画像を読み込み
      const imageBuffer = fs.readFileSync(imagePath);

      // Vision ModelでOCR処理
      const extractedData = await this.extractReceiptDataWithVision(imageBuffer);

      // 仮の領収書IDを生成（R2パス用）
      const tempReceiptId = new ObjectId().toString();

      // WEBP変換とR2アップロード
      let imageUploadResult: { url: string; metadata: ConversionResult & { key: string } } | null = null;
      try {
        imageUploadResult = await this.convertAndUploadToR2(imageBuffer, tempReceiptId);
        logger.info(`[ScanReceiptService] Image uploaded to R2: ${imageUploadResult.url}`);
      } catch (uploadError) {
        // R2アップロードが失敗しても領収書登録は続行
        logger.warn(`[ScanReceiptService] Image upload failed, continuing without image:`, uploadError);
      }

      // 領収書を作成
      const receipt = await this.createReceiptFromExtractedData(
        extractedData,
        fileName,
        imageUploadResult
      );

      // 画像をprocessedフォルダに移動
      const processedPath = path.join(this.processedDir, fileName);
      fs.renameSync(imagePath, processedPath);

      logger.info(`[ScanReceiptService] Successfully processed: ${fileName} -> ${receipt.receiptNumber}`);

      return {
        fileName,
        status: 'success',
        receiptId: receipt._id?.toString(),
        receiptNumber: receipt.receiptNumber,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error(`[ScanReceiptService] Error processing image ${fileName}:`, error);
      return {
        fileName,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * 画像をWEBPに変換してR2にアップロード
   */
  private async convertAndUploadToR2(
    imageBuffer: Buffer,
    receiptId: string
  ): Promise<{ url: string; metadata: ConversionResult & { key: string } }> {
    // PNG → WEBP変換
    const webpResult = await convertToWebp(imageBuffer, {
      quality: 85,
      maxWidth: 2000,
      maxHeight: 2000,
    });

    logger.info(`[ScanReceiptService] WEBP conversion complete: ${webpResult.size} bytes, ${webpResult.width}x${webpResult.height}`);

    // R2にアップロード
    const key = generateReceiptImageKey(receiptId);
    const uploadResult = await uploadToR2(webpResult.buffer, key, {
      contentType: 'image/webp',
      metadata: {
        receiptId,
        originalFormat: 'png',
        width: String(webpResult.width),
        height: String(webpResult.height),
      },
    });

    return {
      url: uploadResult.url,
      metadata: {
        ...webpResult,
        key: uploadResult.key,
      },
    };
  }

  /**
   * Vision Modelで画像からレシートデータを抽出（リトライ付き）
   *
   * SKILL: accounting-ocr-expert
   * 対象モデル: Qwen3-VL-8B-Instruct (LM Studio)
   * 設計書: /Users/tonychustudio/Documents/alldocs/tutorial/2026-01-14_会計OCR_SKILL設計書.md
   */
  async extractReceiptDataWithVision(imageBuffer: Buffer, maxRetries: number = 3): Promise<ExtractedReceiptData> {
    // SKILL システムプロンプト（基本版）
    // Qwen3-VLの安定性を考慮し、ollama-client.tsで単一メッセージに結合される
    const systemPrompt = `あなたは日本の会計処理に精通したOCRエキスパートです。領収書やレシートの画像を分析し、JSON形式で正確にデータを抽出してください。

# 出力形式
必ず以下のJSON形式で出力してください。余計な説明は不要です。

{
  "issuerName": "店舗名・発行者名",
  "issuerAddress": "住所（あれば）",
  "issuerPhone": "電話番号（あれば）",
  "registrationNumber": "インボイス登録番号T+13桁（あれば）",
  "issueDate": "YYYY-MM-DD",
  "subtotal": 税抜金額（数値）,
  "taxAmount": 消費税額（数値）,
  "taxRate": 税率（10または8）,
  "totalAmount": 合計金額（数値）,
  "accountCategory": "勘定科目",
  "confidence": 0.0-1.0の信頼度
}

# 金額処理ルール
- 円マーク（¥、￥）を除去
- 桁区切りカンマを除去
- 全角数字を半角に変換
- 「円」「税込」などの文字を除去
- 結果は必ず数値型（Integer）

# 日付処理ルール
- 和暦は西暦に変換（令和6年→2024年、令和7年→2025年）
- 区切りは全てハイフンに統一（YYYY-MM-DD）

# 勘定科目推定ルール

## 公的機関からの領収書（最優先判定）
発行元が以下の場合は「租税公課」に分類：
- 市区町村: 福岡市、北九州市、早良区、中央区、博多区、東区、西区、南区、城南区、小倉北区、小倉南区、八幡東区、八幡西区、戸畑区、若松区、門司区
- その他の市区町村名（〇〇市、〇〇区、〇〇町、〇〇村）
- 県庁、税務署、法務局、年金事務所等の公的機関
accountCategoryReasonに「公的機関（福岡市）」等と記載すること

## 一般ルール
| キーワード | 勘定科目 |
|-----------|---------|
| 文房具、事務用品、コピー | 消耗品費 |
| 電車、バス、タクシー、駐車場 | 旅費交通費 |
| 書籍、本、雑誌 | 新聞図書費 |
| 宅配、郵便、切手 | 通信費 |
| ガソリン、高速道路 | 車両費 |
| 社員向け飲食、弁当 | 福利厚生費 |
| その他 | 雑費 |

## 飲食レシートの判定ルール（会議費 vs 接待交際費）
飲食店（カフェ、レストラン、居酒屋等）のレシートは以下の優先順位で判定：

### 優先順位1: アルコール飲料の有無
- アルコール飲料（ビール、酒、ワイン、焼酎、ハイボール、サワー、カクテル等）の記載あり → 接待交際費
- アルコール飲料の記載なし → 会議費

### 優先順位2: 金額基準（優先順位1で判断できない場合）
- 合計金額が3,000円以上 → 接待交際費
- 合計金額が3,000円未満 → 会議費

### 判定理由の記載
accountCategoryReasonに判定根拠を記載すること：
例: 「ビール記載あり」「アルコールなし、合計2,500円」

# 信頼度スコア基準
- 0.9-1.0: 鮮明、全項目読み取り可能
- 0.7-0.9: 一部不鮮明だが主要項目は読み取り可能
- 0.5-0.7: 複数項目が不鮮明、推定が必要
- 0.0-0.5: 大部分が読み取り不可

# 禁止事項
- 画像に存在しない情報の捏造
- 不確実な情報の断定的記載
- JSON形式以外での出力
- 余計な説明やコメントの追加

読み取れない項目はnullを設定してください。`;

    // ユーザープロンプト
    // /no_think: Qwen3-VLのthinkingモード無効（安定性優先）
    const userPrompt = `/no_think この領収書を読み取ってJSONで出力してください。`;

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
   * SKILL出力フォーマット→ExtractedReceiptDataへのマッピングを行う
   */
  private parseJsonResponse(response: string): ExtractedReceiptData {
    try {
      let rawData: Record<string, unknown>;

      // コードブロック内のJSONを抽出
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        rawData = JSON.parse(jsonMatch[1].trim());
      } else {
        // コードブロックがない場合、直接JSONとしてパース
        const trimmed = response.trim();
        if (trimmed.startsWith('{')) {
          rawData = JSON.parse(trimmed);
        } else {
          // JSON部分を探す
          const jsonStart = response.indexOf('{');
          const jsonEnd = response.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            rawData = JSON.parse(response.substring(jsonStart, jsonEnd + 1));
          } else {
            throw new Error('No valid JSON found in response');
          }
        }
      }

      // SKILL出力フォーマット→ExtractedReceiptDataへのマッピング
      const result: ExtractedReceiptData = {
        issuerName: rawData.issuerName as string | undefined,
        issuerAddress: rawData.issuerAddress as string | undefined,
        issuerPhone: rawData.issuerPhone as string | undefined,
        // registrationNumber → issuerRegistrationNumber マッピング
        issuerRegistrationNumber: (rawData.registrationNumber || rawData.issuerRegistrationNumber) as string | undefined,
        issueDate: rawData.issueDate as string | undefined,
        subtotal: this.parseNumber(rawData.subtotal),
        taxAmount: this.parseNumber(rawData.taxAmount),
        totalAmount: this.parseNumber(rawData.totalAmount),
        taxRate: this.parseNumber(rawData.taxRate),
        accountCategory: rawData.accountCategory as string | undefined,
        // 信頼度スコア（SKILL出力）
        confidence: this.parseNumber(rawData.confidence),
      };

      return result;
    } catch (error) {
      logger.error('[ScanReceiptService] Failed to parse JSON response:', error);
      throw new Error(`Failed to parse OCR result: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 数値をパース（文字列・数値・nullに対応）
   */
  private parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[,¥￥円]/g, ''));
      return isNaN(num) ? undefined : num;
    }
    return undefined;
  }

  /**
   * 抽出データから領収書を作成
   */
  async createReceiptFromExtractedData(
    extractedData: ExtractedReceiptData,
    originalFileName: string,
    imageUploadResult?: { url: string; metadata: ConversionResult & { key: string } } | null
  ): Promise<Receipt> {
    // 領収書番号を生成（SCAN-timestamp-random形式）
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptNumber = `SCAN-${timestamp}-${random}`;

    // ========================================
    // 学習ルールの適用（最優先）
    // ========================================
    let learningRuleApplied = false;
    let appliedRuleName: string | undefined;
    try {
      const learningRuleService = getLearningRuleService();

      // 仮の領収書データを作成（ルールマッチング用）
      const tempReceipt: Partial<Receipt> = {
        issuerName: extractedData.issuerName,
        subject: extractedData.subject,
        title: extractedData.subject,
        items: extractedData.items?.map(item => ({
          itemName: item.itemName,
          description: item.itemName || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.amount || 0,
          amount: item.amount || 0,
        })) || [],
      };

      // マッチするルールを検索
      const matchResult = await learningRuleService.findMatchingRule(tempReceipt);

      if (matchResult.matched && matchResult.outputs) {
        logger.info(`[ScanReceiptService] Learning rule matched: "${matchResult.rule?.name}"`, {
          outputs: matchResult.outputs,
        });

        // ルールの出力を適用
        if (matchResult.outputs.subject) {
          extractedData.subject = matchResult.outputs.subject;
        }
        if (matchResult.outputs.accountCategory) {
          extractedData.accountCategory = matchResult.outputs.accountCategory;
        }
        if (matchResult.outputs.title) {
          // titleをitemsの最初のitemNameにも設定
          if (extractedData.items && extractedData.items.length > 0) {
            extractedData.items[0].itemName = matchResult.outputs.title;
          }
        }

        learningRuleApplied = true;
        appliedRuleName = matchResult.rule?.name;
      }
    } catch (error) {
      logger.warn('[ScanReceiptService] Learning rule matching failed, continuing without:', error);
    }

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
      // 画像アップロード情報を追加
      ...(imageUploadResult && {
        imageKey: imageUploadResult.metadata.key,
        imageSize: imageUploadResult.metadata.size,
        imageWidth: imageUploadResult.metadata.width,
        imageHeight: imageUploadResult.metadata.height,
        imageFormat: imageUploadResult.metadata.format,
      }),
      // 学習ルール適用情報
      ...(learningRuleApplied && {
        learningRuleApplied: true,
        appliedRuleName: appliedRuleName,
      }),
    };

    // 勘定科目の判定
    // 学習ルールが適用された場合は高い確信度を設定
    const finalAccountCategory = this.validateAccountCategory(extractedData.accountCategory);
    const categoryConfidence = learningRuleApplied ? 1.0 : (extractedData.accountCategory ? 0.8 : 0);

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

      // 勘定科目（ルールベース優先、次にAI推定）
      accountCategory: finalAccountCategory,
      accountCategoryConfidence: categoryConfidence,

      // スキャン取込フラグ
      scannedFromPdf: true,
      scanMetadata,

      // 画像URL（R2にアップロードされた場合）
      ...(imageUploadResult && {
        imageUrl: imageUploadResult.url,
        imageUploadedAt: new Date(),
      }),
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
   * ルールベースの勘定科目分類（AIの出力を上書き）
   * 発行者名から業種を判定し、適切な勘定科目に分類
   */
  private applyAccountCategoryRules(
    extractedData: ExtractedReceiptData
  ): AccountCategory | undefined {
    const issuerName = extractedData.issuerName || '';
    const subject = extractedData.subject || '';
    const notes = extractedData.notes || '';
    const totalAmount = extractedData.totalAmount || 0;

    // 明細の品名も検索対象に含める
    const itemNames = (extractedData.items || [])
      .map(item => item.itemName || '')
      .join(' ');

    // 検索対象テキスト（発行者名、件名、備考、明細品名）
    const searchText = `${issuerName} ${subject} ${notes} ${itemNames}`.toLowerCase();

    // ========================================
    // ルール1: 飲食店の判定
    // - お酒あり → 接待交際費
    // - お酒なし → 会議費
    // - 判断不能 → 3,000円未満: 会議費、3,000円以上: 接待交際費
    // ========================================
    const restaurantKeywords = [
      // 一般的な飲食店
      '飲食', 'レストラン', '食堂', 'カフェ', 'cafe', '喫茶',
      '居酒屋', 'バー', 'bar', 'スナック', 'パブ',
      // 料理ジャンル
      'ラーメン', '拉麺', 'らーめん', 'そば', '蕎麦', 'うどん',
      '焼肉', '焼き肉', 'やきにく', 'ステーキ', 'しゃぶしゃぶ',
      '寿司', 'すし', '鮨', '回転寿司',
      '鶏', '鳥', 'とり', 'チキン', '焼鳥', '焼き鳥', 'やきとり',
      'ピザ', 'パスタ', 'イタリアン', 'フレンチ', '中華', '韓国',
      'カレー', 'ハンバーグ', '定食', '弁当', '丼',
      // 店舗形態
      '料理', '厨房', 'キッチン', 'kitchen', 'ダイニング', 'dining',
      '食事', 'グルメ', 'フード', 'food',
      // 特定チェーン・業態
      'マクドナルド', 'スタバ', 'スターバックス', 'ドトール',
      'サイゼリヤ', 'ガスト', 'デニーズ', 'ジョイフル',
      'ココイチ', '吉野家', '松屋', 'すき家', 'なか卯',
      '串カツ', '天ぷら', 'てんぷら', '天麩羅',
      'ビストロ', 'トラットリア', 'オステリア',
    ];

    // お酒を示すキーワード
    const alcoholKeywords = [
      // ビール
      'ビール', 'beer', '生ビール', '瓶ビール', '缶ビール',
      'アサヒ', 'キリン', 'サッポロ', 'サントリー', 'エビス',
      // 日本酒・焼酎
      '日本酒', '焼酎', '泡盛', '清酒', '純米', '大吟醸', '吟醸',
      '芋焼酎', '麦焼酎', '米焼酎', '黒霧島', '白霧島',
      // ワイン
      'ワイン', 'wine', '赤ワイン', '白ワイン', 'スパークリング',
      'シャンパン', 'シャンペン', 'ロゼ',
      // ウイスキー・洋酒
      'ウイスキー', 'ウィスキー', 'whisky', 'whiskey',
      'ハイボール', 'ブランデー', 'ジン', 'ウォッカ', 'ラム', 'テキーラ',
      // カクテル・サワー
      'カクテル', 'サワー', '酎ハイ', 'チューハイ',
      'レモンサワー', 'グレープフルーツサワー', '梅サワー',
      'モヒート', 'ジントニック', 'カシス',
      // その他
      '酒', 'アルコール', '飲み放題', '乾杯', 'お通し',
      'ドリンク飲み放題', '宴会', 'コース',
    ];

    // ノンアルコールを示すキーワード（お酒なしの判定に使用）
    const nonAlcoholKeywords = [
      'ノンアルコール', 'ノンアル', 'ソフトドリンク',
      'コーヒー', '紅茶', 'ジュース', 'ウーロン茶', '緑茶',
      'コーラ', 'オレンジジュース', 'お茶',
    ];

    // 飲食店かどうかを判定
    let isRestaurant = false;
    for (const keyword of restaurantKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        isRestaurant = true;
        break;
      }
    }

    if (isRestaurant) {
      // お酒キーワードをチェック
      let hasAlcohol = false;
      let alcoholKeywordFound = '';
      for (const keyword of alcoholKeywords) {
        if (searchText.includes(keyword.toLowerCase())) {
          hasAlcohol = true;
          alcoholKeywordFound = keyword;
          break;
        }
      }

      // ノンアルコールのみかチェック（お酒キーワードがない場合）
      let hasOnlyNonAlcohol = false;
      if (!hasAlcohol) {
        for (const keyword of nonAlcoholKeywords) {
          if (searchText.includes(keyword.toLowerCase())) {
            hasOnlyNonAlcohol = true;
            break;
          }
        }
      }

      if (hasAlcohol) {
        // お酒あり → 接待交際費
        logger.info(`[ScanReceiptService] Rule applied: Restaurant with alcohol (keyword: "${alcoholKeywordFound}") → 接待交際費`);
        return '接待交際費';
      } else if (hasOnlyNonAlcohol) {
        // お酒なし（ノンアルコールのみ確認） → 会議費
        logger.info(`[ScanReceiptService] Rule applied: Restaurant without alcohol (non-alcohol drink detected) → 会議費`);
        return '会議費';
      } else {
        // 判断不能 → 金額で判定
        if (totalAmount < 3000) {
          logger.info(`[ScanReceiptService] Rule applied: Restaurant (unclear alcohol), amount ${totalAmount} < 3000 → 会議費`);
          return '会議費';
        } else {
          logger.info(`[ScanReceiptService] Rule applied: Restaurant (unclear alcohol), amount ${totalAmount} >= 3000 → 接待交際費`);
          return '接待交際費';
        }
      }
    }

    // ========================================
    // ルール2: 駐車場 → 旅費交通費
    // ========================================
    const parkingKeywords = [
      '駐車', 'パーキング', 'parking', 'コインパーキング',
      'タイムズ', 'リパーク', '三井のリパーク',
    ];

    for (const keyword of parkingKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        logger.info(`[ScanReceiptService] Rule applied: Parking detected (keyword: "${keyword}") → 旅費交通費`);
        return '旅費交通費';
      }
    }

    // ========================================
    // ルール3: コンビニ → 消耗品費（デフォルト）
    // ========================================
    const convenienceKeywords = [
      'コンビニ', 'セブン', 'セブンイレブン', 'ファミリーマート', 'ファミマ',
      'ローソン', 'ミニストップ', 'デイリーヤマザキ',
    ];

    for (const keyword of convenienceKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        logger.info(`[ScanReceiptService] Rule applied: Convenience store detected (keyword: "${keyword}") → 消耗品費`);
        return '消耗品費';
      }
    }

    // ========================================
    // ルール4: ガソリンスタンド → 車両費
    // ========================================
    const gasStationKeywords = [
      'ガソリン', 'ガソリンスタンド', 'gs', 'エネオス', 'eneos',
      '出光', 'コスモ', '昭和シェル', 'シェル', '給油',
    ];

    for (const keyword of gasStationKeywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        logger.info(`[ScanReceiptService] Rule applied: Gas station detected (keyword: "${keyword}") → 車両費`);
        return '車両費';
      }
    }

    // ルールに該当しない場合はundefined（AIの判定を尊重）
    return undefined;
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
   * 未処理のファイル数を取得（JPG/PNG/PDF対応）
   */
  async getPendingPdfCount(): Promise<number> {
    try {
      if (!fs.existsSync(this.scanDir)) {
        return 0;
      }

      const supportedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      const files = fs.readdirSync(this.scanDir);
      const receiptFiles = files.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return supportedExtensions.includes(ext) && !f.startsWith('.');
      });

      return receiptFiles.length;
    } catch (error) {
      logger.error('[ScanReceiptService] Error getting pending file count:', error);
      return 0;
    }
  }

  /**
   * 未処理のファイル一覧を取得（JPG/PNG/PDF対応）
   */
  async getPendingPdfFiles(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.scanDir)) {
        return [];
      }

      const supportedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
      const files = fs.readdirSync(this.scanDir);
      return files.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return supportedExtensions.includes(ext) && !f.startsWith('.');
      });
    } catch (error) {
      logger.error('[ScanReceiptService] Error getting pending files:', error);
      return [];
    }
  }
}
