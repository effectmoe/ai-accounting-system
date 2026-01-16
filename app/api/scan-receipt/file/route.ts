import { NextRequest, NextResponse } from 'next/server';
import { getFromR2, getReceiptImageUrl } from '@/lib/r2-client';
import { getDatabase, Collections } from '@/lib/mongodb-client';
import type { Receipt } from '@/types/receipt';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    // MongoDBから領収書を検索（originalFileNameで検索）
    const db = await getDatabase();
    const receipt = await db.collection(Collections.RECEIPTS).findOne<Receipt>({
      'scanMetadata.originalFileName': filename
    });

    // 領収書が見つからない場合
    if (!receipt) {
      return NextResponse.json({
        error: 'Receipt not found',
        message: '指定されたファイル名の領収書が見つかりません'
      }, { status: 404 });
    }

    // R2 URLがある場合はリダイレクト
    if (receipt.imageUrl) {
      return NextResponse.redirect(receipt.imageUrl);
    }

    // imageKeyがある場合はR2から取得
    if (receipt.scanMetadata?.imageKey) {
      try {
        const imageBuffer = await getFromR2(receipt.scanMetadata.imageKey);

        if (!imageBuffer) {
          return NextResponse.json({
            error: 'Image not found in R2',
            message: 'R2ストレージに画像が存在しません'
          }, { status: 404 });
        }

        const contentType = receipt.scanMetadata.imageFormat === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="${filename}"`,
            'Cache-Control': 'public, max-age=31536000', // 1年キャッシュ
          },
        });
      } catch (r2Error) {
        console.error('R2 fetch error:', r2Error);
        return NextResponse.json({
          error: 'Failed to fetch from R2',
          message: 'R2からの画像取得に失敗しました'
        }, { status: 500 });
      }
    }

    // R2アップロード前の古いデータ
    return NextResponse.json({
      error: 'Image not available',
      message: 'この領収書はR2アップロード機能実装前に作成されたため、元の画像データが保存されていません。',
      hint: '新しくスキャンした領収書は自動的に画像が保存されます。'
    }, { status: 404 });

  } catch (error) {
    console.error('Error serving scan file:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
