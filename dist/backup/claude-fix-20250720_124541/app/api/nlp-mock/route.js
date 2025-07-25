"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
exports.GET = GET;
const server_1 = require("next/server");
const nlp_orchestrator_wrapper_1 = require("@/nlp-orchestrator-wrapper");
const logger_1 = require("@/lib/logger");
async function POST(request) {
    try {
        const body = await request.json();
        const { input, context } = body;
        if (!input || typeof input !== 'string') {
            return server_1.NextResponse.json({ error: 'Input is required and must be a string' }, { status: 400 });
        }
        // NLPラッパーで自然言語処理
        const result = await (0, nlp_orchestrator_wrapper_1.processUserInput)(input, context);
        return server_1.NextResponse.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('NLP Mock API Error:', error);
        return server_1.NextResponse.json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
async function GET() {
    return server_1.NextResponse.json({
        status: 'healthy',
        features: [
            'natural_language_processing',
            'document_generation',
            'ocr_processing',
            'accounting_analysis',
            'tax_calculation',
        ],
        implementation: 'mock',
        mastra: 'disabled',
        timestamp: new Date().toISOString(),
    });
}
