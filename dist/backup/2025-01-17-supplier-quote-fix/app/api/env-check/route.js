"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET() {
    // 環境変数の存在確認（値は秘匿）
    const envStatus = {
        MONGODB_URI: !!process.env.MONGODB_URI,
        DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
        GOOGLE_CLIENT_EMAIL: !!process.env.GOOGLE_CLIENT_EMAIL,
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLOUD_PROJECT_ID: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
        GOOGLE_PRIVATE_KEY_ID: !!process.env.GOOGLE_PRIVATE_KEY_ID,
        NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        ENABLE_OCR: !!process.env.ENABLE_OCR,
        GAS_OCR_URL: !!process.env.GAS_OCR_URL,
        GAS_WEBHOOK_URL: !!process.env.GAS_WEBHOOK_URL,
    };
    // MongoDB URI の一部を表示（デバッグ用）
    let mongodbInfo = 'Not configured';
    if (process.env.MONGODB_URI) {
        try {
            const uri = new URL(process.env.MONGODB_URI);
            mongodbInfo = `${uri.protocol}//${uri.hostname}/${uri.pathname.split('/').pop()}`;
        }
        catch (e) {
            mongodbInfo = 'Invalid URI format';
        }
    }
    // 全体のステータス
    const allConfigured = Object.values(envStatus).every(status => status);
    return server_1.NextResponse.json({
        success: true,
        allConfigured,
        environment: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        mongodbInfo,
        envStatus,
        timestamp: new Date().toISOString(),
    });
}
