"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET() {
    // 空のレスポンスを返す
    return server_1.NextResponse.json({ transactions: [] });
}
