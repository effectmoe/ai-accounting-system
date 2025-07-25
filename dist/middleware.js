"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.middleware = middleware;
const server_1 = require("next/server");
function middleware(request) {
    // Webhook エンドポイントは認証をスキップ
    if (request.nextUrl.pathname.startsWith('/api/webhook/')) {
        return server_1.NextResponse.next();
    }
    // その他のリクエストはそのまま通す
    return server_1.NextResponse.next();
}
exports.config = {
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
