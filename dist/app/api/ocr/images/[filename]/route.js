"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET(request, { params }) {
    // OCR画像取得機能は現在無効化されています
    // MongoDBベースのファイルストレージ実装が必要な場合は別途実装してください
    return new server_1.NextResponse(null, { status: 404 });
}
