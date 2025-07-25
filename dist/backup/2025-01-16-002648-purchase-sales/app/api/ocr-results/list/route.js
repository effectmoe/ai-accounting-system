"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
const server_1 = require("next/server");
exports.dynamic = 'force-dynamic';
async function GET(request) {
    // OCR機能は現在無効化されています
    // MongoDBベースの実装が必要な場合は別途実装してください
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    return server_1.NextResponse.json({
        success: true,
        data: [],
        total: 0,
        page,
        limit,
        message: 'OCR機能は現在利用できません'
    });
}
