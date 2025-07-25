"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET(request) {
    // 開発環境のみ許可
    if (process.env.NODE_ENV !== 'development') {
        return server_1.NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }
    return server_1.NextResponse.json({
        environment: {
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV,
        },
        apiKeys: {
            deepseek: {
                exists: !!process.env.DEEPSEEK_API_KEY,
                length: process.env.DEEPSEEK_API_KEY?.length || 0,
                prefix: process.env.DEEPSEEK_API_KEY?.substring(0, 10) || 'not set',
            },
            openai: {
                exists: !!process.env.OPENAI_API_KEY,
                length: process.env.OPENAI_API_KEY?.length || 0,
            },
            azure: {
                exists: !!process.env.AZURE_OPENAI_API_KEY,
                length: process.env.AZURE_OPENAI_API_KEY?.length || 0,
                endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'not set',
                deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'not set',
            },
        },
        timestamp: new Date().toISOString(),
    });
}
