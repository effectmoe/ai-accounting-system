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
export const maxDuration = 120; // 120秒タイムアウト（Queue使用時の待機を考慮）

import { OllamaClient } from '@/lib/ollama-client';
import { getOCRQueueClient, OCRResult } from '@/lib/ocr-queue-client';
import { db, Collections } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';
import { CompanyInfoService } from '@/services/company-info.service';
import { Receipt, ReceiptItem, ReceiptStatus, AccountCategory, ACCOUNT_CATEGORIES } from '@/types/receipt';
import { DirectScanRequest, DirectScanResult } from '@/types/scansnap';
import {
  ExtractedReceiptData,
  ScannedReceiptMetadata,
} from '@/types/scan-receipt';
import { convertToWebp } from '@/lib/image-converter';
import { uploadToR2, generateReceiptImageKey } from '@/lib/r2-client';

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

    // OCRサービスの利用可能性を確認
    // Queue有効時: Queueのヘルスチェック
    // Queue無効時: ローカルOllamaのチェック
    const queueClient = getOCRQueueClient();
    const queueConfig = queueClient.getConfig();

    if (queueConfig.enabled) {
      // キュー経由の場合はキューのヘルスチェック
      const queueHealth = await queueClient.checkHealth();
      if (!queueHealth || queueHealth.ollama !== 'healthy') {
        logger.warn('[DirectScan API] OCR Queue unhealthy, will attempt with fallback');
        // フォールバックがあるので続行（ローカルOllamaも試す）
      }
    } else {
      // 直接Ollama呼び出しの場合はローカルOllamaのチェック
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
    }

    // デバッグ: 受け取ったBase64データの形式を確認
    logger.info('[DirectScan API] Received imageBase64 length:', body.imageBase64.length);
    logger.info('[DirectScan API] ImageBase64 prefix:', body.imageBase64.substring(0, 100));

    // Base64データをBufferに変換
    // data:image/jpeg;base64, のプレフィックスがある場合は除去
    const base64Data = body.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    logger.info('[DirectScan API] Image buffer size:', imageBuffer.length);

    // デバッグ: Bufferの最初のバイトを確認（JPEGは0xFF 0xD8、PNGは0x89 0x50）
    if (imageBuffer.length > 4) {
      const header = imageBuffer.slice(0, 4);
      logger.info('[DirectScan API] Image header bytes:', header.toString('hex'));
      if (header[0] === 0xFF && header[1] === 0xD8) {
        logger.info('[DirectScan API] Valid JPEG detected');
      } else if (header[0] === 0x89 && header[1] === 0x50) {
        logger.info('[DirectScan API] Valid PNG detected');
      } else {
        logger.warn('[DirectScan API] Unknown image format, header:', header.toString('hex'));
      }
    }

    // 画像サイズ検証（qwen3-vlは32px未満の画像でクラッシュする）
    // 注意: この簡易チェックはファイルサイズのみ。実際の画像サイズ検証にはsharpが必要
    // ScanSnapからの画像は通常数百KB〜数MBなので、10KB未満は異常と判断
    const MIN_IMAGE_BYTES = 10 * 1024; // 10KB
    if (imageBuffer.length < MIN_IMAGE_BYTES) {
      logger.warn('[DirectScan API] Image too small, may cause qwen3-vl to crash:', {
        size: imageBuffer.length,
        minRequired: MIN_IMAGE_BYTES
      });
      return NextResponse.json(
        {
          success: false,
          error: `画像サイズが小さすぎます（${Math.round(imageBuffer.length / 1024)}KB）。スキャンを再実行してください。`,
          processingTime: Date.now() - startTime,
        } as DirectScanResult,
        { status: 400 }
      );
    }

    // OCR処理（Queue経由またはDirect Ollama）
    const extractedData = await performOCRExtraction(imageBuffer, body.fileName);

    // 領収書を作成（imageBufferを渡してR2にアップロード）
    const receipt = await createReceiptFromExtractedData(
      extractedData,
      body.fileName || `scansnap_${Date.now()}.jpg`,
      imageBuffer
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
 * OCR抽出を実行（Queue経由またはDirect Ollama）
 *
 * 優先順位:
 * 1. OCR Queue（Durable Objects）が有効な場合はキュー経由で処理
 * 2. キューが無効または失敗した場合は直接Ollamaを呼び出し
 */
async function performOCRExtraction(imageBuffer: Buffer, fileName?: string): Promise<ExtractedReceiptData> {
  const queueClient = getOCRQueueClient();
  const queueConfig = queueClient.getConfig();

  logger.info('[DirectScan API] OCR extraction starting...', {
    queueEnabled: queueConfig.enabled,
    queueURL: queueConfig.baseURL || '(not configured)',
  });

  // OCR Queueが有効な場合はキュー経由で処理
  if (queueConfig.enabled) {
    try {
      logger.info('[DirectScan API] Using OCR Queue (Durable Objects)...');

      // Base64エンコード
      const base64Image = imageBuffer.toString('base64');

      // キューに送信して結果を待機
      const queueResult = await queueClient.processImage(base64Image, fileName);

      logger.info('[DirectScan API] OCR Queue result received:', {
        issuerName: queueResult.issuerName,
        totalAmount: queueResult.totalAmount,
        accountCategory: queueResult.accountCategory,
      });

      // OCRResult -> ExtractedReceiptData に変換
      return convertQueueResultToExtractedData(queueResult);
    } catch (error) {
      logger.warn('[DirectScan API] OCR Queue failed, falling back to direct Ollama:', error);
      // フォールバック: 直接Ollamaを呼び出し
    }
  }

  // 直接Ollamaを呼び出し（フォールバックまたはキュー無効時）
  logger.info('[DirectScan API] Using direct Ollama call...');
  return extractReceiptDataWithVision(imageBuffer);
}

/**
 * OCR Queue結果をExtractedReceiptDataに変換
 */
function convertQueueResultToExtractedData(queueResult: OCRResult): ExtractedReceiptData {
  return {
    issuerName: queueResult.issuerName,
    issuerAddress: queueResult.issuerAddress,
    issuerPhone: queueResult.issuerPhone,
    issueDate: queueResult.issueDate,
    subtotal: queueResult.subtotal,
    taxAmount: queueResult.taxAmount,
    totalAmount: queueResult.totalAmount,
    accountCategory: queueResult.accountCategory,
    // confidence は ExtractedReceiptData では使用しないが、ログ用に保持
  };
}

/**
 * Vision Modelで画像からレシートデータを抽出（リトライ付き）
 * ※ OCR Queueが無効または失敗した場合のフォールバック
 */
async function extractReceiptDataWithVision(imageBuffer: Buffer, maxRetries: number = 3): Promise<ExtractedReceiptData> {
  // 注意: Qwen3-VLは長いプロンプトで空レスポンスを返すことがある
  // ミニマルなプロンプトを使用
  const systemPrompt = ''; // システムプロンプトは使用しない

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
  originalFileName: string,
  imageBuffer: Buffer
): Promise<Receipt> {
  // 領収書番号を生成（SCAN-timestamp-random形式）
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const receiptNumber = `SCAN-${timestamp}-${random}`;

  // 画像をWEBPに変換してR2にアップロード
  let imageUrl: string | undefined;
  try {
    logger.info('[DirectScan API] Converting image to WEBP...');
    const webpResult = await convertToWebp(imageBuffer, {
      quality: 85,
      maxWidth: 1920,
      maxHeight: 2560,
    });
    logger.info('[DirectScan API] WEBP conversion complete:', {
      originalSize: imageBuffer.length,
      webpSize: webpResult.size,
      width: webpResult.width,
      height: webpResult.height,
    });

    // R2にアップロード
    const r2Key = generateReceiptImageKey(receiptNumber);
    logger.info('[DirectScan API] Uploading to R2:', { key: r2Key });
    const uploadResult = await uploadToR2(webpResult.buffer, r2Key, {
      contentType: 'image/webp',
      metadata: {
        originalFileName,
        receiptNumber,
      },
    });
    imageUrl = uploadResult.url;
    logger.info('[DirectScan API] R2 upload complete:', {
      url: imageUrl,
      size: uploadResult.size,
    });
  } catch (error) {
    logger.error('[DirectScan API] Failed to upload image to R2:', error);
    // R2アップロード失敗時も領収書は作成する（imageUrlなし）
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
    visionModelUsed: visionModel,
  };

  // 勘定科目の判定（ルールベース優先、次にAI推定）
  const ruleBasedCategory = applyAccountCategoryRules(extractedData);
  const finalAccountCategory = ruleBasedCategory || validateAccountCategory(extractedData.accountCategory);
  const categoryConfidence = ruleBasedCategory ? 1.0 : (extractedData.accountCategory ? 0.8 : 0);

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

    // 勘定科目（ルールベース優先、次にAI推定）
    accountCategory: finalAccountCategory,
    accountCategoryConfidence: categoryConfidence,

    // スキャン取込フラグ
    scannedFromPdf: true,
    scanMetadata,

    // R2にアップロードした画像URL
    imageUrl,
  };

  // 領収書を保存
  const receipt = await db.create<Receipt>(Collections.RECEIPTS, receiptData);

  logger.info(`[DirectScan API] Created receipt: ${receiptNumber}`, {
    totalAmount: receipt.totalAmount,
    issuerName: receipt.issuerName,
    accountCategory: receipt.accountCategory,
    imageUrl: imageUrl || 'N/A',
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

/**
 * ルールベースの勘定科目分類（AIの出力を上書き）
 * 発行者名から業種を判定し、適切な勘定科目に分類
 */
function applyAccountCategoryRules(
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
  // ルール0: 公的機関からの領収書 → 租税公課（最優先）
  // ========================================
  const publicInstitutionKeywords = [
    // 福岡市・北九州市の区
    '福岡市', '北九州市',
    '早良区', '中央区', '博多区', '東区', '西区', '南区', '城南区',
    '小倉北区', '小倉南区', '八幡東区', '八幡西区', '戸畑区', '若松区', '門司区',
    // 一般的な市区町村パターン
    '市役所', '区役所', '町役場', '村役場',
    // 公的機関
    '県庁', '税務署', '法務局', '年金事務所', '労働基準監督署',
    '福祉事務所', '保健所', '消防署', '警察署',
    // その他公的機関
    '国税局', '都道府県', '市区町村',
  ];

  for (const keyword of publicInstitutionKeywords) {
    if (issuerName.includes(keyword)) {
      logger.info(`[DirectScan API] Rule applied: Public institution detected (keyword: "${keyword}") → 租税公課`);
      return '租税公課';
    }
  }

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
      logger.info(`[DirectScan API] Rule applied: Restaurant with alcohol (keyword: "${alcoholKeywordFound}") → 接待交際費`);
      return '接待交際費';
    } else if (hasOnlyNonAlcohol) {
      // お酒なし（ノンアルコールのみ確認） → 会議費
      logger.info(`[DirectScan API] Rule applied: Restaurant without alcohol (non-alcohol drink detected) → 会議費`);
      return '会議費';
    } else {
      // 判断不能 → 金額で判定
      if (totalAmount < 3000) {
        logger.info(`[DirectScan API] Rule applied: Restaurant (unclear alcohol), amount ${totalAmount} < 3000 → 会議費`);
        return '会議費';
      } else {
        logger.info(`[DirectScan API] Rule applied: Restaurant (unclear alcohol), amount ${totalAmount} >= 3000 → 接待交際費`);
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
      logger.info(`[DirectScan API] Rule applied: Parking detected (keyword: "${keyword}") → 旅費交通費`);
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
      logger.info(`[DirectScan API] Rule applied: Convenience store detected (keyword: "${keyword}") → 消耗品費`);
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
      logger.info(`[DirectScan API] Rule applied: Gas station detected (keyword: "${keyword}") → 車両費`);
      return '車両費';
    }
  }

  // ルールに該当しない場合はundefined（AIの判定を尊重）
  return undefined;
}
