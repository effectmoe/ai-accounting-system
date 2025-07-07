import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-singleton';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 500 }
    );
  }

  try {
    const supabase = getSupabaseClient();
    const { id } = params;

    // OCR結果を削除
    const { error } = await supabase
      .from('ocr_results')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting OCR result:', error);
      return NextResponse.json(
        { error: 'OCR結果の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OCR結果を削除しました'
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}