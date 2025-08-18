import { render } from '@react-email/render';
import QuoteHtmlTemplate from '@/emails/QuoteHtmlTemplate';
import QuoteWebTemplate from '@/emails/QuoteWebTemplate';
import { Quote, CompanyInfo } from '@/types/collections';
import { logger } from '@/lib/logger';
import { cleanDuplicateSignatures } from '@/lib/utils/clean-duplicate-signatures';

export interface HtmlQuoteOptions {
  quote: Quote;
  companyInfo: CompanyInfo;
  recipientName?: string;
  customMessage?: string;
  includeTracking?: boolean;
  includeInteractiveElements?: boolean;
  suggestedOptions?: SuggestedOption[];
  tooltips?: Map<string, string>;
  productLinks?: Map<string, string>;
  useWebLayout?: boolean; // Web最適化レイアウト使用フラグ
  acceptUrl?: string;     // カスタムAccept URL（プレビュー用）
  considerUrl?: string;   // カスタムConsider URL（プレビュー用）
  discussUrl?: string;    // カスタムDiscuss URL（プレビュー用）
}

export interface SuggestedOption {
  title: string;
  description: string;
  price: string;
  features: string[];
  ctaText: string;
  ctaUrl: string;
}

export interface HtmlQuoteResult {
  html: string;
  plainText: string;
  subject: string;
  previewText: string;
  trackingId?: string;
}

/**
 * HTML見積書を生成
 */
export async function generateHtmlQuote(
  options: HtmlQuoteOptions
): Promise<HtmlQuoteResult> {
  try {
    console.log('🏗️ [HTML-GENERATOR:START] Starting generateHtmlQuote at:', new Date().toISOString());
    
    const {
      quote,
      companyInfo,
      recipientName,
      customMessage,
      includeTracking = true,
      includeInteractiveElements = true,
      suggestedOptions = [],
      tooltips,
      productLinks,
      useWebLayout = false, // デフォルトは従来のメールテンプレート
      acceptUrl: customAcceptUrl,
      considerUrl: customConsiderUrl,
      discussUrl: customDiscussUrl,
    } = options;

    console.log('🏗️ [HTML-GENERATOR:PARAMS] Extracted parameters:', {
      hasQuote: !!quote,
      quoteId: quote?._id,
      hasNotes: !!quote?.notes,
      notesValue: quote?.notes,
      notesType: typeof quote?.notes,
      notesLength: quote?.notes?.length,
      hasTooltips: !!tooltips,
      tooltipsType: typeof tooltips,
      tooltipsSize: tooltips?.size,
      hasProductLinks: !!productLinks,
      productLinksSize: productLinks?.size,
      useWebLayout,
      includeInteractiveElements,
      suggestedOptionsCount: suggestedOptions?.length || 0,
      timestamp: new Date().toISOString()
    });

    // デバッグログ
    logger.debug('[html-quote-generator] Generating HTML with:', {
      companyName: companyInfo?.companyName || companyInfo?.name,
      suggestedOptionsCount: suggestedOptions?.length || 0,
      useWebLayout,
      includeInteractiveElements,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
    const trackingId = includeTracking ? generateTrackingId() : undefined;

    // ツールチップが提供されていない場合はデフォルトを生成
    console.log('🔧 [HTML-GENERATOR:TOOLTIPS] Processing tooltips...');
    const effectiveTooltips = tooltips && tooltips.size > 0 ? tooltips : generateDefaultTooltips();
    console.log('🔧 [HTML-GENERATOR:TOOLTIPS] Effective tooltips:', {
      originalTooltipsSize: tooltips?.size || 0,
      effectiveTooltipsSize: effectiveTooltips.size,
      wasGenerated: !tooltips || tooltips.size === 0,
      timestamp: new Date().toISOString()
    });
    
    // 見積項目にインタラクティブ要素を追加
    console.log('⚡ [HTML-GENERATOR:ENHANCE] Enhancing quote items...');
    const enhancedQuote = enhanceQuoteItems(quote, effectiveTooltips, productLinks);
    console.log('⚡ [HTML-GENERATOR:ENHANCE] Items enhanced:', {
      originalItemsCount: quote?.items?.length || 0,
      enhancedItemsCount: enhancedQuote?.items?.length || 0,
      hasNotesAfterEnhance: !!enhancedQuote?.notes,
      notesValueAfterEnhance: enhancedQuote?.notes,
      timestamp: new Date().toISOString()
    });

    // URLs生成（カスタムURLが提供されていればそれを使用）
    const viewOnlineUrl = `${baseUrl}/quotes/view/${quote._id}?t=${trackingId}`;
    const acceptUrl = customAcceptUrl || `${baseUrl}/quotes/accept/${quote._id}?t=${trackingId}`;
    const considerUrl = customConsiderUrl || `${baseUrl}/quotes/consider/${quote._id}?t=${trackingId}`;
    const discussUrl = customDiscussUrl || `${baseUrl}/quotes/discuss/${quote._id}?t=${trackingId}`;
    const trackingPixelUrl = includeTracking
      ? `${baseUrl}/api/tracking/open?id=${trackingId}&doc=quote&qid=${quote._id}`
      : undefined;

    // HTML生成 - レイアウトに応じてテンプレートを選択
    const TemplateComponent = useWebLayout ? QuoteWebTemplate : QuoteHtmlTemplate;
    console.log('📄 [HTML-GENERATOR:TEMPLATE] Selected template:', {
      templateName: useWebLayout ? 'QuoteWebTemplate' : 'QuoteHtmlTemplate',
      useWebLayout,
      timestamp: new Date().toISOString()
    });
    
    console.log('📄 [HTML-GENERATOR:RENDER] Rendering template with props:', {
      hasEnhancedQuote: !!enhancedQuote,
      enhancedQuoteNotes: enhancedQuote?.notes,
      hasCompanyInfo: !!companyInfo,
      recipientName,
      hasCustomMessage: !!customMessage,
      customMessage,
      suggestedOptionsCount: includeInteractiveElements ? suggestedOptions?.length : 0,
      timestamp: new Date().toISOString()
    });
    
    const html = await render(
      TemplateComponent({
        quote: enhancedQuote,
        companyInfo,
        recipientName,
        viewOnlineUrl,
        acceptUrl,
        considerUrl,
        discussUrl,
        trackingPixelUrl,
        customMessage,
        suggestedOptions: includeInteractiveElements ? suggestedOptions : [],
      }),
      {
        pretty: true,
      }
    );
    
    console.log('✅ [HTML-GENERATOR:RENDER-COMPLETE] Template rendered successfully:', {
      htmlLength: html?.length,
      hasHtml: !!html,
      templateUsed: useWebLayout ? 'QuoteWebTemplate' : 'QuoteHtmlTemplate',
      timestamp: new Date().toISOString()
    });

    // プレーンテキスト版も生成
    const plainText = generatePlainText(quote, companyInfo);

    // 件名生成
    const subject = generateSubject(quote, companyInfo);

    // プレビューテキスト生成
    const previewText = generatePreviewText(quote, companyInfo);

    return {
      html,
      plainText,
      subject,
      previewText,
      trackingId,
    };
  } catch (error) {
    logger.error('Error generating HTML quote:', error);
    throw error;
  }
}

/**
 * 見積項目にインタラクティブ要素を追加
 */
function enhanceQuoteItems(
  quote: Quote,
  tooltips?: Map<string, string>,
  productLinks?: Map<string, string>
): Quote {
  console.log('🔨 [ENHANCE-ITEMS:START] Starting item enhancement:', {
    hasQuote: !!quote,
    hasItems: !!quote?.items,
    itemsType: Array.isArray(quote?.items) ? 'array' : typeof quote?.items,
    itemsCount: quote?.items?.length || 0,
    hasTooltips: !!tooltips,
    tooltipsSize: tooltips?.size || 0,
    hasProductLinks: !!productLinks,
    productLinksSize: productLinks?.size || 0,
    originalNotes: quote?.notes,
    timestamp: new Date().toISOString()
  });
  
  // itemsが存在しない場合はそのまま返す
  if (!quote.items || !Array.isArray(quote.items)) {
    console.log('⚠️ [ENHANCE-ITEMS:NO-ITEMS] No items to enhance, returning original quote');
    return quote;
  }

  console.log('🔨 [ENHANCE-ITEMS:PROCESSING] Processing items...');
  
  return {
    ...quote,
    items: quote.items.map((item, index) => {
      console.log(`🔨 [ENHANCE-ITEMS:ITEM-${index + 1}] Processing item:`, {
        itemIndex: index,
        itemName: item.itemName,
        description: item.description,
        hasItemName: !!item.itemName,
        hasDescription: !!item.description,
        timestamp: new Date().toISOString()
      });
      const enhanced: any = { ...item };
      
      // itemNameとdescriptionの両方を使ってテキストを構築
      const itemName = item.itemName || '';
      const itemDescription = item.description || '';
      const combinedText = (itemName + ' ' + itemDescription).trim();
      
      // アイテム処理のログは開発環境でのみ
      if (process.env.NODE_ENV === 'development') {
        console.log(`Processing item ${index + 1}: ${itemName}`);
      }
      
      // ツールチップを追加（より強化されたマッチングロジック）
      if (tooltips && tooltips.size > 0) {
        // 複数のテキストソースでツールチップを検索
        let tooltip = findTooltipForItem(itemName, tooltips) || 
                     findTooltipForItem(itemDescription, tooltips) || 
                     findTooltipForItem(combinedText, tooltips);
        
        if (tooltip) {
          enhanced.tooltip = tooltip;
        }
      }

      // 商品リンクを追加
      if (productLinks && productLinks.size > 0) {
        const link = productLinks.get(item.productId || itemName || itemDescription || '');
        if (link) {
          enhanced.productLink = link;
        }
      }

      // 詳細説明を追加（長い項目名を省略表示用）
      if (combinedText.length > 50) {
        enhanced.details = combinedText;
        enhanced.itemName = combinedText.substring(0, 50) + '...';
      }

      return enhanced;
    }),
  };
}

/**
 * アイテムに対応するツールチップを検索
 * 完全一致→部分一致→キーワード一致→類似語検索の順で検索
 * 修正: より積極的にマッチングするよう改善
 */
function findTooltipForItem(
  description: string,
  tooltips: Map<string, string>
): string | undefined {
  if (!description || description.trim() === '') {
    return undefined;
  }
  
  const terms = Array.from(tooltips.keys());
  const descriptionLower = description.toLowerCase().trim();
  
  // デバッグログ（開発環境のみ）
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔍 Finding tooltip for: "${description}" (normalized: "${descriptionLower}")`);
    console.log(`🗂️ Available tooltips: ${terms.join(', ')}`);
  }
  
  // 1. 完全一致を最初に試す
  if (tooltips.has(description)) {
    const result = tooltips.get(description);
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Exact match found: "${description}" -> "${result?.substring(0, 50)}..."`);
    }
    return result;
  }
  
  // 大文字小文字を無視した完全一致
  for (const term of terms) {
    const termLower = term.toLowerCase();
    if (termLower === descriptionLower) {
      const result = tooltips.get(term);
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Case-insensitive exact match: "${term}" -> "${result?.substring(0, 50)}..."`);
      }
      return result;
    }
  }
  
  // 2. 項目名にキーワードが含まれているかチェック（大文字小文字を無視、最小長を1文字に短縮）
  for (const term of terms) {
    const termLower = term.toLowerCase();
    if (descriptionLower.includes(termLower) && termLower.length >= 1) {
      const result = tooltips.get(term);
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Partial match found: "${termLower}" in "${descriptionLower}" -> "${result?.substring(0, 50)}..."`);
      }
      return result;
    }
  }
  
  // 3. 逆方向の検索（ツールチップキーが項目名の一部として含まれているか）
  for (const term of terms) {
    const termLower = term.toLowerCase();
    if (termLower.includes(descriptionLower) && descriptionLower.length >= 1) {
      const result = tooltips.get(term);
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Reverse match found: "${descriptionLower}" in "${termLower}" -> "${result?.substring(0, 50)}..."`);
      }
      return result;
    }
  }
  
  // 4. 特別な処理: 特定の略語や専門用語のマッチング（拡張版）
  const specialMatches = {
    'llmo': ['LLMO', 'LLMOモニタリング', 'モニタリング'],
    'saas': ['SaaS'],
    'api': ['API'],
    'roi': ['ROI'],
    'kpi': ['KPI'],
    'seo': ['SEO'],
    'ui': ['UI/UX'],
    'ux': ['UI/UX'],
    'システム': ['システム', '開発', '構築'],
    'モニタリング': ['モニタリング', 'LLMOモニタリング', 'LLMO'],
    '最適化': ['最適化', 'LLMO', 'LLMOモニタリング'],
    '開発': ['開発', 'システム', '構築'],
    '構築': ['構築', 'システム', '開発'],
    'web': ['システム', '開発', '構築'],
    'ウェブ': ['システム', '開発', '構築'],
    'サイト': ['システム', '開発', '構築'],
    'ホームページ': ['システム', '開発', '構築'],
    'webサイト': ['システム', '開発', '構築'],
    'webシステム': ['システム', '開発', '構築'],
    'analysis': ['モニタリング', 'LLMO'],
    'optimization': ['最適化', 'LLMO'],
    'performance': ['パフォーマンス', 'モニタリング'],
    'test': ['テスト項目'], // デバッグ用のテスト項目追加
    'テスト': ['テスト項目'],
    'sample': ['サンプル'],
    'サンプル': ['サンプル'],
  };
  
  for (const [keyword, candidates] of Object.entries(specialMatches)) {
    if (descriptionLower.includes(keyword)) {
      for (const candidate of candidates) {
        const tooltip = tooltips.get(candidate);
        if (tooltip) {
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Special keyword match: "${keyword}" -> "${candidate}" -> "${tooltip.substring(0, 50)}..."`);
          }
          return tooltip;
        }
      }
    }
  }
  
  // 5. 単語レベルでの部分マッチング（より柔軟に、最小長を1文字に短縮）
  const descriptionWords = descriptionLower.split(/[\s、。，．・_\-]+/).filter(word => word.length >= 1);
  
  for (const word of descriptionWords) {
    for (const term of terms) {
      const termLower = term.toLowerCase();
      const termWords = termLower.split(/[\s、。，．・_\-]+/).filter(w => w.length >= 1);
      
      // 単語が含まれるかチェック
      if (termLower.includes(word) || word.includes(termLower)) {
        const result = tooltips.get(term);
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Word-level match: "${word}" <-> "${termLower}" -> "${result?.substring(0, 50)}..."`);
        }
        return result;
      }
      
      // 単語同士のマッチング
      for (const termWord of termWords) {
        if (word === termWord || (word.length >= 2 && termWord.length >= 2 && (word.includes(termWord) || termWord.includes(word)))) {
          const result = tooltips.get(term);
          if (process.env.NODE_ENV === 'development') {
            console.log(`✅ Word-to-word match: "${word}" <-> "${termWord}" -> "${result?.substring(0, 50)}..."`);
          }
          return result;
        }
      }
    }
  }
  
  // 6. 最後の手段: 曖昧マッチング（文字の一致率をチェック、閾値を50%に下げる）
  for (const term of terms) {
    const similarity = calculateSimilarity(descriptionLower, term.toLowerCase());
    if (similarity > 0.5) { // 50%以上の類似度（より寛容に）
      const result = tooltips.get(term);
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ Similarity match: "${descriptionLower}" <-> "${term.toLowerCase()}" (${Math.round(similarity * 100)}%) -> "${result?.substring(0, 50)}..."`);
      }
      return result;
    }
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`❌ No tooltip found for: "${description}"`);
  }
  
  return undefined;
}

/**
 * 文字列の類似度を計算（簡易版）
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * レーベンシュタイン距離を計算
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * トラッキングID生成
 */
function generateTrackingId(): string {
  return `qt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * プレーンテキスト版生成
 */
function generatePlainText(quote: Quote, companyInfo: CompanyInfo): string {
  const lines: string[] = [];
  
  lines.push('=' .repeat(60));
  lines.push('お見積書');
  lines.push('=' .repeat(60));
  lines.push('');
  lines.push(`見積書番号: ${quote.quoteNumber}`);
  lines.push(`発行日: ${formatDate(quote.issueDate)}`);
  lines.push(`有効期限: ${formatDate(quote.validityDate)}`);
  lines.push('');
  lines.push('-' .repeat(60));
  lines.push('【見積内容】');
  lines.push('-' .repeat(60));
  
  quote.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.itemName || item.description || ''}`);
    lines.push(`   数量: ${item.quantity} ${item.unit || '個'}`);
    lines.push(`   単価: ${formatCurrency(item.unitPrice)}`);
    lines.push(`   金額: ${formatCurrency(item.amount)}`);
    lines.push('');
  });
  
  lines.push('-' .repeat(60));
  lines.push(`小計: ${formatCurrency(quote.subtotal)}`);
  lines.push(`消費税（${quote.taxRate}%）: ${formatCurrency(quote.taxAmount)}`);
  lines.push(`合計金額: ${formatCurrency(quote.totalAmount)}`);
  lines.push('-' .repeat(60));
  
  if (quote.notes) {
    lines.push('');
    lines.push('【備考】');
    lines.push(quote.notes);
  }
  
  lines.push('');
  lines.push('=' .repeat(60));
  lines.push(companyInfo.companyName || companyInfo.name || '');
  if (companyInfo.postalCode) {
    const address = [
      `〒${companyInfo.postalCode}`,
      companyInfo.prefecture,
      companyInfo.city,
      companyInfo.address1,
      companyInfo.address2
    ].filter(Boolean).join(' ');
    lines.push(address);
  }
  if (companyInfo.phone) {
    lines.push(`TEL: ${companyInfo.phone}`);
  }
  if (companyInfo.email) {
    lines.push(`Email: ${companyInfo.email}`);
  }
  if (companyInfo.website) {
    lines.push(`Web: ${companyInfo.website}`);
  }
  
  return lines.join('\n');
}

/**
 * 件名生成
 */
function generateSubject(quote: Quote, companyInfo: CompanyInfo): string {
  const companyName = companyInfo.companyName || companyInfo.name || '';
  if (quote.title) {
    return `【お見積書】${quote.title} - ${companyName}`;
  }
  return `お見積書（No.${quote.quoteNumber}）- ${companyName}`;
}

/**
 * プレビューテキスト生成
 */
function generatePreviewText(quote: Quote, companyInfo: CompanyInfo): string {
  const total = formatCurrency(quote.totalAmount);
  if (quote.title) {
    return `${quote.title} お見積金額：${total}`;
  }
  return `お見積金額：${total} | 有効期限：${formatDate(quote.validityDate)}`;
}

/**
 * 日付フォーマット
 */
function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * 通貨フォーマット
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
}

/**
 * 見積書に選択されたおすすめオプションを取得
 */
export async function getSuggestedOptionsForQuote(
  quote: Quote
): Promise<SuggestedOption[]> {
  // 見積書に選択されたオプションIDがある場合はそれを使用
  if (quote.selectedSuggestedOptionIds && quote.selectedSuggestedOptionIds.length > 0) {
    try {
      // サーバーサイドでのみDB連携を実行
      if (typeof window === 'undefined') {
        const { SuggestedOptionService } = await import('@/services/suggested-option.service');
        const suggestedOptionService = new SuggestedOptionService();
        
        // 選択されたオプションIDから実際のオプションデータを取得
        const selectedOptions = await suggestedOptionService.getSuggestedOptionsByIds(quote.selectedSuggestedOptionIds);
        return selectedOptions;
      }
    } catch (error) {
      console.error('Error fetching selected suggested options:', error);
    }
  }
  
  // フォールバック: デフォルトオプションを返す
  return generateDefaultSuggestedOptions(quote);
}

/**
 * デフォルトの提案オプションを生成（フォールバック用）
 */
export function generateDefaultSuggestedOptions(
  quote: Quote
): SuggestedOption[] {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
  const suggestions: SuggestedOption[] = [];

  // 見積金額に応じた提案を生成
  const totalAmount = quote.totalAmount;

  if (totalAmount < 500000) {
    suggestions.push({
      title: '🚀 プレミアムサポートプラン',
      description: '優先サポートと拡張保証でビジネスを加速',
      price: '月額 ¥20,000',
      features: [
        '24時間以内の優先対応',
        '専任サポート担当者',
        '月次レポート作成',
        '無償アップデート',
      ],
      ctaText: '詳細を見る',
      ctaUrl: `${baseUrl}/plans/premium-support`,
    });
  }

  if (totalAmount > 300000) {
    suggestions.push({
      title: '📊 データ分析オプション',
      description: 'AIを活用した高度な分析でビジネスインサイトを獲得',
      price: '¥50,000/回',
      features: [
        'カスタムダッシュボード作成',
        '予測分析レポート',
        'ROI最適化提案',
        '競合分析',
      ],
      ctaText: 'サンプルを見る',
      ctaUrl: `${baseUrl}/plans/data-analytics`,
    });
  }

  suggestions.push({
    title: '🎯 年間契約割引',
    description: '年間契約で15%の特別割引を適用',
    price: `年額 ¥${Math.floor(totalAmount * 12 * 0.85).toLocaleString()}`,
    features: [
      '15%割引適用',
      '請求書発行の簡素化',
      '優先アップデート',
      '無料カスタマイズ（3回まで）',
    ],
    ctaText: '年間契約に切り替える',
    ctaUrl: `${baseUrl}/quotes/${quote._id}/upgrade-annual`,
  });

  return suggestions;
}

/**
 * 専門用語の辞書を生成
 */
export function generateDefaultTooltips(): Map<string, string> {
  console.log('📚 Generating default tooltips dictionary...');
  const tooltips = new Map<string, string>();

  // IT関連用語
  tooltips.set('LLMO', '大規模言語モデル最適化技術');
  tooltips.set('SaaS', 'Software as a Service - クラウド経由で提供されるソフトウェア');
  tooltips.set('API', 'Application Programming Interface - システム間の連携インターフェース');
  tooltips.set('UI/UX', 'ユーザーインターフェース/ユーザー体験 - 使いやすさとデザイン');
  tooltips.set('レスポンシブ', 'PC・スマホ・タブレットなど、あらゆる画面サイズに対応');
  tooltips.set('SEO', 'Search Engine Optimization - 検索エンジン最適化');
  
  // ビジネス用語
  tooltips.set('ROI', 'Return on Investment - 投資収益率');
  tooltips.set('KPI', 'Key Performance Indicator - 重要業績評価指標');
  tooltips.set('リードタイム', '発注から納品までの期間');
  
  // LLMOモニタリング関連 - 重複を解決し、確実にマッチするようにする
  tooltips.set('LLMOモニタリング', 'AIを活用したWebサイトの最適化とモニタリングサービス。サイトのパフォーマンス、検索順位、ユーザー行動を継続的に分析し、改善提案を行います');
  tooltips.set('モニタリング', 'サイトのパフォーマンスや検索順位を継続的に監視・分析するサービス');
  tooltips.set('最適化', 'システムやプロセスをより効率的に改善すること');
  tooltips.set('パフォーマンス', 'システムの処理能力や応答速度の性能');
  
  // より一般的な用語を追加
  tooltips.set('システム', 'コンピュータとソフトウェアを組み合わせた仕組み');
  tooltips.set('開発', 'ソフトウェアやシステムを設計・構築すること');
  tooltips.set('構築', 'システムやWebサイトを作り上げること');
  tooltips.set('設計', 'システムの設計図を作成すること');
  tooltips.set('保守', 'システムの維持・管理・改善作業');
  tooltips.set('運用', 'システムを日常的に運用・管理すること');
  tooltips.set('メンテナンス', 'システムの保守点検・改良作業');
  tooltips.set('アップデート', 'ソフトウェアやシステムの更新・改善');
  tooltips.set('カスタマイズ', 'お客様のご要望に合わせた独自の調整・改修');
  tooltips.set('サポート', '技術支援・問題解決・使い方指導');
  
  // Web関連の具体的な用語を追加
  tooltips.set('Webサイト', 'インターネット上で公開されるウェブページの集合');
  tooltips.set('ウェブサイト', 'インターネット上で公開されるウェブページの集合');
  tooltips.set('ホームページ', '企業や個人のWebサイトのトップページ');
  tooltips.set('Webシステム', 'ブラウザ経由で利用できるシステム');
  tooltips.set('ウェブシステム', 'ブラウザ経由で利用できるシステム');
  tooltips.set('アプリケーション', '特定の目的のために作られたソフトウェア');
  tooltips.set('データベース', '大量のデータを効率的に管理・検索できるシステム');
  tooltips.set('サーバー', 'インターネット上でサービスを提供するコンピュータ');
  tooltips.set('クラウド', 'インターネット経由でITサービスを利用する仕組み');
  tooltips.set('セキュリティ', 'システムやデータを不正アクセスから守る仕組み');
  
  // コンサルティング・分析関連
  tooltips.set('分析', 'データや情報を詳しく調べて問題点や改善点を見つけること');
  tooltips.set('解析', 'データを詳細に分析して有用な情報を抽出すること');
  tooltips.set('診断', 'システムの状態を調べて問題点を特定すること');
  tooltips.set('コンサルティング', '専門知識を活用した経営やシステムの改善提案');
  tooltips.set('プランニング', '目標達成のための計画立案');
  tooltips.set('戦略', '目標達成のための長期的な計画');
  
  // デバッグ用: テスト項目の追加
  tooltips.set('テスト項目', 'これはツールチップのテスト用項目です。正しく表示されれば機能は正常です。');
  tooltips.set('サンプル', 'ツールチップ機能をテストするためのサンプル項目です。');
  
  console.log(`📖 Created ${tooltips.size} tooltip entries:`, Array.from(tooltips.keys()));
  return tooltips;
}

/**
 * メール送信用の純粋なHTML文字列を生成（Gmail対応）
 */
export async function generateSimpleHtmlQuote({
  quote,
  companyInfo,
  recipientName,
  customMessage,
}: {
  quote: any;
  companyInfo: any;
  recipientName?: string;
  customMessage?: string;
}): Promise<{ html: string; plainText: string; subject: string }> {
  console.log('📧 [SIMPLE-HTML-GENERATOR:START] Starting generateSimpleHtmlQuote at:', new Date().toISOString());
  console.log('📧 [SIMPLE-HTML-GENERATOR:PARAMS] Input parameters:', {
    hasQuote: !!quote,
    quoteId: quote?._id,
    quoteNumber: quote?.quoteNumber,
    hasNotes: !!quote?.notes,
    notesValue: quote?.notes,
    notesType: typeof quote?.notes,
    notesLength: quote?.notes?.length || 0,
    hasCompanyInfo: !!companyInfo,
    recipientName,
    hasCustomMessage: !!customMessage,
    customMessage,
    timestamp: new Date().toISOString()
  });
  const customerName = recipientName || quote.customer?.name || quote.customer?.companyName || 'お客様';
  const issueDate = new Date(quote.issueDate || new Date()).toLocaleDateString('ja-JP');
  const validityDate = new Date(quote.validityDate || new Date()).toLocaleDateString('ja-JP');
  
  const subtotal = quote.subtotal || 0;
  const taxAmount = quote.taxAmount || 0;
  const totalAmount = quote.totalAmount || 0;

  // 会社情報の取得（スナップショットを優先）
  const companyName = quote.companySnapshot?.companyName || companyInfo?.companyName || companyInfo?.name || '会社名未設定';
  const companyAddress = quote.companySnapshot?.address || 
    [companyInfo?.postalCode && `〒${companyInfo.postalCode}`,
     companyInfo?.prefecture,
     companyInfo?.city,
     companyInfo?.address1,
     companyInfo?.address2].filter(Boolean).join(' ') || '';
  const companyPhone = quote.companySnapshot?.phone || companyInfo?.phone || '';
  const companyEmail = quote.companySnapshot?.email || companyInfo?.email || '';
  const companyWebsite = companyInfo?.website || '';

  // デバッグログ: 備考欄とデータフローを確認
  console.log('🔍 [generateSimpleHtmlQuote] Debug Info:', {
    quoteId: quote._id,
    hasNotes: !!quote.notes,
    notesLength: quote.notes?.length || 0,
    notesPreview: quote.notes?.substring(0, 100) || 'なし',
    companyName,
    companySnapshot: quote.companySnapshot,
    quoteTotalAmount: quote.totalAmount,
    itemsCount: quote.items?.length || 0
  });
  
  // 備考が空の場合のデフォルト処理
  const notesContent = quote.notes && quote.notes.trim() ? quote.notes.trim() : null;
  console.log('📝 Notes processing:', {
    originalNotes: quote.notes,
    processedNotes: notesContent,
    willShowNotes: !!notesContent
  });

  // ツールチップ辞書を生成
  const tooltips = generateDefaultTooltips();
  
  // ベースURL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
  
  // トラッキングID生成
  const trackingId = `qt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  // CTA URLs
  const viewOnlineUrl = `${baseUrl}/quotes/view/${quote._id}?t=${trackingId}`;
  const acceptUrl = `${baseUrl}/quotes/accept/${quote._id}?t=${trackingId}`;
  const discussUrl = `${baseUrl}/quotes/discuss/${quote._id}?t=${trackingId}`;
  
  // おすすめオプションをDBから取得
  const suggestedOptions = await getSuggestedOptionsForQuote(quote);

  // HTMLメール用のテンプレート（インラインCSS、Gmail対応、機能的要素付き）
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>お見積書 - ${quote.quoteNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Meiryo', 'MS PGothic', sans-serif; background-color: #f5f5f5;">
  <!-- オンライン版を見るリンク（ボタン化） -->
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 15px 0;">
        <a href="${viewOnlineUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 10px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: all 0.3s;">
          🌐 ウェブブラウザで見積書を表示する
        </a>
      </td>
    </tr>
  </table>
  
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 10px 0 20px 0;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- ヘッダー -->
          <tr>
            <td style="padding: 40px 40px 30px 40px;">
              <h1 style="margin: 0; text-align: center; color: #333333; font-size: 28px; font-weight: bold;">お見積書</h1>
            </td>
          </tr>
          
          <!-- 顧客情報 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold; color: #333333;">${customerName} 様</p>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #666666; line-height: 1.6;">平素より格別のご高配を賜り、厚く御礼申し上げます。</p>
              <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">ご依頼いただきました件について、下記の通りお見積りさせていただきます。</p>
            </td>
          </tr>

          ${customMessage ? `
          <!-- カスタムメッセージ -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #e3f2fd; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px;">
                    <p style="margin: 0; font-size: 14px; color: #1976d2; line-height: 1.6;">${customMessage}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- 見積情報 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="33%" style="padding: 5px 0;">
                    <span style="font-size: 12px; color: #999999;">見積書番号</span><br>
                    <span style="font-size: 14px; color: #333333; font-weight: bold;">${quote.quoteNumber}</span>
                  </td>
                  <td width="33%" style="padding: 5px 0;">
                    <span style="font-size: 12px; color: #999999;">発行日</span><br>
                    <span style="font-size: 14px; color: #333333; font-weight: bold;">${issueDate}</span>
                  </td>
                  <td width="34%" style="padding: 5px 0;">
                    <span style="font-size: 12px; color: #999999;">有効期限</span><br>
                    <span style="font-size: 14px; color: #333333; font-weight: bold;">${validityDate}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 見積内容 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #333333; border-bottom: 2px solid #333333; padding-bottom: 8px;">見積内容</h2>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8f8f8;">
                    <th style="border: 1px solid #dddddd; padding: 10px; text-align: left; font-size: 13px; color: #333333; font-weight: bold;">品目</th>
                    <th style="border: 1px solid #dddddd; padding: 10px; text-align: center; font-size: 13px; color: #333333; font-weight: bold; width: 60px;">数量</th>
                    <th style="border: 1px solid #dddddd; padding: 10px; text-align: right; font-size: 13px; color: #333333; font-weight: bold; width: 100px;">単価</th>
                    <th style="border: 1px solid #dddddd; padding: 10px; text-align: right; font-size: 13px; color: #333333; font-weight: bold; width: 100px;">金額</th>
                  </tr>
                </thead>
                <tbody>
                  ${quote.items.map((item: any) => {
                    // 値引き判定
                    const isDiscount = (item.amount < 0) || 
                      (item.itemName && (item.itemName.includes('値引き') || item.itemName.includes('割引') || item.itemName.includes('ディスカウント')));
                    const itemColor = isDiscount ? '#dc2626 !important' : '#333333';
                    
                    // ツールチップを検索（強化版マッチング）
                    let tooltipText = '';
                    const itemText = (item.itemName || '') + ' ' + (item.description || '');
                    
                    // item.tooltipが既に設定されている場合はそれを使用
                    if (item.tooltip) {
                      tooltipText = item.tooltip;
                    } else {
                      // より柔軟なマッチング
                      for (const [term, explanation] of tooltips.entries()) {
                        if (itemText.toLowerCase().includes(term.toLowerCase()) || term.toLowerCase().includes(itemText.toLowerCase())) {
                          tooltipText = explanation;
                          break;
                        }
                      }
                    }
                    
                    // メール版ツールチップ用のレンダリング関数
                    const renderItemNameWithTooltip = (itemName: string, tooltip: string) => {
                      if (!tooltip || tooltip.trim() === '') {
                        return `<span style="color: ${itemColor};">${itemName}</span>`;
                      }
                      
                      // 長い説明文は50文字で切って省略記号を付ける
                      const trimmedTooltip = tooltip.length > 50 ? tooltip.substring(0, 50) + '...' : tooltip;
                      
                      // メール版ライトグレーマーカースタイル
                      const markerStyle = 'background: linear-gradient(180deg, transparent 60%, rgba(229, 231, 235, 0.8) 60%); padding: 1px 2px; border-radius: 2px; border-bottom: 1px dotted #6b7280;';
                      
                      // インライン注釈スタイル
                      const annotationStyle = 'font-size: 0.75em; color: #6b7280; font-style: italic; margin-left: 4px; font-weight: normal;';
                      
                      return `<span style="${markerStyle}; color: ${itemColor};">${itemName}</span><span style="${annotationStyle}">（※${trimmedTooltip}）</span>`;
                    };
                    
                    const renderedItemName = renderItemNameWithTooltip(item.itemName || '', tooltipText);
                    
                    return `
                  <tr>
                    <td style="border: 1px solid #dddddd; padding: 10px; vertical-align: top;">
                      <div style="font-size: 14px; color: ${itemColor}; font-weight: bold; margin: 0 0 4px 0;">
                        ${renderedItemName}
                      </div>
                      ${item.description ? `<div style="font-size: 12px; color: ${isDiscount ? '#dc2626 !important' : '#666666'}; line-height: 1.4;"><span style="color: ${isDiscount ? '#dc2626 !important' : '#666666'};">${item.description}</span></div>` : ''}
                    </td>
                    <td style="border: 1px solid #dddddd; padding: 10px; text-align: center; font-size: 14px; color: ${itemColor};"><span style="color: ${itemColor};">${item.quantity || 0}${item.unit || ''}</span></td>
                    <td style="border: 1px solid #dddddd; padding: 10px; text-align: right; font-size: 14px; color: ${itemColor};"><span style="color: ${itemColor};">¥${(item.unitPrice || 0).toLocaleString()}</span></td>
                    <td style="border: 1px solid #dddddd; padding: 10px; text-align: right; font-size: 14px; color: ${itemColor}; font-weight: bold;"><span style="color: ${itemColor}; font-weight: bold;">¥${(item.amount || 0).toLocaleString()}</span></td>
                  </tr>
                  `;
                  }).join('')}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- 合計 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="60%"></td>
                  <td width="40%">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 5px 10px; text-align: right; font-size: 14px; color: #666666;">小計:</td>
                        <td style="padding: 5px 0; text-align: right; font-size: 14px; color: #333333; width: 120px;">¥${subtotal.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td style="padding: 5px 10px; text-align: right; font-size: 14px; color: #666666;">消費税(10%):</td>
                        <td style="padding: 5px 0; text-align: right; font-size: 14px; color: #333333;">¥${taxAmount.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="border-top: 2px solid #333333; padding-top: 8px;">
                          <table cellpadding="0" cellspacing="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 5px 10px; text-align: right; font-size: 16px; color: #333333; font-weight: bold;">合計金額:</td>
                              <td style="padding: 5px 0; text-align: right; font-size: 18px; color: #1976d2; font-weight: bold; width: 120px;">¥${totalAmount.toLocaleString()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA ボタンセクション -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <h3 style="margin: 0 0 20px 0; font-size: 16px; color: #333333; font-weight: bold;">📋 次のステップ</h3>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <!-- 承認ボタン -->
                        <td style="padding: 0 10px;">
                          <a href="${acceptUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 30px; background-color: #4caf50; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">✓ 見積を承認する</a>
                        </td>
                        <!-- 相談ボタン -->
                        <td style="padding: 0 10px;">
                          <a href="${discussUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 12px 30px; background-color: #2196f3; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: bold; border-radius: 25px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">💬 相談する</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${suggestedOptions.length > 0 ? `
          <!-- 追加提案セクション -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 2px dashed #ffc107; border-radius: 8px; padding: 20px; background-color: #fffbf0;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #f57c00; font-weight: bold;">🎯 おすすめオプション</h3>
                    
                    ${suggestedOptions.map((option, index) => {
                      const borderColors = ['#4caf50', '#2196f3', '#ff9800', '#9c27b0', '#e91e63'];
                      const borderColor = borderColors[index % borderColors.length];
                      
                      return `
                      <div style="${index > 0 ? 'margin-top: 15px; ' : ''}padding: 12px; background-color: #ffffff; border-radius: 6px; border-left: 4px solid ${borderColor};">
                        <h4 style="margin: 0 0 5px 0; font-size: 14px; color: #333333;">${option.title}</h4>
                        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666666; line-height: 1.4;">${option.description}</p>
                        ${option.features.length > 0 ? `
                        <p style="margin: 0 0 8px 0; font-size: 11px; color: #888888; line-height: 1.3;">
                          ${option.features.join('・')}
                        </p>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                          <span style="font-size: 13px; color: ${borderColor}; font-weight: bold;">${option.price}</span>
                          ${option.ctaUrl ? `
                          <a href="${option.ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; padding: 4px 12px; background-color: ${borderColor}; color: #ffffff; text-decoration: none; font-size: 11px; border-radius: 12px; font-weight: bold;">
                            ${option.ctaText}
                          </a>
                          ` : ''}
                        </div>
                      </div>
                      `;
                    }).join('')}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          ${notesContent ? `
          <!-- 備考 -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f9f9f9; border-radius: 6px;">
                <tr>
                  <td style="padding: 15px;">
                    <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #333333; font-weight: bold;">備考</h3>
                    <p style="margin: 0; font-size: 13px; color: #666666; line-height: 1.6; white-space: pre-wrap;">${cleanDuplicateSignatures(notesContent)}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ''}

          <!-- 会社情報フッター -->
          <tr>
            <td style="padding: 20px 40px 40px 40px; border-top: 1px solid #dddddd;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="50%">
                    <p style="margin: 0 0 5px 0; font-size: 14px; color: #333333; font-weight: bold;">${companyName}</p>
                    ${companyAddress ? `<p style="margin: 0 0 3px 0; font-size: 12px; color: #666666;">${companyAddress}</p>` : ''}
                    ${companyPhone ? `<p style="margin: 0 0 3px 0; font-size: 12px; color: #666666;">TEL: ${companyPhone}</p>` : ''}
                    ${companyEmail ? `<p style="margin: 0 0 3px 0; font-size: 12px; color: #666666;">Email: ${companyEmail}</p>` : ''}
                    ${companyWebsite ? `<p style="margin: 0; font-size: 12px;"><a href="${companyWebsite}" style="color: #1976d2; text-decoration: none;">${companyWebsite}</a></p>` : ''}
                  </td>
                  <td width="50%" align="right" valign="bottom">
                    <p style="margin: 0; font-size: 11px; color: #999999;">お問い合わせ</p>
                    <a href="mailto:${companyEmail}?subject=見積書${quote.quoteNumber}について" style="display: inline-block; margin-top: 5px; padding: 8px 20px; background-color: #f5f5f5; color: #333333; text-decoration: none; font-size: 12px; border-radius: 4px; border: 1px solid #dddddd;">📧 メールで問い合わせ</a>
                  </td>
                </tr>
              </table>
              
              <!-- AAM-Accountingシステム署名 -->
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 12px; color: #6b7280; text-align: center;">
                      このシステムはAI駆動によるAAM-Accountingシステムです powered by <a href="https://notion.effect.moe/" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: none;">EFFECT Inc.</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <!-- トラッキングピクセル -->
  <img src="${baseUrl}/api/tracking/open?id=${trackingId}&doc=quote&qid=${quote._id}" width="1" height="1" style="display: none;" alt="" />
</body>
</html>
  `.trim();

  // プレーンテキスト版
  const plainText = `
お見積書

${customerName} 様

平素より格別のご高配を賜り、厚く御礼申し上げます。
ご依頼いただきました件について、下記の通りお見積りさせていただきます。

${customMessage ? customMessage + '\n\n' : ''}
見積書番号: ${quote.quoteNumber}
発行日: ${issueDate}
有効期限: ${validityDate}

【見積内容】
${quote.items.map((item: any) => {
  const isDiscount = (item.amount < 0) || 
    (item.itemName && (item.itemName.includes('値引き') || item.itemName.includes('割引') || item.itemName.includes('ディスカウント')));
  const prefix = isDiscount ? '[値引き] ' : '';
  
  return `
・${prefix}${item.itemName || ''}
  ${item.description ? item.description + '\n  ' : ''}数量: ${item.quantity || 0}${item.unit || ''}
  単価: ¥${(item.unitPrice || 0).toLocaleString()}
  金額: ¥${(item.amount || 0).toLocaleString()}
`;
}).join('')}

小計: ¥${subtotal.toLocaleString()}
消費税: ¥${taxAmount.toLocaleString()}
合計金額: ¥${totalAmount.toLocaleString()}

${notesContent ? '【備考】\n' + cleanDuplicateSignatures(notesContent) + '\n\n' : ''}
${companyName}
${companyAddress}
${companyPhone ? 'TEL: ' + companyPhone : ''}
${companyEmail ? 'Email: ' + companyEmail : ''}
${companyWebsite || ''}
  `.trim();

  const subject = `お見積書 ${quote.quoteNumber} - ${companyName}`;

  return { html, plainText, subject };
}