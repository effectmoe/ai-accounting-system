import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // 環境変数からパスワードを取得
    const correctPassword = process.env.SITE_PASSWORD;

    // パスワードが設定されていない場合は認証不要
    if (!correctPassword) {
      const response = NextResponse.json({ authenticated: true });
      response.cookies.set('auth-token', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return response;
    }

    if (password === correctPassword) {
      // 認証成功
      const response = NextResponse.json({ authenticated: true });

      // HTTPOnlyクッキーをセット
      response.cookies.set('auth-token', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7日間
        path: '/',
      });

      return response;
    } else {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}