import { NextRequest, NextResponse } from 'next/server';
import { OCRAIOrchestrator } from '@/lib/ocr-ai-orchestrator';

export async function POST(request: NextRequest) {
  try {
    console.log('[TEST-DEEPSEEK-OCR] Starting DeepSeek OCR test...');
    
    const body = await request.json();
    const { ocrResult, documentType = 'supplier-quote' } = body;
    
    if (!ocrResult) {
      return NextResponse.json(
        { error: 'OCR result is required' },
        { status: 400 }
      );
    }

    // DeepSeek OCR Orchestratorを初期化
    const orchestrator = new OCRAIOrchestrator();
    
    console.log('[TEST-DEEPSEEK-OCR] Initialized DeepSeek OCR Orchestrator');
    
    // OCR結果を処理
    const structuredData = await orchestrator.orchestrateOCRResult({
      ocrResult,
      documentType,
      companyId: 'test-company'
    });
    
    console.log('[TEST-DEEPSEEK-OCR] Successfully processed OCR result');
    console.log('[TEST-DEEPSEEK-OCR] Structured data:', {
      vendor: structuredData.vendor.name,
      customer: structuredData.customer.name,
      subject: structuredData.subject,
      totalAmount: structuredData.totalAmount,
      itemsCount: structuredData.items.length
    });
    
    return NextResponse.json({
      success: true,
      data: structuredData,
      message: 'DeepSeek OCR processing completed successfully'
    });
    
  } catch (error) {
    console.error('[TEST-DEEPSEEK-OCR] Error:', error);
    
    return NextResponse.json(
      {
        error: 'DeepSeek OCR processing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // DeepSeek APIキーの設定確認
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    
    const status = {
      deepseekApiKey: deepseekApiKey ? 'configured' : 'not configured',
      deepseekApiKeyLength: deepseekApiKey?.length || 0,
      environment: process.env.NODE_ENV || 'development',
      vercel: process.env.VERCEL || 'false'
    };
    
    console.log('[TEST-DEEPSEEK-OCR] Status check:', status);
    
    return NextResponse.json({
      success: true,
      status,
      message: 'DeepSeek OCR system status'
    });
    
  } catch (error) {
    console.error('[TEST-DEEPSEEK-OCR] Status check error:', error);
    
    return NextResponse.json(
      {
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}