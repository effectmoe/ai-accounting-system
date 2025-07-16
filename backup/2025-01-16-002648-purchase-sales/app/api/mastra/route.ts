import { NextRequest, NextResponse } from 'next/server';
import { processNaturalLanguage } from '@/lib/mastra-integration';

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

    // Mastra統合で自然言語処理
    const result = await processNaturalLanguage(input, context);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Mastra API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Mastra integration error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
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