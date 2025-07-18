import { NextRequest, NextResponse } from 'next/server';
import { OCRAIOrchestrator } from '@/lib/ocr-ai-orchestrator';

export async function GET(request: NextRequest) {
  try {
    console.log('[OCR Mock Test] Starting test...');
    
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
    
    // AI Orchestratorのテスト
    console.log('[OCR Mock Test] Creating orchestrator...');
    const orchestrator = new OCRAIOrchestrator();
    
    console.log('[OCR Mock Test] Calling orchestrateOCRResult...');
    const structuredData = await orchestrator.orchestrateOCRResult({
      ocrResult: mockOcrResult,
      documentType: 'supplier-quote',
      companyId: '11111111-1111-1111-1111-111111111111'
    });
    
    console.log('[OCR Mock Test] Test completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'OCR Mock Test completed',
      input: {
        documentType: 'supplier-quote',
        ocrLinesCount: mockOcrResult.pages[0].lines.length
      },
      output: structuredData,
      environment: {
        hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
        deepSeekKeyPrefix: process.env.DEEPSEEK_API_KEY?.substring(0, 10) || 'not set'
      }
    });
    
  } catch (error) {
    console.error('[OCR Mock Test] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name || 'UnknownError',
      stack: error instanceof Error ? error.stack : undefined,
      environment: {
        hasDeepSeekKey: !!process.env.DEEPSEEK_API_KEY,
        deepSeekKeyPrefix: process.env.DEEPSEEK_API_KEY?.substring(0, 10) || 'not set'
      }
    }, { status: 500 });
  }
}