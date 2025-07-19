import { NextRequest, NextResponse } from 'next/server';
import { OCRAIOrchestrator } from '@/lib/ocr-ai-orchestrator';

import { logger } from '@/lib/logger';
export async function POST(request: NextRequest) {
  try {
    logger.debug('[TEST-DEEPSEEK-OCR] Starting DeepSeek OCR test...');
    
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
    
    logger.debug('[TEST-DEEPSEEK-OCR] Initialized DeepSeek OCR Orchestrator');
    
    // OCR結果を処理
    const structuredData = await orchestrator.orchestrateOCRResult({
      ocrResult,
      documentType,
      companyId: 'test-company'
    });
    
    logger.debug('[TEST-DEEPSEEK-OCR] Successfully processed OCR result');
    logger.debug('[TEST-DEEPSEEK-OCR] Structured data:', {
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
    logger.error('[TEST-DEEPSEEK-OCR] Error:', error);
    
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
    logger.debug('[TEST-DEEPSEEK-OCR] Starting GET test with mock data...');
    
    // モックのOCR結果
    const mockOcrResult = {
      content: `合同会社アソウタイセイプリンティング
〒xxx-xxxx 東京都〇〇区〇〇 1-2-3
TEL: 03-xxxx-xxxx FAX: 03-xxxx-xxxx

見積書

見積番号: M-2025-001
発行日: 2025年1月18日

株式会社CROP御中

件名: 印刷物

下記の通り御見積申し上げます。

品名: 領収書（3枚複写・1冊50組）
数量: 1
単価: 5,000
金額: 5,000

小計: 5,000
消費税: 500
合計金額: 5,500円`,
      pages: [
        {
          pageNumber: 1,
          lines: [
            { content: '合同会社アソウタイセイプリンティング' },
            { content: '〒xxx-xxxx 東京都〇〇区〇〇 1-2-3' },
            { content: 'TEL: 03-xxxx-xxxx FAX: 03-xxxx-xxxx' },
            { content: '見積書' },
            { content: '見積番号: M-2025-001' },
            { content: '発行日: 2025年1月18日' },
            { content: '株式会社CROP御中' },
            { content: '件名: 印刷物' },
            { content: '下記の通り御見積申し上げます。' },
            { content: '品名: 領収書（3枚複写・1冊50組）' },
            { content: '数量: 1' },
            { content: '単価: 5,000' },
            { content: '金額: 5,000' },
            { content: '小計: 5,000' },
            { content: '消費税: 500' },
            { content: '合計金額: 5,500円' }
          ]
        }
      ],
      fields: {},
      tables: []
    };
    
    // DeepSeek APIキーの設定確認
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    
    const status = {
      deepseekApiKey: deepseekApiKey ? 'configured' : 'not configured',
      deepseekApiKeyLength: deepseekApiKey?.length || 0,
      deepseekApiKeyPrefix: deepseekApiKey?.substring(0, 10) || 'not set',
      environment: process.env.NODE_ENV || 'development',
      vercel: process.env.VERCEL || 'false'
    };
    
    logger.debug('[TEST-DEEPSEEK-OCR] Status check:', status);
    
    // AI Orchestratorのテスト
    let testResult = null;
    let testError = null;
    
    try {
      logger.debug('[TEST-DEEPSEEK-OCR] Creating orchestrator...');
      const orchestrator = new OCRAIOrchestrator();
      
      logger.debug('[TEST-DEEPSEEK-OCR] Calling orchestrateOCRResult...');
      const structuredData = await orchestrator.orchestrateOCRResult({
        ocrResult: mockOcrResult,
        documentType: 'supplier-quote',
        companyId: '11111111-1111-1111-1111-111111111111'
      });
      
      testResult = {
        success: true,
        structuredData,
        summary: {
          vendor: structuredData.vendor.name,
          customer: structuredData.customer.name,
          subject: structuredData.subject,
          totalAmount: structuredData.totalAmount,
          itemsCount: structuredData.items.length
        }
      };
      
      logger.debug('[TEST-DEEPSEEK-OCR] Test completed successfully');
    } catch (error) {
      logger.error('[TEST-DEEPSEEK-OCR] Test error:', error);
      testError = {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error?.constructor?.name || 'UnknownError',
        stack: error instanceof Error ? error.stack : undefined
      };
    }
    
    return NextResponse.json({
      success: true,
      status,
      message: 'DeepSeek OCR system test with mock data',
      mockDataUsed: true,
      testResult,
      testError
    });
    
  } catch (error) {
    logger.error('[TEST-DEEPSEEK-OCR] Status check error:', error);
    
    return NextResponse.json(
      {
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}