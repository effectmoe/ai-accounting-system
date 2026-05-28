import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const WRITE_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

// Paths that don't require API key authentication
const API_KEY_EXEMPT_PATHS = [
  '/api/auth',
  '/api/webhook/',
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // APIリクエストの場合
  if (pathname.startsWith('/api/')) {
    // プリフライトリクエストへの対応
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-LLM-Wiki-Key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 書き込みメソッド (POST/PUT/DELETE/PATCH) に対してAPI Keyチェック
    if (WRITE_METHODS.has(request.method)) {
      const isExempt = API_KEY_EXEMPT_PATHS.some(p => pathname.startsWith(p));

      if (!isExempt) {
        // ブラウザからの同一オリジンリクエストはスキップ（Sec-Fetch-Site はJS改ざん不可）
        const secFetchSite = request.headers.get('sec-fetch-site');
        const isBrowserSameOrigin = secFetchSite === 'same-origin' || secFetchSite === 'same-site';

        if (!isBrowserSameOrigin) {
          const apiKey = request.headers.get('X-LLM-Wiki-Key');
          const expectedKey = process.env.LLM_WIKI_API_KEY;

          if (!expectedKey || !apiKey || apiKey !== expectedKey) {
            return NextResponse.json(
              { error: 'Unauthorized: Invalid or missing X-LLM-Wiki-Key header' },
              { status: 401 }
            );
          }
        }
      }
    }

    // CORSヘッダーを追加して通過
    const response = NextResponse.next();
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-LLM-Wiki-Key');
    return response;
  }

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
