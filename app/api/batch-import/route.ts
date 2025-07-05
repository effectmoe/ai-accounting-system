import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // バッチインポートジョブを作成（簡易実装）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .insert({
        company_id: companyId,
        total_jobs: importJobs.length,
        completed_jobs: 0,
        failed_jobs: 0,
        status: 'in_progress',
      })
      .select()
      .single();

    if (batchError) throw batchError;

    return NextResponse.json({
      success: true,
      batchId: batch.id,
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

    // Supabaseから直接バッチ情報を取得
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: batch, error: batchError } = await supabase
      .from('import_batches')
      .select('*')
      .eq('id', batchId)
      .eq('company_id', companyId)
      .single();

    if (batchError) {
      return NextResponse.json(
        { error: 'バッチが見つかりません' },
        { status: 404 }
      );
    }

    const { data: jobs, error: jobsError } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('batch_id', batchId)
      .order('created_at', { ascending: true });

    if (jobsError) {
      throw jobsError;
    }

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