"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
async function POST(request) {
    // Google Drive APIにリダイレクト
    return server_1.NextResponse.json({
        error: 'このエンドポイントは廃止されました。/api/upload/gdriveを使用してください。',
        redirectTo: '/api/upload/gdrive'
    }, { status: 410 } // Gone
    );
}
