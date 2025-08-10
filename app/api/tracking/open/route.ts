import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trackingId = searchParams.get('id');
    const docType = searchParams.get('doc');
    const quoteId = searchParams.get('qid');

    // トラッキングデータをログ出力（実際の実装では、データベースに保存など）
    logger.info('Email tracking pixel accessed', {
      trackingId,
      docType,
      quoteId,
      timestamp: new Date().toISOString(),
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
    });

    // 1x1ピクセルの透明なGIF画像を返す
    const pixelBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(pixelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Length': pixelBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Error in tracking pixel endpoint:', error);
    
    // エラーが発生しても、最低限1x1ピクセルの画像は返す
    const pixelBuffer = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    return new NextResponse(pixelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  }
}