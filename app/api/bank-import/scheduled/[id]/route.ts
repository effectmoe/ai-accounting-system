import { NextRequest, NextResponse } from 'next/server';
import { scheduledImportService } from '@/services/scheduled-import.service';
import { logger } from '@/lib/logger';

/**
 * GET /api/bank-import/scheduled/[id]
 * 定期インポート設定を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await scheduledImportService.getConfig(id);

    if (!config) {
      return NextResponse.json(
        { error: '設定が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    logger.error('Error in GET /api/bank-import/scheduled/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/bank-import/scheduled/[id]
 * 定期インポート設定を更新
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // 有効/無効の切り替えのみの場合
    if (body.toggle !== undefined) {
      await scheduledImportService.toggleConfig(id, body.toggle);
      return NextResponse.json({
        success: true,
        message: body.toggle ? '定期インポートを有効にしました' : '定期インポートを無効にしました',
      });
    }

    // 設定の更新
    await scheduledImportService.updateConfig(id, body);

    return NextResponse.json({
      success: true,
      message: '設定を更新しました',
    });
  } catch (error) {
    logger.error('Error in PATCH /api/bank-import/scheduled/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/bank-import/scheduled/[id]
 * 定期インポート設定を削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await scheduledImportService.deleteConfig(id);

    return NextResponse.json({
      success: true,
      message: '設定を削除しました',
    });
  } catch (error) {
    logger.error('Error in DELETE /api/bank-import/scheduled/[id]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '設定の削除に失敗しました' },
      { status: 500 }
    );
  }
}
