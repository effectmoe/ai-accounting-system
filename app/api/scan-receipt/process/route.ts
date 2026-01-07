/**
 * スキャン領収書処理 API
 * POST: scan-receiptフォルダ内のPDFをOCR処理して領収書として登録
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScanReceiptService } from '@/services/scan-receipt.service';
import { logger } from '@/lib/logger';
import { ScanReceiptProcessRequest } from '@/types/scan-receipt';

const scanReceiptService = new ScanReceiptService();

/**
 * POST /api/scan-receipt/process
 * スキャンフォルダ内のPDFを処理
 */
export async function POST(request: NextRequest) {
  try {
    let params: ScanReceiptProcessRequest = {};

    // リクエストボディを取得（オプション）
    try {
      const body = await request.json();
      params = {
        forceReprocess: body.forceReprocess || false,
        targetFiles: body.targetFiles || undefined,
      };
    } catch {
      // ボディがない場合はデフォルト値を使用
    }

    logger.info('[API] Processing scan receipts...', params);

    // スキャン処理を実行
    const result = await scanReceiptService.processScanReceiptFolder(params);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('[API] Error processing scan receipts:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'スキャン処理に失敗しました',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/scan-receipt/process
 * 処理待ちのPDFファイル情報を取得
 */
export async function GET() {
  try {
    const pendingCount = await scanReceiptService.getPendingPdfCount();
    const pendingFiles = await scanReceiptService.getPendingPdfFiles();

    return NextResponse.json({
      success: true,
      pendingCount,
      pendingFiles,
    });
  } catch (error) {
    logger.error('[API] Error getting pending PDFs:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '処理待ちPDFの取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
