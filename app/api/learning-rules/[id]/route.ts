import { NextRequest, NextResponse } from 'next/server';
import { getLearningRuleService } from '@/services/learning-rule.service';
import type { UpdateLearningRuleParams } from '@/types/learning-rule';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * 学習ルールを取得
 * GET /api/learning-rules/[id]
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = getLearningRuleService();
    const rule = await service.getById(id);

    if (!rule) {
      return NextResponse.json(
        { error: '学習ルールが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Error fetching learning rule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning rule' },
      { status: 500 }
    );
  }
}

/**
 * 学習ルールを更新
 * PUT /api/learning-rules/[id]
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json() as UpdateLearningRuleParams;

    const service = getLearningRuleService();
    const rule = await service.update(id, body);

    if (!rule) {
      return NextResponse.json(
        { error: '学習ルールが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Error updating learning rule:', error);
    return NextResponse.json(
      { error: 'Failed to update learning rule' },
      { status: 500 }
    );
  }
}

/**
 * 学習ルールを削除
 * DELETE /api/learning-rules/[id]
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const service = getLearningRuleService();
    const deleted = await service.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { error: '学習ルールが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting learning rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete learning rule' },
      { status: 500 }
    );
  }
}
