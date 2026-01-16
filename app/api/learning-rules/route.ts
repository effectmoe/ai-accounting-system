import { NextRequest, NextResponse } from 'next/server';
import { getLearningRuleService } from '@/services/learning-rule.service';
import type { CreateLearningRuleParams } from '@/types/learning-rule';

/**
 * 学習ルール一覧を取得
 * GET /api/learning-rules
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const params = {
      enabled: searchParams.get('enabled') === 'true' ? true :
               searchParams.get('enabled') === 'false' ? false : undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      skip: searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : 0,
      sortBy: searchParams.get('sortBy') || 'priority',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
    };

    const service = getLearningRuleService();
    const result = await service.search(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching learning rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning rules' },
      { status: 500 }
    );
  }
}

/**
 * 学習ルールを作成
 * POST /api/learning-rules
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateLearningRuleParams;

    // バリデーション
    if (!body.name) {
      return NextResponse.json(
        { error: 'ルール名は必須です' },
        { status: 400 }
      );
    }

    if (!body.conditions || body.conditions.length === 0) {
      return NextResponse.json(
        { error: '少なくとも1つのマッチ条件が必要です' },
        { status: 400 }
      );
    }

    if (!body.outputs || Object.keys(body.outputs).length === 0) {
      return NextResponse.json(
        { error: '少なくとも1つの出力設定が必要です' },
        { status: 400 }
      );
    }

    if (!body.matchMode) {
      body.matchMode = 'all';
    }

    const service = getLearningRuleService();
    const rule = await service.create(body);

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Error creating learning rule:', error);
    return NextResponse.json(
      { error: 'Failed to create learning rule' },
      { status: 500 }
    );
  }
}
