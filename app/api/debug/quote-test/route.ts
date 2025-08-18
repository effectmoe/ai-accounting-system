import { NextRequest, NextResponse } from 'next/server';
import { generateHtmlQuote, generateDefaultTooltips } from '@/lib/html-quote-generator';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 [DEBUG-QUOTE-TEST:START] Starting debug quote test at:', new Date().toISOString());

    // テスト用のダミーデータを生成
    const testQuote = {
      _id: 'test-quote-id-12345',
      quoteNumber: 'Q-TEST-2024-001',
      customerName: 'テスト会社株式会社',
      issueDate: new Date(),
      validityDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
      subtotal: 100000,
      taxRate: 10,
      taxAmount: 10000,
      totalAmount: 110000,
      status: 'draft',
      notes: 'これはデバッグ用のテスト見積書です。\n\nツールチップやインライン注釈の表示をテストするために作成されました。\n\n【重要】本番環境での実際の見積書ではありません。',
      items: [
        {
          itemName: 'LLMOモニタリングサービス',
          description: 'AIを活用したWebサイト最適化とパフォーマンス監視',
          quantity: 1,
          unit: '式',
          unitPrice: 50000,
          amount: 50000
        },
        {
          itemName: 'システム開発',
          description: 'カスタム業務システムの構築',
          quantity: 1,
          unit: '式',
          unitPrice: 30000,
          amount: 30000
        },
        {
          itemName: 'API統合',
          description: '外部サービスとのAPI連携実装',
          quantity: 2,
          unit: '件',
          unitPrice: 10000,
          amount: 20000
        },
        {
          itemName: 'テスト項目',
          description: 'ツールチップテスト用のサンプル項目',
          quantity: 1,
          unit: '個',
          unitPrice: 0,
          amount: 0
        }
      ],
      customer: {
        name: 'テスト会社株式会社',
        companyName: 'テスト会社株式会社'
      }
    };

    const testCompanyInfo = {
      companyName: 'EFFECT Inc.',
      name: 'EFFECT Inc.',
      postalCode: '123-4567',
      prefecture: '東京都',
      city: '新宿区',
      address1: 'テストビル',
      address2: '5F',
      phone: '03-1234-5678',
      email: 'test@example.com',
      website: 'https://notion.effect.moe'
    };

    console.log('🔧 [DEBUG-QUOTE-TEST:DATA] Test data created:', {
      quoteId: testQuote._id,
      itemsCount: testQuote.items.length,
      hasNotes: !!testQuote.notes,
      notesLength: testQuote.notes?.length,
      totalAmount: testQuote.totalAmount,
      timestamp: new Date().toISOString()
    });

    // デフォルトツールチップを生成
    const tooltips = generateDefaultTooltips();
    console.log('🔧 [DEBUG-QUOTE-TEST:TOOLTIPS] Generated tooltips:', {
      tooltipsCount: tooltips.size,
      tooltipKeys: Array.from(tooltips.keys()).slice(0, 10),
      timestamp: new Date().toISOString()
    });

    // プレビュー用のベースURL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000');

    // テスト用URL
    const trackingId = 'debug-test-tracking-id';
    const acceptUrl = `${baseUrl}/quotes/accept/${testQuote._id}?t=${trackingId}`;
    const considerUrl = `${baseUrl}/quotes/consider/${testQuote._id}?t=${trackingId}`;
    const discussUrl = `${baseUrl}/quotes/discuss/${testQuote._id}?t=${trackingId}`;

    console.log('🔧 [DEBUG-QUOTE-TEST:URLS] Generated URLs:', {
      baseUrl,
      acceptUrl,
      considerUrl,
      discussUrl,
      timestamp: new Date().toISOString()
    });

    // HTML生成をテスト
    console.log('🎯 [DEBUG-QUOTE-TEST:GENERATE] Starting HTML generation...');
    const result = await generateHtmlQuote({
      quote: testQuote,
      companyInfo: testCompanyInfo,
      recipientName: 'テスト太郎',
      customMessage: '🔧 これはデバッグテスト用のカスタムメッセージです。システムが正常に動作しているか確認中です。',
      includeTracking: true,
      includeInteractiveElements: true,
      suggestedOptions: [
        {
          title: '🚀 プレミアムサポート',
          description: 'デバッグテスト用のサンプルオプションです',
          price: '月額 ¥10,000',
          features: ['24時間サポート', 'テスト機能', 'デバッグ支援'],
          ctaText: 'テスト詳細',
          ctaUrl: `${baseUrl}/test-option`
        }
      ],
      tooltips,
      productLinks: new Map(),
      useWebLayout: true, // Webレイアウトを使用
      acceptUrl,
      considerUrl,
      discussUrl,
    });

    console.log('✅ [DEBUG-QUOTE-TEST:SUCCESS] HTML generation completed:', {
      htmlLength: result.html?.length,
      hasHtml: !!result.html,
      plainTextLength: result.plainText?.length,
      subject: result.subject,
      trackingId: result.trackingId,
      timestamp: new Date().toISOString()
    });

    // レスポンスにデバッグ情報を含める
    return NextResponse.json({
      success: true,
      debug: {
        testQuote: {
          id: testQuote._id,
          number: testQuote.quoteNumber,
          itemsCount: testQuote.items.length,
          totalAmount: testQuote.totalAmount,
          hasNotes: !!testQuote.notes,
          notesLength: testQuote.notes?.length
        },
        tooltips: {
          count: tooltips.size,
          sampleKeys: Array.from(tooltips.keys()).slice(0, 5)
        },
        generation: {
          htmlLength: result.html?.length,
          plainTextLength: result.plainText?.length,
          subject: result.subject,
          trackingId: result.trackingId
        },
        urls: {
          acceptUrl,
          considerUrl,
          discussUrl
        }
      },
      result: {
        html: result.html,
        plainText: result.plainText,
        subject: result.subject,
        previewText: result.previewText
      }
    });

  } catch (error) {
    console.error('❌ [DEBUG-QUOTE-TEST:ERROR] Debug test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Debug test failed',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Debug Quote Test Endpoint',
    description: 'POST request with test data to debug quote generation',
    endpoints: {
      test: 'POST /api/debug/quote-test - Run debug test',
    },
    testInstructions: [
      '1. POST request to this endpoint',
      '2. Check console logs for detailed debugging info',
      '3. Response contains both debug info and generated HTML',
      '4. Look for specific log markers: 🔧, 🎯, ✅, ❌'
    ]
  });
}