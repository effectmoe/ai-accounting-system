import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-singleton';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Supabase is not configured' },
      { status: 500 }
    );
  }

  try {
    const supabase = getSupabaseClient();
    const { filename } = params;

    // Supabase Storageから画像を取得
    const { data, error } = await supabase.storage
      .from('ocr-images')
      .download(filename);

    if (error) {
      console.error('Error downloading image:', error);
      // ファイルが見つからない場合はプレースホルダー画像を返す
      return new NextResponse(null, { status: 404 });
    }

    // 画像のコンテンツタイプを設定
    const contentType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}