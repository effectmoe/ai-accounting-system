import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/mongodb-client';

import { logger } from '@/lib/logger';
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { learningId } = body;

    if (!learningId) {
      return NextResponse.json({
        success: false,
        error: 'Learning ID is required'
      }, { status: 400 });
    }

    // 学習データを削除
    const result = await db.delete('accountLearning', learningId);

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Learning data not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: '学習データを削除しました'
    });

  } catch (error) {
    logger.error('Learning deletion error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete learning data'
    }, { status: 500 });
  }
}

export const runtime = 'nodejs';