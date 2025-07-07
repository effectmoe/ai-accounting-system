import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-singleton';

export async function DELETE() {
  try {
    const supabase = getSupabaseClient();
    
    // 不完全なデータを削除（undefinedやNaNを含むデータ）
    const { data: invalidDocs, error: fetchError } = await supabase
      .from('documents')
      .select('id, document_number, partner_name, total_amount')
      .or('document_number.like.%undefined%,partner_name.is.null,total_amount.is.null');

    if (fetchError) throw fetchError;

    if (invalidDocs && invalidDocs.length > 0) {
      // 関連する明細を削除
      const docIds = invalidDocs.map(doc => doc.id);
      
      const { error: itemsError } = await supabase
        .from('document_items')
        .delete()
        .in('document_id', docIds);

      if (itemsError) throw itemsError;

      // 文書本体を削除
      const { error: docsError } = await supabase
        .from('documents')
        .delete()
        .in('id', docIds);

      if (docsError) throw docsError;

      return NextResponse.json({
        message: `${invalidDocs.length}件の不完全なデータを削除しました`,
        deleted: invalidDocs
      });
    }

    return NextResponse.json({
      message: '削除対象のデータがありません'
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'クリーンアップに失敗しました' },
      { status: 500 }
    );
  }
}