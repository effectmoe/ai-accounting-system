/**
 * 処理待ちPDF情報 API
 * GET: scan-receiptフォルダ内の未処理PDF情報を取得
 */

import { NextResponse } from 'next/server';
import { ScanReceiptService } from '@/services/scan-receipt.service';
import { logger } from '@/lib/logger';

const scanReceiptService = new ScanReceiptService();

/**
 * GET /api/scan-receipt/pending
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
        pendingCount: 0,
        pendingFiles: [],
      },
      { status: 500 }
    );
  }
}
