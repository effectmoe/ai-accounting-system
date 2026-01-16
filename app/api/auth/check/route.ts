import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 開発環境では認証をスキップ
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.json({ authenticated: true });
  }

  const authToken = request.cookies.get('auth-token');

  if (authToken?.value === 'authenticated') {
    return NextResponse.json({ authenticated: true });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}