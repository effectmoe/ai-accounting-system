/**
 * 確認フロー回答処理 API
 * POST: ユーザーの確認回答を受け取り、確定した勘定科目で領収書を作成
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

import { db, Collections } from '@/lib/mongodb-client';
import { logger } from '@/lib/logger';
import { Receipt, ReceiptItem, ReceiptStatus, AccountCategory, ACCOUNT_CATEGORIES } from '@/types/receipt';
import { DirectScanResult, ScanConfirmationQuestion } from '@/types/scansnap';
import { ScannedReceiptMetadata } from '@/types/scan-receipt';
import { convertToWebp } from '@/lib/image-converter';
import { uploadToR2, generateReceiptImageKey } from '@/lib/r2-client';

// 確認回答リクエスト
interface ConfirmationAnswerRequest {
  // 確認待ちの抽出データ
  extractedData: {
    issuerName?: string;
    issuerAddress?: string;
    issuerPhone?: string;
    issueDate?: string;
    totalAmount?: number;
    taxAmount?: number;
    accountCategory?: string;
    subject?: string;
    items?: { itemName?: string; amount?: number }[];
  };
  // 確認待ちの画像データ
  pendingReceiptData: {
    imageBase64: string;
    fileName: string;
  };
  // ユーザーの回答
  answers: {
    questionId: string;
    value: string;
    resultCategory?: string;
  }[];
  // 確定した勘定科目（回答に基づく）
  confirmedCategory?: AccountCategory;
}

/**
 * POST /api/scan-receipt/confirm
 * 確認回答を受け取り、領収書を作成
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: ConfirmationAnswerRequest = await request.json();

    if (!body.extractedData || !body.pendingReceiptData) {
      return NextResponse.json(
        {
          success: false,
          error: '確認データが不足しています',
          processingTime: Date.now() - startTime,
        },
        { status: 400 }
      );
    }

    logger.info('[ConfirmAPI] Processing confirmation answers...', {
      answersCount: body.answers?.length,
      confirmedCategory: body.confirmedCategory,
    });

    // 確定した勘定科目を決定
    // 1. リクエストで明示的に指定されている場合はそれを使用
    // 2. 回答に resultCategory が含まれている場合はそれを使用
    // 3. それ以外は抽出データの勘定科目を使用
    let finalCategory: AccountCategory = body.confirmedCategory || '未分類';

    if (!body.confirmedCategory && body.answers?.length > 0) {
      // 回答から勘定科目を決定（最後の回答を優先）
      for (const answer of body.answers) {
        if (answer.resultCategory) {
          // 有効な勘定科目かチェック
          const validCategories = ACCOUNT_CATEGORIES.map(c => c.code);
          if (validCategories.includes(answer.resultCategory as AccountCategory)) {
            finalCategory = answer.resultCategory as AccountCategory;
          }
        }
      }
    }

    if (finalCategory === '未分類' && body.extractedData.accountCategory) {
      // 有効な勘定科目かチェックしてから使用
      const validCategories = ACCOUNT_CATEGORIES.map(c => c.code);
      if (validCategories.includes(body.extractedData.accountCategory as AccountCategory)) {
        finalCategory = body.extractedData.accountCategory as AccountCategory;
      }
    }

    logger.info('[ConfirmAPI] Final category determined:', finalCategory);

    // 画像処理とR2アップロード
    const base64Data = body.pendingReceiptData.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // 領収書番号を生成
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptNumber = `SCAN-${timestamp}-${random}`;

    // 画像をWEBPに変換してR2にアップロード
    let imageUrl: string | undefined;
    try {
      logger.info('[ConfirmAPI] Converting image to WEBP...');
      const webpResult = await convertToWebp(imageBuffer, {
        quality: 85,
        maxWidth: 1920,
        maxHeight: 2560,
      });

      const r2Key = generateReceiptImageKey(receiptNumber);
      const uploadResult = await uploadToR2(webpResult.buffer, r2Key, {
        contentType: 'image/webp',
        metadata: {
          originalFileName: body.pendingReceiptData.fileName,
          receiptNumber,
        },
      });
      imageUrl = uploadResult.url;
      logger.info('[ConfirmAPI] R2 upload complete:', { url: imageUrl });
    } catch (error) {
      logger.error('[ConfirmAPI] Failed to upload image to R2:', error);
    }

    // 明細を変換
    const items: ReceiptItem[] = (body.extractedData.items || []).map(item => ({
      itemName: item.itemName || '',
      description: item.itemName || '明細',
      quantity: 1,
      unit: '式',
      unitPrice: item.amount || 0,
      amount: item.amount || 0,
    }));

    // 明細がない場合、合計金額から1つの明細を作成
    if (items.length === 0 && body.extractedData.totalAmount) {
      items.push({
        description: body.extractedData.subject || '購入代金',
        quantity: 1,
        unit: '式',
        unitPrice: body.extractedData.totalAmount,
        amount: body.extractedData.totalAmount,
      });
    }

    // スキャンメタデータ
    const scanMetadata: ScannedReceiptMetadata = {
      originalFileName: body.pendingReceiptData.fileName,
      processedAt: new Date(),
      visionModelUsed: 'confirmed-by-user',
    };

    // 領収書データを作成
    const receiptData: Omit<Receipt, '_id' | 'createdAt' | 'updatedAt'> = {
      receiptNumber,
      invoiceId: undefined,
      customerId: undefined,
      customerName: '（スキャン取込）',

      issuerName: body.extractedData.issuerName || '（発行者不明）',
      issuerAddress: body.extractedData.issuerAddress,
      issuerPhone: body.extractedData.issuerPhone,

      subtotal: body.extractedData.totalAmount || 0,
      taxAmount: body.extractedData.taxAmount || 0,
      totalAmount: body.extractedData.totalAmount || 0,
      taxRate: 0.1,

      items,

      issueDate: body.extractedData.issueDate
        ? new Date(body.extractedData.issueDate)
        : new Date(),

      subject: body.extractedData.subject || '品代として',
      status: 'issued' as ReceiptStatus,

      // 確認フローで確定した勘定科目
      accountCategory: finalCategory,
      accountCategoryConfidence: 1.0, // ユーザー確認済みは100%

      scannedFromPdf: true,
      scanMetadata,
      imageUrl,
    };

    // 領収書を保存
    const receipt = await db.create<Receipt>(Collections.RECEIPTS, receiptData);

    logger.info(`[ConfirmAPI] Created receipt with confirmed category: ${receiptNumber}`, {
      totalAmount: receipt.totalAmount,
      issuerName: receipt.issuerName,
      accountCategory: receipt.accountCategory,
    });

    const result: DirectScanResult = {
      success: true,
      receiptId: receipt._id?.toString(),
      receiptNumber: receipt.receiptNumber,
      extractedData: {
        issuerName: body.extractedData.issuerName,
        issueDate: body.extractedData.issueDate,
        totalAmount: body.extractedData.totalAmount,
        taxAmount: body.extractedData.taxAmount,
        accountCategory: finalCategory,
      },
      processingTime: Date.now() - startTime,
    };

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[ConfirmAPI] Error processing confirmation:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '確認処理に失敗しました',
        processingTime: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
