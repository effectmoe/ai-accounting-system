import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Google Drive APIにリダイレクト
  return NextResponse.json(
    { 
      error: 'このエンドポイントは廃止されました。/api/upload/gdriveを使用してください。',
      redirectTo: '/api/upload/gdrive'
    },
    { status: 410 } // Gone
  );
}