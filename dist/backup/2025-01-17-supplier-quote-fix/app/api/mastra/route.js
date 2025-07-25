"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const mastra_integration_1 = require("@/lib/mastra-integration");
async function POST(request) {
    try {
        const body = await request.json();
        const { input, context } = body;
        if (!input || typeof input !== 'string') {
            return server_1.NextResponse.json({ error: 'Input is required and must be a string' }, { status: 400 });
        }
        // Mastra統合で自然言語処理
        const result = await (0, mastra_integration_1.processNaturalLanguage)(input, context);
        return server_1.NextResponse.json(result);
    }
    catch (error) {
        console.error('Mastra API Error:', error);
        return server_1.NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
            details: 'Mastra integration error'
        }, { status: 500 });
    }
}
async function GET() {
    return server_1.NextResponse.json({
        status: 'healthy',
        aam_system: {
            enabled: true,
            version: '1.0.0',
            features: [
                'natural_language_processing',
                'document_generation',
                'ocr_processing',
                'accounting_analysis',
                'tax_calculation',
                'deepseek_llm',
                'multi_agent_orchestration'
            ]
        },
        agents: [
            'ocr-agent',
            'accounting-agent',
            'database-agent',
            'customer-agent',
            'product-agent',
            'japan-tax-agent',
            'ui-agent',
            'nlweb-agent',
            'tax-return-agent',
            'gas-deploy-agent',
            'gas-ocr-deploy-agent',
            'gas-test-agent',
            'gas-update-agent',
            'problem-solving-agent'
        ],
        llm: {
            provider: 'deepseek',
            model: 'deepseek-chat',
            configured: !!process.env.DEEPSEEK_API_KEY
        },
        timestamp: new Date().toISOString(),
    });
}
