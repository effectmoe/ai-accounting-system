import { render } from '@react-email/render';
import QuoteHtmlTemplate from '@/emails/QuoteHtmlTemplate';
import { Quote, CompanyInfo } from '@/types/collections';
import { logger } from '@/lib/logger';

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
    } = options;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://accounting-automation.vercel.app';
    const trackingId = includeTracking ? generateTrackingId() : undefined;

    // 見積項目にインタラクティブ要素を追加
    const enhancedQuote = enhanceQuoteItems(quote, tooltips, productLinks);

    // URLs生成
    const viewOnlineUrl = `${baseUrl}/quotes/view/${quote._id}?t=${trackingId}`;
    const acceptUrl = `${baseUrl}/quotes/accept/${quote._id}?t=${trackingId}`;
    const discussUrl = `${baseUrl}/quotes/discuss/${quote._id}?t=${trackingId}`;
    const trackingPixelUrl = includeTracking
      ? `${baseUrl}/api/tracking/open?id=${trackingId}&doc=quote&qid=${quote._id}`
      : undefined;

    // HTML生成
    const html = render(
      QuoteHtmlTemplate({
        quote: enhancedQuote,
        companyInfo,
        recipientName,
        viewOnlineUrl,
        acceptUrl,
        discussUrl,
        trackingPixelUrl,
        customMessage,
        suggestedOptions: includeInteractiveElements ? suggestedOptions : [],
      })
    );

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
  if (!tooltips && !productLinks) {
    return quote;
  }

  return {
    ...quote,
    items: quote.items.map((item) => {
      const enhanced: any = { ...item };
      
      // ツールチップを追加
      if (tooltips) {
        const tooltip = findTooltipForItem(item.description, tooltips);
        if (tooltip) {
          enhanced.tooltip = tooltip;
        }
      }

      // 商品リンクを追加
      if (productLinks) {
        const link = productLinks.get(item.productId || item.description);
        if (link) {
          enhanced.productLink = link;
        }
      }

      // 詳細説明を追加
      if (item.description.length > 50) {
        enhanced.details = item.description;
        enhanced.description = item.description.substring(0, 50) + '...';
      }

      return enhanced;
    }),
  };
}

/**
 * アイテムに対応するツールチップを検索
 */
function findTooltipForItem(
  description: string,
  tooltips: Map<string, string>
): string | undefined {
  // 専門用語を検出してツールチップを返す
  const terms = Array.from(tooltips.keys());
  for (const term of terms) {
    if (description.includes(term)) {
      return tooltips.get(term);
    }
  }
  return undefined;
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
  lines.push(`有効期限: ${formatDate(quote.validUntil)}`);
  lines.push('');
  lines.push('-' .repeat(60));
  lines.push('【見積内容】');
  lines.push('-' .repeat(60));
  
  quote.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.description}`);
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
  lines.push(companyInfo.name);
  if (companyInfo.address) {
    lines.push(`〒${companyInfo.postalCode} ${companyInfo.address}`);
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
  if (quote.title) {
    return `【お見積書】${quote.title} - ${companyInfo.name}`;
  }
  return `お見積書（No.${quote.quoteNumber}）- ${companyInfo.name}`;
}

/**
 * プレビューテキスト生成
 */
function generatePreviewText(quote: Quote, companyInfo: CompanyInfo): string {
  const total = formatCurrency(quote.totalAmount);
  if (quote.title) {
    return `${quote.title} お見積金額：${total}`;
  }
  return `お見積金額：${total} | 有効期限：${formatDate(quote.validUntil)}`;
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
 * デフォルトの提案オプションを生成
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
  const tooltips = new Map<string, string>();

  // IT関連用語
  tooltips.set('SaaS', 'Software as a Service - クラウド経由で提供されるソフトウェア');
  tooltips.set('API', 'Application Programming Interface - システム間の連携インターフェース');
  tooltips.set('UI/UX', 'ユーザーインターフェース/ユーザー体験 - 使いやすさとデザイン');
  tooltips.set('レスポンシブ', 'PC・スマホ・タブレットなど、あらゆる画面サイズに対応');
  tooltips.set('SEO', 'Search Engine Optimization - 検索エンジン最適化');
  
  // ビジネス用語
  tooltips.set('ROI', 'Return on Investment - 投資収益率');
  tooltips.set('KPI', 'Key Performance Indicator - 重要業績評価指標');
  tooltips.set('リードタイム', '発注から納品までの期間');
  
  return tooltips;
}