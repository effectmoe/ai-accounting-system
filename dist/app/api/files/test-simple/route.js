"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runtime = void 0;
exports.GET = GET;
const server_1 = require("next/server");
async function GET(request) {
    return server_1.NextResponse.json({
        success: true,
        message: 'File API is working',
        timestamp: new Date().toISOString()
    });
}
exports.runtime = 'nodejs';
