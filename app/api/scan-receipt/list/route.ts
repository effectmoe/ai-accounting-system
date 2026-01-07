/**
 * スキャン済み領収書一覧 API
 * GET: スキャン取込した領収書の一覧を取得
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScanReceiptService } from '@/services/scan-receipt.service';
import { logger } from '@/lib/logger';

const scanReceiptService = new ScanReceiptService();

/**
 * GET /api/scan-receipt/list
 * スキャン済み領収書一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = {
      limit: parseInt(searchParams.get('limit') || '20', 10),
      skip: parseInt(searchParams.get('skip') || '0', 10),
      sortBy: (searchParams.get('sortBy') as 'createdAt' | 'issueDate' | 'totalAmount') || 'createdAt',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    logger.debug('[API] Fetching scanned receipts...', params);

    const result = await scanReceiptService.getScannedReceipts(params);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    logger.error('[API] Error fetching scanned receipts:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'スキャン済み領収書の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
