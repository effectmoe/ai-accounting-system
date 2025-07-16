import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // OCR機能は現在無効化されています
  // MongoDBベースの実装が必要な場合は別途実装してください
  
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  return NextResponse.json({
    success: true,
    data: [],
    total: 0,
    page,
    limit,
    message: 'OCR機能は現在利用できません'
  });
}