"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    const debug = {
        timestamp: new Date().toISOString(),
        environment: {
            NODE_ENV: process.env.NODE_ENV,
            VERCEL: !!process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV,
            MONGODB_URI_exists: !!process.env.MONGODB_URI,
            MONGODB_URI_length: process.env.MONGODB_URI?.length || 0,
            USE_AZURE_MONGODB: process.env.USE_AZURE_MONGODB,
            NEXT_PUBLIC_USE_AZURE_MONGODB: process.env.NEXT_PUBLIC_USE_AZURE_MONGODB,
        },
        headers: Object.fromEntries(request.headers.entries()),
        url: request.url,
        nextUrl: {
            pathname: request.nextUrl.pathname,
            search: request.nextUrl.search,
            searchParams: Object.fromEntries(request.nextUrl.searchParams.entries())
        }
    };
    // Security: only return detailed info in development
    if (process.env.NODE_ENV === 'development') {
        debug.environment.MONGODB_URI_preview = process.env.MONGODB_URI
            ? `${process.env.MONGODB_URI.substring(0, 20)}...${process.env.MONGODB_URI.substring(process.env.MONGODB_URI.length - 10)}`
            : 'undefined';
    }
    return server_1.NextResponse.json(debug);
}
exports.runtime = 'nodejs';
