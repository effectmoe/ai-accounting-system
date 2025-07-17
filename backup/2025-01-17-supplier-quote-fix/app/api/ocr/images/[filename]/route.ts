import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  // OCR画像取得機能は現在無効化されています
  // MongoDBベースのファイルストレージ実装が必要な場合は別途実装してください
  
  return new NextResponse(null, { status: 404 });
}