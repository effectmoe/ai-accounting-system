/**
 * 直接スキャン処理 API
 * POST: ScanSnapから直接送られてきたBase64画像をOCR処理して領収書として登録
 *
 * このAPIはScanSnap Web SDKと連携し、ブラウザから直接スキャンした画像を
 * PDFを経由せずに処理します。
 */

import { NextRequest, NextResponse } from 'next/server';

// APIルートの設定（大きな画像データを受け入れるため）
export const runtime = 'nodejs';
export const maxDuration = 60; // 60秒タイムアウト

import { OllamaClient } from '@/lib/ollama-client';
import { db, Collections } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';
import { CompanyInfoService } from '@/services/company-info.service';
import { Receipt, ReceiptItem, ReceiptStatus, AccountCategory, ACCOUNT_CATEGORIES } from '@/types/receipt';
import { DirectScanRequest, DirectScanResult } from '@/types/scansnap';
import {
  ExtractedReceiptData,
  ScannedReceiptMetadata,
} from '@/types/scan-receipt';

const ollamaClient = new OllamaClient();
const companyInfoService = new CompanyInfoService();
const visionModel = process.env.OLLAMA_VISION_MODEL || 'qwen3-vl';

/**
 * POST /api/scan-receipt/direct-scan
 * Base64画像を直接処理して領収書を登録
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: DirectScanRequest = await request.json();

    if (!body.imageBase64) {
      return NextResponse.json(
        {
          success: false,
          error: '画像データが必要です',
          processingTime: Date.now() - startTime,
        } as DirectScanResult,
        { status: 400 }
      );
    }

    logger.info('[DirectScan API] Processing direct scan...');

    // Ollamaの利用可能性を確認
    const ollamaAvailable = await ollamaClient.checkAvailability();
    if (!ollamaAvailable) {
      return NextResponse.json(
        {
          success: false,
          error: 'OCRサービスが利用できません。Ollamaが起動しているか確認してください。',
          processingTime: Date.now() - startTime,
        } as DirectScanResult,
        { status: 503 }
      );
    }

    // Base64データをBufferに変換
    // data:image/jpeg;base64, のプレフィックスがある場合は除去
    const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    logger.info('[DirectScan API] Image buffer size:', imageBuffer.length);

    // Vision ModelでOCR処理
    const extractedData = await extractReceiptDataWithVision(imageBuffer);

    // 領収書を作成
    const receipt = await createReceiptFromExtractedData(
      extractedData,
      body.fileName || `scansnap_${Date.now()}.jpg`
    );

    const result: DirectScanResult = {
      success: true,
      receiptId: receipt._id?.toString(),
      receiptNumber: receipt.receiptNumber,
      extractedData: {
        issuerName: extractedData.issuerName,
        issueDate: extractedData.issueDate,
        totalAmount: extractedData.totalAmount,
        taxAmount: extractedData.taxAmount,
        accountCategory: extractedData.accountCategory,
      },
      processingTime: Date.now() - startTime,
    };

    logger.info('[DirectScan API] Scan processed successfully:', {
      receiptNumber: receipt.receiptNumber,
      totalAmount: receipt.totalAmount,
      processingTime: result.processingTime,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[DirectScan API] Error processing direct scan:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'スキャン処理に失敗しました',
        processingTime: Date.now() - startTime,
      } as DirectScanResult,
      { status: 500 }
    );
  }
}

/**
 * Vision Modelで画像からレシートデータを抽出（リトライ付き）
 */
async function extractReceiptDataWithVision(imageBuffer: Buffer, maxRetries: number = 3): Promise<ExtractedReceiptData> {
  // 注意: Qwen3-VLは長いプロンプトで空レスポンスを返すことがある
  // ミニマルなプロンプトを使用
  const systemPrompt = ''; // システムプロンプトは使用しない

  // ミニマルプロンプト（Qwen3-VLで安定動作確認済み）
  const userPrompt = `領収書のJSON：{"issuerName":"店舗名", "issuerAddress":"住所", "issuerPhone":"電話", "issueDate":"YYYY-MM-DD", "subtotal":税抜金額, "taxAmount":消費税, "totalAmount":合計, "accountCategory":"接待交際費/会議費/旅費交通費/車両費/消耗品費/通信費/福利厚生費/新聞図書費/雑費から選択"}`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`[DirectScan API] Vision model extraction attempt ${attempt}/${maxRetries}`);

      // Vision Modelを使用して画像を分析
      // temperature: 0.3 で安定性向上
      const response = await ollamaClient.extractJSONFromImage(
        imageBuffer,
        systemPrompt,
        userPrompt,
        visionModel,
        {
          temperature: 0.3,
          num_predict: 2000,
        }
      );

      logger.debug('[DirectScan API] Vision model response:', response?.substring(0, 500));

      // 空のレスポンスチェック
      if (!response || response.trim() === '') {
        logger.warn(`[DirectScan API] Empty response on attempt ${attempt}`);
        lastError = new Error('Empty response from Vision model');
        continue;
      }

      // JSONを抽出
      const extractedData = parseJsonResponse(response);

      // 基本的なバリデーション
      if (!extractedData.totalAmount && !extractedData.issuerName) {
        logger.warn(`[DirectScan API] Incomplete data on attempt ${attempt}`);
        lastError = new Error('Incomplete data extracted');
        continue;
      }

      logger.info(`[DirectScan API] Successfully extracted data on attempt ${attempt}`, {
        issuerName: extractedData.issuerName,
        totalAmount: extractedData.totalAmount,
        accountCategory: extractedData.accountCategory,
      });

      return extractedData;
    } catch (error) {
      logger.error(`[DirectScan API] Vision model extraction failed on attempt ${attempt}:`, error);
      lastError = error instanceof Error ? error : new Error('Unknown error');

      // 最後の試行でなければ少し待機
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  logger.error('[DirectScan API] All extraction attempts failed:', lastError);

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
function parseJsonResponse(response: string): ExtractedReceiptData {
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
    logger.error('[DirectScan API] Failed to parse JSON response:', error);
    throw new Error(`Failed to parse OCR result: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * 抽出データから領収書を作成
 */
async function createReceiptFromExtractedData(
  extractedData: ExtractedReceiptData,
  originalFileName: string
): Promise<Receipt> {
  // 領収書番号を生成（SCAN-timestamp-random形式）
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const receiptNumber = `SCAN-${timestamp}-${random}`;

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
    visionModelUsed: visionModel,
  };

  // 領収書データを作成
  const receiptData: Omit<Receipt, '_id' | 'createdAt' | 'updatedAt'> = {
    receiptNumber,
    // スキャン取込は請求書・顧客と紐付けない
    invoiceId: undefined,
    customerId: undefined,
    customerName: '（スキャン取込）',

    // 発行者情報（OCRで取得）
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
    accountCategory: validateAccountCategory(extractedData.accountCategory),
    accountCategoryConfidence: extractedData.accountCategory ? 0.8 : 0, // AI推定の場合は0.8

    // スキャン取込フラグ
    scannedFromPdf: true,
    scanMetadata,
  };

  // 領収書を保存
  const receipt = await db.create<Receipt>(Collections.RECEIPTS, receiptData);

  logger.info(`[DirectScan API] Created receipt: ${receiptNumber}`, {
    totalAmount: receipt.totalAmount,
    issuerName: receipt.issuerName,
    accountCategory: receipt.accountCategory,
  });

  return receipt;
}

/**
 * 勘定科目をバリデート（AIの出力が有効な勘定科目かチェック）
 */
function validateAccountCategory(category: string | undefined): AccountCategory {
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

  logger.warn(`[DirectScan API] Invalid account category from AI: "${category}", using 未分類`);
  return '未分類';
}
