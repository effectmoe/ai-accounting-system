"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
// import { orchestrator } from '@/mastra-orchestrator';
async function POST(request) {
    try {
        const body = await request.json();
        const { input, context } = body;
        if (!input || typeof input !== 'string') {
            return server_1.NextResponse.json({ error: 'Input is required and must be a string' }, { status: 400 });
        }
        // 一時的にモックレスポンスを返す
        return server_1.NextResponse.json({
            success: true,
            data: {
                action: 'mock_response',
                message: 'NLP processing is temporarily disabled for production deployment',
                input: input,
            },
        });
    }
    catch (error) {
        console.error('NLP API Error:', error);
        return server_1.NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function GET() {
    try {
        // ヘルスチェック（モック）
        return server_1.NextResponse.json({
            status: 'healthy',
            features: [
                'natural_language_processing',
                'document_generation',
                'ocr_processing',
                'accounting_analysis',
                'tax_calculation',
                'database_operations',
                'ui_generation',
                'nlweb_integration'
            ],
            agents: {
                status: 'mocked',
                message: 'Agents are temporarily disabled for production deployment'
            },
            nlpOrchestrator: {
                status: 'mocked'
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('Health check error:', error);
        return server_1.NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }
}
