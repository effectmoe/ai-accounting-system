import { NextRequest, NextResponse } from 'next/server';
import { scheduledImportService } from '@/services/scheduled-import.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/bank-import/scheduled
 * 定期インポート設定一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const isEnabled = searchParams.get('isEnabled');

    const result = await scheduledImportService.getConfigs({
      limit,
      offset,
      isEnabled: isEnabled !== null ? isEnabled === 'true' : undefined,
    });

    return NextResponse.json({
      success: true,
      items: result.items,
      total: result.total,
    });
  } catch (error) {
    logger.error('Error in GET /api/bank-import/scheduled:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '設定一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/bank-import/scheduled
 * 定期インポート設定を作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const id = await scheduledImportService.createConfig({
      name: body.name,
      isEnabled: body.isEnabled ?? true,
      bankType: body.bankType,
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      accountAlias: body.accountAlias,
      schedule: {
        frequency: body.schedule?.frequency || 'daily',
        time: body.schedule?.time || '09:00',
        dayOfWeek: body.schedule?.dayOfWeek,
        dayOfMonth: body.schedule?.dayOfMonth,
        timezone: body.schedule?.timezone || 'Asia/Tokyo',
      },
      importOptions: {
        autoMatch: body.importOptions?.autoMatch ?? true,
        autoConfirm: body.importOptions?.autoConfirm ?? false,
        onlyHighConfidence: body.importOptions?.onlyHighConfidence ?? true,
        skipDuplicates: body.importOptions?.skipDuplicates ?? true,
      },
      notifications: {
        onSuccess: body.notifications?.onSuccess ?? false,
        onError: body.notifications?.onError ?? true,
        emailAddresses: body.notifications?.emailAddresses || [],
      },
    });

    return NextResponse.json({
      success: true,
      id,
      message: '定期インポート設定を作成しました',
    });
  } catch (error) {
    logger.error('Error in POST /api/bank-import/scheduled:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '設定の作成に失敗しました' },
      { status: 500 }
    );
  }
}
