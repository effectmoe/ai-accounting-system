import { NextRequest, NextResponse } from 'next/server';
import { generateHtmlQuote } from '@/lib/html-quote-generator';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      quote,
      companyInfo,
      recipientName,
      customMessage,
      suggestedOptions,
      tooltips,
      productLinks,
      includeTracking,
      useWebLayout = true, // プレビューではデフォルトでWeb最適化レイアウトを使用
    } = body;
    
    // プレビュー用のベースURLを取得
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                    (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000');

    logger.debug('Preview request received:', {
      hasQuote: !!quote,
      hasCompanyInfo: !!companyInfo,
      quoteNumber: quote?.quoteNumber,
      companyName: companyInfo?.companyName || companyInfo?.name,
      suggestedOptionsCount: suggestedOptions?.length || 0,
      suggestedOptions: suggestedOptions,
      hasNotes: !!quote?.notes,
      notesLength: quote?.notes?.length || 0,
      notesPreview: quote?.notes?.substring(0, 100) || 'なし',
      tooltipsReceived: tooltips?.length || 0,
      tooltipsData: tooltips,
      productLinksReceived: productLinks?.length || 0,
      productLinksData: productLinks,
    });
    
    // コンソールログでもデバッグ情報を出力
    console.log('🔍 API Debug - Received data:', {
      notes: quote?.notes,
      notesType: typeof quote?.notes,
      tooltips: tooltips,
      tooltipsType: typeof tooltips,
      tooltipsLength: tooltips?.length,
      productLinks: productLinks,
      productLinksType: typeof productLinks,
      productLinksLength: productLinks?.length
    });

    // デバッグ用: シンプルなHTMLを返して確認
    const debugMode = request.url.includes('debug=true'); // URLにdebug=trueがある場合のみ有効化
    if (debugMode) {
      const simpleHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>見積書プレビュー</title>
          <style>
            .tooltip-wrapper {
              position: relative;
              display: inline-block;
              border-bottom: 1px dotted #333;
              cursor: help;
            }
            .tooltip-content {
              visibility: hidden;
              background-color: rgba(254, 240, 138, 0.95);
              color: #333;
              text-align: center;
              border-radius: 6px;
              padding: 8px 12px;
              position: absolute;
              z-index: 1;
              bottom: 125%;
              left: 50%;
              transform: translateX(-50%);
              width: 200px;
              font-size: 12px;
              box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            }
            .tooltip-wrapper:hover .tooltip-content {
              visibility: visible;
            }
          </style>
        </head>
        <body style="font-family: sans-serif; padding: 20px;">
          <h1>見積書 #${quote?.quoteNumber || 'N/A'}</h1>
          <p>顧客名: ${quote?.customerName || 'N/A'}</p>
          <p>会社名: ${companyInfo?.companyName || companyInfo?.name || 'N/A'}</p>
          <p>合計金額: ¥${quote?.totalAmount?.toLocaleString() || 'N/A'}</p>
          <p>
            テストツールチップ: 
            <span class="tooltip-wrapper">
              ホバーしてください
              <span class="tooltip-content">💡 ツールチップが表示されます！黄色背景です。</span>
            </span>
          </p>
          <p>備考: ${quote?.notes || 'なし'}</p>
          <hr>
          <h2>見積項目</h2>
          <ul>
            ${quote?.items?.map(item => `
              <li>${item.itemName || item.description || 'N/A'} - ¥${item.amount?.toLocaleString() || 'N/A'}</li>
            `).join('') || '<li>項目なし</li>'}
          </ul>
        </body>
        </html>
      `;
      
      return NextResponse.json({
        html: simpleHtml,
        plainText: 'Simple preview',
        subject: 'Test Subject',
        previewText: 'Test Preview',
      });
    }

    // データ型を確認してMapオブジェクトに変換
    let tooltipsMap: Map<string, string>;
    let productLinksMap: Map<string, string>;
    
    try {
      // tooltipsが配列かどうか確認
      if (Array.isArray(tooltips)) {
        tooltipsMap = new Map(tooltips);
        console.log('🗺️ Tooltips processed as array:', tooltips.length, 'entries');
      } else {
        tooltipsMap = new Map();
        console.log('⚠️ Tooltips is not an array:', typeof tooltips, tooltips);
      }
      
      // productLinksが配列かどうか確認
      if (Array.isArray(productLinks)) {
        productLinksMap = new Map(productLinks);
        console.log('🗺️ ProductLinks processed as array:', productLinks.length, 'entries');
      } else {
        productLinksMap = new Map();
        console.log('⚠️ ProductLinks is not an array:', typeof productLinks, productLinks);
      }
    } catch (error) {
      console.error('❌ Error processing tooltips/productLinks:', error);
      tooltipsMap = new Map();
      productLinksMap = new Map();
    }
    
    // ツールチップが空の場合は、デフォルトのツールチップを生成
    if (tooltipsMap.size === 0) {
      console.log('🔧 No tooltips provided, generating defaults...');
      const { generateDefaultTooltips } = await import('@/lib/html-quote-generator');
      const defaultTooltips = generateDefaultTooltips();
      console.log('📚 Generated default tooltips:', defaultTooltips.size, 'entries');
      console.log('📚 Default tooltips data:', Array.from(defaultTooltips.entries()));
      // デフォルトのツールチップをtooltipsMapに追加
      for (const [key, value] of defaultTooltips.entries()) {
        tooltipsMap.set(key, value);
      }
    }
    
    // デバッグログを追加（強化版）
    console.log('🔍 Preview API Debug - Enhanced version:');
    console.log('  - Tooltips received (type):', typeof tooltips, 'length:', tooltips?.length);
    console.log('  - Tooltips received (data):', tooltips);
    console.log('  - Tooltips map size:', tooltipsMap.size);
    console.log('  - Tooltips entries:', Array.from(tooltipsMap.entries()));
    console.log('  - Quote items (with details):', quote?.items?.map((item, index) => ({
      index,
      itemName: item.itemName,
      description: item.description,
      combined: (item.itemName || '') + ' ' + (item.description || ''),
      hasTooltip: false // これは後で設定される
    })));
    console.log('  - Quote notes (detailed):', {
      hasNotes: !!quote?.notes,
      notesValue: quote?.notes,
      notesLength: quote?.notes?.length,
      notesType: typeof quote?.notes,
      notesPreview: quote?.notes?.substring(0, 100) || 'なし'
    });
    
    // 項目ごとのツールチップマッチングをテスト
    if (quote?.items && Array.isArray(quote.items)) {
      console.log('🎯 Testing tooltip matching for each item:');
      quote.items.forEach((item, index) => {
        const itemText = item.itemName || item.description || '';
        let matchedTooltip = null;
        
        // 簡単なマッチングテスト
        for (const [key, value] of tooltipsMap.entries()) {
          if (itemText.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(itemText.toLowerCase())) {
            matchedTooltip = { key, value: value.substring(0, 50) + '...' };
            break;
          }
        }
        
        console.log(`  Item ${index + 1}: "${itemText}" -> ${matchedTooltip ? `Matched: ${matchedTooltip.key}` : 'No match'}`);
      });
    }
    
    logger.debug('Tooltips received:', tooltips);
    logger.debug('Tooltips map size:', tooltipsMap.size);
    logger.debug('Tooltips entries:', Array.from(tooltipsMap.entries()));
    logger.debug('Quote notes debug:', {
      hasNotes: !!quote?.notes,
      notesValue: quote?.notes,
      notesType: typeof quote?.notes
    });
    
    // プレビュー用のURLを生成（実際の送信時とは異なるダミーURLを使用）
    const trackingId = 'preview-tracking-id';
    const quoteId = quote._id || 'preview-quote-id';
    
    const acceptUrl = `${baseUrl}/quotes/accept/${quoteId}?t=${trackingId}`;
    const considerUrl = `${baseUrl}/quotes/consider/${quoteId}?t=${trackingId}`;
    const discussUrl = `${baseUrl}/quotes/discuss/${quoteId}?t=${trackingId}`;

    // HTML生成 - Web最適化レイアウト使用
    const result = await generateHtmlQuote({
      quote,
      companyInfo,
      recipientName,
      customMessage,
      includeTracking,
      includeInteractiveElements: true,
      suggestedOptions,
      tooltips: tooltipsMap,
      productLinks: productLinksMap,
      useWebLayout, // Web最適化レイアウトフラグを渡す
      acceptUrl,     // プレビュー用URL
      considerUrl,   // プレビュー用URL
      discussUrl,    // プレビュー用URL
    });

    logger.debug('HTML generated successfully, length:', result.html?.length);

    return NextResponse.json({
      html: result.html,
      plainText: result.plainText,
      subject: result.subject,
      previewText: result.previewText,
    });
  } catch (error) {
    logger.error('Error generating HTML quote preview:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    
    return NextResponse.json(
      { 
        error: 'Failed to generate preview',
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}