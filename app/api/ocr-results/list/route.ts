import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-singleton';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || '11111111-1111-1111-1111-111111111111';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const supabase = getSupabaseClient();

    // OCR結果を取得
    const { data: ocrResults, error, count } = await supabase
      .from('ocr_results')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('OCR results fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch OCR results', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ocrResults || [],
      total: count || 0,
      page,
      limit
    });
  } catch (error) {
    console.error('OCR results API error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}