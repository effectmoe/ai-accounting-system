import { NextRequest, NextResponse } from 'next/server';
import { processUserInput as nlpProcessUserInput } from '@/nlp-orchestrator-wrapper';

import { logger } from '@/lib/logger';
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

    // NLPラッパーで自然言語処理
    const result = await nlpProcessUserInput(input, context);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('NLP Mock API Error:', error);
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
  return NextResponse.json({
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