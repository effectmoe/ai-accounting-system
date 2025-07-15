import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';
import { ObjectId } from 'mongodb';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { learningId, accountCategory, patterns } = body;

    if (!learningId || !accountCategory) {
      return NextResponse.json({
        success: false,
        error: 'Learning ID and account category are required'
      }, { status: 400 });
    }

    // 更新データを準備
    const updateData: any = {
      accountCategory,
      updatedAt: new Date()
    };

    // パターンが提供された場合は更新
    if (patterns && Array.isArray(patterns)) {
      updateData.patterns = patterns;
    }

    // 学習データを更新
    const result = await db.update('accountLearning', learningId, updateData);

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Learning data not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '学習データを更新しました',
      learning: result
    });

  } catch (error) {
    console.error('Learning update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update learning data'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';