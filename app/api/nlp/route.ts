import { NextRequest, NextResponse } from 'next/server';
import { orchestrator } from '@/mastra-orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, context } = body;

    if (!input || typeof input !== 'string') {
      return NextResponse.json(
        { error: 'Input is required and must be a string' },
        { status: 400 }
      );
    }

    // NLPオーケストレーターで自然言語処理
    const result = await orchestrator.processNaturalLanguage(input, context);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('NLP API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // ヘルスチェック
    const healthStatus = await orchestrator.healthCheck();
    
    return NextResponse.json({
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
      agents: healthStatus.agents,
      nlpOrchestrator: healthStatus.nlpOrchestrator,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
}