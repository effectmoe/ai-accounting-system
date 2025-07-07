import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-singleton';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    
    // sentを新しいconfirmedステータスに更新
    const { data, error } = await supabase
      .from('documents')
      .update({ status: 'confirmed' })
      .eq('status', 'sent')
      .select();

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'ステータス更新に失敗しました', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: data?.length || 0,
      message: `${data?.length || 0} 件の文書のステータスを更新しました`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}