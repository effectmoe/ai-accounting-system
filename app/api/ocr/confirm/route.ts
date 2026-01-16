import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';
import { logger } from '@/lib/logger';
import {
  ConfirmAnswerRequest,
  ConfirmAnswerResponse,
  ConfirmationStatus,
} from '@/lib/confirmation-config';

export const dynamic = 'force-dynamic';

/**
 * GET: 確認待ちドキュメント一覧を取得
 *
 * クエリパラメータ:
 * - status: 'pending' | 'confirmed' | 'skipped' (デフォルト: 'pending')
 * - limit: 取得件数 (デフォルト: 50)
 * - skip: スキップ件数 (デフォルト: 0)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as ConfirmationStatus || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = parseInt(searchParams.get('skip') || '0');

    // 確認待ちフィルター
    const filter: any = {
      confirmationStatus: status,
      needsConfirmation: true,
    };

    // ドキュメントを取得
    const documents = await db.find('documents', filter, {
      limit,
      skip,
      sort: { createdAt: -1 },
    });

    // フォーマット変換
    const formattedDocuments = documents.map((doc) => ({
      id: doc._id.toString(),
      documentType: doc.documentType || 'receipt',
      vendorName: doc.vendorName || doc.partnerName || '不明',
      totalAmount: doc.totalAmount || 0,
      documentDate: doc.documentDate || doc.issueDate || doc.createdAt,
      createdAt: doc.createdAt,

      // 確認フロー関連
      needsConfirmation: doc.needsConfirmation,
      confirmationStatus: doc.confirmationStatus,
      confirmationQuestions: doc.confirmationQuestions || [],
      confirmationReasons: doc.confirmationReasons || [],
      pendingCategory: doc.pendingCategory,
      aiPredictedCategory: doc.category,
      confidence: doc.confidence,

      // ファイル情報
      fileName: doc.fileName,
      fileType: doc.fileType,
      gridfsFileId: doc.gridfsFileId?.toString() || doc.gridfs_file_id?.toString(),
    }));

    // 総数を取得
    const totalCount = await db.count('documents', filter);

    return NextResponse.json({
      success: true,
      documents: formattedDocuments,
      totalCount,
      currentPage: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    logger.error('Confirmation list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '確認待ちドキュメントの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 確認回答を処理し、勘定科目を確定
 *
 * リクエストボディ:
 * {
 *   documentId: string,
 *   answers: Array<{
 *     questionId: string,
 *     answer: string,
 *     resultCategory?: string
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body: ConfirmAnswerRequest = await request.json();
    const { documentId, answers } = body;

    // バリデーション
    if (!documentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'documentId is required',
        },
        { status: 400 }
      );
    }

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'answers array is required',
        },
        { status: 400 }
      );
    }

    // ObjectIdの検証
    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid document ID format',
        },
        { status: 400 }
      );
    }

    // ドキュメントを取得
    const document = await db.findById('documents', documentId);
    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // 確認待ち状態のチェック
    if (!document.needsConfirmation) {
      return NextResponse.json(
        {
          success: false,
          error: 'This document does not require confirmation',
        },
        { status: 400 }
      );
    }

    if (document.confirmationStatus === 'confirmed') {
      return NextResponse.json(
        {
          success: false,
          error: 'This document has already been confirmed',
        },
        { status: 400 }
      );
    }

    // 回答から勘定科目を決定
    let finalCategory = document.category;
    let reasoning = '確認なしで自動分類';

    for (const answer of answers) {
      // 選択肢にresultCategoryがあればそれを使用
      if (answer.resultCategory) {
        finalCategory = answer.resultCategory;
        reasoning = `ユーザー確認による分類: ${answer.questionId} → ${answer.answer}`;
        break;
      }

      // 税金関連の回答処理
      if (answer.questionId === 'tax_type') {
        const taxCategoryMap: Record<string, string> = {
          property_tax: '租税公課',
          vehicle_tax: '租税公課',
          business_tax: '租税公課',
          stamp_duty: '租税公課',
          certificate_fee: '租税公課',
          income_tax: '事業主貸',
          resident_tax: '事業主貸',
          health_insurance: '事業主貸',
          pension: '事業主貸',
        };

        if (taxCategoryMap[answer.answer]) {
          finalCategory = taxCategoryMap[answer.answer];
          reasoning = `税金タイプに基づく分類: ${answer.answer}`;
        }
      }

      // 事業用/私用の回答処理
      if (answer.questionId === 'business_use') {
        if (answer.answer === 'no') {
          finalCategory = '事業主貸';
          reasoning = 'ユーザー確認: 私用と回答';
        } else {
          reasoning = 'ユーザー確認: 事業用と回答';
        }
      }
    }

    // ドキュメントを更新
    const updateData = {
      category: finalCategory,
      confirmationStatus: 'confirmed' as ConfirmationStatus,
      confirmationAnswers: answers,
      confirmationCompletedAt: new Date(),
      confirmationReasoning: reasoning,
      updatedAt: new Date(),
    };

    await db.update('documents', documentId, updateData);

    logger.info('Confirmation completed:', {
      documentId,
      finalCategory,
      reasoning,
    });

    const response: ConfirmAnswerResponse = {
      success: true,
      category: finalCategory,
      message: `勘定科目を「${finalCategory}」に確定しました`,
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Confirmation processing error:', error);
    return NextResponse.json(
      {
        success: false,
        category: '',
        error: error instanceof Error ? error.message : '確認処理に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH: 確認をスキップ（既存の分類を承認）
 *
 * リクエストボディ:
 * {
 *   documentId: string,
 *   reason?: string
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, reason } = body;

    if (!documentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'documentId is required',
        },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(documentId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid document ID format',
        },
        { status: 400 }
      );
    }

    const document = await db.findById('documents', documentId);
    if (!document) {
      return NextResponse.json(
        {
          success: false,
          error: 'Document not found',
        },
        { status: 404 }
      );
    }

    // スキップとしてマーク
    const updateData = {
      confirmationStatus: 'skipped' as ConfirmationStatus,
      confirmationSkippedAt: new Date(),
      confirmationSkipReason: reason || 'ユーザーによるスキップ',
      updatedAt: new Date(),
    };

    await db.update('documents', documentId, updateData);

    logger.info('Confirmation skipped:', {
      documentId,
      category: document.category,
      reason,
    });

    return NextResponse.json({
      success: true,
      category: document.category,
      message: '確認をスキップしました。AIの推測を採用します。',
    });
  } catch (error) {
    logger.error('Confirmation skip error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'スキップ処理に失敗しました',
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
