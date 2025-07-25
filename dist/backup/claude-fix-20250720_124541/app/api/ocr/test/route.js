"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
async function GET(request) {
    return server_1.NextResponse.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: {
            hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
            hasAzureEndpoint: !!process.env.AZURE_FORM_RECOGNIZER_ENDPOINT,
            hasAzureKey: !!process.env.AZURE_FORM_RECOGNIZER_KEY,
            nodeEnv: process.env.NODE_ENV,
            vercelEnv: process.env.VERCEL_ENV
        },
        timeouts: {
            vercelFunction: '60 seconds (configured)',
            deepseekApi: '25 seconds (configured)',
            azureFormRecognizer: 'default (30 seconds)'
        },
        fixes: {
            timeout: 'Added 25s timeout to DeepSeek API calls',
            retry: 'Added retry mechanism (max 2 attempts)',
            prompt: 'Reduced prompt size for faster processing',
            dataCompression: 'Compact OCR data to reduce payload size',
            errorHandling: 'Improved error handling with 504 status for timeouts'
        }
    });
}
