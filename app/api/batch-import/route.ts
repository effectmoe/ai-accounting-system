import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService, Collections } from '@/lib/mongodb-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, importJobs, notificationEmail } = body;

    if (!companyId || !importJobs || !Array.isArray(importJobs)) {
      return NextResponse.json(
        { error: '必須パラメータが不足しています' },
        { status: 400 }
      );
    }

    // バッチインポートジョブを作成（MongoDB実装）
    const db = DatabaseService.getInstance();

    const batch = await db.create(Collections.IMPORT_BATCHES, {
      companyId: companyId,
      totalJobs: importJobs.length,
      completedJobs: 0,
      failedJobs: 0,
      status: 'in_progress',
    });

    return NextResponse.json({
      success: true,
      batchId: batch._id,
      message: 'バッチインポートを開始しました',
    });
  } catch (error) {
    console.error('Batch import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'バッチインポートの開始に失敗しました' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const companyId = searchParams.get('companyId');

    if (!batchId || !companyId) {
      return NextResponse.json(
        { error: 'batchIdとcompanyIdが必要です' },
        { status: 400 }
      );
    }

    // MongoDBからバッチ情報を取得
    const db = DatabaseService.getInstance();

    const batch = await db.findById(Collections.IMPORT_BATCHES, batchId);
    
    if (!batch || batch.companyId !== companyId) {
      return NextResponse.json(
        { error: 'バッチが見つかりません' },
        { status: 404 }
      );
    }

    const jobs = await db.findMany(Collections.IMPORT_BATCHES, {
      batchId: batchId
    }).sort({ createdAt: 1 }).toArray();

    return NextResponse.json({
      batch,
      jobs: jobs || [],
    });
  } catch (error) {
    console.error('Get batch import status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'バッチ情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}