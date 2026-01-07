import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // 認証が不要なパス
  const publicPaths = [
    '/api/auth',
    '/api/auth/check',
    '/api/auth/logout',
    '/api/webhook/',
    '/_next/',
    '/favicon.ico',
  ];
  
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  
  // APIリクエストの場合はCORSヘッダーを追加
  if (pathname.startsWith('/api/')) {
    // プリフライトリクエストへの対応
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 通常のAPIリクエストにCORSヘッダーを追加
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  }

  // パスワード認証を無効化
  // if (process.env.SITE_PASSWORD && !isPublicPath) {
  //   const authToken = request.cookies.get('auth-token');
  //
  //   if (!authToken || authToken.value !== 'authenticated') {
  //     // 認証されていない場合、APIリクエストには401を返す
  //     if (pathname.startsWith('/api/')) {
  //       return NextResponse.json(
  //         { error: 'Unauthorized' },
  //         { status: 401 }
  //       );
  //     }
  //     // ページリクエストの場合は、クライアントサイドで処理
  //   }
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};