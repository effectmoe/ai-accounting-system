"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
exports.dynamic = 'force-dynamic';
async function GET() {
    return server_1.NextResponse.json({
        MONGODB_URI: process.env.MONGODB_URI ?
            process.env.MONGODB_URI.replace(/:[^:@]+@/, ':***@') :
            'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        timestamp: new Date().toISOString()
    });
}
